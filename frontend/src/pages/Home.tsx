import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Loader2, Wifi, WifiOff, Clock } from "lucide-react";
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

// Helper function to format chart labels based on period
const formatChartLabel = (date: string, period: string, index: number): string => {
  switch (period) {
    case 'day':
      // Always show 00:00, 04:00, 08:00, 12:00, 16:00, 20:00
      const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
      return hours[index] || '';
    case 'week':
      // Always show L, M, M, G, V, S, D
      const days = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
      return days[index] || '';
    case 'month':
      // Always show W1, W2, W3, W4
      return `W${index + 1}`;
    case 'year':
      // Always show G, F, M, A, M, G, L, A, S, O, N, D
      const months = ['G', 'F', 'M', 'A', 'M', 'G', 'L', 'A', 'S', 'O', 'N', 'D'];
      return months[index] || '';
    default:
      return '';
  }
};

// Helper function to limit chart labels for mobile display
const getVisibleLabels = (data: any[], period: string) => {
  if (!data || data.length === 0) return [];
  
  switch (period) {
    case 'day':
      // Show every 2nd label for day (every 8 hours)
      return data.filter((_, index) => index % 2 === 0);
    case 'week':
      // Show all 7 days
      return data;
    case 'month':
      // Show all 4 weeks
      return data;
    case 'year':
      // Show all 12 months for year view
      return data;
    default:
      return data;
  }
};

// Helper function to get date range based on period
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
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  return {
    startDate: startDate.toISOString(),
    endDate: now.toISOString()
  };
};

// Convert currency code to symbol
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
  const { isOnline } = useSync();
  const [viewType, setViewType] = useState<"income" | "spending">("spending");
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("week");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");
  const [displayLimit, setDisplayLimit] = useState(50);
  const [allTransactionsData, setAllTransactionsData] = useState<Transaction[]>([]);

  const loadUserName = async () => {
    try {
      const response = await api.auth.me();
      setUserName(response.data.user.name || "User");
    } catch (err) {
      console.error("Failed to load user:", err);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dateRange = getDateRange(period);
      const transactionType = viewType === "spending" ? "expense" : "income";
      
      // CACHE-FIRST STRATEGY: Load ALL transactions of the type (not limited)
      const allCachedTransactions = await db.cachedTransactions
        .where('type')
        .equals(transactionType)
        .toArray();
      
      // Filter by date range
      const cachedTransactionsInPeriod = allCachedTransactions.filter(tx => {
        const txDate = new Date(tx.transactionDate);
        return txDate >= new Date(dateRange.startDate) && txDate <= new Date(dateRange.endDate);
      });
      
      // Sort by date descending
      cachedTransactionsInPeriod.sort((a, b) => 
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      );
      
      // Load pending transactions
      const pendingTxs = await db.pendingTransactions
        .where('type')
        .equals(transactionType)
        .toArray();
      
      // Filter pending by date range
      const pendingInPeriod = pendingTxs.filter(pt => {
        const txDate = new Date(pt.transactionDate);
        return txDate >= new Date(dateRange.startDate) && txDate <= new Date(dateRange.endDate);
      });
      
      // Combine cached + pending transactions
      const allTransactionsInPeriod = [...cachedTransactionsInPeriod, ...pendingInPeriod.map(pt => ({
        ...pt,
        id: parseInt(pt.tempId.replace(/\D/g, '')), // Convert tempId to number
        accountName: pt.accountName || 'Account sconosciuto',
        categoryName: pt.categoryName || 'Categoria sconosciuta',
        accountCurrency: pt.accountCurrency || 'EUR',
        categoryIcon: pt.categoryIcon || 'HelpCircle',
        categoryColor: pt.categoryColor || 'gradient-gray',
        isPending: true,
        updatedAt: pt.createdAt // Use createdAt as updatedAt for pending
      }))];
      
      // Save ALL transactions for pagination
      setAllTransactionsData(allTransactionsInPeriod);
      
      // Calculate stats from ALL transactions in period
      const totalAmount = allTransactionsInPeriod.reduce((sum, tx) => sum + tx.amount, 0);
      
      // Calculate local trend from cached transactions
      const calculateLocalTrend = (transactions: Transaction[], period: 'day' | 'week' | 'month' | 'year') => {
        const dateRange = getDateRange(period);
        const filteredTxs = transactions.filter(tx => {
          const txDate = new Date(tx.transactionDate);
          return txDate >= new Date(dateRange.startDate) && txDate <= new Date(dateRange.endDate);
        });

        // Group by date based on period
        const groupedByDate = filteredTxs.reduce((acc, tx) => {
          let dateKey: string;
          const txDate = new Date(tx.transactionDate);
          
          switch(period) {
            case 'day':
              dateKey = format(txDate, 'HH:00');
              break;
            case 'week':
              dateKey = format(txDate, 'EEE');
              break;
            case 'month':
              dateKey = format(txDate, 'dd');
              break;
            case 'year':
              dateKey = format(txDate, 'MMM');
              break;
            default:
              dateKey = format(txDate, 'yyyy-MM-dd');
          }
          
          if (!acc[dateKey]) acc[dateKey] = 0;
          acc[dateKey] += tx.amount;
          return acc;
        }, {} as Record<string, number>);

        return Object.entries(groupedByDate).map(([date, amount]) => ({
          date,
          income: transactionType === 'income' ? amount : 0,
          expense: transactionType === 'expense' ? Math.abs(amount) : 0
        }));
      };

      const localTrend = calculateLocalTrend(allTransactionsInPeriod, period);
      
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
      
      // Show only first displayLimit transactions for recent transactions display
      setRecentTransactions(allTransactionsInPeriod.slice(0, displayLimit));
      
      // If online, try to fetch fresh data in background
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

          // Update with fresh data
          setStats(statsResponse.data);
          
          const transactions = transactionsResponse.data.transactions || [];
          setRecentTransactions(Array.isArray(transactions) ? transactions : []);
          
          // Cache fresh transactions
          if (Array.isArray(transactions)) {
            const user = localStorage.getItem('user');
            const userId = user ? JSON.parse(user).id : '';
            const txsWithUser = transactions.map(tx => ({ ...tx, userId }));
            await db.cachedTransactions.bulkPut(txsWithUser);
          }
        } catch (networkErr: any) {
          // Network failed, but we already have cache data - no error shown
          console.log("Network fetch failed, using cached data:", networkErr);
        }
      }
    } catch (err: any) {
      console.error("Failed to load data:", err);
      setError(err.response?.data?.message || "Errore nel caricamento dei dati");
      setRecentTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [period, viewType, displayLimit]); // Added displayLimit to dependencies

  useEffect(() => {
    loadUserName();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Reset display limit when period or viewType changes
    setDisplayLimit(50);
  }, [period, viewType]);

  useEffect(() => {
    // Listen for transaction created event
    const handleTransactionCreated = () => {
      loadData();
    };

    // Listen for data synced event
    const handleDataSynced = () => {
      loadData();
    };

    window.addEventListener('transactionCreated', handleTransactionCreated);
    window.addEventListener('dataSynced', handleDataSynced);
    return () => {
      window.removeEventListener('transactionCreated', handleTransactionCreated);
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

  // Calculate proper domain for Y-axis to prevent line truncation
  const getYAxisDomain = (data: any[]) => {
    if (!data || data.length === 0) return ['dataMin', 'dataMax'];
    
    const values = data.map(d => d.amount).filter(v => v != null);
    if (values.length === 0) return ['dataMin', 'dataMax'];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    // Add 20% padding above and below to prevent truncation
    const padding = Math.max(range * 0.2, 1); // At least 1 unit padding
    
    return [min - padding, max + padding];
  };

  return (
    <div className="px-3 pt-4 max-w-md mx-auto">

      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {error && (
        <div className="glass-card p-4 mb-6 tone-danger">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Balance Card */}
          <GlassCard className="p-4 mb-4">
            <div className="p-2 glass-card flex gap-2 mb-4">
              <button 
                onClick={() => setViewType("spending")}
                className={`flex-1 py-2 rounded-2xl text-sm font-medium transition-all interactive-press ${
                  viewType === "spending" ? "gradient-blue text-white" : "text-muted-foreground"
                }`}
              >
                Uscite
              </button>
              <button 
                onClick={() => setViewType("income")}
                className={`flex-1 py-2 rounded-2xl text-sm font-medium transition-all interactive-press ${
                  viewType === "income" ? "gradient-blue text-white" : "text-muted-foreground"
                }`}
              >
                Entrate
              </button>
            </div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-3xl font-bold">
                {getCurrencySymbol(stats?.currency)} {formatCurrency(totalAmount)}
              </h2>
              {/* Online/Offline Badge */}
              <div className={`flex items-center justify-center w-9 h-9 rounded-full border ${
                isOnline 
                  ? 'border-success/40 bg-success/15 text-success-foreground' 
                  : 'border-destructive/40 bg-destructive/25 text-destructive-foreground'
              }`}>
                {isOnline ? (
                  <Wifi className="w-5 h-5" />
                ) : (
                  <WifiOff className="w-5 h-5" />
                )}
              </div>
            </div>
            
            {/* Chart */}
            {chartData.length > 0 && (
              <div className="neon-chart-container mb-3">
                {/* Chart Labels */}
                <div className="flex justify-between items-center mb-2 px-2">
                  {getVisibleLabels(chartData, period).map((item, index) => (
                    <span key={index} className={period === 'year' ? 'chart-label-year' : 'chart-label'}>
                      {formatChartLabel(item.date, period, index)}
                    </span>
                  ))}
                </div>
                
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart 
                    data={chartData}
                    margin={{ top: 15, right: 10, left: 10, bottom: 0 }}
                  >
                    <XAxis 
                      dataKey="date" 
                      hide
                    />
                    <YAxis 
                      hide
                      domain={getYAxisDomain(chartData)}
                    />
                    <Line 
                      type="natural" 
                      dataKey="amount"
                      stroke="white" 
                      strokeWidth={3}
                      dot={false}
                      isAnimationActive={true}
                      animationDuration={800}
                      className="neon-glow"
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Period Selector */}
            <div className="flex gap-1.5">
              {(["day", "week", "month", "year"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-1.5 rounded-xl text-xs transition-all capitalize interactive-press ${
                    period === p 
                      ? "bg-white/20 text-white font-medium backdrop-blur-sm" 
                      : "text-white/70 hover:text-white/90"
                  }`}
                >
                  {p === "day" ? "Giorno" : p === "week" ? "Settimana" : p === "month" ? "Mese" : "Anno"}
                </button>
              ))}
            </div>
          </GlassCard>
        </>
      )}

      {/* Transactions */}
      {!loading && !error && (
        <GlassCard className="p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">Transazioni Recenti</h3>
            <Link to="/transactions" className="flex items-center gap-1 group interactive-press rounded-xl px-2 py-1">
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Nessuna transazione trovata</p>
            </div>
          ) : (
            <div className="space-y-2 gap-2">
              {recentTransactions.map((transaction) => (
                <Link key={transaction.id} to={`/transaction/${transaction.id}`}>
                  <div className="glass-card p-2.5 interactive-press cursor-pointer rounded-xl mb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-xl ${transaction.categoryColor || 'gradient-blue'} flex items-center justify-center`}>
                          <IconRenderer icon={transaction.categoryIcon} size={20} />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{transaction.categoryName}</h4>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(transaction.transactionDate), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold text-sm ${
                          transaction.isPending 
                            ? 'text-warning' 
                            : transaction.type === 'income' 
                              ? 'text-success' 
                              : 'text-destructive'
                        }`}>
                          {transaction.type === 'income' ? <ArrowUpRight className="inline w-4 h-4 mb-0.5" /> : <ArrowDownRight className="inline w-4 h-4 mb-0.5" />}
                          {' '}{getCurrencySymbol(transaction.accountCurrency || stats?.currency)} {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          
          {/* Show More Button */}
          {allTransactionsData.length > displayLimit && (
            <div className="text-center mt-3">
              <Button
                onClick={handleLoadMore}
                variant="outline"
                className="w-full"
              >
                Mostra altri ({allTransactionsData.length - displayLimit} rimanenti)
              </Button>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}

