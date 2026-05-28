// Helper per ottenere token e utente da Clerk fuori dai componenti React
type WindowWithClerk = Window & {
  Clerk?: {
    load: () => Promise<void>;
    session?: {
      getToken: (options?: { template?: string }) => Promise<string | null>;
    };
    user?: {
      id?: string;
      fullName?: string | null;
      primaryEmailAddress?: {
        emailAddress?: string | null;
      } | null;
    };
    signOut?: (options?: { redirectUrl?: string }) => Promise<void>;
  };
};

// In-memory token cache per evitare round-trip ripetuti a Clerk
// (particolarmente lenti su iOS Safari con connessione instabile)
let _cachedToken: string | null = null;
let _tokenCachedAt = 0;
const TOKEN_TTL_MS = 50_000; // 50 secondi (i token Clerk scadono dopo ~60s)

async function getClerk() {
  if (typeof window === 'undefined') return null;
  const wnd = window as WindowWithClerk;
  const clerk = wnd.Clerk;
  if (!clerk) return null;
  try {
    await clerk.load();
    return clerk;
  } catch (error) {
    console.error("Clerk load failed", error);
    return null;
  }
}

export async function getClerkToken() {
  // Usa il token in cache se ancora valido
  const now = Date.now();
  if (_cachedToken && now - _tokenCachedAt < TOKEN_TTL_MS) {
    return _cachedToken;
  }

  const clerk = await getClerk();
  if (!clerk?.session) {
    _cachedToken = null;
    return null;
  }
  try {
    const token = await clerk.session.getToken();
    _cachedToken = token || null;
    _tokenCachedAt = now;
    return _cachedToken;
  } catch (error) {
    console.error("Unable to get Clerk token", error);
    _cachedToken = null;
    return null;
  }
}

/** Invalida il token in cache (da chiamare al logout o cambio utente) */
export function invalidateClerkTokenCache(): void {
  _cachedToken = null;
  _tokenCachedAt = 0;
}

export async function getClerkUser() {
  const clerk = await getClerk();
  return clerk?.user || null;
}

export async function getClerkUserId() {
  const user = await getClerkUser();
  return user?.id ?? null;
}

