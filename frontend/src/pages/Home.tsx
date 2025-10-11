import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { ArrowDownRight, ArrowUpRight, Search, MoreVertical, ChevronRight, Loader2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { DashboardStats, Transaction } from "@/types/api";
import { format } from "date-fns";

export default function Home() {
  const [viewType, setViewType] = useState<"income" | "spending">("spending");
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("month");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    loadData();
  }, [period]);

  useEffect(() => {
    loadUserName();
  }, []);

  const loadUserName = async () => {
    try {
      const response = await api.auth.me();
      setUserName(response.data.name || "User");
    } catch (err) {
      console.error("Failed to load user:", err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsResponse, transactionsResponse] = await Promise.all([
        api.stats.getDashboard(period),
        api.transactions.getAll({ limit: 10 })
      ]);

      setStats(statsResponse.data);
      setRecentTransactions(transactionsResponse.data);
    } catch (err: any) {
      console.error("Failed to load data:", err);
      setError(err.response?.data?.message || "Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = recentTransactions.filter(t => 
    viewType === "income" ? t.type === 'income' : t.type === 'expense'
  );

  const chartData = stats?.chartData || [];
  const totalAmount = viewType === "income" ? stats?.income || 0 : stats?.expense || 0;

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-muted-foreground text-sm">Ciao,</p>
          <h1 className="text-3xl font-bold">{userName}</h1>
        </div>
        <div className="flex gap-3">
          <Link to="/search" className="p-3 glass-card rounded-2xl">
            <Search className="w-5 h-5" />
          </Link>
          <Link to="/settings" className="p-3 glass-card rounded-2xl">
            <MoreVertical className="w-5 h-5" />
          </Link>
        </div>
      </div>

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
          <GlassCard className="p-6 mb-6">
            <div className="flex gap-4 mb-6">
              <button 
                onClick={() => setViewType("spending")}
                className={`text-sm pb-2 ${viewType === "spending" ? "font-medium border-b-2 border-primary" : "text-white/70"}`}
              >
                Uscite
              </button>
              <button 
                onClick={() => setViewType("income")}
                className={`text-sm pb-2 ${viewType === "income" ? "font-medium border-b-2 border-primary" : "text-white/70"}`}
              >
                Entrate
              </button>
            </div>
            <div className="mb-4">
              <h2 className="text-4xl font-bold">
                {stats?.currency} {totalAmount.toFixed(2)}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                {viewType === "income" ? "Totale entrate" : "Totale uscite"}
              </p>
            </div>
            
            {/* Chart */}
            {chartData.length > 0 && (
              <div className="gradient-blue rounded-2xl p-4 mb-4">
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData}>
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.5)" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(date) => format(new Date(date), 'dd/MM')}
                    />
                    <YAxis hide />
                    <Line 
                      type="monotone" 
                      dataKey={viewType === "income" ? "income" : "expense"}
                      stroke="white" 
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Period Selector */}
            <div className="flex gap-2">
              {(["day", "week", "month", "year"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-2 rounded-xl text-sm transition-all capitalize ${
                    period === p ? "gradient-blue text-white" : "text-muted-foreground"
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
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <Link to="/transactions" className="flex items-center gap-2 group">
              <h3 className="text-xl font-semibold">Transazioni Recenti</h3>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
            <span className="text-sm text-muted-foreground">
              {format(new Date(), 'dd/MM/yyyy')}
            </span>
          </div>

          {filteredTransactions.length === 0 ? (
            <GlassCard className="p-6 text-center">
              <p className="text-muted-foreground">Nessuna transazione trovata</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <Link key={transaction.id} to={`/transaction/${transaction.id}`}>
                  <GlassCard className="p-3 hover:scale-[1.02] transition-transform cursor-pointer mb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl ${transaction.categoryColor || 'gradient-blue'} flex items-center justify-center`}>
                          <IconRenderer icon={transaction.categoryIcon} size={24} />
                        </div>
                        <div>
                          <h4 className="font-medium">{transaction.title}</h4>
                          <p className="text-sm text-muted-foreground">{transaction.categoryName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${transaction.type === 'income' ? 'text-success' : 'text-foreground'}`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {transaction.type === 'income' ? <ArrowUpRight className="inline w-4 h-4" /> : <ArrowDownRight className="inline w-4 h-4" />}
                          {' '}{transaction.accountCurrency || stats?.currency} {Math.abs(transaction.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(transaction.transactionDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

