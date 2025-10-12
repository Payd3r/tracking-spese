import { GlassCard } from "@/components/GlassCard";
import { TextInput } from "@/components/TextInput";
import { Button } from "@/components/ui/button";
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

    // Validation
    if (!email || !password) {
      toast.error("Inserisci email e password");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Inserisci un'email valida");
      return;
    }

    // Password validation
    if (password.length < 6) {
      toast.error("La password deve essere almeno di 6 caratteri");
      return;
    }

    if (mode === "register" && name && name.trim().length < 2) {
      toast.error("Il nome deve essere almeno di 2 caratteri");
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
      
      // Extract error message from response
      let errorMessage = "Errore durante l'autenticazione";
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Handle specific error cases
      if (err.response?.status === 400) {
        if (errorMessage.includes("Credenziali non valide")) {
          errorMessage = "Email o password non corretti";
        } else if (errorMessage.includes("Email già registrata")) {
          errorMessage = "Un account con questa email esiste già";
        }
      } else if (err.response?.status === 500) {
        errorMessage = "Errore del server. Riprova più tardi.";
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = "Errore di connessione. Verifica la tua connessione internet.";
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center px-3 py-8 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-6">
          <div className="inline-block p-3 rounded-3xl gradient-purple mb-3">
            <DollarSign className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-1">Tracking Spese</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci le tue finanze in modo semplice
          </p>
        </div>

        {/* Auth Card */}
        <GlassCard className="p-5">
          {/* Mode Toggle */}
          <div className="flex gap-2 p-2 glass-card rounded-2xl mb-5">
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
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <div>
                <TextInput
                  value={name}
                  onChange={setName}
                  placeholder="Il tuo nome"
                  icon={User}
                  label="Nome (opzionale)"
                />
              </div>
            )}

            <div>
              <GlassCard>
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block font-medium">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@esempio.com"
                      required
                      className="w-full bg-transparent border-none outline-none text-base placeholder:text-muted-foreground/50"
                      style={{
                        WebkitAppearance: 'none',
                      }}
                    />
                  </div>
                </div>
              </GlassCard>
            </div>

            <div>
              <GlassCard>
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block font-medium">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={mode === "register" ? 6 : undefined}
                      className="w-full bg-transparent border-none outline-none text-base placeholder:text-muted-foreground/50"
                      style={{
                        WebkitAppearance: 'none',
                      }}
                    />
                  </div>
                </div>
              </GlassCard>
            </div>

            {mode === "register" && (
              <div>
                <label className="text-xs text-muted-foreground mb-2 ml-1 block font-medium">
                  Valuta Predefinita
                </label>
                <div className="flex gap-2">
                  {['EUR', 'USD', 'GBP', 'CHF'].map((currency) => (
                    <button
                      key={currency}
                      type="button"
                      onClick={() => setDefaultCurrency(currency)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        defaultCurrency === currency
                          ? 'gradient-blue text-white'
                          : 'glass-card text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {currency}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDefaultCurrency('')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      defaultCurrency === ''
                        ? 'gradient-blue text-white'
                        : 'glass-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    +
                  </button>
                </div>
                {defaultCurrency === '' && (
                  <div className="mt-2">
                    <GlassCard>
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-xl gradient-green flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={defaultCurrency}
                            onChange={(e) => setDefaultCurrency(e.target.value.toUpperCase())}
                            placeholder="Inserisci valuta"
                            maxLength={3}
                            className="w-full bg-transparent border-none outline-none text-base placeholder:text-muted-foreground/50 uppercase"
                            style={{
                              WebkitAppearance: 'none',
                            }}
                          />
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl gradient-blue text-white font-semibold text-base shadow-lg mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {mode === "login" ? "Accesso..." : "Creazione..."}
                </>
              ) : (
                <>{mode === "login" ? "Accedi" : "Crea Account"}</>
              )}
            </Button>
          </form>

          {/* Additional Info */}
          <div className="mt-4 text-center text-xs text-muted-foreground">
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
        <p className="text-center text-[10px] text-muted-foreground mt-4">
          Traccia le tue spese in modo sicuro e privato
        </p>
      </div>
    </div>
  );
}

