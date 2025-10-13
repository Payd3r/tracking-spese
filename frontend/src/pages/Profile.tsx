import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, Download, Upload, User, Mail, Loader2, DollarSign, Save, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { User as UserType } from "@/types/api";
import { toast } from "sonner";

const CURRENCIES = [
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'USD', name: 'Dollaro USA ($)' },
  { code: 'GBP', name: 'Sterlina (£)' },
  { code: 'JPY', name: 'Yen (¥)' },
  { code: 'CHF', name: 'Franco Svizzero (Fr)' },
  { code: 'CAD', name: 'Dollaro Canadese (C$)' },
  { code: 'AUD', name: 'Dollaro Australiano (A$)' },
  { code: 'CNY', name: 'Yuan (¥)' },
  { code: 'INR', name: 'Rupia (₹)' },
  { code: 'RUB', name: 'Rublo (₽)' },
  { code: 'BRL', name: 'Real (R$)' },
  { code: 'ZAR', name: 'Rand (R)' },
  { code: 'SEK', name: 'Corona Svedese (kr)' },
  { code: 'NOK', name: 'Corona Norvegese (kr)' },
  { code: 'DKK', name: 'Corona Danese (kr)' },
  { code: 'PLN', name: 'Złoty (zł)' },
  { code: 'TRY', name: 'Lira Turca (₺)' },
  { code: 'MXN', name: 'Peso Messicano ($)' },
  { code: 'AED', name: 'Dirham (د.إ)' },
  { code: 'SAR', name: 'Riyal (﷼)' },
];

export default function Profile() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("");
  
  // Track if there are changes
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  // Check for changes whenever form values change
  useEffect(() => {
    if (user) {
      const originalName = user.name || "";
      const originalCurrency = user.defaultCurrency || "EUR";
      
      const nameChanged = name !== originalName;
      const currencyChanged = defaultCurrency !== originalCurrency;
      
      setHasChanges(nameChanged || currencyChanged);
    }
  }, [name, defaultCurrency, user]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await api.auth.me();
      const userData = response.data.user; // Extract user from response
      setUser(userData);
      
      // Initialize form with current values
      setName(userData.name || "");
      setDefaultCurrency(userData.defaultCurrency || "EUR");
    } catch (err: any) {
      console.error("Failed to load user:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento del profilo");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    
    try {
      setSaving(true);
      
      const updateData: { name?: string; defaultCurrency?: string } = {};
      
      if (name !== (user?.name || "")) {
        updateData.name = name.trim() || null;
      }
      
      if (defaultCurrency !== (user?.defaultCurrency || "EUR")) {
        updateData.defaultCurrency = defaultCurrency;
      }
      
      const response = await api.auth.updateProfile(updateData);
      setUser(response.data);
      setHasChanges(false);
      
      toast.success("Profilo aggiornato con successo!");
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      toast.error(err.response?.data?.message || "Errore nell'aggiornamento del profilo");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setName(user.name || "");
      setDefaultCurrency(user.defaultCurrency || "EUR");
      setHasChanges(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center py-20">
        <p>Errore nel caricamento del profilo</p>
      </div>
    );
  }

  const initial = user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="px-3 pt-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/settings" className="p-1.5 glass-card rounded-2xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Profilo</h1>
      </div>

      {/* Profile Info */}
      <GlassCard className="p-4 mb-4">
        <div className="flex flex-col items-center mb-4">
          <div className="w-20 h-20 rounded-full gradient-purple flex items-center justify-center text-3xl font-bold mb-3">
            {initial}
          </div>
          <h2 className="text-xl font-bold">{user.name || "Utente"}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        <div className="space-y-3">
          {/* Name Field */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Nome</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Inserisci il tuo nome"
              className="glass-card"
            />
          </div>

          {/* Currency Field */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Valuta Predefinita</label>
            <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
              <SelectTrigger className="glass-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email Field (Read Only) */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Email</label>
            <div className="glass-card p-3 text-sm text-muted-foreground">
              {user.email}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Save/Cancel Buttons - Only show when there are changes */}
      {hasChanges && (
        <div className="flex gap-2 mb-4">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1 gap-2"
            disabled={saving}
          >
            <X className="w-4 h-4" />
            Annulla
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 gap-2 gradient-blue text-white"
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      )}

      {/* Backup Section */}
      <GlassCard className="p-4">
        <h3 className="font-semibold text-sm mb-3">Backup Dati</h3>
        <div className="space-y-2">
          <Button 
            className="w-full gap-2 h-10 text-sm" 
            variant="outline"
            onClick={() => toast.info("Funzionalità in arrivo")}
          >
            <Upload className="w-3.5 h-3.5" />
            Importa Backup
          </Button>
          <Button 
            className="w-full gap-2 h-10 text-sm" 
            variant="outline"
            onClick={() => toast.info("Funzionalità in arrivo")}
          >
            <Download className="w-3.5 h-3.5" />
            Esporta Backup
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}