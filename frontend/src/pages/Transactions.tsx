import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft } from "lucide-react";
import { Link, Link as RouterLink } from "react-router-dom";
import { useState } from "react";

const categories = [
  {
    id: 1,
    name: "Fast Food",
    icon: "🍔",
    color: "gradient-green",
    spent: 46,
    transactions: [
      { id: 1, title: "McDonald's", amount: -15, date: "16/09/2020" },
      { id: 2, title: "Burger King", amount: -12, date: "15/09/2020" },
      { id: 3, title: "KFC", amount: -19, date: "14/09/2020" },
    ],
  },
  {
    id: 2,
    name: "Grocerie",
    icon: "🛒",
    color: "gradient-purple",
    spent: 97,
    transactions: [
      { id: 4, title: "Supermarket", amount: -45, date: "16/09/2020" },
      { id: 5, title: "Fresh Market", amount: -32, date: "15/09/2020" },
      { id: 6, title: "Organic Store", amount: -20, date: "13/09/2020" },
    ],
  },
  {
    id: 3,
    name: "Taxi",
    icon: "🚕",
    color: "gradient-pink",
    spent: 76,
    transactions: [
      { id: 7, title: "Uber", amount: -18, date: "16/09/2020" },
      { id: 8, title: "Bolt", amount: -25, date: "15/09/2020" },
      { id: 9, title: "Taxi", amount: -33, date: "14/09/2020" },
    ],
  },
  {
    id: 4,
    name: "Shopping",
    icon: "🛍️",
    color: "gradient-teal",
    spent: 88,
    transactions: [
      { id: 10, title: "H&M", amount: -45, date: "16/09/2020" },
      { id: 11, title: "Zara", amount: -43, date: "14/09/2020" },
    ],
  },
];

export default function Transactions() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  
  const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);

  const displayedTransactions = selectedCategory 
    ? categories.find(c => c.id === selectedCategory)?.transactions || []
    : categories.flatMap(c => c.transactions);

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="p-2 glass-card rounded-2xl">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Categories</h1>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {categories.map((category) => (
          <GlassCard
            key={category.id}
            className={`p-5 ${category.color} cursor-pointer transition-all ${
              selectedCategory === category.id ? "ring-2 ring-white/50" : ""
            }`}
            hover
            onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
          >
            <div className="text-4xl mb-4">{category.icon}</div>
            <h3 className="text-white font-semibold mb-1">{category.name}</h3>
            <p className="text-white/80 text-sm">spent {category.spent}%</p>
          </GlassCard>
        ))}
      </div>

      {/* Transactions List */}
      <div className="glass-card p-6 mb-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {selectedCategory 
              ? categories.find(c => c.id === selectedCategory)?.name 
              : "All Transactions"}
          </h2>
          <span className="text-xl font-bold">$ {totalSpent.toFixed(2)}</span>
        </div>

        <div className="space-y-3">
          {displayedTransactions.map((transaction) => (
            <RouterLink key={transaction.id} to={`/transaction/${transaction.id}`}>
              <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer rounded-lg px-2">
                <div>
                  <h4 className="font-medium">{transaction.title}</h4>
                  <p className="text-xs text-muted-foreground">{transaction.date}</p>
                </div>
                <span className="font-semibold">$ {transaction.amount}</span>
              </div>
            </RouterLink>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">Today • Sep 16</p>
      </div>
    </div>
  );
}
