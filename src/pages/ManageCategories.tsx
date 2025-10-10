import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const expenseCategories = [
  { id: 1, name: "Fast Food", icon: "🍔", color: "gradient-green" },
  { id: 2, name: "Grocerie", icon: "🛒", color: "gradient-purple" },
  { id: 3, name: "Taxi", icon: "🚕", color: "gradient-pink" },
  { id: 4, name: "Shopping", icon: "🛍️", color: "gradient-teal" },
];

const incomeCategories = [
  { id: 5, name: "Stipendio", icon: "💰", color: "gradient-blue" },
  { id: 6, name: "Freelance", icon: "💼", color: "gradient-green" },
  { id: 7, name: "Investimenti", icon: "📈", color: "gradient-purple" },
];

export default function ManageCategories() {
  const [viewType, setViewType] = useState<"expense" | "income">("expense");
  
  const categories = viewType === "expense" ? expenseCategories : incomeCategories;

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/settings" className="p-2 glass-card rounded-2xl">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Gestione Categorie</h1>
      </div>

      {/* Toggle */}
      <GlassCard className="p-2 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewType("expense")}
            className={`flex-1 py-2 rounded-xl text-sm transition-all ${
              viewType === "expense" ? "gradient-blue text-white" : "text-muted-foreground"
            }`}
          >
            Uscite
          </button>
          <button
            onClick={() => setViewType("income")}
            className={`flex-1 py-2 rounded-xl text-sm transition-all ${
              viewType === "income" ? "gradient-blue text-white" : "text-muted-foreground"
            }`}
          >
            Entrate
          </button>
        </div>
      </GlassCard>

      {/* Add Category Button */}
      <Button className="w-full mb-6 gap-2">
        <Plus className="w-5 h-5" />
        Aggiungi Categoria
      </Button>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 gap-4">
        {categories.map((category) => (
          <GlassCard key={category.id} className={`p-5 ${category.color} relative group`}>
            <button className="absolute top-3 right-3 p-1.5 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-4 h-4 text-white" />
            </button>
            <div className="text-4xl mb-4">{category.icon}</div>
            <h3 className="text-white font-semibold">{category.name}</h3>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
