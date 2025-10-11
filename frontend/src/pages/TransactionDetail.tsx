import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { ArrowLeft, Calendar, FileText, Wallet, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Transaction, Account, Category } from "@/types/api";
import { toast } from "sonner";
import { format } from "date-fns";
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
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  // Edit form states
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (id) {
      loadTransaction();
    }
  }, [id]);

  const loadTransaction = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await api.transactions.getOne(parseInt(id));
      const txn = response.data;
      setTransaction(txn);
      
      // Set form values
      setTitle(txn.title);
      setAmount(txn.amount.toString());
      setSelectedCategory(txn.categoryId);
      setSelectedAccount(txn.accountId);
      setDate(format(new Date(txn.transactionDate), 'yyyy-MM-dd'));
      setNote(txn.note || "");
      
      // Load categories and accounts
      const [categoriesRes, accountsRes] = await Promise.all([
        api.categories.getAll(txn.type),
        api.accounts.getAll()
      ]);
      setCategories(categoriesRes.data);
      setAccounts(accountsRes.data);
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
      await api.transactions.update(parseInt(id), {
        title,
        amount: parseFloat(amount),
        categoryId: selectedCategory!,
        accountId: selectedAccount!,
        transactionDate: new Date(date).toISOString(),
        note: note || undefined
      });
      
      toast.success("Transazione aggiornata con successo!");
      setIsEditing(false);
      loadTransaction();
    } catch (err: any) {
      console.error("Failed to update transaction:", err);
      toast.error(err.response?.data?.message || "Errore nell'aggiornamento della transazione");
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await api.transactions.delete(parseInt(id));
      toast.success("Transazione eliminata con successo!");
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
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-2xl">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Dettaglio Transazione</h1>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="ghost" size="sm">
            Modifica
          </Button>
        )}
      </div>

      {/* Title */}
      {isEditing && (
        <GlassCard className="p-6 mb-6">
          <label className="text-sm text-muted-foreground mb-2 block">Titolo</label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent border-none p-0 h-auto text-xl focus-visible:ring-0"
          />
        </GlassCard>
      )}

      {/* Transaction Type Badge */}
      <div className="mb-6">
        <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
          transaction.type === "expense" ? "gradient-pink text-white" : "gradient-green text-white"
        }`}>
          {transaction.type === "expense" ? "Uscita" : "Entrata"}
        </span>
      </div>

      {/* Amount */}
      <GlassCard className="p-6 mb-6">
        <label className="text-sm text-muted-foreground mb-2 block">Importo</label>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold">€</span>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-4xl font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
            />
          </div>
        ) : (
          <p className="text-4xl font-bold">{transaction.accountCurrency} {transaction.amount.toFixed(2)}</p>
        )}
      </GlassCard>

      {/* Category */}
      <GlassCard className="p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${transaction.categoryColor || 'gradient-blue'} flex items-center justify-center`}>
            <IconRenderer icon={transaction.categoryIcon} size={24} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Categoria</p>
            <p className="font-semibold">{transaction.categoryName}</p>
          </div>
        </div>
        {isEditing && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`glass-card p-3 flex flex-col items-center gap-2 transition-all ${
                  selectedCategory === category.id ? (category.color || 'gradient-blue') : ""
                }`}
              >
                <IconRenderer icon={category.icon} size={24} />
                <span className="text-xs font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Account */}
      <GlassCard className="p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Conto</p>
            <p className="font-semibold">{transaction.accountName}</p>
          </div>
        </div>
        {isEditing && (
          <div className="space-y-2 mt-4">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setSelectedAccount(account.id)}
                className={`w-full glass-card p-3 flex justify-between items-center transition-all ${
                  selectedAccount === account.id ? "gradient-blue" : ""
                }`}
              >
                <span className="font-medium text-sm">{account.name}</span>
                <span className="text-xs">{account.currency} {account.balance.toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Date */}
      <GlassCard className="p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Data</p>
            {isEditing ? (
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent border-none p-0 h-auto focus-visible:ring-0 font-semibold"
              />
            ) : (
              <p className="font-semibold">{format(new Date(transaction.transactionDate), 'dd/MM/yyyy')}</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Note */}
      <GlassCard className="p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-2">Nota</p>
            {isEditing ? (
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-transparent border-none resize-none min-h-[60px] focus-visible:ring-0 p-0"
              />
            ) : (
              <p>{transaction.note || "Nessuna nota"}</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Actions */}
      {isEditing ? (
        <div className="flex gap-3">
          <Button 
            onClick={() => {
              setIsEditing(false);
              // Reset form values
              setTitle(transaction.title);
              setAmount(transaction.amount.toString());
              setSelectedCategory(transaction.categoryId);
              setSelectedAccount(transaction.accountId);
              setDate(format(new Date(transaction.transactionDate), 'yyyy-MM-dd'));
              setNote(transaction.note || "");
            }} 
            variant="outline" 
            className="flex-1"
          >
            Annulla
          </Button>
          <Button 
            onClick={handleUpdate} 
            className="flex-1 gradient-blue text-white"
          >
            Salva
          </Button>
        </div>
      ) : (
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={() => setDeleteDialogOpen(true)}
        >
          Elimina Transazione
        </Button>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa transazione? Questa azione non può essere annullata.
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
