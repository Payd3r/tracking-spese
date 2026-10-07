import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { BottomSheet } from "@/components/BottomSheet";
import { AccountForm } from "@/components/forms/AccountForm";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CardListSkeleton } from "@/components/skeletons/CardListSkeleton";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Account } from "@/types/api";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useSync } from "@/contexts/SyncContext";
import { db } from "@/lib/db";
import { useBottomNavPadding } from "@/hooks/useBottomNavPadding";
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
  const { isFullyOnline } = useSync();
  const { ref, style } = useBottomNavPadding();
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

      // SEMPRE caricare dalla cache prima
      const cachedAccounts = await db.cachedAccounts.toArray();

      // Mostrare subito i dati dalla cache
      setAccounts(cachedAccounts);
      setLoading(false);

      // POI, se online E server raggiungibile, aggiornare in background
      if (isFullyOnline) {
        try {
          const response = await api.accounts.getAll();
          const accountsData = Array.isArray(response.data.accounts) ? response.data.accounts : [];

          // Aggiornare cache
          await db.cachedAccounts.bulkPut(accountsData);

          // Aggiornare stato con dati freschi
          setAccounts(accountsData);
        } catch (err) {
          // Ignorare errori di rete - abbiamo già i dati dalla cache
          console.log("Background refresh failed, using cached data");
        }
      }
    } catch (err: any) {
      console.error("Failed to load accounts:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento dei conti");
      setAccounts([]);
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

  return (
    <div ref={ref} style={style} className="px-3 pt-4 pb-28 max-w-md mx-auto md:max-w-5xl md:px-8 md:py-8">
      {/* Mobile-only Header */}
      <div className="flex items-center gap-3 mb-5 md:hidden">
        <Link to="/settings" className="p-1.5 glass-card rounded-2xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Gestione Conti</h1>
      </div>

      {/* Responsive Title & Add Button Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="hidden md:block">
          <h2 className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">I tuoi conti attivi</h2>
        </div>
        <Button
          onClick={() => setCreateSheetOpen(true)}
          className="gap-2 h-10 px-5 sm:w-auto w-full font-semibold shrink-0 shadow-strong pill-active"
        >
          <Plus className="w-4 h-4" />
          Aggiungi Conto
        </Button>
      </div>

      {/* Accounts List Grid */}
      {loading && accounts.length === 0 ? (
        <CardListSkeleton variant="list" />
      ) : accounts.length === 0 ? (
        <GlassCard className="p-6 text-center mb-4">
          <p className="text-sm text-muted-foreground">Nessun conto disponibile</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {accounts.map((account) => (
            <GlassCard key={account.id} className="p-4 border border-white/10 hover:border-white/15 bg-white/5 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center border border-white/5 shrink-0">
                    <IconRenderer icon={account.icon} size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-tight">{account.name}</h3>
                    <p className={`text-lg font-extrabold mt-0.5 ${account.balance === 0 ? 'text-white' : account.balance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {account.balance > 0 ? '+ ' : account.balance < 0 ? '- ' : ''}{formatCurrency(Math.abs(account.balance))} €
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAccountToDelete(account.id);
                    setDeleteDialogOpen(true);
                  }}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all text-muted-foreground hover:text-red-400 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
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
            <AlertDialogTitle className="text-base font-bold">Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Sei sicuro di voler eliminare questo conto? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="m-0 text-sm">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="m-0 text-sm pill-active">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Account Bottom Sheet / Desktop Modal */}
      <AccountForm
        isOpen={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        onSuccess={handleAccountCreated}
      />
    </div>
  );
}

