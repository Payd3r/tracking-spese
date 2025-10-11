import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Account } from "@/types/api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ManageAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<number | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("lucide:Wallet");
  const [currency, setCurrency] = useState("EUR");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.accounts.getAll();
      setAccounts(response.data);
    } catch (err: any) {
      console.error("Failed to load accounts:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento dei conti");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name) {
      toast.error("Inserisci il nome del conto");
      return;
    }

    try {
      setSubmitting(true);
      await api.accounts.create({
        name,
        icon,
        currency
      });

      toast.success("Conto creato con successo!");
      setDialogOpen(false);
      setName("");
      setIcon("lucide:Wallet");
      setCurrency("EUR");
      loadAccounts();
    } catch (err: any) {
      console.error("Failed to create account:", err);
      toast.error(err.response?.data?.message || "Errore nella creazione del conto");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;

    try {
      await api.accounts.delete(accountToDelete);
      toast.success("Conto eliminato con successo!");
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
      loadAccounts();
    } catch (err: any) {
      console.error("Failed to delete account:", err);
      toast.error(err.response?.data?.message || "Errore nell'eliminazione del conto");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/settings" className="p-2 glass-card rounded-2xl">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Gestione Conti</h1>
      </div>

      {/* Add Account Button */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full mb-6 gap-2">
            <Plus className="w-5 h-5" />
            Aggiungi Conto
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo Conto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es: Conto Principale"
              />
            </div>
            <div>
              <Label htmlFor="icon">Icona (Lucide)</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Es: lucide:Wallet"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formato: lucide:NomeIcona (es: lucide:Wallet, lucide:CreditCard)
              </p>
            </div>
            <div>
              <Label htmlFor="currency">Valuta</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="EUR"
                maxLength={3}
              />
            </div>
            <Button onClick={handleCreate} disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creazione...
                </>
              ) : (
                "Crea Conto"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <GlassCard className="p-6 text-center">
          <p className="text-muted-foreground">Nessun conto disponibile</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <GlassCard key={account.id} className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-blue flex items-center justify-center">
                    <IconRenderer icon={account.icon} size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{account.name}</h3>
                    <p className="text-2xl font-bold mt-1">
                      {account.currency} {account.balance.toFixed(2)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setAccountToDelete(account.id);
                    setDeleteDialogOpen(true);
                  }}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo conto? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
