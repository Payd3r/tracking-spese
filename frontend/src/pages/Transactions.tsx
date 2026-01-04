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
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const LIMIT = 50;

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
    setOffset(0); // Reset offset when filters change

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
      loadData(true, 0, false); // reset=true, offset=0, showLoading=false
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

  const loadMoreTransactions = async () => {
    const newOffset = offset + LIMIT;
    setOffset(newOffset);
    await loadData(false, newOffset);
  };

  const loadData = async (reset: boolean = true, customOffset?: number, showLoading: boolean = true) => {
    try {
      const currentOffset = customOffset !== undefined ? customOffset : (reset ? 0 : offset);
      let newBalance = balance;
      let newIncomeTotal = incomeTotal;
      let newExpenseTotal = expenseTotal;

      if (reset && showLoading) {
        setLoading(true);
      } else if (!reset) {
        setLoadingMore(true);
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

      if (isOnline) {
        // Online: fetch from API and cache
        if (reset) {
          const commonFilters = {
            accountId: selectedAccountFilter || undefined,
            categoryId: selectedCategoryFilter || undefined,
            search: searchQuery || undefined,
          };

          // 1. Fetch Categories & Accounts
          // 2. Fetch List Transactions (User filters)
          // 3. Fetch Stats (Stats filters)
          const [categoriesResponse, accountsResponse, transactionsResponse, incomeStatsResponse, expenseStatsResponse] = await Promise.all([
            api.categories.getAll(viewType),
            api.accounts.getAll(),
            api.transactions.getAll({
              type: viewType,
              ...commonFilters,
              startDate: selectedStartDate || undefined,
              endDate: effectiveEndDate || undefined,
              limit: LIMIT,
              offset: currentOffset
            }),
            api.transactions.getAll({
              type: 'income',
              ...commonFilters,
              startDate: statsStartDate,
              endDate: statsEndDate,
              limit: 1, // Only need totals
              offset: 0
            }),
            api.transactions.getAll({
              type: 'expense',
              ...commonFilters,
              startDate: statsStartDate,
              endDate: statsEndDate,
              limit: 1, // Only need totals
              offset: 0
            })
          ]);

          const categoriesData = Array.isArray(categoriesResponse.data.categories) ? categoriesResponse.data.categories : [];
          const accountsData = Array.isArray(accountsResponse.data.accounts) ? accountsResponse.data.accounts : [];
          const txsData = transactionsResponse.data.transactions || [];
          const totalTxs = transactionsResponse.data.total || 0;

          setCategories(categoriesData);
          setAccounts(accountsData);
          setTransactions(Array.isArray(txsData) ? txsData : []);
          setTotalTransactions(totalTxs);

          const incomeVal = incomeStatsResponse.data.totalAmount || 0;
          const expenseVal = expenseStatsResponse.data.totalAmount || 0;

          newIncomeTotal = incomeVal;
          newExpenseTotal = expenseVal;
          newBalance = incomeVal - expenseVal;

          // Cache data for offline use
          await db.cachedCategories.bulkPut(categoriesData);
          await db.cachedAccounts.bulkPut(accountsData);

          if (Array.isArray(txsData)) {
            const userId = user?.id;
            const txsWithUser = userId
              ? txsData.map(tx => ({ ...tx, userId }))
              : txsData;
            await db.cachedTransactions.bulkPut(txsWithUser);
          }
        } else {
          // Load more transactions (List only)
          const transactionsResponse = await api.transactions.getAll({
            type: viewType,
            accountId: selectedAccountFilter || undefined,
            categoryId: selectedCategoryFilter || undefined,
            startDate: selectedStartDate || undefined,
            endDate: effectiveEndDate || undefined,
            search: searchQuery || undefined,
            limit: LIMIT,
            offset: currentOffset
          });

          const newTransactions = transactionsResponse.data.transactions || [];
          const total = transactionsResponse.data.total || 0;

          setTransactions(prev => [...prev, ...(Array.isArray(newTransactions) ? newTransactions : [])]);
          setTotalTransactions(total);

          // Cache new transactions
          if (Array.isArray(newTransactions)) {
            const userId = user?.id;
            const txsWithUser = userId
              ? newTransactions.map(tx => ({ ...tx, userId }))
              : newTransactions;
            await db.cachedTransactions.bulkPut(txsWithUser);
          }
        }
      } else {
        // Offline: load from cache using cacheManager
        if (reset) {
          // Get List data
          const allCachedTransactions = await getCachedTransactions({
            type: viewType,
            accountId: selectedAccountFilter || undefined,
            categoryId: selectedCategoryFilter || undefined,
            startDate: selectedStartDate || undefined,
            endDate: selectedEndDate || undefined,
            search: searchQuery || undefined
          });

          const total = allCachedTransactions.length;
          const paginatedTransactions = allCachedTransactions.slice(currentOffset, currentOffset + LIMIT);

          const cachedCategories = await getCachedCategories(viewType);
          const cachedAccounts = await getCachedAccounts();

          setCategories(cachedCategories);
          setAccounts(cachedAccounts);
          setTransactions(paginatedTransactions);
          setTotalTransactions(total);

          // Get Stats data using stats filters
          const [incomeCached, expenseCached] = await Promise.all([
            getCachedTransactions({
              type: 'income',
              accountId: selectedAccountFilter || undefined,
              categoryId: selectedCategoryFilter || undefined,
              startDate: statsStartDate,
              endDate: statsEndDate,
              search: searchQuery || undefined
            }),
            getCachedTransactions({
              type: 'expense',
              accountId: selectedAccountFilter || undefined,
              categoryId: selectedCategoryFilter || undefined,
              startDate: statsStartDate,
              endDate: statsEndDate,
              search: searchQuery || undefined
            })
          ]);

          const iTotal = incomeCached.reduce((sum, t) => sum + Math.abs(t.amount), 0);
          const eTotal = expenseCached.reduce((sum, t) => sum + Math.abs(t.amount), 0);
          newIncomeTotal = iTotal;
          newExpenseTotal = eTotal;
          newBalance = iTotal - eTotal;
        } else {
          // Load more (List only)
          const allCachedTransactions = await getCachedTransactions({
            type: viewType,
            accountId: selectedAccountFilter || undefined,
            categoryId: selectedCategoryFilter || undefined,
            startDate: selectedStartDate || undefined,
            endDate: selectedEndDate || undefined,
            search: searchQuery || undefined
          });

          const paginatedTransactions = allCachedTransactions.slice(currentOffset, currentOffset + LIMIT);
          setTransactions(prev => [...prev, ...paginatedTransactions]);
        }
      }

      // Load pending transactions for List View
      const pendingTxs = await db.pendingTransactions
        .where('type')
        .equals(viewType)
        .toArray();

      if (pendingTxs.length > 0) {
        const mergedPendingTxs = pendingTxs.map(pt => ({
          ...pt,
          id: parseInt(pt.tempId.replace(/\D/g, '')),
          accountName: pt.accountName || 'Account sconosciuto',
          categoryName: pt.categoryName || 'Categoria sconosciuta',
          accountCurrency: pt.accountCurrency || 'EUR',
          categoryIcon: pt.categoryIcon || 'HelpCircle',
          categoryColor: pt.categoryColor || 'gradient-gray',
          isPending: true,
          updatedAt: pt.createdAt
        }));

        if (reset) {
          setTransactions(prev => [...mergedPendingTxs, ...prev]);
        } else {
          setTransactions(prev => [...prev, ...mergedPendingTxs]);
        }
        setTotalTransactions(prev => prev + pendingTxs.length);
      }

      // Update stats with ALL pending transactions if they fall within stats range
      if (reset) {
        const allPending = await db.pendingTransactions.toArray();

        const isDateInRange = (dateStr: string) => {
          if (!dateStr) return true;
          const d = new Date(dateStr).getTime();
          const s = new Date(statsStartDate).getTime();
          // Adding 1 day + a bit to ensure we cover the whole end day (if it's just 'YYYY-MM-DD')
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

        newIncomeTotal += pendingIncome;
        newExpenseTotal += pendingExpense;
        newBalance = newIncomeTotal - newExpenseTotal;
      }

      if (reset) {
        setBalance(newBalance);
        setIncomeTotal(newIncomeTotal);
        setExpenseTotal(newExpenseTotal);
      }
    } catch (err: any) {
      console.error("Failed to load data:", err);
      setError(err.response?.data?.message || "Errore nel caricamento dei dati");
      if (reset) {
        setCategories([]);
        setAccounts([]);
        setTransactions([]);
        setBalance(0);
        setIncomeTotal(0);
        setExpenseTotal(0);
      }
    } finally {
      if (reset && showLoading) {
        setLoading(false);
      }
      setLoadingMore(false);
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
            € {formatCurrency(Math.abs(balance))}
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
                <RouterLink key={transaction.id} to={`/transaction/${transaction.id}`}>
                  <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer rounded-lg px-1.5 interactive-press">
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

            {/* Load More Button */}
            {transactions.length < totalTransactions && (
              <Button
                onClick={loadMoreTransactions}
                disabled={loadingMore}
                variant="outline"
                className="w-full mt-4 h-11 text-sm font-medium"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Caricamento...
                  </>
                ) : (
                  `Altre... (${totalTransactions - transactions.length} rimanenti)`
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
