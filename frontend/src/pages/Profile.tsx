import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, Download, Upload, Loader2, Save, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { User as UserType } from "@/types/api";
import { toast } from "sonner";
import { useBottomNavPadding } from "@/hooks/useBottomNavPadding";
import { useAuth } from "@/contexts/AuthContext";

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
  const { ref, style } = useBottomNavPadding();
  const { user: authUser, isLoaded } = useAuth();
  const [profile, setProfile] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      loadUser();
    }
  }, [isLoaded, authUser]);

  useEffect(() => {
    const originalName = authUser?.name || profile?.name || "";
    const originalCurrency = profile?.defaultCurrency || "EUR";
    
    const nameChanged = name !== originalName;
    const currencyChanged = defaultCurrency !== originalCurrency;
    
    setHasChanges(nameChanged || currencyChanged);
  }, [name, defaultCurrency, authUser, profile]);

  const loadUser = async () => {
    try {
      setLoading(true);
      let userData: UserType | null = null;

      try {
        const response = await api.auth.me();
        userData = response.data.user;
        setProfile(userData);
        setDefaultCurrency(userData?.defaultCurrency || "EUR");
      } catch (err) {
        console.error("Failed to load backend user:", err);
      }

      setName(authUser?.name || userData?.name || "Andrea Mauri");
      if (!userData) {
        setDefaultCurrency("EUR");
      }
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
      const originalName = authUser?.name || profile?.name || "";
      const originalCurrency = profile?.defaultCurrency || "EUR";

      if (name !== originalName) {
        updateData.name = name.trim() || "";
      }
      
      if (defaultCurrency !== originalCurrency) {
        updateData.defaultCurrency = defaultCurrency;
      }
      
      if (updateData.defaultCurrency || updateData.name) {
        const response = await api.auth.updateProfile(updateData);
        setProfile(response.data);
      }

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
    const originalName = authUser?.name || profile?.name || "";
    const originalCurrency = profile?.defaultCurrency || "EUR";
    setName(originalName);
    setDefaultCurrency(originalCurrency);
    setHasChanges(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const displayName = name || authUser?.name || profile?.name || "Andrea Mauri";
  const displayEmail = authUser?.email || profile?.email || "andreamauri2013";
  const initial = displayName?.charAt(0)?.toUpperCase() || "A";

  return (
    <div ref={ref} style={style} className="px-3 pt-4 pb-28 max-w-md mx-auto md:max-w-4xl md:px-8 md:py-8">
      {/* Mobile-only Header */}
      <div className="flex items-center gap-3 mb-5 md:hidden">
        <Link to="/settings" className="p-1.5 glass-card rounded-2xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Profilo</h1>
      </div>

      {/* Main Widescreen Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
        
        {/* Left Column: Avatar Card */}
        <div className="md:col-span-1">
          <GlassCard className="p-6 flex flex-col items-center justify-center text-center border border-white/10 bg-white/5 shadow-strong">
            <div className="w-24 h-24 rounded-full gradient-purple flex items-center justify-center text-4xl font-extrabold mb-4 shadow-strong text-white border border-white/10 shrink-0">
              {initial}
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight leading-none">{displayName}</h2>
            <p className="text-xs text-muted-foreground mt-2 truncate w-full">{displayEmail}</p>
          </GlassCard>
        </div>

        {/* Right Columns: Inputs Form & Backup Actions */}
        <div className="md:col-span-2 space-y-4">
          {/* Form details card */}
          <GlassCard className="p-5 border border-white/10 bg-white/5">
            <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider">Informazioni Personali</h3>
            
            <div className="space-y-4">
              {/* Name Field */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Nome visualizzato</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Inserisci il tuo nome"
                  className="bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-1 focus-visible:ring-white/20 h-10"
                />
              </div>

              {/* Currency Field */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Valuta Predefinita</label>
                <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-white/10 text-white">
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email Field (Read Only) */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Indirizzo Email (solo lettura)</label>
                <div className="bg-white/5 border border-white/10 p-3 text-xs text-muted-foreground rounded-xl font-mono">
                  {displayEmail}
                </div>
              </div>

              {/* Save/Cancel Action Buttons */}
              {hasChanges && (
                <div className="flex gap-2.5 pt-3 border-t border-white/5">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="flex-1 gap-2 h-10 font-semibold bg-transparent border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white"
                    disabled={saving}
                  >
                    <X className="w-4 h-4" />
                    Annulla
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="flex-1 gap-2 h-10 font-semibold pill-active shadow-strong"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saving ? "Salvataggio..." : "Salva Modifiche"}
                  </Button>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Backup Management Card */}
          <GlassCard className="p-5 border border-white/10 bg-white/5">
            <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider">Gestione Backup Dati</h3>
            <p className="text-[11px] text-muted-foreground mb-4">
              Esporta i dati registrati localmente sul tuo browser per salvaguardare lo storico delle spese o per migrarli su un altro dispositivo.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button 
                className="w-full gap-2 h-10 text-xs font-semibold bg-transparent border-white/10 text-white hover:bg-white/5 rounded-xl" 
                variant="outline"
                onClick={() => toast.info("Funzionalità in arrivo")}
              >
                <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                Importa file Backup
              </Button>
              <Button 
                className="w-full gap-2 h-10 text-xs font-semibold bg-transparent border-white/10 text-white hover:bg-white/5 rounded-xl" 
                variant="outline"
                onClick={() => toast.info("Funzionalità in arrivo")}
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                Esporta file Backup
              </Button>
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
}
