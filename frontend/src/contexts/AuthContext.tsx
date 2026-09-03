import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { api } from '../lib/api';
import {
  AuthUser,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getCachedUser,
  setCachedUser,
} from '../lib/authStorage';
import { toast } from 'sonner';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoaded: boolean;
  hasPasskey: boolean;
  email: string;
  loginWithPasskey: () => Promise<void>;
  registerPasskey: () => Promise<void>;
  logout: () => Promise<void>;
  checkStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(getCachedUser());
  const [token, setTokenState] = useState<string | null>(getAuthToken());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAuthToken());
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasPasskey, setHasPasskey] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('andreamauri2013');

  const checkStatus = useCallback(async () => {
    try {
      const res = await api.auth.getStatus();
      if (res.data) {
        setHasPasskey(!!res.data.hasPasskey);
        if (res.data.email) setEmail(res.data.email);
      }
    } catch (err) {
      console.warn('Impossibile verificare lo stato della passkey (modalità offline):', err);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      await checkStatus();
      const existingToken = getAuthToken();

      if (existingToken) {
        try {
          const res = await api.auth.me();
          if (res.data?.user) {
            setUser(res.data.user);
            setCachedUser(res.data.user);
            setIsAuthenticated(true);
          }
        } catch (err: any) {
          if (err.response?.status === 401) {
            removeAuthToken();
            setTokenState(null);
            setUser(null);
            setIsAuthenticated(false);
          } else {
            // Offline scenario: retain cached user and token if present
            const cached = getCachedUser();
            if (cached) {
              setUser(cached);
              setIsAuthenticated(true);
            }
          }
        }
      } else {
        setIsAuthenticated(false);
      }

      setIsLoaded(true);
    };

    initAuth();
  }, [checkStatus]);

  const registerPasskey = async () => {
    if (!browserSupportsWebAuthn()) {
      toast.error('Il tuo dispositivo o browser non supporta le Passkey.');
      throw new Error('WebAuthn non supportato');
    }

    try {
      const optionsRes = await api.auth.getRegisterOptions();
      const options = optionsRes.data;

      const attestation = await startRegistration({ optionsJSON: options });
      const verifyRes = await api.auth.verifyRegister(attestation);

      const { token: newToken, user: newUser } = verifyRes.data;
      setAuthToken(newToken);
      setCachedUser(newUser);
      setTokenState(newToken);
      setUser(newUser);
      setIsAuthenticated(true);
      setHasPasskey(true);
      toast.success('Passkey registrata con successo!');
    } catch (err: any) {
      console.error('Passkey registration error:', err);
      const msg = err.response?.data?.error || err.message || 'Errore nella registrazione della Passkey';
      toast.error(msg);
      throw err;
    }
  };

  const loginWithPasskey = async () => {
    if (!browserSupportsWebAuthn()) {
      toast.error('Il tuo dispositivo o browser non supporta le Passkey.');
      throw new Error('WebAuthn non supportato');
    }

    try {
      const optionsRes = await api.auth.getLoginOptions();
      const options = optionsRes.data;

      const assertion = await startAuthentication({ optionsJSON: options });
      const verifyRes = await api.auth.verifyLogin(assertion);

      const { token: newToken, user: newUser } = verifyRes.data;
      setAuthToken(newToken);
      setCachedUser(newUser);
      setTokenState(newToken);
      setUser(newUser);
      setIsAuthenticated(true);
      setHasPasskey(true);
      toast.success('Accesso effettuato con Passkey!');
    } catch (err: any) {
      console.error('Passkey login error:', err);
      const msg = err.response?.data?.error || err.message || 'Errore durante l\'accesso con Passkey';
      toast.error(msg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.warn('Logout API warning:', err);
    } finally {
      removeAuthToken();
      setTokenState(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoaded,
        hasPasskey,
        email,
        loginWithPasskey,
        registerPasskey,
        logout,
        checkStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere usato all\'interno di AuthProvider');
  }
  return context;
};
