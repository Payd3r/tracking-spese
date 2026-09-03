import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Wifi, WifiOff, RefreshCw, Wallet, Tag, HandCoins, Cloud, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { DashboardStats, Transaction } from "@/types/api";
import { format } from "date-fns";
import { useSync } from "@/contexts/SyncContext";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { setStartupSnapshot, getStartupSnapshot, isCountedTransaction } from "@/lib/cacheManager";
import { useAuth } from "@/contexts/AuthContext";

// Helper function to format chart labels based on period
const formatChartLabel = (date: string, period: string, index: number): string => {
  switch (period) {
    case 'day':
      const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
      return hours[index] || '';
    case 'week':
      const days = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
      return days[index] || '';
    case 'month':
      return `W${index + 1}`;
    case 'year':
      const months = ['G', 'F', 'M', 'A', 'M', 'G', 'L', 'A', 'S', 'O', 'N', 'D'];
      return months[index] || '';
    default:
      return '';
  }
};

const getVisibleLabels = (data: any[], period: string) => {
  if (!data || data.length === 0) return [];

  switch (period) {
    case 'day':
      return data.filter((_, index) => index % 2 === 0);
    case 'week':
      return data;
    case 'month':
      return data;
    case 'year':
      return data;
    default:
      return data;
  }
};

const getDateRange = (period: 'day' | 'week' | 'month' | 'year') => {
  const now = new Date();
  let startDate = new Date();

  switch (period) {
    case 'day':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setDate(now.getDate() - 28);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
  }

  return {
    startDate: startDate.toISOString(),
    endDate: now.toISOString()
  };
};

const getCurrencySymbol = (code: string = "EUR"): string => {
  const symbols: Record<string, string> = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£',
    'JPY': '¥',
    'CHF': 'Fr',
    'CAD': 'C$',
    'AUD': 'A$',
    'CNY': '¥',
    'INR': '₹',
    'RUB': '₽',
    'BRL': 'R$',
    'ZAR': 'R',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'TRY': '₺',
    'MXN': '$',
    'AED': 'د.إ',
    'SAR': '﷼',
  };

  return symbols[code.toUpperCase()] || code;
};

export default function Home() {
  const { isOnline, isSyncing, pendingCount, hasPending, triggerSync } = useSync();
  const { user } = useAuth();
  const [viewType, setViewType] = useState<"income" | "spending">("spending");
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("week");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");
  const [displayLimit, setDisplayLimit] = useState(50);
  const [allTransactionsData, setAllTransactionsData] = useState<Transaction[]>([]);
  const [hasInitialData, setHasInitialData] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [topCategories, setTopCategories] = useState<any[]>([]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadUserName = () => {
    const name = user?.name || user?.email || "Andrea";
    setUserName(name);

    const snapshot = getStartupSnapshot();
    if (snapshot) {
      setStartupSnapshot({
        ...snapshot,
        userName: name
      });
    }
  };

  const loadData = useCallback(async () => {
    try {
      if (!hasInitialData) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      // Load accounts to display on desktop financial summary
      const localAccounts = await db.cachedAccounts.toArray();
      setAccounts(localAccounts);

      const dateRange = getDateRange(period);
      const transactionType = viewType === "spending" ? "expense" : "income";

      const allCachedTransactions = await db.cachedTransactions
        .where('type')
        .equals(transactionType)
        .toArray();

      const cachedTransactionsInPeriod = allCachedTransactions.filter(tx => {
        const txDate = new Date(tx.transactionDate);
        return txDate >= new Date(dateRange.startDate) && txDate <= new Date(dateRange.endDate);
      });

      cachedTransactionsInPeriod.sort((a, b) =>
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      );

      const pendingTxs = await db.pendingTransactions
        .where('type')
        .equals(transactionType)
        .toArray();

      const pendingInPeriod = pendingTxs.filter(pt => {
        const txDate = new Date(pt.transactionDate);
        return txDate >= new Date(dateRange.startDate) && txDate <= new Date(dateRange.endDate);
      });

      const allTransactionsInPeriod = [...cachedTransactionsInPeriod, ...pendingInPeriod.map(pt => ({
        ...pt,
        id: parseInt(pt.tempId.replace(/\D/g, '')),
        accountName: pt.accountName || 'Account sconosciuto',
        categoryName: pt.categoryName || 'Categoria sconosciuta',
        accountCurrency: pt.accountCurrency || 'EUR',
        categoryIcon: pt.categoryIcon || 'HelpCircle',
        categoryColor: pt.categoryColor || 'gradient-gray',
        isPending: true,
        updatedAt: pt.createdAt
      }))];

      setAllTransactionsData(allTransactionsInPeriod);

      const countedTransactionsInPeriod = allTransactionsInPeriod.filter(isCountedTransaction);
      const totalAmount = countedTransactionsInPeriod.reduce((sum, tx) => sum + tx.amount, 0);

      // Calculate top categories for widescreen
      const categorySpent: Record<string, { amount: number, icon: string, color: string }> = {};
      countedTransactionsInPeriod.forEach(tx => {
        if (!tx.categoryName) return;
        if (!categorySpent[tx.categoryName]) {
          categorySpent[tx.categoryName] = {
            amount: 0,
            icon: tx.categoryIcon || 'HelpCircle',
            color: tx.categoryColor || 'gradient-blue'
          };
        }
        categorySpent[tx.categoryName].amount += tx.amount;
      });

      const calculatedTopCategories = Object.entries(categorySpent)
        .map(([name, data]) => ({
          name,
          ...data,
          percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4);

      setTopCategories(calculatedTopCategories);

      const calculateLocalTrend = (transactions: Transaction[], period: 'day' | 'week' | 'month' | 'year') => {
        const dateRange = getDateRange(period);
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);

        let dataPoints: { date: string, amount: number }[] = [];

        if (period === 'day') {
          for (let i = 0; i < 6; i++) {
            dataPoints.push({ date: `${String(i * 4).padStart(2, '0')}:00`, amount: 0 });
          }
        } else if (period === 'week') {
          for (let i = 0; i < 7; i++) {
            dataPoints.push({ date: `Day ${i}`, amount: 0 });
          }
        } else if (period === 'month') {
          for (let i = 1; i <= 4; i++) {
            dataPoints.push({ date: `W${i}`, amount: 0 });
          }
        } else if (period === 'year') {
          for (let i = 0; i < 12; i++) {
            dataPoints.push({ date: `Month ${i}`, amount: 0 });
          }
        }

        const filteredTxs = transactions.filter(tx => {
          const txDate = new Date(tx.transactionDate);
          return txDate >= startDate && txDate <= endDate;
        });

        filteredTxs.forEach(tx => {
          const txDate = new Date(tx.transactionDate);
          let index = -1;

          if (period === 'day') {
            index = Math.min(Math.floor(txDate.getHours() / 4), 5);
          } else if (period === 'week') {
            const day = txDate.getDay();
            index = day === 0 ? 6 : day - 1;
          } else if (period === 'month') {
            const diffDays = Math.floor((txDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
            index = Math.min(Math.max(Math.floor(diffDays / 7), 0), 3);
          } else if (period === 'year') {
            index = txDate.getMonth();
          }

          if (index !== -1 && dataPoints[index]) {
            dataPoints[index].amount += tx.amount;
          }
        });

        return dataPoints.map(dp => ({
          ...dp,
          amount: Math.abs(dp.amount),
          income: transactionType === 'income' ? dp.amount : 0,
          expense: transactionType === 'expense' ? Math.abs(dp.amount) : 0
        }));
      };

      const localTrend = calculateLocalTrend(countedTransactionsInPeriod, period);

      setStats({
        currency: 'EUR',
        totalBalance: 0,
        period: {
          name: period,
          startDate: getDateRange(period).startDate,
          endDate: getDateRange(period).endDate,
          totalIncome: viewType === 'income' ? totalAmount : 0,
          totalExpense: viewType === 'spending' ? totalAmount : 0,
          netIncome: viewType === 'income' ? totalAmount : -totalAmount
        },
        trend: localTrend
      });

      const displayedTransactions = allTransactionsInPeriod.slice(0, displayLimit);
      setRecentTransactions(displayedTransactions);

      const cacheTimestamp = new Date().toISOString();
      setStartupSnapshot({
        stats,
        recentTransactions: displayedTransactions,
        period,
        viewType,
        lastUpdatedAt: cacheTimestamp,
        userName
      });
      setSnapshotTimestamp(cacheTimestamp);

      if (isOnline) {
        try {
          const [statsResponse, transactionsResponse] = await Promise.all([
            api.stats.getDashboard(period, transactionType),
            api.transactions.getAll({
              limit: 10,
              type: transactionType,
              startDate: dateRange.startDate,
              endDate: dateRange.endDate
            })
          ]);

          setStats(statsResponse.data);

          const transactions = transactionsResponse.data.transactions || [];
          const freshTransactions = Array.isArray(transactions) ? transactions : [];
          setRecentTransactions(freshTransactions);

          if (Array.isArray(transactions)) {
            const userId = user?.id;
            const txsWithUser = userId
              ? transactions.map(tx => ({ ...tx, userId }))
              : transactions;
            await db.cachedTransactions.bulkPut(txsWithUser);
          }

          const newTimestamp = new Date().toISOString();
          setStartupSnapshot({
            stats: statsResponse.data,
            recentTransactions: freshTransactions,
            period,
            viewType,
            lastUpdatedAt: newTimestamp,
            userName
          });
          setSnapshotTimestamp(newTimestamp);
          setSyncError(null);
        } catch (networkErr: any) {
          console.log("Network fetch failed, using cached data:", networkErr);
          if (isOnline) {
            setSyncError("Impossibile aggiornare i dati. Verifica la connessione.");
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to load data:", err);
      setError(err.response?.data?.message || "Errore nel caricamento dei dati");
      setRecentTransactions([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setHasInitialData(false);
    }
  }, [period, viewType, displayLimit, hasInitialData]);

  useEffect(() => {
    const snapshot = getStartupSnapshot();
    if (snapshot) {
      setStats(snapshot.stats);
      setRecentTransactions(snapshot.recentTransactions);
      setPeriod(snapshot.period);
      setViewType(snapshot.viewType);
      if (snapshot.userName) {
        setUserName(snapshot.userName);
      }
      setSnapshotTimestamp(snapshot.lastUpdatedAt);
      setHasInitialData(true);
      setLoading(false);
    }
    loadUserName();
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setDisplayLimit(50);
  }, [period, viewType]);

  useEffect(() => {
    const handleTransactionCreated = () => {
      loadData();
    };

    const handleTransactionUpdated = () => {
      loadData();
    };

    const handleDataSynced = () => {
      loadData();
    };

    window.addEventListener('transactionCreated', handleTransactionCreated);
    window.addEventListener('transactionUpdated', handleTransactionUpdated);
    window.addEventListener('dataSynced', handleDataSynced);
    return () => {
      window.removeEventListener('transactionCreated', handleTransactionCreated);
      window.removeEventListener('transactionUpdated', handleTransactionUpdated);
      window.removeEventListener('dataSynced', handleDataSynced);
    };
  }, [loadData]);

  const handleLoadMore = () => {
    const newLimit = displayLimit + 50;
    setDisplayLimit(newLimit);
    setRecentTransactions(allTransactionsData.slice(0, newLimit));
  };

  const chartData = stats?.trend || [];
  const totalAmount = viewType === "income" ? stats?.period?.totalIncome || 0 : stats?.period?.totalExpense || 0;

  const getYAxisDomain = (data: any[]) => {
    if (!data || data.length === 0) return ['dataMin', 'dataMax'];

    const values = data.map(d => d.amount).filter(v => v != null);
    if (values.length === 0) return ['dataMin', 'dataMax'];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    const padding = Math.max(range * 0.2, 1);

    return [min - padding, max + padding];
  };

  return (
    <div className="px-3 pt-4 pb-28 max-w-md mx-auto md:max-w-6xl md:px-8 md:py-8 md:pb-8">

      {error && (
        <div className="glass-card p-4 mb-6 tone-danger">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Main Responsive Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Left Columns (Chart & Transactions list) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Balance & Curve Chart Card */}
          <GlassCard className="p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              
              {/* Title & Amount figures + Wifi status (On mobile: top row, justified-between. On desktop: left column) */}
              <div className="order-1 md:order-1 flex flex-row items-center justify-between w-full md:flex-col md:items-start md:w-auto">
                <div className="flex flex-col items-start">
                  <span className="hidden md:block text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">
                    {viewType === "spending" ? "Spettro Uscite" : "Flusso Entrate"}
                  </span>
                  {loading && !stats ? (
                    <Skeleton className="h-10 w-48 md:mx-0" />
                  ) : (
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                      {viewType === "spending" ? "- " : ""}{formatCurrency(totalAmount)} €
                    </h2>
                  )}
                </div>

                {/* Mobile-only Connectivity Wifi Icon */}
                <div className="md:hidden flex items-center justify-center shrink-0 ml-2.5">
                  {isOnline ? (
                    <Wifi className="w-5.5 h-5.5 text-green-400 animate-pulse" />
                  ) : (
                    <WifiOff className="w-5.5 h-5.5 text-red-400" />
                  )}
                </div>
              </div>

              {/* Toggle Buttons (On mobile: bottom row, full width. On desktop: right side) */}
              <div className="order-2 md:order-2 w-full md:w-auto flex justify-center md:justify-end">
                <div className="p-1 bg-white/5 border border-white/10 rounded-2xl flex gap-1 shrink-0 w-full md:w-[240px]">
                  <button
                    onClick={() => setViewType("spending")}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all interactive-press ${viewType === "spending" ? "pill-active" : "text-muted-foreground"}`}
                  >
                    Uscite
                  </button>
                  <button
                    onClick={() => setViewType("income")}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all interactive-press ${viewType === "income" ? "pill-active" : "text-muted-foreground"}`}
                  >
                    Entrate
                  </button>
                </div>
              </div>

            </div>

            {/* Neon Chart container with responsive sizing */}
            {loading && !stats ? (
              <div className="neon-chart-container mb-6 h-[120px] md:h-[220px] flex items-end justify-between px-2 pb-2 gap-1 border-t border-white/5 pt-4">
                <Skeleton className="w-[12%] h-[40%] rounded-t-sm opacity-20" />
                <Skeleton className="w-[12%] h-[70%] rounded-t-sm opacity-20" />
                <Skeleton className="w-[12%] h-[50%] rounded-t-sm opacity-20" />
                <Skeleton className="w-[12%] h-[80%] rounded-t-sm opacity-20" />
                <Skeleton className="w-[12%] h-[60%] rounded-t-sm opacity-20" />
                <Skeleton className="w-[12%] h-[90%] rounded-t-sm opacity-20" />
                <Skeleton className="w-[12%] h-[30%] rounded-t-sm opacity-20" />
              </div>
            ) : chartData.length > 0 ? (
              <div className="neon-chart-container mb-6">
                <div className="flex justify-between items-center mb-3 px-2">
                  {getVisibleLabels(chartData, period).map((item, index) => (
                    <span key={index} className={period === 'year' ? 'chart-label-year' : 'chart-label'}>
                      {formatChartLabel(item.date, period, index)}
                    </span>
                  ))}
                </div>

                <ResponsiveContainer width="100%" height={isMobile ? 110 : 200}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 15, right: 10, left: 10, bottom: 0 }}
                  >
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={getYAxisDomain(chartData)} />
                    <Line
                      type="natural"
                      dataKey="amount"
                      stroke="white"
                      strokeWidth={3}
                      dot={false}
                      isAnimationActive={true}
                      animationDuration={800}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            {/* Period Selector Tabs */}
            <div className="flex gap-1.5 p-1 bg-white/5 border border-white/5 rounded-2xl">
              {(["day", "week", "month", "year"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-1.5 rounded-xl text-xs transition-all capitalize font-medium interactive-press ${period === p
                    ? "bg-white/10 text-white border border-white/10 shadow-glow"
                    : "text-muted-foreground hover:text-white"
                    }`}
                >
                  {p === "day" ? "Giorno" : p === "week" ? "Settimana" : p === "month" ? "Mese" : "Anno"}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Widescreen Financial Breakdown Cards (Desktop only) */}
          <div className="hidden md:grid grid-cols-2 gap-4">
            
            {/* Accounts Balance Summary Card */}
            <GlassCard className="p-5 border border-white/10 bg-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white tracking-tight">Riepilogo Conti</h3>
                <Link to="/settings/accounts" className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-0.5">
                  Gestisci <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              
              {accounts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nessun conto configurato</p>
              ) : (
                <div className="space-y-3">
                  {accounts.slice(0, 3).map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <Wallet className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-white truncate">{acc.name}</span>
                      </div>
                      <span className={`text-xs font-bold ${acc.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {acc.balance >= 0 ? '+ ' : ''}{formatCurrency(acc.balance)} €
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Top Spending Categories Card */}
            <GlassCard className="p-5 border border-white/10 bg-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {viewType === "spending" ? "Top Categorie Spesa" : "Top Categorie Entrate"}
                </h3>
                <Link to="/settings/categories" className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-0.5">
                  Vedi tutte <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {topCategories.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nessuna operazione registrata</p>
              ) : (
                <div className="space-y-3">
                  {topCategories.map((cat, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <IconRenderer icon={cat.icon} size={14} className="text-white/60 shrink-0" />
                          <span className="font-semibold text-white truncate">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] shrink-0 font-medium">
                          <span className="text-white font-semibold">{formatCurrency(cat.amount)} €</span>
                          <span className="text-muted-foreground">({cat.percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
                        <div 
                          className="bg-white h-full rounded-full transition-all duration-500" 
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

          </div>

          {/* Transactions List */}
          <GlassCard className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Transazioni Recenti</h3>
              <Link to="/transactions" className="flex items-center gap-1 group interactive-press rounded-xl px-2 py-1 hover:bg-white/5 border border-transparent hover:border-white/5">
                <span className="text-xs text-muted-foreground group-hover:text-white transition-colors">Vedi tutte</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
              </Link>
            </div>

            {loading && recentTransactions.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-card p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-xl" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Nessuna transazione trovata</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((transaction) => (
                  <Link key={transaction.id} to={`/transaction/${transaction.id}`} className="block">
                    <div className="glass-card p-3 interactive-press cursor-pointer rounded-xl flex items-center justify-between border border-transparent hover:border-white/10 hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const counted = isCountedTransaction(transaction);
                          return (
                            <>
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/5 border border-white/10 ${!counted ? 'opacity-40' : ''}`}
                              >
                                <IconRenderer icon={transaction.categoryIcon} size={20} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm text-white">{transaction.categoryName}</h4>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {format(new Date(transaction.transactionDate), 'dd/MM/yyyy')}
                                  {!counted && <span className="text-warning"> · Non conteggiata</span>}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                          {transaction.type === 'income' ? <ArrowUpRight className="inline w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="inline w-3.5 h-3.5 mr-0.5" />}
                          {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)} €
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Show More Button */}
            {allTransactionsData.length > displayLimit && (
              <div className="text-center mt-4">
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  className="w-full bg-transparent hover:bg-white/5 border-white/10 hover:text-white"
                >
                  Mostra altri ({allTransactionsData.length - displayLimit} rimanenti)
                </Button>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Column (Sync / Shortcuts / Accounts Summary) */}
        <div className="hidden lg:block space-y-6">
          
          {/* Quick Shortcuts Grid (Desktop feature) */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-bold text-white mb-4 tracking-tight">Scorciatoie Gestione</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/settings/accounts" className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-white/5 hover:border-white/15 bg-white/5 hover:bg-white/10 transition-all text-center">
                <Wallet className="w-5 h-5 mb-2 text-muted-foreground" />
                <span className="text-xs font-semibold text-white">Conti</span>
              </Link>
              <Link to="/settings/categories" className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-white/5 hover:border-white/15 bg-white/5 hover:bg-white/10 transition-all text-center">
                <Tag className="w-5 h-5 mb-2 text-muted-foreground" />
                <span className="text-xs font-semibold text-white">Categorie</span>
              </Link>
              <Link to="/settings/transfers" className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-white/5 hover:border-white/15 bg-white/5 hover:bg-white/10 transition-all text-center">
                <RefreshCw className="w-5 h-5 mb-2 text-muted-foreground" />
                <span className="text-xs font-semibold text-white">Trasferimenti</span>
              </Link>
              <Link to="/settings/loans" className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-white/5 hover:border-white/15 bg-white/5 hover:bg-white/10 transition-all text-center">
                <HandCoins className="w-5 h-5 mb-2 text-muted-foreground" />
                <span className="text-xs font-semibold text-white">Prestiti</span>
              </Link>
            </div>
          </GlassCard>

          {/* Sync status & DB cache details */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-bold text-white mb-4 tracking-tight">Dettaglio Sincronizzazione</h3>
            
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Stato Connessione</span>
                <span className={`font-semibold ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Ultimo Sync Locale</span>
                <span className="text-white font-medium">
                  {snapshotTimestamp ? format(new Date(snapshotTimestamp), 'dd/MM/yyyy HH:mm') : 'N/D'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Transazioni in Coda (Offline)</span>
                <span className={`font-semibold ${hasPending ? 'text-warning' : 'text-muted-foreground'}`}>
                  {pendingCount}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Filtro Periodo attivo</span>
                <span className="text-white font-medium capitalize">
                  {period === 'day' ? 'Giorno' : period === 'week' ? 'Settimana' : period === 'month' ? 'Mese' : 'Anno'}
                </span>
              </div>

              {/* Sync Trigger button for desktop context */}
              <button
                disabled={!isOnline || isSyncing}
                onClick={triggerSync}
                className="w-full mt-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sincronizzazione...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Sincronizza ora</span>
                  </>
                )}
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
