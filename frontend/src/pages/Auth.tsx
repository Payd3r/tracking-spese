import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { GlassCard } from '../components/GlassCard';

export default function Auth() {
  const { isAuthenticated, isLoaded, hasPasskey, loginWithPasskey, registerPasskey } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const autoTriggeredRef = useRef(false);

  const handleAction = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (hasPasskey) {
        await loginWithPasskey();
      } else {
        await registerPasskey();
      }
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isAuthenticated) {
      navigate('/', { replace: true });
      return;
    }

    if (isLoaded && !isAuthenticated && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      handleAction();
    }
  }, [isLoaded, isAuthenticated, navigate]);

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white p-4">
      <GlassCard className="w-full max-w-md p-8 border border-white/10 bg-neutral-900/90 text-center space-y-6 shadow-2xl rounded-3xl">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white shadow-strong">
          <KeyRound className="w-8 h-8" />
        </div>
        
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Tracking Spese
          </h1>
          <p className="text-xs text-muted-foreground mt-2">
            Autenticazione biometrica tramite Passkey.
          </p>
        </div>

        <Button
          onClick={handleAction}
          disabled={loading}
          className="w-full py-6 text-sm font-semibold rounded-2xl bg-white text-black hover:bg-white/90 active:scale-95 transition-all shadow-strong"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin text-black" />
              Autenticazione in corso...
            </>
          ) : (
            <>
              <KeyRound className="w-5 h-5 mr-2 text-black" />
              Autenticati con Passkey
            </>
          )}
        </Button>

        <div className="space-y-2 pt-1">
          <p className="text-[11px] text-muted-foreground font-mono">
            Account: andreamauri2013
          </p>
          <div>
            <Link
              to="/privacy"
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
              <span>Informativa sulla Privacy & Enable Banking</span>
            </Link>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
