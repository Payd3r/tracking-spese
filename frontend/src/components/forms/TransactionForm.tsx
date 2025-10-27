import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { AmountInput } from "@/components/AmountInput";
import { MobileDateInput } from "@/components/MobileDateInput";
import { NoteInput } from "@/components/NoteInput";
import { Loader2, ChevronDown, ChevronUp, Wifi, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Account, Category } from "@/types/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSync } from "@/contexts/SyncContext";
import { addPendingTransaction } from "@/lib/sync";
import { db } from "@/lib/db";
import { getCategoryStyle } from "@/utils/categoryColors";

interface TransactionFormProps {
  onSuccess: () => void;
}

export function TransactionForm({ onSuccess }: TransactionFormProps) {
  const { isFullyOnline, isOnline, isServerReachable } = useSync();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  useEffect(() => {
    loadData();
  }, [type]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // SEMPRE caricare dalla cache prima
      const cachedCategories = await db.cachedCategories
        .where('type')
        .equals(type)
        .toArray();
      const cachedAccounts = await db.cachedAccounts.toArray();
      
      // Mostrare subito i dati dalla cache
      setCategories(cachedCategories);
      setAccounts(cachedAccounts);
      
      if (cachedAccounts.length > 0 && selectedAccount === null) {
        setSelectedAccount(cachedAccounts[0].id);
      }
      
      setLoading(false);
      
      // POI, se online E server raggiungibile, aggiornare in background
      if (isFullyOnline) {
        try {
          const [categoriesResponse, accountsResponse] = await Promise.all([
            api.categories.getAll(type),
            api.accounts.getAll()
          ]);
          
          const categoriesData = Array.isArray(categoriesResponse.data.categories) ? categoriesResponse.data.categories : [];
          const accountsData = Array.isArray(accountsResponse.data.accounts) ? accountsResponse.data.accounts : [];
          
          // Aggiornare cache e stato
          await db.cachedCategories.bulkPut(categoriesData);
          await db.cachedAccounts.bulkPut(accountsData);
          
          setCategories(categoriesData);
          setAccounts(accountsData);
        } catch (err) {
          // Ignorare errori di rete - abbiamo già i dati dalla cache
          console.log("Background refresh failed, using cached data");
        }
      }
    } catch (err: any) {
      // Se anche la cache fallisce, mostrare errore
      console.error("Failed to load data:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento dei dati");
      setCategories([]);
      setAccounts([]);
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !selectedCategory || !selectedAccount) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    try {
      setSubmitting(true);
      
      const selectedCategoryData = categories.find(c => c.id === selectedCategory);
      const title = selectedCategoryData 
        ? `${type === 'income' ? 'Entrata' : 'Uscita'} - ${selectedCategoryData.name}`
        : type === 'income' ? 'Entrata' : 'Uscita';
      
      if (!isFullyOnline) {
        // Offline: save to pending queue
        const user = localStorage.getItem('user');
        const userId = user ? JSON.parse(user).id : '';
        
        await addPendingTransaction(userId, {
          accountId: selectedAccount,
          categoryId: selectedCategory,
          amount: parseFloat(amount),
          type,
          title,
          note: note || undefined,
          transactionDate: new Date(date).toISOString(),
        });

        toast.success("Transazione salvata offline! Verrà sincronizzata quando torni online.");
      } else {
        // Online: create directly via API
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
      }
      
      // Reset form
      setAmount("");
      setNote("");
      setSelectedCategory(null);
      setSelectedAccount(null);
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setType("expense");
      
      onSuccess();
    } catch (err: any) {
      console.error("Failed to create transaction:", err);
      toast.error(err.response?.data?.message || "Errore nella creazione della transazione");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Type Selector */}
      <GlassCard className="p-2 flex gap-2">
        <button
          onClick={() => {
            setType("expense");
            setSelectedCategory(null);
            setCategoriesExpanded(false);
          }}
          className={`flex-1 py-2 rounded-2xl text-sm font-medium transition-all ${
            type === "expense" ? "gradient-blue text-white" : "text-muted-foreground"
          }`}
        >
          Uscita
        </button>
        <button
          onClick={() => {
            setType("income");
            setSelectedCategory(null);
            setCategoriesExpanded(false);
          }}
          className={`flex-1 py-2 rounded-2xl text-sm font-medium transition-all ${
            type === "income" ? "gradient-blue text-white" : "text-muted-foreground"
          }`}
        >
          Entrata
        </button>
      </GlassCard>

      {/* Status Indicator */}
      {!isFullyOnline && (
        <div className={`glass-card p-3 rounded-2xl flex items-center gap-2 ${
          !isOnline 
            ? 'border border-orange-500/50 bg-orange-500/10' 
            : 'border border-orange-500/50 bg-orange-500/10'
        }`}>
          {!isOnline ? (
            <>
              <WifiOff className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-orange-400">Modalità offline - Le transazioni verranno sincronizzate quando torni online</span>
            </>
          ) : !isServerReachable ? (
            <>
              <WifiOff className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-orange-400">Server non raggiungibile - Le transazioni verranno sincronizzate automaticamente</span>
            </>
          ) : null}
        </div>
      )}

      {/* Amount */}
      <AmountInput
        value={amount}
        onChange={setAmount}
        currency={selectedAccount ? accounts.find(a => a.id === selectedAccount)?.currency : 'EUR'}
        type={type}
      />

      {/* Date */}
      <MobileDateInput value={date} onChange={setDate} />

      {/* Category */}
      <GlassCard className="p-4">
        <label className="text-xs text-muted-foreground mb-2 block font-medium">Categoria</label>
        {categories.length === 0 ? (
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Nessuna categoria disponibile</p>
            <Link to="/settings/categories" className="text-primary text-xs mt-2 inline-block">
              Crea una categoria
            </Link>
          </div>
        ) : (
          <>
            {(() => {
              const filteredCategories = categories.filter(category => category.name !== 'Trasferimento');
              const visibleCategories = categoriesExpanded ? filteredCategories : filteredCategories.slice(0, 8);
              const hasMoreCategories = filteredCategories.length > 8;
              
              return (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {visibleCategories.map((category) => {
                      const { className: colorClass, style: colorStyle } = getCategoryStyle(
                        category.color, 
                        selectedCategory === category.id
                      );
                      
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`p-2.5 flex flex-col items-center gap-1.5 transition-all rounded-xl ${
                            selectedCategory === category.id ? colorClass : "glass-card"
                          }`}
                          style={colorStyle}
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
      <GlassCard className="p-4">
        <label className="text-xs text-muted-foreground mb-2 block font-medium">Conto</label>
        {accounts.length === 0 ? (
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Nessun conto disponibile</p>
            <Link to="/settings/accounts" className="text-primary text-xs mt-2 inline-block">
              Crea un conto
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setSelectedAccount(account.id)}
                className={`glass-card p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all rounded-xl ${
                  selectedAccount === account.id ? "gradient-blue" : ""
                }`}
              >
                <IconRenderer icon={account.icon} size={24} />
                <span className="text-[10px] font-medium leading-tight text-center">{account.name}</span>
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Note */}
      <NoteInput
        value={note}
        onChange={setNote}
        placeholder="Note opzionali..."
      />

      {/* Submit Button */}
      <Button 
        onClick={handleSubmit} 
        disabled={submitting}
        className="w-full h-11 rounded-2xl gradient-blue text-white font-semibold text-base shadow-lg"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Salvataggio...
          </>
        ) : (
          "Aggiungi Transazione"
        )}
      </Button>
    </div>
  );
}

