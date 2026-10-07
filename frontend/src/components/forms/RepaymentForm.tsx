import { GlassCard } from "@/components/GlassCard";
import { AmountInput } from "@/components/AmountInput";
import { MobileDateInput } from "@/components/MobileDateInput";
import { TextInput } from "@/components/TextInput";
import { BottomSheet } from "@/components/BottomSheet";
import { Wallet, Loader2, User, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Account, Loan } from "@/types/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSync } from "@/contexts/SyncContext";
import { db } from "@/lib/db";
import { addPendingLoanOperation } from "@/lib/sync";
import { useAuth } from "@/contexts/AuthContext";

interface RepaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
  onSuccess: () => void;
}

export function RepaymentForm({ isOpen, onClose, loan, onSuccess }: RepaymentFormProps) {
  const { isFullyOnline } = useSync();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [repaymentDate, setRepaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  const loadAccounts = async () => {
    try {
      setLoading(true);

      const cachedAccounts = await db.cachedAccounts.toArray();
      setAccounts(cachedAccounts);

      if (cachedAccounts.length > 0 && selectedAccount === null) {
        setSelectedAccount(cachedAccounts[0].id);
      }

      setLoading(false);

      if (isFullyOnline) {
        try {
          const accountsResponse = await api.accounts.getAll();
          const accountsData = Array.isArray(accountsResponse.data.accounts)
            ? accountsResponse.data.accounts
            : [];

          await db.cachedAccounts.bulkPut(accountsData);
          setAccounts(accountsData);
        } catch {
          console.log("Background refresh failed, using cached data");
        }
      }
    } catch (err: any) {
      console.error("Failed to load accounts:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento dei conti");
      setLoading(false);
    }
  };

  const currency = loan.currency;
  const remainingAmount = (loan.amount || 0) - (loan.totalRepaid || 0);

  const handleCreate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Inserisci un importo valido");
      return;
    }

    const repaymentAmount = parseFloat(amount);

    if (!selectedAccount) {
      toast.error("Seleziona un conto");
      return;
    }

    const payload = {
      amount: repaymentAmount,
      currency,
      toAccountId: selectedAccount!,
      repaymentDate: new Date(repaymentDate).toISOString(),
      description: description.trim() || undefined,
    };

    const treatAsOffline = !isFullyOnline || loan.isPending === true || loan.id < 0;

    const saveRepaymentOffline = async () => {
      const userId = user?.id;
      if (!userId) {
        toast.error("Utente non autenticato");
        return false;
      }
      const tempId = -Date.now();
      await addPendingLoanOperation(userId, {
        type: "repayment",
        loanId: loan.id,
        data: { ...payload, tempId, loanId: loan.id },
        timestamp: new Date().toISOString(),
      });
      await db.cachedLoanRepayments.put({
        id: tempId,
        loanId: loan.id,
        ...payload,
        createdAt: new Date().toISOString(),
        isPending: true,
      });
      await db.cachedLoans.update(loan.id, {
        totalRepaid: (loan.totalRepaid || 0) + repaymentAmount,
      });
      toast.success("Restituzione salvata offline! Verrà sincronizzata quando torni online.");
      return true;
    };

    try {
      setSubmitting(true);

      if (treatAsOffline) {
        const ok = await saveRepaymentOffline();
        if (!ok) return;
      } else {
        if (selectedAccount == null || selectedAccount <= 0) {
          toast.error(
            "Il conto non risulta ancora sincronizzato. Attendi la sincronizzazione o apri l'app da rete stabile, poi riprova."
          );
          return;
        }
        try {
          await api.loans.addRepayment(loan.id, payload);
          toast.success("Restituzione aggiunta con successo!");
        } catch (apiError: any) {
          const isNetworkOrServer = !apiError.response || apiError.response.status >= 500;
          if (isNetworkOrServer) {
            console.warn("addRepayment fallita, accodo in offline:", apiError);
            const ok = await saveRepaymentOffline();
            if (!ok) {
              toast.error("Connessione instabile e impossibile salvare in locale. Riprova.");
            }
          } else {
            throw apiError;
          }
        }
      }

      setAmount("");
      setDescription("");
      setRepaymentDate(format(new Date(), "yyyy-MM-dd"));
      onSuccess();
    } catch (err: any) {
      console.error("Failed to add repayment:", err);
      const apiMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : null);
      toast.error(apiMsg || "Errore nell'aggiunta della restituzione");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      header={
        <div className="pb-3 border-b border-white/10 flex items-center">
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-bold text-white tracking-tight">Nuova Restituzione</h2>
          </div>
        </div>
      }
      footer={
        <Button
          onClick={handleCreate}
          disabled={submitting || loading || !amount || parseFloat(amount) <= 0}
          size="lg"
          className="w-full h-12 pill-active text-sm font-bold rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Aggiunta...
            </span>
          ) : (
            "Aggiungi Restituzione"
          )}
        </Button>
      }
    >
      <div className="py-4 space-y-4">
        {/* Loan Info */}
        <GlassCard className="p-4">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Prestito</div>
            <div className="font-semibold text-sm">{loan.title}</div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Totale prestato:</span>
              <span className="font-medium">
                {loan.currency} {loan.amount?.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Restituito:</span>
              <span className="font-medium">
                {loan.currency} {(loan.totalRepaid || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs pt-2 border-t border-white/5">
              <span className="text-muted-foreground">Residuo:</span>
              <span className={`font-bold ${remainingAmount > 0 ? "text-warning" : "text-green-400"}`}>
                {loan.currency} {remainingAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </GlassCard>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Amount Input */}
            <AmountInput value={amount} onChange={setAmount} currency={currency} />

            {/* Account Selector */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block font-medium">
                Conto di Destinazione
              </label>
              <div className="space-y-1.5">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedAccount(account.id)}
                    className={`w-full p-3 flex items-center gap-3 transition-all rounded-2xl interactive-press ${
                      selectedAccount === account.id ? "pill-active" : "glass-card"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{account.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {account.currency} {account.balance.toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Input */}
            <MobileDateInput
              value={repaymentDate}
              onChange={setRepaymentDate}
              label="Data Restituzione"
            />

            {/* Description Input */}
            <TextInput
              value={description}
              onChange={setDescription}
              placeholder="Es: Restituito da Mario..."
              icon={User}
              label="Descrizione (opzionale)"
              maxLength={255}
            />
          </>
        )}
      </div>
    </BottomSheet>
  );
}
