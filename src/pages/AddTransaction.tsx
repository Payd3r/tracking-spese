import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

const expenseCategories = [
  { id: 1, name: "Food", icon: "🍔", color: "gradient-green" },
  { id: 2, name: "Transport", icon: "🚕", color: "gradient-pink" },
  { id: 3, name: "Shopping", icon: "🛍️", color: "gradient-purple" },
  { id: 4, name: "Bills", icon: "📄", color: "gradient-blue" },
  { id: 5, name: "Entertainment", icon: "🎮", color: "gradient-teal" },
];

const incomeCategories = [
  { id: 6, name: "Stipendio", icon: "💰", color: "gradient-blue" },
  { id: 7, name: "Freelance", icon: "💼", color: "gradient-green" },
  { id: 8, name: "Investimenti", icon: "📈", color: "gradient-purple" },
];

const accounts = [
  { id: 1, name: "Main Account", balance: 1673.80 },
  { id: 2, name: "Savings", balance: 5420.00 },
];

export default function AddTransaction() {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<number>(1);

  const categories = type === "expense" ? expenseCategories : incomeCategories;

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="p-2 glass-card rounded-2xl">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Nuova Transazione</h1>
      </div>

      {/* Type Selector */}
      <GlassCard className="p-2 mb-6 flex gap-2">
        <button
          onClick={() => setType("expense")}
          className={`flex-1 py-3 rounded-2xl font-medium transition-all ${
            type === "expense" ? "gradient-pink text-white" : "text-muted-foreground"
          }`}
        >
          Uscita
        </button>
        <button
          onClick={() => setType("income")}
          className={`flex-1 py-3 rounded-2xl font-medium transition-all ${
            type === "income" ? "gradient-green text-white" : "text-muted-foreground"
          }`}
        >
          Entrata
        </button>
      </GlassCard>

      {/* Amount */}
      <GlassCard className="p-6 mb-6">
        <label className="text-sm text-muted-foreground mb-2 block">Importo</label>
        <div className="flex items-center gap-2">
          <span className="text-4xl font-bold">$</span>
          <Input
            type="number"
            placeholder="0.00"
            className="text-4xl font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
          />
        </div>
      </GlassCard>

      {/* Category */}
      <div className="mb-6">
        <label className="text-sm text-muted-foreground mb-3 block">Categoria</label>
        <div className="grid grid-cols-3 gap-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`glass-card p-4 flex flex-col items-center gap-2 transition-all ${
                selectedCategory === category.id ? category.color : ""
              }`}
            >
              <span className="text-3xl">{category.icon}</span>
              <span className="text-xs font-medium">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Account */}
      <div className="mb-6">
        <label className="text-sm text-muted-foreground mb-3 block">Conto</label>
        <div className="space-y-2">
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => setSelectedAccount(account.id)}
              className={`w-full glass-card p-4 flex justify-between items-center transition-all ${
                selectedAccount === account.id ? "gradient-blue" : ""
              }`}
            >
              <span className="font-medium">{account.name}</span>
              <span className="text-sm">$ {account.balance.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="mb-6">
        <label className="text-sm text-muted-foreground mb-3 block">Nota (opzionale)</label>
        <GlassCard className="p-4">
          <Textarea
            placeholder="Aggiungi una nota..."
            className="bg-transparent border-none resize-none min-h-[80px] focus-visible:ring-0"
          />
        </GlassCard>
      </div>

      {/* Submit Button */}
      <Button className="w-full h-14 rounded-2xl gradient-blue text-white font-semibold text-lg shadow-lg">
        Aggiungi Transazione
      </Button>
    </div>
  );
}
