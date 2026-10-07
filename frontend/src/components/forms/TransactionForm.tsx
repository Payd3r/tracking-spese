import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { AmountInput } from "@/components/AmountInput";
import { MobileDateInput } from "@/components/MobileDateInput";
import { NoteInput } from "@/components/NoteInput";
import { BottomSheet } from "@/components/BottomSheet";
import { Loader2, ChevronDown, ChevronUp, WifiOff, PlusCircle } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { isVisibleTransactionCategory, sortCategoriesByUsage } from "@/lib/cacheManager";

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransactionForm({ isOpen, onClose, onSuccess }: TransactionFormProps) {
  const { isFullyOnline } = useSync();
  const { user } = useAuth();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  const getDefaultAccountId = (list: Account[]) => {
    if (!list.length) return null;
    const cash = list.find(
      (a) => a.name.toLowerCase() === "contanti" || a.name.toLowerCase() === "cash"
    );
    return (cash ?? list[0]).id;
  };

  const getDefaultCategoryId = (list: Category[]) => {
    const visibleCategories = sortCategoriesByUsage(list.filter(isVisibleTransactionCategory));
    if (!visibleCategories.length) return null;
    const other = visibleCategories.find((c) => c.name.toLowerCase() === "altro");
    return (other ?? visibleCategories[0]).id;
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [type, isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);

      const cachedCategories = sortCategoriesByUsage(
        await db.cachedCategories.where("type").equals(type).toArray()
      );
      const cachedAccounts = await db.cachedAccounts.toArray();

      setCategories(cachedCategories);
      setAccounts(cachedAccounts);

      if (cachedAccounts.length > 0 && selectedAccount === null) {
        setSelectedAccount(getDefaultAccountId(cachedAccounts));
      }
      if (cachedCategories.length > 0 && selectedCategory === null) {
        setSelectedCategory(getDefaultCategoryId(cachedCategories));
      }

      setLoading(false);

      if (isFullyOnline) {
        try {
          const [categoriesResponse, accountsResponse] = await Promise.all([
            api.categories.getAll(type),
            api.accounts.getAll(),
          ]);

          const categoriesData = sortCategoriesByUsage(
            Array.isArray(categoriesResponse.data.categories)
              ? categoriesResponse.data.categories
              : []
          );
          const accountsData = Array.isArray(accountsResponse.data.accounts)
            ? accountsResponse.data.accounts
            : [];

          await db.cachedCategories.bulkPut(categoriesData);
          await db.cachedAccounts.bulkPut(accountsData);

          setCategories(categoriesData);
          setAccounts(accountsData);
        } catch {
          console.log("Background refresh failed, using cached data");
        }
      }
    } catch (err: any) {
      console.error("Failed to load data:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento dei dati");
      setCategories([]);
      setAccounts([]);
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0 || !selectedCategory || !selectedAccount) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    try {
      setSubmitting(true);

      const selectedCategoryData = categories.find((c) => c.id === selectedCategory);
      const title = selectedCategoryData
        ? `${type === "income" ? "Entrata" : "Uscita"} - ${selectedCategoryData.name}`
        : type === "income"
        ? "Entrata"
        : "Uscita";

      const transactionData = {
        accountId: selectedAccount,
        categoryId: selectedCategory,
        amount: parseFloat(amount),
        type,
        title,
        note: note || undefined,
        transactionDate: new Date(date).toISOString(),
      };

      const saveOffline = async () => {
        const userId = user?.id;
        if (!userId) throw new Error("Utente non autenticato (offline save)");

        await addPendingTransaction(userId, transactionData);
        toast.success("Salvata offline! Sarà sincronizzata appena possibile.");
      };

      if (!isFullyOnline) {
        await saveOffline();
      } else {
        try {
          await api.transactions.create(transactionData);
          toast.success("Transazione creata con successo!");
        } catch (apiError: any) {
          console.warn("Direct API call failed, falling back to offline queue:", apiError);
          const isNetworkOrServer = !apiError.response || apiError.response.status >= 500;
          if (isNetworkOrServer) {
            await saveOffline();
          } else {
            throw apiError;
          }
        }
      }

      // Reset form
      setAmount("");
      setNote("");
      setSelectedCategory(null);
      setSelectedAccount(null);
      setDate(format(new Date(), "yyyy-MM-dd"));
      setType("expense");
      setCategoriesExpanded(false);

      window.dispatchEvent(new Event("transactionUpdated"));
      onSuccess();
    } catch (err: any) {
      console.error("Failed to create transaction:", err);
      toast.error(err.response?.data?.message || "Errore nella creazione della transazione");
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
            <PlusCircle className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-bold text-white tracking-tight">Nuova Transazione</h2>
          </div>
        </div>
      }
      footer={
        <Button
          onClick={handleSubmit}
          disabled={submitting || loading}
          size="lg"
          className="w-full h-12 pill-active text-sm font-bold rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvataggio...
            </span>
          ) : type === "expense" ? (
            "Aggiungi Uscita"
          ) : (
            "Aggiungi Entrata"
          )}
        </Button>
      }
    >
      <div className="py-4 space-y-4">
        {/* Type Selector */}
        <div className="p-1 bg-white/5 border border-white/10 rounded-2xl flex gap-1">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all interactive-press ${
              type === "expense" ? "pill-active" : "text-muted-foreground hover:text-white"
            }`}
          >
            Uscite
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all interactive-press ${
              type === "income" ? "pill-active" : "text-muted-foreground hover:text-white"
            }`}
          >
            Entrate
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Amount */}
            <AmountInput
              value={amount}
              onChange={setAmount}
              currency={
                selectedAccount
                  ? accounts.find((a) => a.id === selectedAccount)?.currency || "EUR"
                  : "EUR"
              }
              type={type}
            />

            {/* Date */}
            <MobileDateInput value={date} onChange={setDate} />

            {/* Category */}
            <GlassCard className="p-4">
              <label className="text-xs text-muted-foreground mb-2 block font-medium">
                Categoria
              </label>
              {categories.length === 0 ? (
                <div className="text-center py-2">
                  <p className="text-muted-foreground text-xs">Nessuna categoria disponibile</p>
                  <Link
                    to="/settings/categories"
                    onClick={onClose}
                    className="text-primary text-xs mt-2 inline-block"
                  >
                    Crea una categoria
                  </Link>
                </div>
              ) : (
                <>
                  {(() => {
                    const filteredCategories = sortCategoriesByUsage(
                      categories.filter(isVisibleTransactionCategory)
                    );
                    const visibleCategories = categoriesExpanded
                      ? filteredCategories
                      : filteredCategories.slice(0, 8);
                    const hasMoreCategories = filteredCategories.length > 8;

                    if (filteredCategories.length === 0) {
                      return (
                        <div className="text-center py-2">
                          <p className="text-muted-foreground text-xs">Nessuna categoria disponibile</p>
                          <Link
                            to="/settings/categories"
                            onClick={onClose}
                            className="text-primary text-xs mt-2 inline-block"
                          >
                            Crea una categoria
                          </Link>
                        </div>
                      );
                    }

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
                </>
              )}
            </GlassCard>

            {/* Account */}
            <GlassCard className="p-4">
              <label className="text-xs text-muted-foreground mb-2 block font-medium">Conto</label>
              {accounts.length === 0 ? (
                <div className="text-center py-2">
                  <p className="text-muted-foreground text-xs">Nessun conto disponibile</p>
                  <Link
                    to="/settings/accounts"
                    onClick={onClose}
                    className="text-primary text-xs mt-2 inline-block"
                  >
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
                        type="button"
                        onClick={() => setSelectedAccount(account.id)}
                        className={`p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all rounded-xl interactive-press ${
                          isSelected ? "pill-active" : "glass-card"
                        }`}
                      >
                        <IconRenderer icon={account.icon} size={22} />
                        <span className="text-[10px] font-medium leading-tight text-center truncate w-full">
                          {account.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* Note */}
            <NoteInput value={note} onChange={setNote} placeholder="Note opzionali..." />

            {!isFullyOnline && (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2 text-warning text-xs">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>Modalità offline: la transazione verrà sincronizzata appena online.</span>
              </div>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
