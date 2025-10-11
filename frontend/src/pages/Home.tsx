import { GlassCard } from "@/components/GlassCard";
import { ArrowDownRight, ArrowUpRight, Search, MoreVertical, ChevronRight } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { useState } from "react";

const mockData = [
  { day: "L", value: 1200 },
  { day: "M", value: 1800 },
  { day: "M", value: 1400 },
  { day: "G", value: 2200 },
  { day: "V", value: 1900 },
  { day: "S", value: 2400 },
  { day: "D", value: 1600 },
];

const recentTransactions = [
  { id: 1, title: "Subscription", category: "Bills", amount: -49, date: "16/09/2020", icon: "🔄" },
  { id: 2, title: "Food Garage", category: "Food", amount: -80, date: "16/09/2020", icon: "🍔" },
  { id: 3, title: "Salary", category: "Income", amount: 2500, date: "15/09/2020", icon: "💰" },
];

export default function Home() {
  const [viewType, setViewType] = useState<"income" | "spending">("spending");
  const [period, setPeriod] = useState<"Day" | "Week" | "Month" | "Year">("Month");

  const filteredTransactions = recentTransactions.filter(t => 
    viewType === "income" ? t.amount > 0 : t.amount < 0
  );

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-muted-foreground text-sm">Hello,</p>
          <h1 className="text-3xl font-bold">Mark</h1>
        </div>
        <div className="flex gap-3">
          <button className="p-3 glass-card rounded-2xl">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-3 glass-card rounded-2xl">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <GlassCard className="p-6 mb-6">
        <div className="flex gap-4 mb-6">
          <button 
            onClick={() => setViewType("spending")}
            className={`text-sm pb-2 ${viewType === "spending" ? "font-medium border-b-2 border-primary" : "text-white/70"}`}
          >
            Spendings
          </button>
          <button 
            onClick={() => setViewType("income")}
            className={`text-sm pb-2 ${viewType === "income" ? "font-medium border-b-2 border-primary" : "text-white/70"}`}
          >
            Incomes
          </button>
        </div>
        <div className="mb-4">
          <h2 className="text-4xl font-bold">$ 1,673.80</h2>
          <p className="text-muted-foreground text-sm mt-1">Balance totale</p>
        </div>
        
        {/* Chart */}
        <div className="gradient-blue rounded-2xl p-4 mb-4">
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={mockData}>
              <XAxis 
                dataKey="day" 
                stroke="rgba(255,255,255,0.5)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="white" 
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {(["Day", "Week", "Month", "Year"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-xl text-sm transition-all ${
                period === p ? "gradient-blue text-white" : "text-muted-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Transactions */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <Link to="/transactions" className="flex items-center gap-2 group">
            <h3 className="text-xl font-semibold">Transactions</h3>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
          <span className="text-sm text-muted-foreground">Today • Sep 16</span>
        </div>

        <div className="space-y-3">
          {filteredTransactions.map((transaction) => (
            <Link key={transaction.id} to={`/transaction/${transaction.id}`}>
              <GlassCard className="p-3 hover:scale-[1.02] transition-transform cursor-pointer mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl gradient-blue flex items-center justify-center text-2xl">
                      {transaction.icon}
                    </div>
                    <div>
                      <h4 className="font-medium">{transaction.title}</h4>
                      <p className="text-sm text-muted-foreground">{transaction.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.amount > 0 ? 'text-success' : 'text-foreground'}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount > 0 ? <ArrowUpRight className="inline w-4 h-4" /> : <ArrowDownRight className="inline w-4 h-4" />} ${Math.abs(transaction.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{transaction.date}</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
