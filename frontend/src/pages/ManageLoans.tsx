import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { BottomSheet } from "@/components/BottomSheet";
import { LoanForm } from "@/components/forms/LoanForm";
import { RepaymentForm } from "@/components/forms/RepaymentForm";
import { ArrowLeft, Plus, Trash2, Loader2, X, CheckCircle2, ArrowDownLeft, Eye, Calendar, Wallet } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Loan, LoanDetail } from "@/types/api";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useSync } from "@/contexts/SyncContext";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { addPendingLoanOperation } from "@/lib/sync";
import { useAuth } from "@/contexts/AuthContext";
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

export default function ManageLoans() {
  const location = useLocation();
  const { isFullyOnline } = useSync();
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<number | null>(null);
  const [loanToClose, setLoanToClose] = useState<Loan | null>(null);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [repaymentSheetOpen, setRepaymentSheetOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [expandedLoan, setExpandedLoan] = useState<number | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [loanDetail, setLoanDetail] = useState<LoanDetail | null>(null);

  useEffect(() => {
    loadLoans();
  }, []);

  // Ricarica i prestiti quando si torna alla pagina
  useEffect(() => {
    if (location.pathname === '/settings/loans') {
      loadLoans();
    }
  }, [location.pathname]);

  const loadLoans = async () => {
    try {
      setLoading(true);
      
      // SEMPRE caricare dalla cache prima
      const cachedLoans = await db.cachedLoans
        .where('status')
        .equals('active')
        .toArray();
      
      // Mostrare subito i dati dalla cache
      setLoans(cachedLoans);
      setLoading(false);
      
      // POI, se online E server raggiungibile, aggiornare in background
      if (isFullyOnline) {
        try {
          const response = await api.loans.getAll({ status: 'active' });
          const loansData = Array.isArray(response.data.loans) ? response.data.loans : [];
          
          // Aggiornare cache
          await db.cachedLoans.bulkPut(loansData);
          
          // Aggiornare stato con dati freschi
          setLoans(loansData);
        } catch (err) {
          // Ignorare errori di rete - abbiamo già i dati dalla cache
          console.log("Background refresh failed, using cached data");
        }
      }
    } catch (err: any) {
      console.error("Failed to load loans:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento dei prestiti");
      setLoans([]);
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!loanToDelete) return;

    try {
      if (!isFullyOnline) {
        const userId = user?.id;
        if (!userId) {
          toast.error("Utente non autenticato");
          return;
        }
        await addPendingLoanOperation(userId, {
          type: 'delete',
          loanId: loanToDelete,
          data: { loanId: loanToDelete },
          timestamp: new Date().toISOString()
        });
        await db.cachedLoans.delete(loanToDelete);
        await db.cachedLoanRepayments.where('loanId').equals(loanToDelete).delete();
        toast.success("Prestito eliminato offline! Verrà sincronizzato appena possibile.");
      } else {
        await api.loans.delete(loanToDelete);
        toast.success("Prestito eliminato con successo!");
      }
      setDeleteDialogOpen(false);
      setLoanToDelete(null);
      setDetailSheetOpen(false);
      loadLoans();
    } catch (err: any) {
      console.error("Failed to delete loan:", err);
      toast.error(err.response?.data?.message || "Errore nell'eliminazione del prestito");
    }
  };

  const handleClose = async () => {
    if (!loanToClose) return;

    try {
      if (!isFullyOnline) {
        const userId = user?.id;
        if (!userId) {
          toast.error("Utente non autenticato");
          return;
        }
        await addPendingLoanOperation(userId, {
          type: 'close',
          loanId: loanToClose.id,
          data: { loanId: loanToClose.id },
          timestamp: new Date().toISOString()
        });
        await db.cachedLoans.update(loanToClose.id, { status: 'closed', pendingAction: 'close' });
        toast.success("Chiusura prestito salvata offline, sarà sincronizzata.");
      } else {
        const response = await api.loans.close(loanToClose.id);
        const remaining = response.data.remainingAmount || 0;
        const overpaid = response.data.overpaidAmount || 0;
        toast.success(
          remaining > 0 
            ? `Prestito chiuso! Residuo non restituito: ${loanToClose.currency} ${remaining.toFixed(2)}`
            : overpaid > 0
              ? `Prestito chiuso! Guadagno registrato: ${loanToClose.currency} ${overpaid.toFixed(2)}`
            : "Prestito chiuso con successo!"
        );
      }
      setCloseDialogOpen(false);
      setLoanToClose(null);
      setDetailSheetOpen(false);
      loadLoans();
    } catch (err: any) {
      console.error("Failed to close loan:", err);
      toast.error(err.response?.data?.message || "Errore nella chiusura del prestito");
    }
  };

  const handleLoanCreated = () => {
    setCreateSheetOpen(false);
    loadLoans();
  };

  const handleRepaymentCreated = () => {
    setRepaymentSheetOpen(false);
    setSelectedLoan(null);
    // Reload detail if detail sheet is open
    if (loanDetail) {
      loadLoanDetail(loanDetail.id).then((detail) => {
        if (detail) {
          setLoanDetail({ ...loanDetail, ...detail } as LoanDetail);
        }
      });
    }
    loadLoans();
  };

  const handleAddRepayment = (loan: Loan) => {
    setSelectedLoan(loan);
    setRepaymentSheetOpen(true);
  };

  const getRemainingAmount = (loan: Loan) => {
    return (loan.amount || 0) - (loan.totalRepaid || 0);
  };

  const loadLoanDetail = async (loanId: number) => {
    try {
      if (!isFullyOnline) {
        const cached = await db.cachedLoans.get(loanId);
        if (cached) {
          const repayments = await db.cachedLoanRepayments.where('loanId').equals(loanId).toArray();
          return { ...cached, repayments, totalRepaid: cached.totalRepaid || 0 } as LoanDetail;
        }
        throw new Error("Offline: dettagli non disponibili");
      }

      const response = await api.loans.getOne(loanId);
      const detail = response.data;
      
      // Update loan in state with repayments
      setLoans(prevLoans => 
        prevLoans.map(loan => 
          loan.id === loanId 
            ? { ...loan, ...detail } as Loan
            : loan
        )
      );
      
      // Update cache
      await db.cachedLoans.put(detail);
      if (detail.repayments) {
        await db.cachedLoanRepayments.bulkPut(detail.repayments);
      }
      
      return detail;
    } catch (err: any) {
      console.error("Failed to load loan detail:", err);
      toast.error("Errore nel caricamento dei dettagli del prestito");
      return null;
    }
  };

  const handleViewLoan = async (loan: Loan) => {
    const detail = await loadLoanDetail(loan.id);
    if (detail) {
      setLoanDetail({ ...loan, ...detail } as LoanDetail);
      setDetailSheetOpen(true);
    }
  };

  const handleCloseFromDetail = () => {
    if (!loanDetail) return;
    setLoanToClose(loanDetail);
    setDetailSheetOpen(false);
    setCloseDialogOpen(true);
  };

  const handleDeleteFromDetail = () => {
    if (!loanDetail) return;
    setLoanToDelete(loanDetail.id);
    setDetailSheetOpen(false);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-3 pt-4 pb-28 max-w-md mx-auto md:max-w-5xl md:px-8 md:py-8">
      {/* Mobile-only Header */}
      <div className="flex items-center gap-3 mb-5 md:hidden">
        <Link to="/settings" className="p-1.5 glass-card rounded-2xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Gestione Prestiti</h1>
      </div>

      {/* Control Bar (Title & Add Button) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="hidden md:block">
          <h2 className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">I tuoi prestiti attivi</h2>
        </div>
        <Button 
          onClick={() => setCreateSheetOpen(true)}
          className="gap-2 h-10 px-5 sm:w-auto w-full font-semibold shrink-0 shadow-strong pill-active"
        >
          <Plus className="w-4 h-4" />
          Nuovo Prestito
        </Button>
      </div>

      {/* Loans List Grid */}
      {loans.length === 0 ? (
        <GlassCard className="p-6 text-center mb-4">
          <p className="text-sm text-muted-foreground">Nessun prestito attivo al momento</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {loans.map((loan) => {
            const remaining = getRemainingAmount(loan);
            
            return (
              <GlassCard key={loan.id} className="p-4 border border-white/10 hover:border-white/15 bg-white/5 transition-all flex flex-col justify-between h-full">
                <div className="space-y-3">
                  {/* Main Info */}
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-tight flex items-center justify-between gap-2">
                      <span className="truncate">{loan.note || loan.title}</span>
                      {loan.isPending && (
                        <span className="text-[9px] font-bold text-warning bg-warning/10 border border-warning/30 px-2 py-0.5 rounded-full shrink-0">
                          Pending sync
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center flex-wrap gap-1 text-[10px] text-muted-foreground mt-1">
                      <span>{loan.fromAccountName}</span>
                      <span>•</span>
                      <span>{loan.categoryName}</span>
                      <span>•</span>
                      <span>{format(new Date(loan.loanDate), 'dd MMM yyyy', { locale: it })}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Totale prestato:</span>
                      <span className="font-semibold text-white">{loan.currency} {loan.amount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Restituito:</span>
                      <span className="font-semibold text-green-400">{loan.currency} {(loan.totalRepaid || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-white/5 font-bold">
                      <span className="text-muted-foreground">Residuo:</span>
                      <span className={`${remaining > 0 ? 'text-warning' : 'text-green-400'}`}>
                        {loan.currency} {remaining.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 mt-3 border-t border-white/5">
                  <Button
                    onClick={() => handleAddRepayment(loan)}
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 h-8 text-xs font-semibold bg-transparent border-white/10 hover:bg-white/5 hover:text-white"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    Rientro
                  </Button>
                  <Button
                    onClick={() => handleViewLoan(loan)}
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 h-8 text-xs font-semibold bg-transparent border-white/10 hover:bg-white/5 hover:text-white"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Vedi Dettagli
                  </Button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Sei sicuro di voler eliminare questo prestito? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="m-0 text-sm">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="m-0 text-sm pill-active">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close Confirmation Dialog */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Chiudi prestito</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {loanToClose && getRemainingAmount(loanToClose) > 0 ? (
                <>
                  Chiudendo questo prestito, ci sono ancora{" "}
                  <strong>{loanToClose.currency} {getRemainingAmount(loanToClose).toFixed(2)}</strong>{" "}
                  non restituiti. Vuoi continuare?
                </>
              ) : loanToClose && getRemainingAmount(loanToClose) < 0 ? (
                <>
                  Chiudendo questo prestito, verrà registrata un'entrata di{" "}
                  <strong>{loanToClose.currency} {Math.abs(getRemainingAmount(loanToClose)).toFixed(2)}</strong>{" "}
                  come guadagno. Vuoi continuare?
                </>
              ) : (
                "Sei sicuro di voler chiudere questo prestito?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="m-0 text-sm">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} className="m-0 text-sm pill-active">Chiudi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Loan Bottom Sheet / Desktop Modal */}
      <BottomSheet
        isOpen={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        title="Nuovo Prestito"
      >
        <LoanForm onSuccess={handleLoanCreated} />
      </BottomSheet>

      {/* Add Repayment Bottom Sheet / Desktop Modal */}
      <BottomSheet
        isOpen={repaymentSheetOpen}
        onClose={() => {
          setRepaymentSheetOpen(false);
          setSelectedLoan(null);
        }}
        title="Nuova Restituzione"
      >
        {selectedLoan && <RepaymentForm loan={selectedLoan} onSuccess={handleRepaymentCreated} />}
      </BottomSheet>

      {/* Loan Detail Bottom Sheet / Desktop Modal */}
      <BottomSheet
        isOpen={detailSheetOpen}
        onClose={() => {
          setDetailSheetOpen(false);
          setLoanDetail(null);
        }}
        title="Dettaglio Prestito"
      >
        {loanDetail && (
          <div className="space-y-4">
            {/* Header */}
            <div>
              <h2 className="text-lg font-bold mb-1 text-white leading-tight">{loanDetail.note || loanDetail.title}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{loanDetail.fromAccountName}</span>
                <span>•</span>
                <span>{loanDetail.categoryName}</span>
                <span>•</span>
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span>{format(new Date(loanDetail.loanDate), 'dd MMM yyyy', { locale: it })}</span>
              </div>
            </div>

            {/* Summary */}
            <GlassCard className="p-4 border border-white/10 bg-white/5 shadow-strong">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Totale prestato</span>
                  <span className="text-sm font-bold text-white">{loanDetail.currency} {loanDetail.amount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Restituito</span>
                  <span className="text-sm font-bold text-green-400">{loanDetail.currency} {(loanDetail.totalRepaid || 0).toFixed(2)}</span>
                </div>
                <div className="pt-2.5 border-t border-white/5 flex justify-between items-center text-sm font-bold">
                  <span className="text-white">Residuo</span>
                  <span className={`${getRemainingAmount(loanDetail) > 0 ? 'text-warning' : 'text-green-400'}`}>
                    {loanDetail.currency} {getRemainingAmount(loanDetail).toFixed(2)}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Repayments List */}
            {loanDetail.repayments && loanDetail.repayments.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wider">Storico Restituzioni</h3>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {loanDetail.repayments.map((repayment) => (
                    <GlassCard key={repayment.id} className="p-3 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs text-white mb-1 truncate">{repayment.description || 'Restituzione'}</div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Wallet className="w-3 h-3" />
                            <span className="truncate">{repayment.toAccountName}</span>
                            <span>•</span>
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(repayment.repaymentDate), 'dd MMM yyyy', { locale: it })}</span>
                          </div>
                        </div>
                        <div className="font-bold text-xs text-green-400 shrink-0 ml-2">
                          + {repayment.currency} {repayment.amount.toFixed(2)}
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            )}

            {(!loanDetail.repayments || loanDetail.repayments.length === 0) && (
              <GlassCard className="p-5 text-center border border-white/5 bg-white/5">
                <p className="text-xs text-muted-foreground">Nessuna restituzione registrata</p>
              </GlassCard>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-white/5">
              <Button
                onClick={() => {
                  setDetailSheetOpen(false);
                  handleAddRepayment(loanDetail);
                }}
                className="w-full gap-2 h-10 font-semibold"
                variant="outline"
              >
                <ArrowDownLeft className="w-4 h-4" />
                Aggiungi Restituzione
              </Button>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleCloseFromDetail}
                  className="flex-1 gap-2 h-10 font-semibold pill-active shadow-strong"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Chiudi Prestito
                </Button>
                <Button
                  onClick={handleDeleteFromDetail}
                  variant="destructive"
                  className="gap-2 h-10 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-white transition-all shrink-0 px-3 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

