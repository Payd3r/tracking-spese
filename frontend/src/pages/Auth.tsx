import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, User, DollarSign } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("EUR");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Inserisci email e password");
      return;
    }

    if (mode === "register" && password.length < 6) {
      toast.error("La password deve essere almeno di 6 caratteri");
      return;
    }

    try {
      setLoading(true);

      if (mode === "login") {
        const response = await api.auth.login({ email, password });
        const { token, user } = response.data;
        
        // Save token and user
        localStorage.setItem("authToken", token);
        localStorage.setItem("user", JSON.stringify(user));
        
        toast.success(`Benvenuto, ${user.name || user.email}!`);
        navigate("/");
      } else {
        const response = await api.auth.register({
          email,
          password,
          name: name || undefined,
          defaultCurrency
        });
        const { token, user } = response.data;
        
        // Save token and user
        localStorage.setItem("authToken", token);
        localStorage.setItem("user", JSON.stringify(user));
        
        toast.success("Account creato con successo!");
        navigate("/");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      toast.error(err.response?.data?.message || "Errore durante l'autenticazione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 rounded-3xl gradient-purple mb-4">
            <DollarSign className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Tracking Spese</h1>
          <p className="text-muted-foreground">
            Gestisci le tue finanze in modo semplice
          </p>
        </div>

        {/* Auth Card */}
        <GlassCard className="p-8">
          {/* Mode Toggle */}
          <div className="flex gap-2 p-2 glass-card rounded-2xl mb-6">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === "login" ? "gradient-blue text-white" : "text-muted-foreground"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === "register" ? "gradient-blue text-white" : "text-muted-foreground"
              }`}
            >
              Registrati
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome (opzionale)
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Il tuo nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="email@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10"
                minLength={mode === "register" ? 6 : undefined}
              />
              {mode === "register" && (
                <p className="text-xs text-muted-foreground">
                  Minimo 6 caratteri
                </p>
              )}
            </div>

            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="currency" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Valuta Predefinita
                </Label>
                <Input
                  id="currency"
                  type="text"
                  placeholder="EUR"
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value.toUpperCase())}
                  maxLength={3}
                  className="bg-white/5 border-white/10"
                />
                <p className="text-xs text-muted-foreground">
                  Codice ISO (es: EUR, USD, GBP)
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl gradient-blue text-white font-semibold text-lg shadow-lg mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {mode === "login" ? "Accesso..." : "Creazione..."}
                </>
              ) : (
                <>{mode === "login" ? "Accedi" : "Crea Account"}</>
              )}
            </Button>
          </form>

          {/* Additional Info */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <p>
                Non hai un account?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="text-primary hover:underline font-medium"
                >
                  Registrati qui
                </button>
              </p>
            ) : (
              <p>
                Hai già un account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-primary hover:underline font-medium"
                >
                  Accedi qui
                </button>
              </p>
            )}
          </div>
        </GlassCard>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Traccia le tue spese in modo sicuro e privato
        </p>
      </div>
    </div>
  );
}

