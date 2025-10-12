import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, Link as RouterLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Category, Transaction } from "@/types/api";
import { format } from "date-fns";

export default function Transactions() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [categoriesResponse, transactionsResponse] = await Promise.all([
        api.categories.getAll(),
        api.transactions.getAll()
      ]);

      // Ensure arrays
      setCategories(Array.isArray(categoriesResponse.data.categories) ? categoriesResponse.data.categories : []);
      const transactions = transactionsResponse.data.transactions || [];
      setTransactions(Array.isArray(transactions) ? transactions : []);
    } catch (err: any) {
      console.error("Failed to load data:", err);
      setError(err.response?.data?.message || "Errore nel caricamento dei dati");
      setCategories([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate spent percentage for each category
  const categoriesWithStats = categories.map(category => {
    const categoryTransactions = transactions.filter(t => t.categoryId === category.id && t.type === 'expense');
    const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
    return {
      ...category,
      total,
      count: categoryTransactions.length,
      transactions: categoryTransactions
    };
  }).filter(c => c.count > 0);

  const totalSpent = categoriesWithStats.reduce((sum, cat) => sum + cat.total, 0);

  const displayedTransactions = selectedCategory 
    ? transactions.filter(t => t.categoryId === selectedCategory)
    : transactions;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-3 pt-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/" className="p-1.5 glass-card rounded-2xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Tutte le transazioni</h1>
      </div>

      {error && (
        <div className="glass-card p-4 mb-6 bg-red-500/20 border border-red-500/50">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Category Cards */}
      {categoriesWithStats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {categoriesWithStats.map((category) => {
            const percentage = totalSpent > 0 ? (category.total / totalSpent) * 100 : 0;
            return (
              <GlassCard
                key={category.id}
                className={`p-4 ${category.color || 'gradient-blue'} cursor-pointer transition-all ${
                  selectedCategory === category.id ? "ring-2 ring-white/50" : ""
                }`}
                hover
                onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
              >
                <div className="mb-3">
                  <IconRenderer icon={category.icon} size={32} />
                </div>
                <h3 className="text-white font-semibold text-sm mb-0.5">{category.name}</h3>
                <p className="text-white/80 text-xs">{percentage.toFixed(1)}% • {category.count} trans.</p>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Transactions List */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">
            {selectedCategory 
              ? categories.find(c => c.id === selectedCategory)?.name 
              : "Tutte le Transazioni"}
          </h2>
          <span className="text-base font-bold">€ {totalSpent.toFixed(2)}</span>
        </div>

        {displayedTransactions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Nessuna transazione trovata</p>
        ) : (
          <div className="space-y-2">
            {displayedTransactions.map((transaction) => (
              <RouterLink key={transaction.id} to={`/transaction/${transaction.id}`}>
                <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer rounded-lg px-1.5">
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
                  <span className={`font-semibold text-sm ${transaction.type === 'income' ? 'text-success' : ''}`}>
                    {transaction.type === 'income' ? '+' : '-'}€ {Math.abs(transaction.amount).toFixed(2)}
                  </span>
                </div>
              </RouterLink>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4">
          {format(new Date(), 'dd MMMM yyyy')}
        </p>
      </div>
    </div>
  );
}
