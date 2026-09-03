import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { ArrowLeft, ChevronUp, Filter, RotateCcw, Search, Calendar, Wallet, Tag, Banknote, FileText, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionRowSkeleton } from "@/components/skeletons/TransactionRowSkeleton";
import { Link, Link as RouterLink } from "react-router-dom";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { Category, Transaction, Account } from "@/types/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useSync } from "@/contexts/SyncContext";
import { db } from "@/lib/db";
import { getCachedCategories, getCachedAccounts, getCachedTransactions, isCountedTransaction, sortCategoriesByUsage } from "@/lib/cacheManager";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { MobileDateInput } from "@/components/MobileDateInput";
import { Slider } from "@/components/ui/slider";
import {
  computeAmountBounds,
  countActiveFilters,
  DatePreset,
  EMPTY_TRANSACTION_FILTERS,
  filterTransactionsByAmount,
  filtersFromPageState,
  getDateRangeFromPreset,
  getSliderStep,
  getTodayDateString,
  isAmountFilterActive,
  normalizeAmountFilter,
  resolveEndDate,
  SortOption,
  sortTransactions,
  TRANSACTIONS_PAGE_SIZE,
  TransactionListFilters,
} from "@/lib/transactionFilters";
import {
  getScrollContainer,
  readTransactionsPageState,
  TransactionsPageState,
  writeTransactionsPageState,
} from "@/lib/transactionsPageState";
import { usePreventIosBackSwipe } from "@/hooks/usePreventIosBackSwipe";
import { TransactionFiltersSheet } from "@/components/TransactionFiltersSheet";

const truncateText = (text: string, maxLength: number) =>
  text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;

const initialPageState = readTransactionsPageState();

const PRESET_LABELS: Record<DatePreset, string> = {
  all: "Tutto",
  this_month: "Questo mese",
  last_month: "Mese scorso",
  this_year: "Quest'anno",
  custom: "Personalizzato",
};

const SORT_LABELS: Record<SortOption, string> = {
  date_desc: "Più recenti",
  date_asc: "Meno recenti",
  amount_desc: "Importo maggiore",
  amount_asc: "Importo minore",
  title_asc: "Titolo (A-Z)",
};

export default function Transactions() {
  usePreventIosBackSwipe();
  const { isOnline } = useSync();
  const { user } = useAuth();
  const [viewType, setViewType] = useState<"income" | "expense">(
    () => initialPageState?.viewType ?? "expense"
  );
  const [filtersExpanded, setFiltersExpanded] = useState(
    () => initialPageState?.filtersExpanded ?? false
  );
  const [appliedFilters, setAppliedFilters] = useState<TransactionListFilters>(() =>
    filtersFromPageState(initialPageState)
  );
  const [draftFilters, setDraftFilters] = useState<TransactionListFilters>(appliedFilters);
  const [searchQuery, setSearchQuery] = useState<string>(
    () => initialPageState?.searchQuery ?? ""
  );
  const [searchInputValue, setSearchInputValue] = useState<string>(
    () => initialPageState?.searchInputValue ?? ""
  );
  const [listLimit, setListLimit] = useState(
    () => initialPageState?.listLimit ?? TRANSACTIONS_PAGE_SIZE
  );
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRestoreRef = useRef<number | null>(initialPageState?.scrollTop ?? null);
  const skipInitialPersistRef = useRef(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Desktop direct numeric input values for Min and Max amount
  const [desktopMinInput, setDesktopMinInput] = useState<string>(
    appliedFilters.minAmount !== null ? String(appliedFilters.minAmount) : ""
  );
  const [desktopMaxInput, setDesktopMaxInput] = useState<string>(
    appliedFilters.maxAmount !== null ? String(appliedFilters.maxAmount) : ""
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [baseTransactions, setBaseTransactions] = useState<Transaction[]>([]);
  const [apiTotal, setApiTotal] = useState(0);
  const [balance, setBalance] = useState(0);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountBounds = useMemo(() => computeAmountBounds(baseTransactions), [baseTransactions]);
  const sliderStep = getSliderStep(amountBounds.min, amountBounds.max);

  const displayedTransactions = useMemo(() => {
    let list = filterTransactionsByAmount(
      baseTransactions,
      appliedFilters.minAmount,
      appliedFilters.maxAmount
    );

    const accIds = appliedFilters.accountIds || [];
    const catIds = appliedFilters.categoryIds || [];

    if (accIds.length > 0) {
      list = list.filter((t) => accIds.includes(t.accountId));
    }
    if (catIds.length > 0) {
      list = list.filter((t) => catIds.includes(t.categoryId));
    }

    return sortTransactions(list, appliedFilters.sortBy);
  }, [baseTransactions, appliedFilters]);

  const amountFilterActive = isAmountFilterActive(
    appliedFilters.minAmount,
    appliedFilters.maxAmount,
    amountBounds
  );

  const activeCount = useMemo(
    () => countActiveFilters(appliedFilters, amountBounds),
    [appliedFilters, amountBounds]
  );

  const hasActiveFilters = activeCount > 0;

  const persistPageState = useCallback(
    (overrides: Partial<TransactionsPageState> = {}) => {
      writeTransactionsPageState({
        viewType,
        filters: appliedFilters,
        searchQuery,
        searchInputValue,
        filtersExpanded,
        listLimit,
        scrollTop: getScrollContainer()?.scrollTop ?? 0,
        ...overrides,
      });
    },
    [viewType, appliedFilters, searchQuery, searchInputValue, filtersExpanded, listLimit]
  );

  const openFilters = () => {
    setDraftFilters({
      ...appliedFilters,
      minAmount: appliedFilters.minAmount,
      maxAmount: appliedFilters.maxAmount,
    });
    setFiltersExpanded(true);
  };

  const applyFilters = () => {
    const endDate = resolveEndDate(draftFilters.startDate, draftFilters.endDate);
    const normalizedAmount = normalizeAmountFilter(
      draftFilters.minAmount,
      draftFilters.maxAmount,
      amountBounds
    );

    setAppliedFilters({
      ...draftFilters,
      endDate,
      noteQuery: draftFilters.noteQuery.trim(),
      ...normalizedAmount,
    });
    setListLimit(TRANSACTIONS_PAGE_SIZE);
    setFiltersExpanded(false);
  };

  const clearFilters = () => {
    const cleared = { ...EMPTY_TRANSACTION_FILTERS };
    setDraftFilters(cleared);
    setAppliedFilters(cleared);
    setSearchQuery("");
    setSearchInputValue("");
    setDesktopMinInput("");
    setDesktopMaxInput("");
    setListLimit(TRANSACTIONS_PAGE_SIZE);
  };

  const removeAccountFilter = (id: number) => {
    setAppliedFilters((prev) => ({
      ...prev,
      accountIds: prev.accountIds.filter((aId) => aId !== id),
    }));
    setDraftFilters((prev) => ({
      ...prev,
      accountIds: prev.accountIds.filter((aId) => aId !== id),
    }));
    setListLimit(TRANSACTIONS_PAGE_SIZE);
  };

  const removeCategoryFilter = (id: number) => {
    setAppliedFilters((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.filter((cId) => cId !== id),
    }));
    setDraftFilters((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.filter((cId) => cId !== id),
    }));
    setListLimit(TRANSACTIONS_PAGE_SIZE);
  };

  const removeFilter = (key: keyof TransactionListFilters) => {
    const update = (prev: TransactionListFilters): TransactionListFilters => {
      if (key === "accountIds") return { ...prev, accountIds: [] };
      if (key === "categoryIds") return { ...prev, categoryIds: [] };
      if (key === "minAmount" || key === "maxAmount") {
        setDesktopMinInput("");
        setDesktopMaxInput("");
        return { ...prev, minAmount: null, maxAmount: null };
      }
      if (key === "startDate") return { ...prev, startDate: "", endDate: "", datePreset: "all" };
      if (key === "endDate") return { ...prev, endDate: "" };
      if (key === "datePreset") return { ...prev, datePreset: "all", startDate: "", endDate: "" };
      if (key === "includeLoans") return { ...prev, includeLoans: false };
      if (key === "sortBy") return { ...prev, sortBy: "date_desc" };
      return { ...prev, [key]: "" } as TransactionListFilters;
    };

    setAppliedFilters(update);
    setDraftFilters(update);
    setListLimit(TRANSACTIONS_PAGE_SIZE);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (skipInitialPersistRef.current) {
      skipInitialPersistRef.current = false;
      return;
    }
    persistPageState();
  }, [persistPageState]);

  useEffect(() => {
    const scrollEl = getScrollContainer();
    if (!scrollEl) return;

    const handleScroll = () => {
      if (scrollSaveTimeoutRef.current) clearTimeout(scrollSaveTimeoutRef.current);
      scrollSaveTimeoutRef.current = setTimeout(() => {
        persistPageState({ scrollTop: scrollEl.scrollTop });
      }, 150);
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
      if (scrollSaveTimeoutRef.current) clearTimeout(scrollSaveTimeoutRef.current);
    };
  }, [persistPageState]);

  useEffect(() => {
    if (loading || scrollRestoreRef.current === null) return;

    const scrollTop = scrollRestoreRef.current;
    scrollRestoreRef.current = null;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const scrollEl = getScrollContainer();
        if (scrollEl) scrollEl.scrollTop = scrollTop;
      });
    });
  }, [loading, displayedTransactions.length]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(searchInputValue);
      setListLimit(TRANSACTIONS_PAGE_SIZE);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchInputValue]);

  const loadData = useCallback(
    async (showLoading: boolean = true) => {
      try {
        if (showLoading) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        const effectiveEndDate = appliedFilters.startDate
          ? resolveEndDate(appliedFilters.startDate, appliedFilters.endDate)
          : "";

        const currentYear = new Date().getFullYear();
        const startOfYear = `${currentYear}-01-01`;
        const endOfYear = `${currentYear}-12-31`;
        const statsStartDate = appliedFilters.startDate || startOfYear;
        const statsEndDate = appliedFilters.startDate ? effectiveEndDate : endOfYear;

        const allPending = await db.pendingTransactions.toArray();
        const pendingFiltered = allPending.filter((pt) => {
          if (pt.type !== viewType) return false;
          if (
            appliedFilters.accountIds.length > 0 &&
            !appliedFilters.accountIds.includes(pt.accountId)
          )
            return false;
          if (
            appliedFilters.categoryIds.length > 0 &&
            !appliedFilters.categoryIds.includes(pt.categoryId)
          )
            return false;

          if (appliedFilters.startDate) {
            const ptDate = new Date(pt.transactionDate);
            const start = new Date(appliedFilters.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(effectiveEndDate);
            end.setHours(23, 59, 59, 999);
            if (ptDate < start || ptDate > end) return false;
          }

          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const titleMatch = pt.title?.toLowerCase().includes(query) || false;
            const noteMatch = (pt.note || "").toLowerCase().includes(query);
            if (!titleMatch && !noteMatch) return false;
          }

          if (appliedFilters.noteQuery) {
            const noteQuery = appliedFilters.noteQuery.toLowerCase();
            if (!(pt.note || "").toLowerCase().includes(noteQuery)) return false;
          }

          return true;
        });

        const mappedPending: Transaction[] = pendingFiltered.map(
          (pt) =>
            ({
              ...pt,
              id: -1,
              userId: pt.userId,
              originalAmount: pt.amount,
              createdAt: pt.createdAt,
              updatedAt: pt.createdAt,
              isPending: true,
              clientRequestId: pt.tempId,
            }) as unknown as Transaction
        );

        let fetchedTransactions: Transaction[] = [];
        let totalFromApi = 0;
        let newIncomeTotal = 0;
        let newExpenseTotal = 0;

        const singleAccountId =
          appliedFilters.accountIds.length === 1 ? appliedFilters.accountIds[0] : undefined;
        const singleCategoryId =
          appliedFilters.categoryIds.length === 1 ? appliedFilters.categoryIds[0] : undefined;

        const apiFilters = {
          accountId: singleAccountId,
          categoryId: singleCategoryId,
          search: searchQuery || undefined,
          note: appliedFilters.noteQuery || undefined,
          startDate: appliedFilters.startDate || undefined,
          endDate: effectiveEndDate || undefined,
          includeLoans: appliedFilters.includeLoans,
          limit: listLimit,
          offset: 0,
        };

        if (isOnline) {
          const [
            categoriesResponse,
            accountsResponse,
            transactionsResponse,
            incomeStatsResponse,
            expenseStatsResponse,
          ] = await Promise.all([
            api.categories.getAll(viewType),
            api.accounts.getAll(),
            api.transactions.getAll({ type: viewType, ...apiFilters }),
            api.transactions.getAll({
              type: "income",
              accountId: apiFilters.accountId,
              categoryId: apiFilters.categoryId,
              search: apiFilters.search,
              note: apiFilters.note,
              startDate: statsStartDate,
              endDate: statsEndDate,
              includeLoans: appliedFilters.includeLoans,
              limit: 1,
              offset: 0,
            }),
            api.transactions.getAll({
              type: "expense",
              accountId: apiFilters.accountId,
              categoryId: apiFilters.categoryId,
              search: apiFilters.search,
              note: apiFilters.note,
              startDate: statsStartDate,
              endDate: statsEndDate,
              includeLoans: appliedFilters.includeLoans,
              limit: 1,
              offset: 0,
            }),
          ]);

          const categoriesData = sortCategoriesByUsage(
            Array.isArray(categoriesResponse.data.categories)
              ? categoriesResponse.data.categories
              : []
          );
          const accountsData = Array.isArray(accountsResponse.data.accounts)
            ? accountsResponse.data.accounts
            : [];
          const txsData = transactionsResponse.data.transactions || [];
          totalFromApi = transactionsResponse.data.total || 0;

          setCategories(categoriesData);
          setAccounts(accountsData);
          fetchedTransactions = Array.isArray(txsData) ? txsData : [];
          newIncomeTotal = incomeStatsResponse.data.totalAmount || 0;
          newExpenseTotal = expenseStatsResponse.data.totalAmount || 0;

          if (Array.isArray(categoriesData) && categoriesData.length > 0) {
            await db.cachedCategories.bulkPut(categoriesData);
          }
          if (Array.isArray(accountsData) && accountsData.length > 0) {
            await db.cachedAccounts.bulkPut(accountsData);
          }
        } else {
          const cachedCategories = await getCachedCategories();
          const cachedAccounts = await getCachedAccounts();
          const cachedTransactions = await getCachedTransactions();

          const sortedCategories = sortCategoriesByUsage(
            cachedCategories.filter(
              (c) => c.type === viewType || c.type === "both"
            )
          );

          setCategories(sortedCategories);
          setAccounts(cachedAccounts);

          const filtered = cachedTransactions.filter((t) => {
            if (t.type !== viewType) return false;
            if (
              appliedFilters.accountIds.length > 0 &&
              !appliedFilters.accountIds.includes(t.accountId)
            )
              return false;
            if (
              appliedFilters.categoryIds.length > 0 &&
              !appliedFilters.categoryIds.includes(t.categoryId)
            )
              return false;

            if (appliedFilters.startDate) {
              const tDate = new Date(t.transactionDate);
              const start = new Date(appliedFilters.startDate);
              start.setHours(0, 0, 0, 0);
              const end = new Date(effectiveEndDate);
              end.setHours(23, 59, 59, 999);
              if (tDate < start || tDate > end) return false;
            }

            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              const titleMatch = t.title?.toLowerCase().includes(query) || false;
              const noteMatch = (t.note || "").toLowerCase().includes(query);
              if (!titleMatch && !noteMatch) return false;
            }

            if (appliedFilters.noteQuery) {
              const noteQuery = appliedFilters.noteQuery.toLowerCase();
              if (!(t.note || "").toLowerCase().includes(noteQuery)) return false;
            }

            return true;
          });

          totalFromApi = filtered.length;
          fetchedTransactions = filtered.slice(0, listLimit);

          const incomeCached = cachedTransactions.filter(
            (t) =>
              t.type === "income" &&
              (appliedFilters.accountIds.length === 0 ||
                appliedFilters.accountIds.includes(t.accountId)) &&
              (appliedFilters.categoryIds.length === 0 ||
                appliedFilters.categoryIds.includes(t.categoryId))
          );
          const expenseCached = cachedTransactions.filter(
            (t) =>
              t.type === "expense" &&
              (appliedFilters.accountIds.length === 0 ||
                appliedFilters.accountIds.includes(t.accountId)) &&
              (appliedFilters.categoryIds.length === 0 ||
                appliedFilters.categoryIds.includes(t.categoryId))
          );

          newIncomeTotal = incomeCached
            .filter((t) => isCountedTransaction(t, appliedFilters.includeLoans))
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
          newExpenseTotal = expenseCached
            .filter((t) => isCountedTransaction(t, appliedFilters.includeLoans))
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        }

        const combinedMap = new Map<string | number, Transaction>();
        mappedPending.forEach((pt) => combinedMap.set(pt.clientRequestId, pt));
        fetchedTransactions.forEach((tx) => {
          if (!tx.clientRequestId || !combinedMap.has(tx.clientRequestId)) {
            combinedMap.set(tx.id, tx);
          }
        });

        const combinedList = Array.from(combinedMap.values());
        setBaseTransactions(combinedList);
        setApiTotal(totalFromApi + mappedPending.length);

        const isDateInRange = (dateStr: string) => {
          if (!dateStr) return true;
          const d = new Date(dateStr).getTime();
          const s = new Date(statsStartDate).getTime();
          const e = new Date(statsEndDate).getTime();
          return d >= s && d <= e + 86400000;
        };

        const pendingIncome = allPending
          .filter(
            (pt) =>
              pt.type === "income" &&
              isCountedTransaction(pt, appliedFilters.includeLoans) &&
              (appliedFilters.accountIds.length === 0 ||
                appliedFilters.accountIds.includes(pt.accountId)) &&
              (appliedFilters.categoryIds.length === 0 ||
                appliedFilters.categoryIds.includes(pt.categoryId)) &&
              (!searchQuery ||
                pt.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (pt.note || "").toLowerCase().includes(searchQuery.toLowerCase())) &&
              (!appliedFilters.noteQuery ||
                (pt.note || "").toLowerCase().includes(appliedFilters.noteQuery.toLowerCase())) &&
              isDateInRange(pt.transactionDate)
          )
          .reduce((sum, pt) => sum + Math.abs(pt.amount || 0), 0);

        const pendingExpense = allPending
          .filter(
            (pt) =>
              pt.type === "expense" &&
              isCountedTransaction(pt, appliedFilters.includeLoans) &&
              (appliedFilters.accountIds.length === 0 ||
                appliedFilters.accountIds.includes(pt.accountId)) &&
              (appliedFilters.categoryIds.length === 0 ||
                appliedFilters.categoryIds.includes(pt.categoryId)) &&
              (!searchQuery ||
                pt.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (pt.note || "").toLowerCase().includes(searchQuery.toLowerCase())) &&
              (!appliedFilters.noteQuery ||
                (pt.note || "").toLowerCase().includes(appliedFilters.noteQuery.toLowerCase())) &&
              isDateInRange(pt.transactionDate)
          )
          .reduce((sum, pt) => sum + Math.abs(pt.amount || 0), 0);

        setBalance(newIncomeTotal + pendingIncome - (newExpenseTotal + pendingExpense));
        setIncomeTotal(newIncomeTotal + pendingIncome);
        setExpenseTotal(newExpenseTotal + pendingExpense);
      } catch (err: any) {
        console.error("Failed to load data:", err);
        setError(err.response?.data?.message || "Errore nel caricamento dei dati");
        setBaseTransactions([]);
        setApiTotal(0);
      } finally {
        if (showLoading) setLoading(false);
        setLoadingMore(false);
      }
    },
    [appliedFilters, viewType, searchQuery, listLimit, isOnline, user?.id]
  );

  useEffect(() => {
    loadData(true);
  }, [appliedFilters, viewType, searchQuery, listLimit]);

  useEffect(() => {
    const handleDataSynced = () => loadData(true);
    const handleTransactionUpdated = () => loadData(true);

    window.addEventListener("dataSynced", handleDataSynced);
    window.addEventListener("transactionUpdated", handleTransactionUpdated);
    return () => {
      window.removeEventListener("dataSynced", handleDataSynced);
      window.removeEventListener("transactionUpdated", handleTransactionUpdated);
    };
  }, [loadData]);

  const canLoadMore = baseTransactions.length < apiTotal;

  const handleLoadMore = () => {
    setListLimit((prev) => prev + TRANSACTIONS_PAGE_SIZE);
  };

  const handleDesktopMinInputChange = (val: string) => {
    setDesktopMinInput(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setDraftFilters((prev) => ({ ...prev, minAmount: num }));
    } else if (val === "") {
      setDraftFilters((prev) => ({ ...prev, minAmount: null }));
    }
  };

  const handleDesktopMaxInputChange = (val: string) => {
    setDesktopMaxInput(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setDraftFilters((prev) => ({ ...prev, maxAmount: num }));
    } else if (val === "") {
      setDraftFilters((prev) => ({ ...prev, maxAmount: null }));
    }
  };

  return (
    <div className="transactions-page px-3 pt-4 pb-28 max-w-md mx-auto md:max-w-6xl md:px-8 md:py-8">
      {/* Mobile Header Bar */}
      <div className="flex items-center gap-3 mb-4 md:hidden">
        <Link to="/" className="p-1.5 glass-card rounded-2xl interactive-press">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1">Transazioni</h1>
        <button
          onClick={() => (filtersExpanded ? setFiltersExpanded(false) : openFilters())}
          className="p-2 glass-card rounded-2xl transition-all interactive-press relative flex items-center justify-center"
        >
          <Filter className="w-5 h-5" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Quick Date Presets Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 md:hidden no-scrollbar">
        {[
          { id: "all", label: "Tutto" },
          { id: "this_month", label: "Questo mese" },
          { id: "last_month", label: "Mese scorso" },
          { id: "this_year", label: "Quest'anno" },
        ].map((p) => {
          const isSelected = appliedFilters.datePreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                const range = getDateRangeFromPreset(p.id as DatePreset);
                const updated: TransactionListFilters = {
                  ...appliedFilters,
                  datePreset: p.id as DatePreset,
                  startDate: range.startDate,
                  endDate: range.endDate,
                };
                setAppliedFilters(updated);
                setDraftFilters(updated);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                isSelected
                  ? "pill-active"
                  : "bg-white/5 text-muted-foreground border border-white/10"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="glass-card p-4 mb-6 tone-danger">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Balance Summary Header Card */}
      <GlassCard className="p-4 mb-6">
        {loading && baseTransactions.length === 0 ? (
          <div className="flex items-center justify-between gap-3 animate-pulse">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 px-2">
            <div className="text-center md:text-left">
              <span className="text-[10px] md:text-xs text-muted-foreground uppercase font-semibold block mb-0.5">
                {isMobile ? "Uscite" : "Uscite Periodo"}
              </span>
              <span className="text-sm md:text-base font-bold text-red-400">
                {formatCurrency(Math.abs(expenseTotal))} €
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] md:text-xs text-muted-foreground uppercase font-semibold block mb-0.5">
                {isMobile ? "Bilancio" : "Bilancio Periodo"}
              </span>
              <span
                className={`text-2xl md:text-3xl font-extrabold ${
                  balance === 0 ? "text-white" : balance > 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {balance < 0 ? "- " : ""}
                {formatCurrency(Math.abs(balance))} €
              </span>
            </div>
            <div className="text-center md:text-right">
              <span className="text-[10px] md:text-xs text-muted-foreground uppercase font-semibold block mb-0.5">
                {isMobile ? "Entrate" : "Entrate Periodo"}
              </span>
              <span className="text-sm md:text-base font-bold text-green-400">
                {formatCurrency(Math.abs(incomeTotal))} €
              </span>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Grid Layout: Desktop Sidebar vs Main List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* Desktop Sidebar Filters */}
        <div className="hidden lg:block lg:col-span-1">
          <GlassCard className="p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                Filtri &amp; Ordinamento
              </h3>
              <button
                onClick={clearFilters}
                className="text-[11px] text-muted-foreground hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Date Preset */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" /> Periodo
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: "Tutto" },
                  { id: "this_month", label: "Questo mese" },
                  { id: "last_month", label: "Mese scorso" },
                  { id: "this_year", label: "Quest'anno" },
                  { id: "custom", label: "Personalizzato" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (p.id === "custom") {
                        setDraftFilters((prev) => ({ ...prev, datePreset: "custom" }));
                      } else {
                        const range = getDateRangeFromPreset(p.id as DatePreset);
                        setDraftFilters((prev) => ({
                          ...prev,
                          datePreset: p.id as DatePreset,
                          startDate: range.startDate,
                          endDate: range.endDate,
                        }));
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all interactive-press ${
                      draftFilters.datePreset === p.id
                        ? "pill-active"
                        : "bg-white/5 text-muted-foreground border border-white/10"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {draftFilters.datePreset === "custom" && (
                <div className="flex gap-2 mt-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex-1">
                    <label className="text-[9px] text-muted-foreground mb-1 block">Inizio</label>
                    <MobileDateInput
                      compact
                      placeholder="Inizio"
                      value={draftFilters.startDate}
                      onChange={(startDate) => {
                        setDraftFilters((prev) => ({
                          ...prev,
                          startDate,
                          endDate:
                            startDate && !prev.endDate
                              ? getTodayDateString()
                              : prev.endDate,
                        }));
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] text-muted-foreground mb-1 block">Fine</label>
                    <MobileDateInput
                      compact
                      placeholder="Fine"
                      value={draftFilters.endDate}
                      onChange={(endDate) => {
                        setDraftFilters((prev) => ({ ...prev, endDate }));
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Ordinamento */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <ArrowUpDown className="w-3.5 h-3.5" /> Ordina Per
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "date_desc", label: "Più recenti" },
                  { id: "date_asc", label: "Meno recenti" },
                  { id: "amount_desc", label: "Importo ⬇" },
                  { id: "amount_asc", label: "Importo ⬆" },
                  { id: "title_asc", label: "Titolo (A-Z)" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setDraftFilters((prev) => ({ ...prev, sortBy: s.id as SortOption }));
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all interactive-press ${
                      draftFilters.sortBy === s.id
                        ? "pill-active"
                        : "bg-white/5 text-muted-foreground border border-white/10"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Prestiti */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Includi Prestiti nei totali
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Prestiti e restituzioni
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraftFilters((prev) => ({ ...prev, includeLoans: !prev.includeLoans }));
                }}
                className={`w-10 h-5.5 rounded-full transition-colors relative flex items-center p-0.5 ${
                  draftFilters.includeLoans ? "bg-white" : "bg-white/20"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-black transition-transform ${
                    draftFilters.includeLoans ? "translate-x-4.5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Conti Multi-select */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <Wallet className="w-3.5 h-3.5" /> Conti
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    setDraftFilters((prev) => ({ ...prev, accountIds: [] }));
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all interactive-press ${
                    draftFilters.accountIds.length === 0
                      ? "pill-active"
                      : "bg-white/5 text-muted-foreground border border-white/10"
                  }`}
                >
                  Tutti
                </button>
                {accounts.map((account) => {
                  const isSelected = draftFilters.accountIds.includes(account.id);
                  return (
                    <button
                      key={account.id}
                      onClick={() => {
                        const updatedIds = isSelected
                          ? draftFilters.accountIds.filter((id) => id !== account.id)
                          : [...draftFilters.accountIds, account.id];
                        setDraftFilters((prev) => ({ ...prev, accountIds: updatedIds }));
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all interactive-press ${
                        isSelected
                          ? "pill-active"
                          : "bg-white/5 text-muted-foreground border border-white/10"
                      }`}
                    >
                      {account.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categorie Multi-select */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5" /> Categorie
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                <button
                  onClick={() => {
                    setDraftFilters((prev) => ({ ...prev, categoryIds: [] }));
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all interactive-press ${
                    draftFilters.categoryIds.length === 0
                      ? "pill-active"
                      : "bg-white/5 text-muted-foreground border border-white/10"
                  }`}
                >
                  Tutte
                </button>
                {categories.map((category) => {
                  const isSelected = draftFilters.categoryIds.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        const updatedIds = isSelected
                          ? draftFilters.categoryIds.filter((id) => id !== category.id)
                          : [...draftFilters.categoryIds, category.id];
                        setDraftFilters((prev) => ({ ...prev, categoryIds: updatedIds }));
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 font-semibold transition-all interactive-press ${
                        isSelected
                          ? "pill-active"
                          : "bg-white/5 text-muted-foreground border border-white/10"
                      }`}
                    >
                      <IconRenderer icon={category.icon} size={12} />
                      <span>{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Range Importo (€) */}
            {amountBounds.max >= amountBounds.min && (
              <div>
                <label className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Banknote className="w-3.5 h-3.5" /> Importo (€)
                </label>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
                  {/* Numeric Inputs */}
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground font-semibold">Min</span>
                      <input
                        type="number"
                        step="any"
                        placeholder={String(amountBounds.min)}
                        value={desktopMinInput}
                        onChange={(e) => handleDesktopMinInputChange(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-muted-foreground/40 font-mono"
                      />
                      <span className="text-xs text-muted-foreground">€</span>
                    </div>
                    <span className="text-xs text-muted-foreground">–</span>
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground font-semibold">Max</span>
                      <input
                        type="number"
                        step="any"
                        placeholder={String(amountBounds.max)}
                        value={desktopMaxInput}
                        onChange={(e) => handleDesktopMaxInputChange(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-muted-foreground/40 font-mono"
                      />
                      <span className="text-xs text-muted-foreground">€</span>
                    </div>
                  </div>

                  <Slider
                    min={amountBounds.min}
                    max={amountBounds.max}
                    step={sliderStep}
                    value={[
                      draftFilters.minAmount ?? amountBounds.min,
                      draftFilters.maxAmount ?? amountBounds.max,
                    ]}
                    disabled={amountBounds.min === amountBounds.max}
                    onValueChange={([min, max]) => {
                      setDesktopMinInput(String(min));
                      setDesktopMaxInput(String(max));
                      setDraftFilters((prev) => ({ ...prev, minAmount: min, maxAmount: max }));
                    }}
                    className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-white [&_[role=slider]]:bg-white [&_.bg-primary]:bg-white [&_.bg-secondary]:bg-white/10"
                  />
                  <p className="text-[10px] text-muted-foreground text-center">
                    Range: {formatCurrency(amountBounds.min)} € – {formatCurrency(amountBounds.max)} €
                  </p>
                </div>
              </div>
            )}

            {/* Note Query */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" /> Note
              </label>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <input
                  type="text"
                  value={draftFilters.noteQuery}
                  onChange={(e) => {
                    setDraftFilters((prev) => ({ ...prev, noteQuery: e.target.value }));
                  }}
                  placeholder="Cerca solo nelle note..."
                  className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            {/* Bottone Applica Filtri (Desktop) */}
            <div className="pt-2">
              <Button
                onClick={applyFilters}
                className="w-full h-11 pill-active text-xs font-bold rounded-xl shadow-lg transition-all"
              >
                Applica Filtri
              </Button>
            </div>
          </GlassCard>
        </div>

        {/* Main Section: Search, Type Switch, Active Badges, List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <GlassCard className="p-2">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    type="text"
                    value={searchInputValue}
                    onChange={(e) => setSearchInputValue(e.target.value)}
                    placeholder="Cerca per titolo..."
                    className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/50 text-white"
                  />
                </div>
              </GlassCard>
            </div>

            <div className="p-1 bg-white/5 border border-white/10 rounded-2xl flex gap-1 w-full md:w-[200px] shrink-0">
              <button
                onClick={() => {
                  setViewType("expense");
                  setListLimit(TRANSACTIONS_PAGE_SIZE);
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all interactive-press ${
                  viewType === "expense" ? "pill-active" : "text-muted-foreground"
                }`}
              >
                Uscite
              </button>
              <button
                onClick={() => {
                  setViewType("income");
                  setListLimit(TRANSACTIONS_PAGE_SIZE);
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all interactive-press ${
                  viewType === "income" ? "pill-active" : "text-muted-foreground"
                }`}
              >
                Entrate
              </button>
            </div>
          </div>

          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex gap-1.5 flex-wrap items-center">
              {appliedFilters.accountIds.map((id) => (
                <div
                  key={`acc-${id}`}
                  className="glass-card px-2.5 py-1 text-xs flex items-center gap-1.5 border border-white/10 text-muted-foreground"
                >
                  <span>Conto: {accounts.find((a) => a.id === id)?.name}</span>
                  <button
                    onClick={() => removeAccountFilter(id)}
                    className="text-red-400 hover:text-white font-bold ml-0.5"
                  >
                    ×
                  </button>
                </div>
              ))}
              {appliedFilters.categoryIds.map((id) => (
                <div
                  key={`cat-${id}`}
                  className="glass-card px-2.5 py-1 text-xs flex items-center gap-1.5 border border-white/10 text-muted-foreground"
                >
                  <span>Cat: {categories.find((c) => c.id === id)?.name}</span>
                  <button
                    onClick={() => removeCategoryFilter(id)}
                    className="text-red-400 hover:text-white font-bold ml-0.5"
                  >
                    ×
                  </button>
                </div>
              ))}
              {appliedFilters.datePreset !== "all" && (
                <div className="glass-card px-2.5 py-1 text-xs flex items-center gap-1.5 border border-white/10 text-muted-foreground">
                  <span>Periodo: {PRESET_LABELS[appliedFilters.datePreset]}</span>
                  <button
                    onClick={() => removeFilter("datePreset")}
                    className="text-red-400 hover:text-white font-bold ml-0.5"
                  >
                    ×
                  </button>
                </div>
              )}
              {appliedFilters.startDate && appliedFilters.datePreset === "custom" && (
                <div className="glass-card px-2.5 py-1 text-xs flex items-center gap-1.5 border border-white/10 text-muted-foreground">
                  <span>Dal: {format(new Date(appliedFilters.startDate), "dd/MM/yyyy")}</span>
                  <button
                    onClick={() => removeFilter("startDate")}
                    className="text-red-400 hover:text-white font-bold ml-0.5"
                  >
                    ×
                  </button>
                </div>
              )}
              {appliedFilters.endDate && appliedFilters.datePreset === "custom" && (
                <div className="glass-card px-2.5 py-1 text-xs flex items-center gap-1.5 border border-white/10 text-muted-foreground">
                  <span>Al: {format(new Date(appliedFilters.endDate), "dd/MM/yyyy")}</span>
                  <button
                    onClick={() => removeFilter("endDate")}
                    className="text-red-400 hover:text-white font-bold ml-0.5"
                  >
                    ×
                  </button>
                </div>
              )}
              {appliedFilters.includeLoans && (
                <div className="glass-card px-2.5 py-1 text-xs flex items-center gap-1.5 border border-white/10 text-muted-foreground">
                  <span>Inclusi Prestiti</span>
                  <button
                    onClick={() => removeFilter("includeLoans")}
                    className="text-red-400 hover:text-white font-bold ml-0.5"
                  >
                    ×
                  </button>
                </div>
              )}
              {appliedFilters.sortBy !== "date_desc" && (
                <div className="glass-card px-2.5 py-1 text-xs flex items-center gap-1.5 border border-white/10 text-muted-foreground">
                  <span>Ordina: {SORT_LABELS[appliedFilters.sortBy]}</span>
                  <button
                    onClick={() => removeFilter("sortBy")}
                    className="text-red-400 hover:text-white font-bold ml-0.5"
                  >
                    ×
                  </button>
                </div>
              )}
              {appliedFilters.noteQuery && (
                <div className="glass-card px-2.5 py-1 text-xs flex items-center gap-1.5 border border-white/10 text-muted-foreground">
                  <span>Nota: {truncateText(appliedFilters.noteQuery, 30)}</span>
                  <button
                    onClick={() => removeFilter("noteQuery")}
                    className="text-red-400 hover:text-white font-bold ml-0.5"
                  >
                    ×
                  </button>
                </div>
              )}
              {amountFilterActive &&
                appliedFilters.minAmount !== null &&
                appliedFilters.maxAmount !== null && (
                  <div className="glass-card px-2.5 py-1 text-xs flex items-center gap-1.5 border border-white/10 text-muted-foreground">
                    <span>
                      Importo: {formatCurrency(appliedFilters.minAmount)} € –{" "}
                      {formatCurrency(appliedFilters.maxAmount)} €
                    </span>
                    <button
                      onClick={() => removeFilter("minAmount")}
                      className="text-red-400 hover:text-white font-bold ml-0.5"
                    >
                      ×
                    </button>
                  </div>
                )}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground px-1">
            {loading && baseTransactions.length === 0
              ? "Caricamento transazioni..."
              : `Mostrate ${displayedTransactions.length} di ${apiTotal} transazioni`}
          </p>

          <GlassCard className="p-4 md:p-5">
            {loading && baseTransactions.length === 0 ? (
              <div className="space-y-3">
                <TransactionRowSkeleton variant="list" />
                <TransactionRowSkeleton variant="list" />
                <TransactionRowSkeleton variant="list" />
              </div>
            ) : displayedTransactions.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">
                  Nessuna transazione trovata con i filtri attuali
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {displayedTransactions.map((transaction) => (
                  <RouterLink
                    key={transaction.id > 0 ? transaction.id : transaction.clientRequestId}
                    to={transaction.id > 0 ? `/transaction/${transaction.id}` : "#"}
                    className="block"
                    onClick={() => persistPageState()}
                  >
                    <div
                      className={`flex items-center justify-between py-3 hover:bg-white/5 transition-colors cursor-pointer rounded-lg px-2 border-none ${
                        transaction.isPending ? "opacity-70" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {(() => {
                          const isCounted = isCountedTransaction(
                            transaction,
                            appliedFilters.includeLoans
                          );
                          return (
                            <>
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/5 border border-white/10 ${
                                  !isCounted ? "opacity-40" : ""
                                }`}
                              >
                                <IconRenderer icon={transaction.categoryIcon} size={18} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm text-white tracking-tight">
                                  {transaction.title}
                                </h4>
                                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                                  <span>
                                    {format(new Date(transaction.transactionDate), "dd/MM/yyyy")}
                                  </span>
                                  {transaction.categoryName && (
                                    <span>· {transaction.categoryName}</span>
                                  )}
                                  {transaction.accountName && (
                                    <span className="hidden sm:inline">
                                      · {transaction.accountName}
                                    </span>
                                  )}
                                  {transaction.note && (
                                    <span className="hidden md:inline">
                                      · {truncateText(transaction.note, 200)}
                                    </span>
                                  )}
                                  {!isCounted && (
                                    <span className="text-warning">· Non conteggiata</span>
                                  )}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <span
                        className={`font-bold text-sm ${
                          transaction.isPending
                            ? "text-warning"
                            : transaction.type === "income"
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {transaction.type === "income" ? "+ " : "- "}
                        {formatCurrency(transaction.amount)} €
                      </span>
                    </div>
                  </RouterLink>
                ))}
              </div>
            )}

            {canLoadMore && (
              <div className="pt-4 border-t border-white/5 mt-2">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="w-full h-10 border-white/10 bg-white/5 hover:bg-white/10 text-white"
                >
                  {loadingMore ? "Caricamento..." : `Carica altre ${TRANSACTIONS_PAGE_SIZE}`}
                </Button>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Mobile Filters Bottom Sheet */}
      <TransactionFiltersSheet
        open={filtersExpanded}
        onOpenChange={setFiltersExpanded}
        draftFilters={draftFilters}
        setDraftFilters={setDraftFilters}
        accounts={accounts}
        categories={categories}
        amountBounds={amountBounds}
        activeCount={activeCount}
        totalFilteredCount={displayedTransactions.length}
        onApply={applyFilters}
        onClear={clearFilters}
      />
    </div>
  );
}
