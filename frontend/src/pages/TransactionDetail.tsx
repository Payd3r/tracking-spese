import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { ArrowLeft, Calendar, FileText, Wallet, Loader2, ChevronDown, ChevronUp, WifiOff } from "lucide-react";
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
import { useUser } from "@clerk/clerk-react";

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
  const { user } = useUser();
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

        setCategories(cachedCategories as unknown as Category[]);
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

        const categoriesData = Array.isArray(categoriesRes.data.categories)
          ? categoriesRes.data.categories
          : [];
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
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
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
    <div className="px-3 pt-4 pb-28 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="p-1.5 glass-card rounded-2xl">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Dettaglio Transazione</h1>
      </div>

      {/* Status Indicator */}
      {!isFullyOnline && (
        <div className="glass-card tone-warning p-3 mb-4 rounded-2xl flex items-center gap-2">
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
      <GlassCard className={`p-3 mb-4 text-center ${
        transaction.type === "expense" ? "gradient-pink" : "gradient-green"
      }`}>
        <span className="text-white text-sm font-medium">
          {transaction.type === "expense" ? "Uscita" : "Entrata"}
        </span>
      </GlassCard>

      {/* Amount */}
      <GlassCard className="p-4 mb-4">
        <label className="text-xs text-muted-foreground mb-2 block font-medium">Importo</label>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{getCurrencySymbol(transaction.accountCurrency)}</span>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-2xl font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
            />
          </div>
        ) : (
          <p className="text-2xl font-bold">{getCurrencySymbol(transaction.accountCurrency)} {formatCurrency(transaction.amount)}</p>
        )}
      </GlassCard>

      {/* Category */}
      <GlassCard className="p-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl ${transaction.categoryColor || 'gradient-blue'} flex items-center justify-center`}>
            <IconRenderer icon={transaction.categoryIcon} size={20} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-0.5">Categoria</p>
            <p className="font-medium text-sm">{transaction.categoryName}</p>
          </div>
        </div>
        {isEditing && (
          <>
            {(() => {
              const filteredCategories = categories.filter(category => category.name !== 'Trasferimento');
              const visibleCategories = categoriesExpanded ? filteredCategories : filteredCategories.slice(0, 8);
              const hasMoreCategories = filteredCategories.length > 8;
              
              return (
                <>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {visibleCategories.map((category) => {
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`glass-card p-2.5 flex flex-col items-center gap-1.5 transition-all rounded-xl interactive-press ${
                            selectedCategory === category.id ? "pill-active" : ""
                          }`}
                        >
                          <IconRenderer icon={category.icon} size={24} />
                          <span className="text-[10px] font-medium leading-tight text-center">{category.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {hasMoreCategories && (
                    <button
                      onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                      className="w-full mt-3 glass-card p-3 flex items-center justify-center gap-2 text-sm font-medium transition-all hover:bg-white/10"
                    >
                      {categoriesExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Mostra meno
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Mostra tutte le categorie ({filteredCategories.length - 8} altre)
                        </>
                      )}
                    </button>
                  )}
                </>
              );
            })()}
          </>
        )}
      </GlassCard>

      {/* Account */}
      <GlassCard className="p-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-0.5">Conto</p>
            <p className="font-medium text-sm">{transaction.accountName}</p>
          </div>
        </div>
        {isEditing && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setSelectedAccount(account.id)}
                className={`glass-card p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all rounded-xl interactive-press ${
                  selectedAccount === account.id ? "pill-active" : ""
                }`}
              >
                <IconRenderer icon={account.icon} size={24} />
                <span className="text-[10px] font-medium leading-tight text-center">{account.name}</span>
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Date */}
      <GlassCard className="p-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-0.5">Data</p>
            {isEditing ? (
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent border-none p-0 h-auto focus-visible:ring-0 font-medium text-sm"
              />
            ) : (
              <p className="font-medium text-sm">{format(new Date(transaction.transactionDate), 'dd/MM/yyyy')}</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Note */}
      <GlassCard className="p-4 mb-5">
        <div className="flex items-start gap-2.5">
          <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1.5">Nota</p>
            {isEditing ? (
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-transparent border-none resize-none min-h-[50px] focus-visible:ring-0 p-0 text-sm"
              />
            ) : (
              <p className="text-sm leading-relaxed">{transaction.note || "Nessuna nota"}</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Actions */}
      <div className="flex gap-2">
        {isEditing ? (
          <>
            <Button 
              onClick={() => {
                setIsEditing(false);
                // Reset form values
                setAmount(transaction.amount.toString());
                setSelectedCategory(transaction.categoryId);
                setSelectedAccount(transaction.accountId);
                setDate(format(new Date(transaction.transactionDate), 'yyyy-MM-dd'));
                setNote(transaction.note || "");
              }} 
              variant="outline" 
              className="flex-1 h-11 text-sm rounded-2xl"
            >
              Annulla
            </Button>
            <Button
              onClick={handleUpdate}
              className="flex-1 h-11 text-sm rounded-2xl"
            >
              Salva
            </Button>
          </>
        ) : (
          <>
            <Button 
              onClick={() => {
                setIsEditing(true);
                setCategoriesExpanded(false);
              }}
              variant="outline"
              className="flex-1 h-11 text-sm rounded-2xl"
            >
              Modifica
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-11 text-sm rounded-2xl pill-active"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Elimina
            </Button>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Sei sicuro di voler eliminare questa transazione? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="m-0 text-sm">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="m-0 text-sm">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
