import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { ArrowLeft, Calendar, FileText, Wallet, ChevronDown, ChevronUp, WifiOff } from "lucide-react";
import { MobileDateInput } from "@/components/MobileDateInput";
import { NoteText } from "@/components/NoteText";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Transaction, Account, Category } from "@/types/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { getCategoryStyle } from "@/utils/categoryColors";
import { formatCurrency } from "@/lib/utils";
import { useSync } from "@/contexts/SyncContext";
import { db } from "@/lib/db";
import { addPendingDelete, addPendingUpdate } from "@/lib/sync";
import { useAuth } from "@/contexts/AuthContext";
import { isVisibleTransactionCategory, sortCategoriesByUsage } from "@/lib/cacheManager";

// Convert currency code to symbol
const getCurrencySymbol = (code: string = "EUR"): string => {
  const symbols: Record<string, string> = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£',
    'JPY': '¥',
    'CHF': 'Fr',
    'CAD': 'C$',
    'AUD': 'A$',
    'CNY': '¥',
    'INR': '₹',
    'RUB': '₽',
    'BRL': 'R$',
    'ZAR': 'R',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'TRY': '₺',
    'MXN': '$',
    'AED': 'د.إ',
    'SAR': '﷼',
  };

  return symbols[code.toUpperCase()] || code;
};
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

export default function TransactionDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isFullyOnline, isOnline, isServerReachable } = useSync();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Edit form states
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  useEffect(() => {
    if (id) {
      loadTransaction();
    }
  }, [id]);
  const loadTransaction = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const numericId = parseInt(id);

      // 1) Prova a caricare prima dalla cache
      const cachedTx = await db.cachedTransactions.get(numericId);

      if (cachedTx) {
        const txn = cachedTx as unknown as Transaction;
        setTransaction(txn);

        // Set form values dalla cache
        setAmount(txn.amount.toString());
        setSelectedCategory(txn.categoryId);
        setSelectedAccount(txn.accountId);
        setDate(format(new Date(txn.transactionDate), "yyyy-MM-dd"));
        setNote(txn.note || "");

        // Carica categorie e conti dalla cache
        const [cachedCategories, cachedAccounts] = await Promise.all([
          db.cachedCategories.where("type").equals(txn.type).toArray(),
          db.cachedAccounts.toArray(),
        ]);

        setCategories(sortCategoriesByUsage(cachedCategories as unknown as Category[]));
        setAccounts(cachedAccounts as unknown as Account[]);
      }

      // Se non abbiamo nulla in cache e non siamo pienamente online, non possiamo procedere
      if (!cachedTx && !isFullyOnline) {
        toast.error("Transazione non disponibile offline");
        navigate(-1);
        return;
      }

      // 2) Se siamo pienamente online, aggiorna da API e refresh cache
      if (isFullyOnline) {
        const response = await api.transactions.getOne(numericId);
        const txn = response.data as Transaction;
        setTransaction(txn);

        // Aggiorna form con i dati più freschi
        setAmount(txn.amount.toString());
        setSelectedCategory(txn.categoryId);
        setSelectedAccount(txn.accountId);
        setDate(format(new Date(txn.transactionDate), "yyyy-MM-dd"));
        setNote(txn.note || "");

        // Load categories and accounts da API
        const [categoriesRes, accountsRes] = await Promise.all([
          api.categories.getAll(txn.type),
          api.accounts.getAll(),
        ]);

        const categoriesData = sortCategoriesByUsage(Array.isArray(categoriesRes.data.categories)
          ? categoriesRes.data.categories
          : []);
        const accountsData = Array.isArray((accountsRes.data as any).accounts)
          ? (accountsRes.data as any).accounts
          : Array.isArray(accountsRes.data)
            ? (accountsRes.data as any)
            : [];

        setCategories(categoriesData);
        setAccounts(accountsData);

        // Aggiorna cache
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
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!id || !transaction) return;

    try {
      // Generate automatic title from category name and type
      const selectedCategoryData = categories.find(c => c.id === selectedCategory);
      const title = selectedCategoryData
        ? `${transaction.type === 'income' ? 'Entrata' : 'Uscita'} - ${selectedCategoryData.name}`
        : transaction.type === 'income' ? 'Entrata' : 'Uscita';

      const payload = {
        title,
        amount: parseFloat(amount),
        categoryId: selectedCategory!,
        accountId: selectedAccount!,
        transactionDate: new Date(date).toISOString(),
        note: note || undefined,
      };

      const selectedAccountData = accounts.find(a => a.id === selectedAccount);

      if (!isFullyOnline) {
        // OFFLINE / SERVER NON RAGGIUNGIBILE: metti in coda e aggiorna cache + stato locale
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

        setTransaction(updatedTransaction);
        setIsEditing(false);
        toast.success("Transazione aggiornata offline! Verrà sincronizzata quando torni online.");
      } else {
        // ONLINE: aggiorna via API e poi cache
        const response = await api.transactions.update(parseInt(id), payload);
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

        setTransaction(mergedTx);
        setIsEditing(false);
        toast.success("Transazione aggiornata con successo!");
      }

      // Notifica il resto dell'app che i dati sono cambiati
      window.dispatchEvent(new Event("transactionUpdated"));
    } catch (err: any) {
      console.error("Failed to update transaction:", err);
      toast.error(err.response?.data?.message || "Errore nell'aggiornamento della transazione");
    }
  };

  const handleDelete = async () => {
    if (!id || !transaction) return;

    try {
      const numericId = parseInt(id);

      if (!isFullyOnline) {
        // OFFLINE / SERVER NON RAGGIUNGIBILE: metti in coda e rimuovi dalla cache
        await addPendingDelete("transaction", numericId);
        await db.cachedTransactions.delete(transaction.id);

        toast.success("Transazione eliminata offline! Verrà sincronizzata quando torni online.");
      } else {
        // ONLINE: elimina via API e poi dalla cache
        await api.transactions.delete(numericId);
        await db.cachedTransactions.delete(transaction.id);

        toast.success("Transazione eliminata con successo!");
      }

      // Notifica il resto dell'app che i dati sono cambiati
      window.dispatchEvent(new Event("transactionUpdated"));
      navigate("/");
    } catch (err: any) {
      console.error("Failed to delete transaction:", err);
      toast.error(err.response?.data?.message || "Errore nell'eliminazione della transazione");
    }
  };

  if (loading) {
    return (
      <div className="px-3 pt-4 pb-28 max-w-md mx-auto space-y-4">
        {/* Header Skeleton */}
        <div className="flex items-center gap-3 mb-5">
          <Skeleton className="w-8 h-8 rounded-2xl" />
          <Skeleton className="h-6 w-40 rounded-lg" />
        </div>

        {/* Type Badge Skeleton */}
        <GlassCard className="p-3 mb-4 flex justify-center">
          <Skeleton className="h-4 w-20" />
        </GlassCard>

        {/* Amount Skeleton */}
        <GlassCard className="p-4 mb-4">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-8 w-32" />
        </GlassCard>

        {/* Category Skeleton */}
        <GlassCard className="p-4 mb-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </GlassCard>

        {/* Account Skeleton */}
        <GlassCard className="p-4 mb-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p>Transazione non trovata</p>
      </div>
    );
  }

  return (
    <div className="px-3 pt-4 pb-28 max-w-md mx-auto md:max-w-4xl md:px-8 md:py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 glass-card rounded-2xl transition-colors hover:bg-white/10"
          aria-label="Torna indietro"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Dettaglio Transazione</h1>
      </div>

      {/* Main Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
        
        {/* Left Column: Core Fields (Amount, Type, Date, Note) */}
        <div className="space-y-4">
          
          {/* Status Indicator */}
          {!isFullyOnline && (
            <div className="glass-card tone-warning p-3 rounded-2xl flex items-center gap-2">
              {!isOnline ? (
                <>
                  <WifiOff className="w-4 h-4 text-warning" />
                  <span className="text-xs text-warning">Modalità offline - Le modifiche verranno sincronizzate quando torni online</span>
                </>
              ) : !isServerReachable ? (
                <>
                  <WifiOff className="w-4 h-4 text-warning" />
                  <span className="text-xs text-warning">Server non raggiungibile - Le modifiche verranno sincronizzate automaticamente</span>
                </>
              ) : null}
            </div>
          )}

          {/* Transaction Type Badge */}
          <GlassCard className={`p-3 text-center border border-white/5 font-semibold ${
            transaction.type === "expense" ? "gradient-pink" : "gradient-green"
          }`}>
            <span className="text-white text-sm font-semibold">
              {transaction.type === "expense" ? "Uscita" : "Entrata"}
            </span>
          </GlassCard>

          {/* Amount */}
          <GlassCard className="p-4 border border-white/10 bg-white/5 shadow-strong">
            <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2 block">Importo</label>
            {isEditing ? (
              <div className="flex items-center gap-2 border-b border-white/20 pb-1">
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-2xl font-extrabold bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-white"
                />
                <span className="text-2xl font-extrabold text-white">€</span>
              </div>
            ) : (
              <p className={`text-3xl font-extrabold tracking-tight ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                {transaction.type === 'income' ? '+ ' : '- '}{formatCurrency(transaction.amount)} €
              </p>
            )}
          </GlassCard>

          {/* Date */}
          <GlassCard className="p-4 border border-white/10 bg-white/5 shadow-strong">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center shrink-0 border border-white/5">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Data Transazione</p>
                {isEditing ? (
                  <MobileDateInput inline value={date} onChange={setDate} placeholder="Seleziona data" />
                ) : (
                  <p className="font-semibold text-sm text-white">{format(new Date(transaction.transactionDate), 'dd/MM/yyyy')}</p>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Note */}
          <GlassCard className="p-4 border border-white/10 bg-white/5 shadow-strong">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center shrink-0 border border-white/5">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">Nota Aggiuntiva</p>
                {isEditing ? (
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="bg-transparent border-none resize-none min-h-[60px] focus-visible:ring-0 p-0 text-sm text-white"
                    placeholder="Nessuna nota aggiunta..."
                  />
                ) : (
                  <NoteText
                    text={transaction.note}
                    className="text-sm leading-relaxed text-white font-medium"
                  />
                )}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Categorization, Account and Actions */}
        <div className="space-y-4">
          {/* Category Card */}
          <GlassCard className="p-4 border border-white/10 bg-white/5 shadow-strong">
            <div className="flex items-center gap-3">
              {(() => {
                const isExcluded = transaction.categoryExcludeFromTotals === true
                  || transaction.categoryName === 'Trasferimento'
                  || transaction.categoryName === 'Prestito'
                  || transaction.categoryName === 'Restituzione prestito';

                return (
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/5 border border-white/10 ${isExcluded ? 'opacity-40' : ''}`}
                  >
                    <IconRenderer icon={transaction.categoryIcon} size={20} />
                  </div>
                );
              })()}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Categoria</p>
                <p className="font-semibold text-sm text-white truncate">{transaction.categoryName}</p>
                {(transaction.categoryExcludeFromTotals === true
                  || transaction.categoryName === 'Trasferimento'
                  || transaction.categoryName === 'Prestito'
                  || transaction.categoryName === 'Restituzione prestito') && (
                  <p className="text-[9px] font-bold text-warning mt-0.5">Escluso dai calcoli del bilancio</p>
                )}
              </div>
            </div>

            {/* Category Selector (Only during Edit Mode) */}
            {isEditing && (
              <div className="pt-4 border-t border-white/5 mt-3">
                <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2 block">Seleziona Categoria</label>
                {(() => {
                  const filteredCategories = sortCategoriesByUsage(categories.filter(isVisibleTransactionCategory));
                  const visibleCategories = categoriesExpanded ? filteredCategories : filteredCategories.slice(0, 8);
                  const hasMoreCategories = filteredCategories.length > 8;

                  return (
                    <>
                      <div className="grid grid-cols-4 gap-2">
                        {visibleCategories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`p-2 flex flex-col items-center gap-1 transition-all rounded-xl border border-transparent font-medium text-xs interactive-press ${
                              selectedCategory === category.id ? "pill-active" : "bg-white/5 border-white/5 text-muted-foreground hover:text-white"
                            }`}
                          >
                            <IconRenderer icon={category.icon} size={18} />
                            <span className="text-[9px] font-semibold leading-tight text-center truncate w-full">{category.name}</span>
                          </button>
                        ))}
                      </div>

                      {hasMoreCategories && (
                        <button
                          onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                          className="w-full mt-3 bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-white transition-all"
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
              </div>
            )}
          </GlassCard>

          {/* Account Card */}
          <GlassCard className="p-4 border border-white/10 bg-white/5 shadow-strong">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center shrink-0 border border-white/5">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Conto Corrente</p>
                <p className="font-semibold text-sm text-white truncate">{transaction.accountName}</p>
              </div>
            </div>

            {/* Account Selector (Only during Edit Mode) */}
            {isEditing && (
              <div className="pt-4 border-t border-white/5 mt-3">
                <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2 block">Seleziona Conto</label>
                <div className="grid grid-cols-4 gap-2">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => setSelectedAccount(account.id)}
                      className={`p-2 flex flex-col items-center justify-center gap-1 transition-all rounded-xl border border-transparent font-medium text-xs interactive-press ${
                        selectedAccount === account.id ? "pill-active" : "bg-white/5 border-white/5 text-muted-foreground hover:text-white"
                      }`}
                    >
                      <IconRenderer icon={account.icon} size={18} />
                      <span className="text-[9px] font-semibold leading-tight text-center truncate w-full">{account.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>

          {/* Main Action Buttons */}
          <div className="pt-2">
            {isEditing ? (
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setAmount(transaction.amount.toString());
                    setSelectedCategory(transaction.categoryId);
                    setSelectedAccount(transaction.accountId);
                    setDate(format(new Date(transaction.transactionDate), 'yyyy-MM-dd'));
                    setNote(transaction.note || "");
                  }}
                  variant="outline"
                  className="flex-1 h-10 font-semibold bg-transparent border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white rounded-xl"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleUpdate}
                  className="flex-1 h-10 font-semibold pill-active shadow-strong rounded-xl"
                >
                  Salva Modifiche
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setIsEditing(true);
                    setCategoriesExpanded(false);
                  }}
                  variant="outline"
                  className="flex-1 h-10 font-semibold bg-transparent border-white/10 text-white hover:bg-white/5 rounded-xl"
                >
                  Modifica
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 h-10 font-semibold pill-active shadow-strong rounded-xl"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Elimina
                </Button>
              </div>
            )}
          </div>
        </div>

      </div>

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
            <AlertDialogAction onClick={handleDelete} className="m-0 text-sm pill-active">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
