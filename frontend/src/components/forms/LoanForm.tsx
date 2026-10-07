import { GlassCard } from "@/components/GlassCard";
import { AmountInput } from "@/components/AmountInput";
import { MobileDateInput } from "@/components/MobileDateInput";
import { NoteInput } from "@/components/NoteInput";
import { IconRenderer } from "@/components/IconRenderer";
import { BottomSheet } from "@/components/BottomSheet";
import { Loader2, ChevronDown, ChevronUp, HandCoins } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { isVisibleTransactionCategory, sortCategoriesByUsage } from "@/lib/cacheManager";

interface LoanFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoanForm({ isOpen, onClose, onSuccess }: LoanFormProps) {
  const { isFullyOnline } = useSync();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loanDate, setLoanDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);

      const cachedAccounts = await db.cachedAccounts.toArray();
      const cachedCategories = sortCategoriesByUsage(
        await db.cachedCategories.where("type").equals("expense").toArray()
      );

      setAccounts(cachedAccounts);
      setCategories(cachedCategories);

      if (cachedAccounts.length > 0 && selectedAccount === null) {
        setSelectedAccount(cachedAccounts[0].id);
      }
      if (cachedCategories.length > 0 && selectedCategory === null) {
        const countedCategories = cachedCategories.filter(isVisibleTransactionCategory);
        const other = countedCategories.find((c) => c.name.toLowerCase() === "altro");
        setSelectedCategory(other ? other.id : countedCategories[0]?.id || cachedCategories[0].id);
      }

      setLoading(false);

      if (isFullyOnline) {
        try {
          const [accountsResponse, categoriesResponse] = await Promise.all([
            api.accounts.getAll(),
            api.categories.getAll("expense"),
          ]);

          const accountsData = Array.isArray(accountsResponse.data.accounts)
            ? accountsResponse.data.accounts
            : [];
          const categoriesData = sortCategoriesByUsage(
            Array.isArray(categoriesResponse.data.categories)
              ? categoriesResponse.data.categories
              : []
          );

          await db.cachedAccounts.bulkPut(accountsData);
          await db.cachedCategories.bulkPut(categoriesData);

          setAccounts(accountsData);
          setCategories(categoriesData);
        } catch {
          console.log("Background refresh failed, using cached data");
        }
      }
    } catch (err: any) {
      console.error("Failed to load data:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento dei dati");
      setLoading(false);
    }
  };

  const selectedAccountData = accounts.find((a) => a.id === selectedAccount);
  const currency = selectedAccountData?.currency || "EUR";

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
        title: note.trim(),
        amount: parseFloat(amount),
        currency,
        fromAccountId: selectedAccount,
        categoryId: selectedCategory,
        loanDate: new Date(loanDate).toISOString(),
        note: note.trim(),
      };

      if (!isFullyOnline) {
        const userId = user?.id;
        if (!userId) {
          toast.error("Utente non autenticato");
          return;
        }
        const tempId = -Date.now();
        await addPendingLoanOperation(userId, {
          type: "create",
          data: { ...payload, tempId },
          timestamp: new Date().toISOString(),
        });
        await db.cachedLoans.put({
          id: tempId,
          userId,
          ...payload,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalRepaid: 0,
          isPending: true,
          pendingAction: "create",
        });
        toast.success("Prestito salvato offline! Verrà sincronizzato automaticamente.");
      } else {
        await api.loans.create(payload);
        toast.success("Prestito creato con successo!");
      }

      // Reset form
      setAmount("");
      setNote("");
      setLoanDate(format(new Date(), "yyyy-MM-dd"));
      setCategoriesExpanded(false);

      onSuccess();
    } catch (err: any) {
      console.error("Failed to create loan:", err);
      toast.error(err.response?.data?.message || "Errore nella creazione del prestito");
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
            <HandCoins className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-bold text-white tracking-tight">Nuovo Prestito</h2>
          </div>
        </div>
      }
      footer={
        <Button
          onClick={handleCreate}
          disabled={submitting || loading || !selectedCategory || !note.trim() || !amount}
          size="lg"
          className="w-full h-12 pill-active text-sm font-bold rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Creazione...
            </span>
          ) : (
            "Crea Prestito"
          )}
        </Button>
      }
    >
      <div className="py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Amount Input */}
            <AmountInput value={amount} onChange={setAmount} currency={currency} />

            {/* Date */}
            <MobileDateInput value={loanDate} onChange={setLoanDate} />

            {/* Category */}
            <GlassCard className="p-4">
              <label className="text-xs text-muted-foreground mb-2 block font-medium">
                Categoria
              </label>
              {categories.length === 0 ? (
                <div className="text-center">
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
                        <div className="text-center">
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
                                <IconRenderer icon={category.icon} size={24} />
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
                <div className="text-center">
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
                        <IconRenderer icon={account.icon} size={24} />
                        <span className="text-[10px] font-medium leading-tight text-center truncate w-full">
                          {account.name}
                        </span>
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
              placeholder="Note o beneficiario del prestito..."
            />
          </>
        )}
      </div>
    </BottomSheet>
  );
}
