import { GlassCard } from "@/components/GlassCard";
import { AmountInput } from "@/components/AmountInput";
import { MobileDateInput } from "@/components/MobileDateInput";
import { NoteInput } from "@/components/NoteInput";
import { IconRenderer } from "@/components/IconRenderer";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Account, Category } from "@/types/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSync } from "@/contexts/SyncContext";
import { db } from "@/lib/db";
import { addPendingLoanOperation } from "@/lib/sync";

interface LoanFormProps {
  onSuccess: () => void;
}

export function LoanForm({ onSuccess }: LoanFormProps) {
  const { isFullyOnline } = useSync();
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loanDate, setLoanDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState("");
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // SEMPRE caricare dalla cache prima
      const cachedAccounts = await db.cachedAccounts.toArray();
      const cachedCategories = await db.cachedCategories
        .where('type')
        .equals('expense')
        .toArray();
      
      // Mostrare subito i dati dalla cache
      setAccounts(cachedAccounts);
      setCategories(cachedCategories);
      
      if (cachedAccounts.length > 0 && selectedAccount === null) {
        setSelectedAccount(cachedAccounts[0].id);
      }
      if (cachedCategories.length > 0 && selectedCategory === null) {
        const other = cachedCategories.find((c) => c.name.toLowerCase() === "altro");
        setSelectedCategory(other ? other.id : cachedCategories[0].id);
      }
      
      setLoading(false);
      
      // POI, se online E server raggiungibile, aggiornare in background
      if (isFullyOnline) {
        try {
          const [accountsResponse, categoriesResponse] = await Promise.all([
            api.accounts.getAll(),
            api.categories.getAll('expense')
          ]);
          
          const accountsData = Array.isArray(accountsResponse.data.accounts) ? accountsResponse.data.accounts : [];
          const categoriesData = Array.isArray(categoriesResponse.data.categories) ? categoriesResponse.data.categories : [];
          
          // Aggiornare cache e stato
          await db.cachedAccounts.bulkPut(accountsData);
          await db.cachedCategories.bulkPut(categoriesData);
          
          setAccounts(accountsData);
          setCategories(categoriesData);
        } catch (err) {
          console.log("Background refresh failed, using cached data");
        }
      }
    } catch (err: any) {
      console.error("Failed to load data:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento dei dati");
      setLoading(false);
    }
  };

  const selectedAccountData = accounts.find(a => a.id === selectedAccount);
  const selectedCategoryData = categories.find(c => c.id === selectedCategory);
  const currency = selectedAccountData?.currency || 'EUR';

  const handleCreate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Inserisci un importo valido");
      return;
    }

    if (!selectedAccount) {
      toast.error("Seleziona un conto");
      return;
    }

    if (!selectedCategory) {
      toast.error("Seleziona una categoria");
      return;
    }

    if (!note.trim()) {
      toast.error("Inserisci una nota per il prestito");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: note.trim(), // Usa la nota come titolo
        amount: parseFloat(amount),
        currency,
        fromAccountId: selectedAccount,
        categoryId: selectedCategory,
        loanDate: new Date(loanDate).toISOString(),
        note: note.trim()
      };

      if (!isFullyOnline) {
        const user = localStorage.getItem('user');
        const userId = user ? JSON.parse(user).id : '';
        const tempId = -Date.now();
        await addPendingLoanOperation(userId, {
          type: 'create',
          data: { ...payload, tempId },
          timestamp: new Date().toISOString()
        });
        await db.cachedLoans.put({
          id: tempId,
          userId,
          ...payload,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalRepaid: 0,
          isPending: true,
          pendingAction: 'create'
        });
        toast.success("Prestito salvato offline! Verrà sincronizzato automaticamente.");
      } else {
        await api.loans.create(payload);
        toast.success("Prestito creato con successo!");
      }
      
      // Reset form
      setAmount("");
      setNote("");
      setLoanDate(format(new Date(), 'yyyy-MM-dd'));
      
      onSuccess();
    } catch (err: any) {
      console.error("Failed to create loan:", err);
      toast.error(err.response?.data?.message || "Errore nella creazione del prestito");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Amount Input */}
      <AmountInput
        value={amount}
        onChange={setAmount}
        currency={currency}
      />

      {/* Date */}
      <MobileDateInput
        value={loanDate}
        onChange={setLoanDate}
      />

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
                      const isSelected = selectedCategory === category.id;
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`p-2.5 flex flex-col items-center gap-1.5 transition-all rounded-xl interactive-press ${
                            isSelected ? "pill-active" : "glass-card"
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
                      className="w-full mt-3 glass-card p-3 flex items-center justify-center gap-2 text-sm font-medium transition-all hover:bg-white/10 interactive-press"
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
            {accounts.map((account) => {
              const isSelected = selectedAccount === account.id;
              return (
                <button
                  key={account.id}
                  onClick={() => setSelectedAccount(account.id)}
                  className={`p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all rounded-xl interactive-press ${
                    isSelected ? "pill-active" : "glass-card"
                  }`}
                >
                  <IconRenderer icon={account.icon} size={24} />
                  <span className="text-[10px] font-medium leading-tight text-center">{account.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Note Input */}
      <NoteInput
        value={note}
        onChange={setNote}
        placeholder="Note del prestito..."
      />

      {/* Submit Button */}
      <Button 
        onClick={handleCreate} 
        disabled={submitting || !selectedCategory || !note.trim()}
        className="w-full h-11 rounded-2xl font-semibold text-base pill-active"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Creazione...
          </>
        ) : (
          "Crea Prestito"
        )}
      </Button>
    </div>
  );
}

