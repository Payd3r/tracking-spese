import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Account, Category } from "@/types/api";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AddTransaction() {
  const navigate = useNavigate();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [type]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesResponse, accountsResponse] = await Promise.all([
        api.categories.getAll(type),
        api.accounts.getAll()
      ]);
      
      setCategories(categoriesResponse.data);
      setAccounts(accountsResponse.data);
      
      if (accountsResponse.data.length > 0 && !selectedAccount) {
        setSelectedAccount(accountsResponse.data[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load data:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !title || !selectedCategory || !selectedAccount) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    try {
      setSubmitting(true);
      await api.transactions.create({
        accountId: selectedAccount,
        categoryId: selectedCategory,
        amount: parseFloat(amount),
        type,
        title,
        note: note || undefined,
        transactionDate: new Date(date).toISOString(),
      });

      toast.success("Transazione creata con successo!");
      navigate("/");
    } catch (err: any) {
      console.error("Failed to create transaction:", err);
      toast.error(err.response?.data?.message || "Errore nella creazione della transazione");
    } finally {
      setSubmitting(false);
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
        <Link to="/" className="p-2 glass-card rounded-2xl">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Nuova Transazione</h1>
      </div>

      {/* Type Selector */}
      <GlassCard className="p-2 mb-6 flex gap-2">
        <button
          onClick={() => {
            setType("expense");
            setSelectedCategory(null);
          }}
          className={`flex-1 py-3 rounded-2xl font-medium transition-all ${
            type === "expense" ? "gradient-pink text-white" : "text-muted-foreground"
          }`}
        >
          Uscita
        </button>
        <button
          onClick={() => {
            setType("income");
            setSelectedCategory(null);
          }}
          className={`flex-1 py-3 rounded-2xl font-medium transition-all ${
            type === "income" ? "gradient-green text-white" : "text-muted-foreground"
          }`}
        >
          Entrata
        </button>
      </GlassCard>

      {/* Title */}
      <GlassCard className="p-6 mb-6">
        <label className="text-sm text-muted-foreground mb-2 block">Titolo</label>
        <Input
          type="text"
          placeholder="Es: Spesa al supermercato"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-transparent border-none p-0 h-auto text-xl focus-visible:ring-0"
        />
      </GlassCard>

      {/* Amount */}
      <GlassCard className="p-6 mb-6">
        <label className="text-sm text-muted-foreground mb-2 block">Importo</label>
        <div className="flex items-center gap-2">
          <span className="text-4xl font-bold">€</span>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-4xl font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
          />
        </div>
      </GlassCard>

      {/* Date */}
      <GlassCard className="p-6 mb-6">
        <label className="text-sm text-muted-foreground mb-2 block">Data</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-transparent border-none p-0 h-auto text-lg focus-visible:ring-0"
        />
      </GlassCard>

      {/* Category */}
      <div className="mb-6">
        <label className="text-sm text-muted-foreground mb-3 block">Categoria</label>
        {categories.length === 0 ? (
          <GlassCard className="p-6 text-center">
            <p className="text-muted-foreground text-sm">Nessuna categoria disponibile</p>
            <Link to="/settings/categories" className="text-primary text-sm mt-2 inline-block">
              Crea una categoria
            </Link>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`glass-card p-4 flex flex-col items-center gap-2 transition-all ${
                  selectedCategory === category.id ? (category.color || "gradient-blue") : ""
                }`}
              >
                <IconRenderer icon={category.icon} size={32} />
                <span className="text-xs font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Account */}
      <div className="mb-6">
        <label className="text-sm text-muted-foreground mb-3 block">Conto</label>
        {accounts.length === 0 ? (
          <GlassCard className="p-6 text-center">
            <p className="text-muted-foreground text-sm">Nessun conto disponibile</p>
            <Link to="/settings/accounts" className="text-primary text-sm mt-2 inline-block">
              Crea un conto
            </Link>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setSelectedAccount(account.id)}
                className={`w-full glass-card p-4 flex justify-between items-center transition-all ${
                  selectedAccount === account.id ? "gradient-blue" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconRenderer icon={account.icon} size={24} />
                  <span className="font-medium">{account.name}</span>
                </div>
                <span className="text-sm">{account.currency} {account.balance.toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Note */}
      <div className="mb-6">
        <label className="text-sm text-muted-foreground mb-3 block">Nota (opzionale)</label>
        <GlassCard className="p-4">
          <Textarea
            placeholder="Aggiungi una nota..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="bg-transparent border-none resize-none min-h-[80px] focus-visible:ring-0"
          />
        </GlassCard>
      </div>

      {/* Submit Button */}
      <Button 
        onClick={handleSubmit} 
        disabled={submitting}
        className="w-full h-14 rounded-2xl gradient-blue text-white font-semibold text-lg shadow-lg"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Salvataggio...
          </>
        ) : (
          "Aggiungi Transazione"
        )}
      </Button>
    </div>
  );
}
