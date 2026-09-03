export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  defaultCurrency?: string;
}

const TOKEN_KEY = 'spese_auth_token';
const USER_KEY = 'spese_auth_user';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getCachedUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem(USER_KEY);
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

export function setCachedUser(user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem('lastUserId', user.id);
}

export function getUserId(): string | null {
  const user = getCachedUser();
  return user?.id || (typeof window !== 'undefined' ? localStorage.getItem('lastUserId') : null);
}
