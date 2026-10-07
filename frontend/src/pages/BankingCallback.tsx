import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function BankingCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoaded } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Collegamento in corso...");

  useEffect(() => {
    if (!isLoaded) return;

    const run = async () => {
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      const code = searchParams.get("code");
      const state = searchParams.get("state");

      if (error) {
        setStatus("error");
        setMessage(errorDescription || error);
        toast.error("Autorizzazione bancaria annullata o fallita");
        setTimeout(() => navigate("/settings", { replace: true }), 2500);
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("Parametro code mancante nel callback");
        setTimeout(() => navigate("/settings", { replace: true }), 2500);
        return;
      }

      if (!isAuthenticated) {
        setStatus("error");
        setMessage("Effettua il login per completare il collegamento");
        setTimeout(() => navigate("/auth", { replace: true }), 2000);
        return;
      }

      try {
        const { data } = await api.banking.exchange({ code, state: state || undefined });
        setStatus("success");
        setMessage(data.message || "Banca collegata con successo");
        toast.success("Banca collegata");
        setTimeout(() => navigate("/settings", { replace: true }), 1500);
      } catch (err: any) {
        console.error(err);
        setStatus("error");
        setMessage(err?.response?.data?.error || err?.message || "Errore nello scambio del codice");
        toast.error("Collegamento fallito");
        setTimeout(() => navigate("/settings", { replace: true }), 3000);
      }
    };

    run();
  }, [isLoaded, isAuthenticated, searchParams, navigate]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-4">
        {status === "loading" && <Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-400" />}
        <h1 className="text-xl font-bold">
          {status === "loading" && "Collegamento in corso..."}
          {status === "success" && "Collegamento riuscito"}
          {status === "error" && "Collegamento non riuscito"}
        </h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
