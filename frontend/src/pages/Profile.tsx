import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, Download, Upload, User, Mail, Loader2, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { User as UserType } from "@/types/api";
import { toast } from "sonner";

export default function Profile() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await api.auth.me();
      setUser(response.data);
    } catch (err: any) {
      console.error("Failed to load user:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento del profilo");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p>Errore nel caricamento del profilo</p>
      </div>
    );
  }

  const initial = user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/settings" className="p-2 glass-card rounded-2xl">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Profilo</h1>
      </div>

      {/* Profile Info */}
      <GlassCard className="p-6 mb-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full gradient-purple flex items-center justify-center text-4xl font-bold mb-4">
            {initial}
          </div>
          <h2 className="text-2xl font-bold">{user.name || "Utente"}</h2>
          <p className="text-muted-foreground">{user.email}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 glass-card rounded-xl">
            <User className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="font-medium">{user.name || "Non impostato"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 glass-card rounded-xl">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 glass-card rounded-xl">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Valuta Predefinita</p>
              <p className="font-medium">{user.defaultCurrency}</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Backup Section */}
      <GlassCard className="p-6">
        <h3 className="font-semibold mb-4">Backup Dati</h3>
        <div className="space-y-3">
          <Button 
            className="w-full gap-2" 
            variant="outline"
            onClick={() => toast.info("Funzionalità in arrivo")}
          >
            <Upload className="w-4 h-4" />
            Importa Backup
          </Button>
          <Button 
            className="w-full gap-2" 
            variant="outline"
            onClick={() => toast.info("Funzionalità in arrivo")}
          >
            <Download className="w-4 h-4" />
            Esporta Backup
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
