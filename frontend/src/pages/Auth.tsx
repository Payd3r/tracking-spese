import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { DollarSign, LogIn, UserPlus, User } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth, useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate("/", { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div className="h-full flex items-center justify-center px-3 py-8 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-block p-3 rounded-3xl glass-card mb-3">
            <DollarSign className="w-10 h-10 text-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-1">Tracking Spese</h1>
          <p className="text-sm text-muted-foreground">
            Accedi o registrati con Clerk per continuare
          </p>
        </div>

        <GlassCard className="p-5 space-y-4">
          <SignedOut>
            <div className="space-y-3">
              <SignInButton mode="modal" redirectUrl="/">
                <Button className="w-full h-11 rounded-xl font-semibold text-base gap-2">
                  <LogIn className="w-4 h-4" />
                  Accedi
                </Button>
              </SignInButton>
              <SignUpButton mode="modal" redirectUrl="/">
                <Button variant="outline" className="w-full h-11 rounded-xl font-semibold text-base gap-2">
                  <UserPlus className="w-4 h-4" />
                  Crea account
                </Button>
              </SignUpButton>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{user?.fullName || user?.primaryEmailAddress?.emailAddress}</span>
              </div>
              <UserButton afterSignOutUrl="/auth" />
              <Button onClick={() => navigate("/")} className="w-full h-11 rounded-xl font-semibold text-base">
                Vai alla dashboard
              </Button>
            </div>
          </SignedIn>
        </GlassCard>

        <p className="text-center text-[10px] text-muted-foreground mt-4">
          Traccia le tue spese in modo sicuro e privato
        </p>
      </div>
    </div>
  );
}

