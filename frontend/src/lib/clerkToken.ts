// Helper per ottenere token e utente da Clerk fuori dai componenti React
type WindowWithClerk = typeof window & {
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

async function getClerk() {
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
  const clerk = await getClerk();
  if (!clerk?.session) return null;
  try {
    const token = await clerk.session.getToken();
    return token || null;
  } catch (error) {
    console.error("Unable to get Clerk token", error);
    return null;
  }
}

export async function getClerkUser() {
  const clerk = await getClerk();
  return clerk?.user || null;
}

export async function getClerkUserId() {
  const user = await getClerkUser();
  return user?.id ?? null;
}

