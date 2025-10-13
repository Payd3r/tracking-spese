import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { BottomSheet } from "@/components/BottomSheet";
import { AccountForm } from "@/components/forms/AccountForm";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  const location = useLocation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<number | null>(null);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  // Ricarica i conti quando si torna alla pagina
  useEffect(() => {
    if (location.pathname === '/settings/accounts') {
      loadAccounts();
    }
  }, [location.pathname]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.accounts.getAll();
      setAccounts(Array.isArray(response.data.accounts) ? response.data.accounts : []);
    } catch (err: any) {
      console.error("Failed to load accounts:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento dei conti");
      setAccounts([]);
    } finally {
      setLoading(false);
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

  const handleAccountCreated = () => {
    setCreateSheetOpen(false);
    loadAccounts();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-3 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/settings" className="p-1.5 glass-card rounded-2xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Gestione Conti</h1>
      </div>

      {/* Add Account Button */}
      <Button 
        onClick={() => setCreateSheetOpen(true)}
        className="w-full mb-4 gap-2 h-11"
      >
        <Plus className="w-4 h-4" />
        Aggiungi Conto
      </Button>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <GlassCard className="p-5 text-center">
          <p className="text-sm text-muted-foreground">Nessun conto disponibile</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <GlassCard key={account.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
                    <IconRenderer icon={account.icon} size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{account.name}</h3>
                    <p className="text-lg font-bold mt-0.5">
                      {account.currency} {account.balance.toFixed(2)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setAccountToDelete(account.id);
                    setDeleteDialogOpen(true);
                  }}
                  className="p-1.5 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
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
            <AlertDialogTitle className="text-base">Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Sei sicuro di voler eliminare questo conto? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="m-0 text-sm">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="m-0 text-sm">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Account Bottom Sheet */}
      <BottomSheet
        isOpen={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
      >
        <AccountForm onSuccess={handleAccountCreated} />
      </BottomSheet>
    </div>
  );
}
