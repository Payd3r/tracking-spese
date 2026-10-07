import React, { useState, useEffect } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { AmountInput } from "@/components/AmountInput";
import { MobileDateInput } from "@/components/MobileDateInput";
import { NoteInput } from "@/components/NoteInput";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { Trash2, ChevronDown, ChevronUp, Loader2, WifiOff } from "lucide-react";
import { api } from "@/lib/api";
import { Transaction, Account, Category } from "@/types/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSync } from "@/contexts/SyncContext";
import { db } from "@/lib/db";
import { addPendingDelete, addPendingUpdate } from "@/lib/sync";
import { useAuth } from "@/contexts/AuthContext";
import { isVisibleTransactionCategory, sortCategoriesByUsage } from "@/lib/cacheManager";
import { useBottomSheet } from "@/contexts/BottomSheetContext";

export function TransactionDetailSheet() {
  const { selectedTransactionId, closeTransactionDetail } = useBottomSheet();
  const { isFullyOnline } = useSync();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Form states
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  useEffect(() => {
    if (selectedTransactionId) {
      loadTransaction(selectedTransactionId);
    } else {
      setTransaction(null);
      setCategoriesExpanded(false);
    }
  }, [selectedTransactionId]);

  const loadTransaction = async (numericId: number) => {
    try {
      setLoading(true);

      // 1) Prova a caricare prima dalla cache
      const cachedTx = await db.cachedTransactions.get(numericId);

      if (cachedTx) {
        const txn = cachedTx as unknown as Transaction;
        setTransaction(txn);
        setAmount(txn.amount.toString());
        setSelectedCategory(txn.categoryId);
        setSelectedAccount(txn.accountId);
        setDate(format(new Date(txn.transactionDate), "yyyy-MM-dd"));
        setNote(txn.note || "");

        const [cachedCategories, cachedAccounts] = await Promise.all([
          db.cachedCategories.where("type").equals(txn.type).toArray(),
          db.cachedAccounts.toArray(),
        ]);

        setCategories(sortCategoriesByUsage(cachedCategories as unknown as Category[]));
        setAccounts(cachedAccounts as unknown as Account[]);
      }

      if (!cachedTx && !isFullyOnline) {
        toast.error("Transazione non disponibile offline");
        closeTransactionDetail();
        return;
      }

      // 2) Se online, aggiorna da API
      if (isFullyOnline) {
        const response = await api.transactions.getOne(numericId);
        const txn = response.data as Transaction;
        setTransaction(txn);
        setAmount(txn.amount.toString());
        setSelectedCategory(txn.categoryId);
        setSelectedAccount(txn.accountId);
        setDate(format(new Date(txn.transactionDate), "yyyy-MM-dd"));
        setNote(txn.note || "");

        const [categoriesRes, accountsRes] = await Promise.all([
          api.categories.getAll(txn.type),
          api.accounts.getAll(),
        ]);

        const categoriesData = sortCategoriesByUsage(
          Array.isArray(categoriesRes.data.categories) ? categoriesRes.data.categories : []
        );
        const accountsData = Array.isArray((accountsRes.data as any).accounts)
          ? (accountsRes.data as any).accounts
          : Array.isArray(accountsRes.data)
          ? (accountsRes.data as any)
          : [];

        setCategories(categoriesData);
        setAccounts(accountsData);

        const userId = user?.id;
        await db.cachedTransactions.put({
          ...(txn as any),
          ...(userId ? { userId } : {}),
        });
        await db.cachedCategories.bulkPut(categoriesData as any);
        await db.cachedAccounts.bulkPut(accountsData as any);
      }
    } catch (err: any) {
      console.error("Failed to load transaction:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento della transazione");
      closeTransactionDetail();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!transaction || !selectedTransactionId) return;

    if (!amount || parseFloat(amount) <= 0 || !selectedCategory || !selectedAccount) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    try {
      setSubmitting(true);
      const selectedCategoryData = categories.find((c) => c.id === selectedCategory);
      const title = selectedCategoryData
        ? `${transaction.type === "income" ? "Entrata" : "Uscita"} - ${selectedCategoryData.name}`
        : transaction.type === "income"
        ? "Entrata"
        : "Uscita";

      const payload = {
        title,
        amount: parseFloat(amount),
        categoryId: selectedCategory!,
        accountId: selectedAccount!,
        transactionDate: new Date(date).toISOString(),
        note: note || undefined,
      };

      const selectedAccountData = accounts.find((a) => a.id === selectedAccount);

      if (!isFullyOnline) {
        await addPendingUpdate("transaction", transaction.id, payload);

        const updatedTransaction: Transaction = {
          ...transaction,
          ...payload,
          accountName: selectedAccountData?.name || transaction.accountName,
          accountCurrency: selectedAccountData?.currency || transaction.accountCurrency,
          categoryName: selectedCategoryData?.name || transaction.categoryName,
          categoryIcon: selectedCategoryData?.icon || transaction.categoryIcon,
          categoryColor: selectedCategoryData?.color || transaction.categoryColor,
          updatedAt: new Date().toISOString(),
        };

        const existing: any = transaction as any;
        await db.cachedTransactions.put({
          ...existing,
          ...updatedTransaction,
          userId: existing.userId,
        });

        toast.success("Transazione aggiornata offline! Verrà sincronizzata quando torni online.");
      } else {
        const response = await api.transactions.update(selectedTransactionId, payload);
        const apiTx = response.data as Transaction | undefined;

        const mergedTx: Transaction = apiTx
          ? apiTx
          : {
              ...transaction,
              ...payload,
              accountName: selectedAccountData?.name || transaction.accountName,
              accountCurrency: selectedAccountData?.currency || transaction.accountCurrency,
              categoryName: selectedCategoryData?.name || transaction.categoryName,
              categoryIcon: selectedCategoryData?.icon || transaction.categoryIcon,
              categoryColor: selectedCategoryData?.color || transaction.categoryColor,
              updatedAt: new Date().toISOString(),
            };

        const existing: any = transaction as any;
        await db.cachedTransactions.put({
          ...existing,
          ...mergedTx,
          userId: existing.userId,
        });

        toast.success("Transazione aggiornata con successo!");
      }

      window.dispatchEvent(new Event("transactionUpdated"));
      closeTransactionDetail();
    } catch (err: any) {
      console.error("Failed to update transaction:", err);
      toast.error(err.response?.data?.message || "Errore nell'aggiornamento della transazione");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction || !selectedTransactionId) return;

    try {
      setSubmitting(true);
      if (!isFullyOnline) {
        await addPendingDelete("transaction", selectedTransactionId);
        await db.cachedTransactions.delete(transaction.id);
        toast.success("Transazione eliminata offline! Verrà sincronizzata quando torni online.");
      } else {
        await api.transactions.delete(selectedTransactionId);
        await db.cachedTransactions.delete(transaction.id);
        toast.success("Transazione eliminata con successo!");
      }

      window.dispatchEvent(new Event("transactionUpdated"));
      setDeleteDialogOpen(false);
      closeTransactionDetail();
    } catch (err: any) {
      console.error("Failed to delete transaction:", err);
      toast.error(err.response?.data?.message || "Errore nell'eliminazione della transazione");
    } finally {
      setSubmitting(false);
    }
  };

  const isOpen = selectedTransactionId !== null;

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={closeTransactionDetail}
        header={
          <div className="pb-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {transaction && (
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <IconRenderer icon={transaction.categoryIcon || "lucide:Tag"} size={18} />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white tracking-tight truncate">
                  Dettaglio Transazione
                </h2>
                {transaction && (
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {transaction.type === "income" ? "Entrata" : "Uscita"} · {transaction.accountName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                className="p-2 rounded-xl text-red-400 hover:text-white hover:bg-red-500/20 transition-colors"
                aria-label="Elimina transazione"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
        footer={
          <Button
            onClick={handleUpdate}
            disabled={submitting || loading}
            size="lg"
            className="w-full h-12 pill-active text-sm font-bold rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvataggio...
              </span>
            ) : (
              "Salva Modifiche"
            )}
          </Button>
        }
      >
        <div className="py-4 space-y-4">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : transaction ? (
            <>
              {/* Amount Input */}
              <AmountInput
                value={amount}
                onChange={setAmount}
                currency={
                  selectedAccount
                    ? accounts.find((a) => a.id === selectedAccount)?.currency || "EUR"
                    : "EUR"
                }
                type={transaction.type}
              />

              {/* Date */}
              <MobileDateInput value={date} onChange={setDate} />

              {/* Category */}
              <GlassCard className="p-4">
                <label className="text-xs text-muted-foreground mb-2 block font-medium">Categoria</label>
                {(() => {
                  const filteredCategories = sortCategoriesByUsage(
                    categories.filter(isVisibleTransactionCategory)
                  );
                  const visibleCategories = categoriesExpanded
                    ? filteredCategories
                    : filteredCategories.slice(0, 8);
                  const hasMoreCategories = filteredCategories.length > 8;

                  return (
                    <>
                      <div className="grid grid-cols-4 gap-2">
                        {visibleCategories.map((category) => {
                          const isSelected = selectedCategory === category.id;
                          return (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => setSelectedCategory(category.id)}
                              className={`p-2.5 flex flex-col items-center gap-1.5 transition-all rounded-xl interactive-press ${
                                isSelected ? "pill-active" : "glass-card"
                              }`}
                            >
                              <IconRenderer icon={category.icon} size={22} />
                              <span className="text-[10px] font-medium leading-tight text-center truncate w-full">
                                {category.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {hasMoreCategories && (
                        <button
                          type="button"
                          onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                          className="w-full mt-3 glass-card p-2.5 flex items-center justify-center gap-1.5 text-xs font-medium transition-all hover:bg-white/10 interactive-press"
                        >
                          {categoriesExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              Mostra meno
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              Mostra tutte ({filteredCategories.length - 8} altre)
                            </>
                          )}
                        </button>
                      )}
                    </>
                  );
                })()}
              </GlassCard>

              {/* Account */}
              <GlassCard className="p-4">
                <label className="text-xs text-muted-foreground mb-2 block font-medium">Conto</label>
                <div className="grid grid-cols-4 gap-2">
                  {accounts.map((acc) => {
                    const isSelected = selectedAccount === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setSelectedAccount(acc.id)}
                        className={`p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all rounded-xl interactive-press ${
                          isSelected ? "pill-active" : "glass-card"
                        }`}
                      >
                        <IconRenderer icon={acc.icon} size={22} />
                        <span className="text-[10px] font-medium leading-tight text-center truncate w-full">
                          {acc.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Note */}
              <NoteInput value={note} onChange={setNote} placeholder="Note opzionali..." />

              {!isFullyOnline && (
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2 text-warning text-xs">
                  <WifiOff className="w-4 h-4 shrink-0" />
                  <span>Modalità offline: le modifiche verranno sincronizzate alla riconnessione.</span>
                </div>
              )}
            </>
          ) : null}
        </div>
      </BottomSheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Sei sicuro di voler eliminare questa transazione? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="m-0 text-sm">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="m-0 text-sm pill-active">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
