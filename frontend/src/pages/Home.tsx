import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Loader2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { DashboardStats, Transaction } from "@/types/api";
import { format } from "date-fns";

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
  const [viewType, setViewType] = useState<"income" | "spending">("spending");
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("week");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");

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
      
      const [statsResponse, transactionsResponse] = await Promise.all([
        api.stats.getDashboard(period, viewType === "spending" ? "expense" : "income"),
        api.transactions.getAll({ limit: 10 })
      ]);

      setStats(statsResponse.data);
      
      // Ensure recentTransactions is always an array
      const transactions = transactionsResponse.data.transactions || [];
      setRecentTransactions(Array.isArray(transactions) ? transactions : []);
    } catch (err: any) {
      console.error("Failed to load data:", err);
      setError(err.response?.data?.message || "Errore nel caricamento dei dati");
      // Set empty array on error to avoid filter issues
      setRecentTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [period, viewType]);

  useEffect(() => {
    loadUserName();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Listen for transaction created event
    const handleTransactionCreated = () => {
      loadData();
    };

    window.addEventListener('transactionCreated', handleTransactionCreated);
    return () => {
      window.removeEventListener('transactionCreated', handleTransactionCreated);
    };
  }, [loadData]);

  const filteredTransactions = recentTransactions.filter(t => 
    viewType === "income" ? t.type === 'income' : t.type === 'expense'
  );

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
    <div className="min-h-screen pb-24 px-3 pt-4 max-w-md mx-auto">

      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {error && (
        <div className="glass-card p-4 mb-6 bg-red-500/20 border border-red-500/50">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Balance Card */}
          <GlassCard className="p-4 mb-4">
            <div className="flex gap-3 mb-4">
              <button 
                onClick={() => setViewType("spending")}
                className={`text-xs pb-1.5 ${viewType === "spending" ? "font-medium border-b-2 border-primary" : "text-white/70"}`}
              >
                Uscite
              </button>
              <button 
                onClick={() => setViewType("income")}
                className={`text-xs pb-1.5 ${viewType === "income" ? "font-medium border-b-2 border-primary" : "text-white/70"}`}
              >
                Entrate
              </button>
            </div>
            <div className="mb-3">
              <h2 className="text-3xl font-bold">
                {stats?.currency} {totalAmount.toFixed(2)}
              </h2>
              <p className="text-muted-foreground text-xs mt-1">
                {viewType === "income" ? "Totale entrate" : "Totale uscite"}
              </p>
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
                  className={`flex-1 py-1.5 rounded-xl text-xs transition-all capitalize ${
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
            <Link to="/transactions" className="flex items-center gap-1 group">
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Nessuna transazione trovata</p>
            </div>
          ) : (
            <div className="space-y-2 gap-2">
              {filteredTransactions.map((transaction) => (
                <Link key={transaction.id} to={`/transaction/${transaction.id}`}>
                  <div className="glass-card p-2.5 hover:scale-[1.01] transition-transform cursor-pointer rounded-xl mb-2">
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
                        <p className={`font-semibold text-sm ${transaction.type === 'income' ? 'text-success' : 'text-red-400'}`}>
                          {transaction.type === 'income' ? <ArrowUpRight className="inline w-4 h-4 mb-0.5" /> : <ArrowDownRight className="inline w-4 h-4 mb-0.5" />}
                          {' '}{getCurrencySymbol(transaction.accountCurrency || stats?.currency)} {Math.abs(transaction.amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}

