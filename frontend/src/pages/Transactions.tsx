import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { ArrowLeft, Loader2, ChevronUp, Filter, Search } from "lucide-react";
import { Link, Link as RouterLink } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Category, Transaction, Account } from "@/types/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useSync } from "@/contexts/SyncContext";
import { db } from "@/lib/db";
import { getCachedCategories, getCachedAccounts, getCachedTransactions } from "@/lib/cacheManager";
import { formatCurrency } from "@/lib/utils";
import { useUser } from "@clerk/clerk-react";

export default function Transactions() {
  const { isOnline } = useSync();
  const { user } = useUser();
  const [viewType, setViewType] = useState<"income" | "expense">("expense");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<number | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<string>("");
  const [selectedEndDate, setSelectedEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchInputValue, setSearchInputValue] = useState<string>("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Temporary filter states (before applying)
  const [tempAccountFilter, setTempAccountFilter] = useState<number | null>(null);
  const [tempCategoryFilter, setTempCategoryFilter] = useState<number | null>(null);
  const [tempStartDate, setTempStartDate] = useState<string>("");
  const [tempEndDate, setTempEndDate] = useState<string>("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [balance, setBalance] = useState(0);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(searchInputValue);
    }, 300); // 300ms delay

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInputValue]);

  // Track previous search query to detect if only search changed
  const prevSearchQueryRef = useRef<string>("");
  const prevFiltersRef = useRef({
    viewType,
    selectedAccountFilter,
    selectedCategoryFilter,
    selectedStartDate,
    selectedEndDate
  });

  useEffect(() => {
    // Check if only search query changed
    const onlySearchChanged =
      prevSearchQueryRef.current !== searchQuery &&
      prevFiltersRef.current.viewType === viewType &&
      prevFiltersRef.current.selectedAccountFilter === selectedAccountFilter &&
      prevFiltersRef.current.selectedCategoryFilter === selectedCategoryFilter &&
      prevFiltersRef.current.selectedStartDate === selectedStartDate &&
      prevFiltersRef.current.selectedEndDate === selectedEndDate;

    // Update refs
    prevSearchQueryRef.current = searchQuery;
    prevFiltersRef.current = {
      viewType,
      selectedAccountFilter,
      selectedCategoryFilter,
      selectedStartDate,
      selectedEndDate
    };

    // If only search changed, don't show full loading
    if (onlySearchChanged) {
      loadData(false); // showLoading=false
    } else {
      loadData(true);
    }
  }, [viewType, selectedAccountFilter, selectedCategoryFilter, selectedStartDate, selectedEndDate, searchQuery]);

  const applyFilters = () => {
    setSelectedAccountFilter(tempAccountFilter);
    setSelectedCategoryFilter(tempCategoryFilter);
    setSelectedStartDate(tempStartDate);
    setSelectedEndDate(tempEndDate);
    setFiltersExpanded(false);
  };

  const clearFilters = () => {
    setTempAccountFilter(null);
    setTempCategoryFilter(null);
    setTempStartDate("");
    setTempEndDate("");
    setSelectedAccountFilter(null);
    setSelectedCategoryFilter(null);
    setSelectedStartDate("");
    setSelectedEndDate("");
    setSearchQuery("");
    setSearchInputValue("");
  };

  const loadData = async (showLoading: boolean = true) => {
    try {
      let newBalance = balance;
      let newIncomeTotal = incomeTotal;
      let newExpenseTotal = expenseTotal;

      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Calculate date filters for the LIST (User filters)
      const effectiveEndDate = selectedStartDate && !selectedEndDate
        ? selectedStartDate
        : selectedEndDate;

      // Calculate date filters for the STATS (Defaults to Current Year)
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;
      const endOfYear = `${currentYear}-12-31`;

      // Unless user specified a date, we default stats to Current Year
      const statsStartDate = selectedStartDate || startOfYear;
      const statsEndDate = selectedStartDate ? effectiveEndDate : endOfYear;

      // 1. Always load PENDING transactions first
      const allPending = await db.pendingTransactions.toArray();

      // Filter pending by current filters
      const pendingFiltered = allPending.filter(pt => {
        // Type filter
        if (pt.type !== viewType) return false;

        // Account filter
        if (selectedAccountFilter && pt.accountId !== selectedAccountFilter) return false;

        // Category filter
        if (selectedCategoryFilter && pt.categoryId !== selectedCategoryFilter) return false;

        // Date filter
        if (selectedStartDate) {
          const ptDate = new Date(pt.transactionDate);
          const start = new Date(selectedStartDate);
          start.setHours(0, 0, 0, 0);
          if (ptDate < start) return false;

          if (effectiveEndDate) {
            const end = new Date(effectiveEndDate);
            end.setHours(23, 59, 59, 999);
            if (ptDate > end) return false;
          } else {
            // Exact match single day
            const nextDay = new Date(start);
            nextDay.setDate(nextDay.getDate() + 1);
            if (ptDate >= nextDay) return false;
          }
        }

        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const titleMatch = pt.title?.toLowerCase().includes(query) || false;
          const noteMatch = (pt.note || '').toLowerCase().includes(query);
          if (!titleMatch && !noteMatch) return false;
        }

        return true;
      });

      // Map pending to Transaction type
      const mappedPending: Transaction[] = pendingFiltered.map(pt => ({
        ...pt,
        id: -1, // Placeholder ID, will key by tempId usually but lists rely on id
        // Use a negative hash or just -1, but key prop in React needs to be unique. 
        // We will handle key in render or let's try to generate a fake number hash if possible, 
        // or just rely on the component using optional logic? 
        // Actually, Transaction.id is number. We can use -Math.abs(hash(tempId)) or just random.
        // Better: mapped Pending items should use a prop 'tempId' if we had it in type.
        // Typescript allows extra props.

        // Let's generate a temporary numeric ID from the tempId string hash to satisfy the type
        userId: pt.userId,
        originalAmount: pt.amount,
        createdAt: pt.createdAt,
        updatedAt: pt.createdAt,
        isPending: true, // IMPORTANT
        clientRequestId: pt.tempId // Store tempId here
      } as unknown as Transaction)); // Cast to Transaction for now


      let fetchedTransactions: Transaction[] = [];
      let totalTxs = 0;

      if (isOnline) {
        // Online: fetch from API and cache
        const commonFilters = {
          accountId: selectedAccountFilter || undefined,
          categoryId: selectedCategoryFilter || undefined,
          search: searchQuery || undefined,
        };

        const [categoriesResponse, accountsResponse, transactionsResponse, incomeStatsResponse, expenseStatsResponse] = await Promise.all([
          api.categories.getAll(viewType),
          api.accounts.getAll(),
          api.transactions.getAll({
            type: viewType,
            ...commonFilters,
            startDate: selectedStartDate || undefined,
            endDate: effectiveEndDate || undefined,
          }),
          api.transactions.getAll({
            type: 'income',
            ...commonFilters,
            startDate: statsStartDate,
            endDate: statsEndDate,
            limit: 1,
            offset: 0
          }),
          api.transactions.getAll({
            type: 'expense',
            ...commonFilters,
            startDate: statsStartDate,
            endDate: statsEndDate,
            limit: 1,
            offset: 0
          })
        ]);

        const categoriesData = Array.isArray(categoriesResponse.data.categories) ? categoriesResponse.data.categories : [];
        const accountsData = Array.isArray(accountsResponse.data.accounts) ? accountsResponse.data.accounts : [];
        const txsData = transactionsResponse.data.transactions || [];
        totalTxs = transactionsResponse.data.total || 0;

        setCategories(categoriesData);
        setAccounts(accountsData);
        fetchedTransactions = Array.isArray(txsData) ? txsData : [];

        const incomeVal = incomeStatsResponse.data.totalAmount || 0;
        const expenseVal = expenseStatsResponse.data.totalAmount || 0;

        newIncomeTotal = incomeVal;
        newExpenseTotal = expenseVal;

        // Cache data
        await db.cachedCategories.bulkPut(categoriesData);
        await db.cachedAccounts.bulkPut(accountsData);
        if (Array.isArray(txsData)) {
          const userId = user?.id;
          const txsWithUser = userId ? txsData.map(tx => ({ ...tx, userId })) : txsData;
          await db.cachedTransactions.bulkPut(txsWithUser);
        }
      } else {
        // Offline: load from cache
        const allCachedTransactions = await getCachedTransactions({
          type: viewType,
          accountId: selectedAccountFilter || undefined,
          categoryId: selectedCategoryFilter || undefined,
          startDate: selectedStartDate || undefined,
          endDate: selectedEndDate || undefined,
          search: searchQuery || undefined
        });

        const cachedCategories = await getCachedCategories(viewType);
        const cachedAccounts = await getCachedAccounts();

        setCategories(cachedCategories);
        setAccounts(cachedAccounts);
        fetchedTransactions = allCachedTransactions;
        totalTxs = allCachedTransactions.length;

        // Offline Stats (approximate)
        const [incomeCached, expenseCached] = await Promise.all([
          getCachedTransactions({ type: 'income', startDate: statsStartDate, endDate: statsEndDate }),
          getCachedTransactions({ type: 'expense', startDate: statsStartDate, endDate: statsEndDate })
        ]);

        newIncomeTotal = incomeCached.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        newExpenseTotal = expenseCached.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      }

      // MERGE: Pending + Fetched
      // Filter out duplicate pending items (if they synced but we haven't cleared pending yet? rarely happens if sync logic creates mapped entry)
      // Actually sync logic clears pending immediately.

      const merged = [...mappedPending, ...fetchedTransactions];

      // Sort Merged (descending date)
      merged.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

      setTransactions(merged);
      setTotalTransactions(merged.length);

      // Update Balance with pending adjustments
      // Assuming api.transactions.getAll returns 'totalAmount' that DOES NOT include pending.
      // We must add pending amounts to the running totals.

      // Filter pending for stats (global pending, not just the list view)
      // Only items that match STATS date range
      const isDateInRange = (dateStr: string) => {
        if (!dateStr) return true;
        const d = new Date(dateStr).getTime();
        const s = new Date(statsStartDate).getTime();
        const eStr = statsEndDate || endOfYear;
        const e = new Date(eStr).getTime();
        return d >= s && d <= e + 86400000;
      };

      const pendingIncome = allPending
        .filter(pt => pt.type === 'income' && isDateInRange(pt.createdAt))
        .reduce((sum, pt) => sum + Math.abs(pt.amount || 0), 0);

      const pendingExpense = allPending
        .filter(pt => pt.type === 'expense' && isDateInRange(pt.createdAt))
        .reduce((sum, pt) => sum + Math.abs(pt.amount || 0), 0);

      if (isOnline) {
        // API totals don't have pending, so add them
        newIncomeTotal += pendingIncome;
        newExpenseTotal += pendingExpense;
      } else {
        // Cache totals (calculated manually above) also don't have pending, so add them
        newIncomeTotal += pendingIncome;
        newExpenseTotal += pendingExpense;
      }

      newBalance = newIncomeTotal - newExpenseTotal;
      setBalance(newBalance);
      setIncomeTotal(newIncomeTotal);
      setExpenseTotal(newExpenseTotal);

    } catch (err: any) {
      console.error("Failed to load data:", err);
      setError(err.response?.data?.message || "Errore nel caricamento dei dati");
      setTransactions([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Listen for data synced event
  useEffect(() => {
    const handleDataSynced = () => {
      loadData(true); // Reload all data after sync
    };

    const handleTransactionUpdated = () => {
      loadData(true); // Reload data after an update/delete on a single transaction
    };

    window.addEventListener('dataSynced', handleDataSynced);
    window.addEventListener('transactionUpdated', handleTransactionUpdated);
    return () => {
      window.removeEventListener('dataSynced', handleDataSynced);
      window.removeEventListener('transactionUpdated', handleTransactionUpdated);
    };
  }, [viewType, selectedAccountFilter, selectedCategoryFilter, selectedStartDate, selectedEndDate, searchQuery]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-3 pt-4 pb-28 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/" className="p-1.5 glass-card rounded-2xl interactive-press">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1">Tutte le transazioni</h1>
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="p-1.5 glass-card rounded-2xl transition-all interactive-press"
        >
          {filtersExpanded ? <ChevronUp className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
        </button>
      </div>

      {error && (
        <div className="glass-card p-4 mb-6 tone-danger">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Saldo sintetico */}
      <GlassCard className="p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-destructive">
            € {formatCurrency(Math.abs(expenseTotal))}
          </span>
          <span className={`text-2xl font-bold ${balance === 0 ? 'text-white' : balance > 0 ? 'text-success' : 'text-destructive'}`}>
            {balance < 0 ? '-' : ''}€ {formatCurrency(Math.abs(balance))}
          </span>
          <span className="text-xs font-semibold text-success">
            € {formatCurrency(Math.abs(incomeTotal))}
          </span>
        </div>
      </GlassCard>

      {/* Toggle Income/Expense */}
      <GlassCard className="p-2 mb-4 flex gap-2">
        <button
          onClick={() => setViewType("expense")}
          className={`flex-1 py-2 rounded-2xl text-sm font-medium transition-all interactive-press ${viewType === "expense" ? "pill-active" : "text-muted-foreground"
            }`}
        >
          Uscite
        </button>
        <button
          onClick={() => setViewType("income")}
          className={`flex-1 py-2 rounded-2xl text-sm font-medium transition-all interactive-press ${viewType === "income" ? "pill-active" : "text-muted-foreground"
            }`}
        >
          Entrate
        </button>
      </GlassCard>

      {/* Search Input - Compact */}
      <div className="mb-4">
        <GlassCard className="p-2">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              placeholder="Cerca per descrizione..."
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/50"
            />
          </div>
        </GlassCard>
      </div>

      {/* Expandable Filters */}
      {filtersExpanded && (
        <GlassCard className="p-4 mb-4">
          <h3 className="text-sm font-semibold mb-3">Filtri</h3>

          {/* Account Filter */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-2 block">Conto</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTempAccountFilter(null)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all interactive-press ${tempAccountFilter === null
                  ? "pill-active"
                  : "glass-card text-white/70"
                  }`}
              >
                Tutti
              </button>
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => setTempAccountFilter(account.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all interactive-press ${tempAccountFilter === account.id
                    ? "pill-active"
                    : "glass-card text-white/70"
                    }`}
                >
                  {account.name}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-2 block">Categoria</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTempCategoryFilter(null)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all interactive-press ${tempCategoryFilter === null
                  ? "pill-active"
                  : "glass-card text-white/70"
                  }`}
              >
                Tutte
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setTempCategoryFilter(category.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all interactive-press ${tempCategoryFilter === category.id
                    ? "pill-active"
                    : "glass-card text-white/70"
                    }`}
                >
                  <IconRenderer icon={category.icon} size={14} />
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Date Filters - Inline Compact */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-2 block">Filtri data</label>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground mb-1 block">Data inizio</label>
                <div className="glass-card px-2 py-1.5 rounded-lg">
                  <input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-xs text-white"
                    style={{ fontSize: '12px', WebkitAppearance: 'none' }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground mb-1 block">Data fine (opz.)</label>
                <div className="glass-card px-2 py-1.5 rounded-lg">
                  <input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-xs text-white"
                    style={{ fontSize: '12px', WebkitAppearance: 'none' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Apply/Clear Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={clearFilters}
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
            >
              Cancella
            </Button>
            <Button
              onClick={applyFilters}
              size="sm"
              className="flex-1 text-xs h-8"
            >
              Applica
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Active Filters Display */}
      {(selectedAccountFilter || selectedCategoryFilter || selectedStartDate || selectedEndDate) && (
        <div className="mb-3 flex gap-2 flex-wrap">
          {selectedAccountFilter && (
            <div className="glass-card px-3 py-1.5 text-xs flex items-center gap-2">
              <span>Conto: {accounts.find(a => a.id === selectedAccountFilter)?.name}</span>
              <button onClick={() => setSelectedAccountFilter(null)} className="text-destructive">×</button>
            </div>
          )}
          {selectedCategoryFilter && (
            <div className="glass-card px-3 py-1.5 text-xs flex items-center gap-2">
              <span>Categoria: {categories.find(c => c.id === selectedCategoryFilter)?.name}</span>
              <button onClick={() => setSelectedCategoryFilter(null)} className="text-destructive">×</button>
            </div>
          )}
          {selectedStartDate && (
            <div className="glass-card px-3 py-1.5 text-xs flex items-center gap-2">
              <span>Dal: {format(new Date(selectedStartDate), 'dd/MM/yyyy')}</span>
              <button onClick={() => setSelectedStartDate("")} className="text-destructive">×</button>
            </div>
          )}
          {selectedEndDate && (
            <div className="glass-card px-3 py-1.5 text-xs flex items-center gap-2">
              <span>Al: {format(new Date(selectedEndDate), 'dd/MM/yyyy')}</span>
              <button onClick={() => setSelectedEndDate("")} className="text-destructive">×</button>
            </div>
          )}
        </div>
      )}

      {/* Transactions List */}
      <div className="glass-card p-4 mb-4">
        {transactions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Nessuna transazione trovata</p>
        ) : (
          <>
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <RouterLink key={transaction.id > 0 ? transaction.id : transaction.clientRequestId} to={transaction.id > 0 ? `/transaction/${transaction.id}` : '#'}>
                  <div className={`flex items-center justify-between py-2 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer rounded-lg px-1.5 interactive-press ${transaction.isPending ? 'opacity-70' : ''}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg ${transaction.categoryColor || 'gradient-blue'} flex items-center justify-center`}>
                        <IconRenderer icon={transaction.categoryIcon} size={16} />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{transaction.title}</h4>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(transaction.transactionDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    <span className={`font-semibold text-sm ${transaction.isPending
                      ? 'text-warning'
                      : transaction.type === 'income'
                        ? 'text-success'
                        : 'text-destructive'
                      }`}>
                      {transaction.type === 'income' ? '+' : '-'}€ {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                </RouterLink>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
