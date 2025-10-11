import { GlassCard } from "@/components/GlassCard";
import { TextInput } from "@/components/TextInput";
import { IconSelector } from "@/components/IconSelector";
import { Wallet, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const mainCurrencies = ["EUR", "USD", "GBP", "CHF"];

interface AccountFormProps {
  onSuccess: () => void;
}

export function AccountForm({ onSuccess }: AccountFormProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("lucide:Wallet");
  const [currency, setCurrency] = useState("EUR");
  const [submitting, setSubmitting] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customCurrency, setCustomCurrency] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Inserisci il nome del conto");
      return;
    }

    if (!currency) {
      toast.error("Seleziona una valuta");
      return;
    }

    try {
      setSubmitting(true);
      await api.accounts.create({
        name: name.trim(),
        icon,
        currency
      });

      toast.success("Conto creato con successo!");
      
      // Reset form
      setName("");
      setIcon("lucide:Wallet");
      setCurrency("EUR");
      
      onSuccess();
    } catch (err: any) {
      console.error("Failed to create account:", err);
      toast.error(err.response?.data?.message || "Errore nella creazione del conto");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomCurrency = () => {
    if (customCurrency.length === 3) {
      setCurrency(customCurrency.toUpperCase());
      setCustomDialogOpen(false);
      setCustomCurrency("");
    } else {
      toast.error("La valuta deve essere di 3 caratteri");
    }
  };

  return (
    <div className="space-y-4">
      {/* Name Input */}
      <TextInput
        value={name}
        onChange={setName}
        placeholder="Es: Conto Principale, Risparmi..."
        icon={Wallet}
        label="Nome Conto"
        maxLength={50}
      />

      {/* Icon Selector */}
      <IconSelector
        selectedIcon={icon}
        onSelect={setIcon}
        iconSet="account"
      />

      {/* Currency Selector */}
      <div>
        <label className="text-xs text-muted-foreground mb-3 block font-medium">
          Seleziona Valuta
        </label>
        <GlassCard className="p-4">
          <div className="flex flex-wrap gap-2">
            {mainCurrencies.map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  currency === curr
                    ? "gradient-blue text-white ring-2 ring-white/30"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                {curr}
              </button>
            ))}
            <button
              onClick={() => setCustomDialogOpen(true)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                !mainCurrencies.includes(currency)
                  ? "gradient-blue text-white ring-2 ring-white/30"
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              {!mainCurrencies.includes(currency) ? currency : <Plus className="w-4 h-4" />}
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Submit Button */}
      <Button 
        onClick={handleCreate} 
        disabled={submitting}
        className="w-full h-12 rounded-2xl gradient-blue text-white font-semibold shadow-lg"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Creazione...
          </>
        ) : (
          "Crea Conto"
        )}
      </Button>

      {/* Custom Currency Dialog */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Valuta Personalizzata</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
                Codice Valuta (3 lettere)
              </label>
              <input
                type="text"
                value={customCurrency}
                onChange={(e) => setCustomCurrency(e.target.value.toUpperCase())}
                placeholder="Es: JPY, CAD"
                maxLength={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base uppercase focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setCustomDialogOpen(false);
                  setCustomCurrency("");
                }} 
                variant="outline"
                className="flex-1"
              >
                Annulla
              </Button>
              <Button 
                onClick={handleCustomCurrency}
                className="flex-1 gradient-blue text-white"
                disabled={customCurrency.length !== 3}
              >
                Conferma
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

