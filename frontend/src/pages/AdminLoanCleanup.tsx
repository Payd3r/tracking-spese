import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { NoteText } from "@/components/NoteText";
import { formatCurrency } from "@/lib/utils";
import { isVisibleTransactionCategory, sortCategoriesByUsage } from "@/lib/cacheManager";
import { Category, Loan, Transaction } from "@/types/api";
import { ArrowLeft, CheckCircle2, Link2, RefreshCw, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type AdminCredentials = {
  username: string;
  password: string;
};

export default function AdminLoanCleanup() {
  const [credentials, setCredentials] = useState<AdminCredentials>({
    username: "",
    password: ""
  });
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [incomes, setIncomes] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [incomeSearch, setIncomeSearch] = useState("");
  const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(null);
  const [selectedIncomeId, setSelectedIncomeId] = useState<number | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [loanTitle, setLoanTitle] = useState("");
  const [loanNote, setLoanNote] = useState("");
  const [repaymentDescription, setRepaymentDescription] = useState("");
  const [converting, setConverting] = useState(false);
  const [attaching, setAttaching] = useState(false);

  const adminPayload = {
    username: credentials.username,
    password: credentials.password
  };

  const filteredExpenses = useMemo(() => {
    const query = expenseSearch.trim().toLowerCase();
    if (!query) return expenses;
    return expenses.filter((tx) =>
      tx.title?.toLowerCase().includes(query) ||
      tx.note?.toLowerCase().includes(query) ||
      tx.categoryName?.toLowerCase().includes(query) ||
      tx.accountName?.toLowerCase().includes(query)
    );
  }, [expenses, expenseSearch]);

  const filteredIncomes = useMemo(() => {
    const query = incomeSearch.trim().toLowerCase();
    if (!query) return incomes;
    return incomes.filter((tx) =>
      tx.title?.toLowerCase().includes(query) ||
      tx.note?.toLowerCase().includes(query) ||
      tx.categoryName?.toLowerCase().includes(query) ||
      tx.accountName?.toLowerCase().includes(query)
    );
  }, [incomes, incomeSearch]);

  const selectedExpense = expenses.find((tx) => tx.id === selectedExpenseId) || null;
  const selectedIncome = incomes.find((tx) => tx.id === selectedIncomeId) || null;

  useEffect(() => {
    if (!selectedExpense) return;
    setLoanTitle(selectedExpense.note || selectedExpense.title || "");
  }, [selectedExpenseId]);

  const unlock = async () => {
    if (!credentials.username || !credentials.password) {
      toast.error("Inserisci utente e password");
      return;
    }

    try {
      setLoading(true);
      await api.loans.adminValidate(credentials);
      setUnlocked(true);
      await loadData();
    } catch (error: any) {
      console.error("Admin validation failed:", error);
      toast.error(error.response?.data?.message || "Credenziali admin non valide");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [expenseResponse, incomeResponse, loansResponse, categoriesResponse] = await Promise.all([
        api.transactions.getAll({ type: "expense", limit: 300, offset: 0 }),
        api.transactions.getAll({ type: "income", limit: 300, offset: 0 }),
        api.loans.getAll(),
        api.categories.getAll("expense")
      ]);

      const expenseData = Array.isArray(expenseResponse.data.transactions) ? expenseResponse.data.transactions : [];
      const incomeData = Array.isArray(incomeResponse.data.transactions) ? incomeResponse.data.transactions : [];
      const loanData = Array.isArray(loansResponse.data.loans) ? loansResponse.data.loans : [];
      const categoryData = sortCategoriesByUsage(
        Array.isArray(categoriesResponse.data.categories) ? categoriesResponse.data.categories : []
      ).filter(isVisibleTransactionCategory);

      setExpenses(expenseData.filter((tx) => tx.categoryExcludeFromTotals !== true));
      setIncomes(incomeData.filter((tx) => tx.categoryExcludeFromTotals !== true));
      setLoans(loanData);
      setCategories(categoryData);

      if (!selectedCategoryId && categoryData.length > 0) {
        const other = categoryData.find((category) => category.name.toLowerCase() === "altro");
        setSelectedCategoryId((other || categoryData[0]).id);
      }
    } catch (error: any) {
      console.error("Admin cleanup load failed:", error);
      toast.error(error.response?.data?.message || "Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  const convertExpense = async () => {
    if (!selectedExpenseId || !selectedCategoryId || !loanTitle.trim()) {
      toast.error("Seleziona transazione, categoria finale e titolo");
      return;
    }

    try {
      setConverting(true);
      await api.loans.adminConvertFromTransaction({
        ...adminPayload,
        transactionId: selectedExpenseId,
        categoryId: selectedCategoryId,
        title: loanTitle.trim(),
        note: loanNote.trim() || undefined
      });

      toast.success("Transazione convertita in prestito");
      setSelectedExpenseId(null);
      setLoanTitle("");
      setLoanNote("");
      await loadData();
    } catch (error: any) {
      console.error("Convert failed:", error);
      toast.error(error.response?.data?.message || "Conversione non riuscita");
    } finally {
      setConverting(false);
    }
  };

  const attachRepayment = async () => {
    if (!selectedLoanId || !selectedIncomeId) {
      toast.error("Seleziona prestito e transazione di entrata");
      return;
    }

    try {
      setAttaching(true);
      await api.loans.adminAttachRepaymentTransaction(selectedLoanId, {
        ...adminPayload,
        transactionId: selectedIncomeId,
        description: repaymentDescription.trim() || undefined
      });

      toast.success("Restituzione collegata al prestito");
      setSelectedIncomeId(null);
      setRepaymentDescription("");
      await loadData();
    } catch (error: any) {
      console.error("Attach failed:", error);
      toast.error(error.response?.data?.message || "Collegamento non riuscito");
    } finally {
      setAttaching(false);
    }
  };

  const TransactionButton = ({
    transaction,
    selected,
    onClick
  }: {
    transaction: Transaction;
    selected: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        selected ? "border-primary bg-primary/15" : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{transaction.title}</div>
          <div className="text-xs text-muted-foreground">
            {transaction.accountName || "Conto"} · {transaction.categoryName || "Categoria"} · {format(new Date(transaction.transactionDate), "dd/MM/yyyy")}
          </div>
        </div>
        <div className={`text-sm font-bold ${transaction.type === "income" ? "text-success" : "text-destructive"}`}>
          {transaction.type === "income" ? "+" : "-"} {formatCurrency(transaction.amount)} €
        </div>
      </div>
      {transaction.note && (
        <NoteText text={transaction.note} className="mt-1 text-xs text-muted-foreground" />
      )}
    </button>
  );

  if (!unlocked) {
    return (
      <div className="min-h-screen px-6 py-8">
        <div className="mx-auto max-w-xl">
          <div className="mb-6 flex items-center gap-3">
            <Link to="/settings" className="rounded-2xl glass-card p-2 interactive-press">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold">Pulizia prestiti</h1>
          </div>
          <GlassCard className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-blue">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Accesso admin</h2>
                <p className="text-sm text-muted-foreground">Strumento desktop per sistemare transazioni storiche.</p>
              </div>
            </div>
            <div className="space-y-3">
              <Input
                value={credentials.username}
                onChange={(event) => setCredentials((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="Utente"
              />
              <Input
                type="password"
                value={credentials.password}
                onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Password"
                onKeyDown={(event) => {
                  if (event.key === "Enter") unlock();
                }}
              />
              <Button className="w-full gap-2" onClick={unlock} disabled={loading}>
                <ShieldCheck className="h-4 w-4" />
                {loading ? "Verifica..." : "Entra"}
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-6 pb-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/settings" className="rounded-2xl glass-card p-2 interactive-press">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Pulizia prestiti</h1>
              <p className="text-sm text-muted-foreground">Converti transazioni vecchie senza duplicare movimenti.</p>
            </div>
          </div>
          <Button variant="outline" className="gap-2" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <GlassCard className="p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">1. Uscita → prestito</h2>
                <p className="text-xs text-muted-foreground">La transazione viene riclassificata come `Prestito` escluso dai totali.</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <Input
                  value={expenseSearch}
                  onChange={(event) => setExpenseSearch(event.target.value)}
                  placeholder="Cerca uscita per titolo, nota, conto o categoria..."
                  className="mb-3"
                />
                <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                  {filteredExpenses.map((transaction) => (
                    <TransactionButton
                      key={transaction.id}
                      transaction={transaction}
                      selected={selectedExpenseId === transaction.id}
                      onClick={() => setSelectedExpenseId(transaction.id)}
                    />
                  ))}
                  {filteredExpenses.length === 0 && (
                    <div className="rounded-lg border border-white/10 p-6 text-center text-sm text-muted-foreground">
                      Nessuna uscita trovata
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Input value={loanTitle} onChange={(event) => setLoanTitle(event.target.value)} placeholder="Titolo prestito" />
                <Input value={loanNote} onChange={(event) => setLoanNote(event.target.value)} placeholder="Nota opzionale" />
                <select
                  value={selectedCategoryId || ""}
                  onChange={(event) => setSelectedCategoryId(Number(event.target.value))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="" disabled>Categoria finale se resta residuo</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {selectedExpense && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-muted-foreground">
                    Selezionata: {selectedExpense.title} · {formatCurrency(selectedExpense.amount)} €
                  </div>
                )}
                <Button className="w-full gap-2" onClick={convertExpense} disabled={converting || !selectedExpenseId}>
                  <CheckCircle2 className="h-4 w-4" />
                  {converting ? "Conversione..." : "Converti in prestito"}
                </Button>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">2. Entrata → restituzione</h2>
                <p className="text-xs text-muted-foreground">L'entrata viene collegata al prestito e riclassificata come restituzione esclusa.</p>
              </div>
              <Link2 className="h-5 w-5 text-primary" />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <Input
                  value={incomeSearch}
                  onChange={(event) => setIncomeSearch(event.target.value)}
                  placeholder="Cerca entrata per titolo, nota, conto o categoria..."
                  className="mb-3"
                />
                <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                  {filteredIncomes.map((transaction) => (
                    <TransactionButton
                      key={transaction.id}
                      transaction={transaction}
                      selected={selectedIncomeId === transaction.id}
                      onClick={() => setSelectedIncomeId(transaction.id)}
                    />
                  ))}
                  {filteredIncomes.length === 0 && (
                    <div className="rounded-lg border border-white/10 p-6 text-center text-sm text-muted-foreground">
                      Nessuna entrata trovata
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <select
                  value={selectedLoanId || ""}
                  onChange={(event) => setSelectedLoanId(Number(event.target.value))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="" disabled>Prestito da aggiornare</option>
                  {loans.map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loan.title} · {loan.currency} {loan.amount.toFixed(2)} · {loan.status}
                    </option>
                  ))}
                </select>
                <Input
                  value={repaymentDescription}
                  onChange={(event) => setRepaymentDescription(event.target.value)}
                  placeholder="Descrizione opzionale"
                />
                {selectedIncome && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-muted-foreground">
                    Selezionata: {selectedIncome.title} · {formatCurrency(selectedIncome.amount)} €
                  </div>
                )}
                <Button className="w-full gap-2" onClick={attachRepayment} disabled={attaching || !selectedLoanId || !selectedIncomeId}>
                  <Link2 className="h-4 w-4" />
                  {attaching ? "Collegamento..." : "Collega restituzione"}
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
