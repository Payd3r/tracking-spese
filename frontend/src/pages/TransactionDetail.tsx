import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, Calendar, FileText, Wallet } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

const categories = [
  { id: 1, name: "Food", icon: "🍔", color: "gradient-green" },
  { id: 2, name: "Transport", icon: "🚕", color: "gradient-pink" },
  { id: 3, name: "Shopping", icon: "🛍️", color: "gradient-purple" },
];

const accounts = [
  { id: 1, name: "Main Account", balance: 1673.80 },
  { id: 2, name: "Savings", balance: 5420.00 },
];

export default function TransactionDetail() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number>(1);
  const [selectedAccount, setSelectedAccount] = useState<number>(1);

  // Mock transaction data
  const transaction = {
    type: "expense",
    amount: 45.50,
    category: "Food",
    account: "Main Account",
    date: "2024-01-15",
    note: "Lunch at restaurant"
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-2xl">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Dettaglio Transazione</h1>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="ghost" size="sm">
            Modifica
          </Button>
        )}
      </div>

      {/* Transaction Type Badge */}
      <div className="mb-6">
        <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
          transaction.type === "expense" ? "gradient-pink text-white" : "gradient-green text-white"
        }`}>
          {transaction.type === "expense" ? "Uscita" : "Entrata"}
        </span>
      </div>

      {/* Amount */}
      <GlassCard className="p-6 mb-6">
        <label className="text-sm text-muted-foreground mb-2 block">Importo</label>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold">$</span>
            <Input
              type="number"
              defaultValue={transaction.amount}
              className="text-4xl font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
            />
          </div>
        ) : (
          <p className="text-4xl font-bold">$ {transaction.amount.toFixed(2)}</p>
        )}
      </GlassCard>

      {/* Category */}
      <GlassCard className="p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🍔</div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Categoria</p>
            <p className="font-semibold">{transaction.category}</p>
          </div>
        </div>
        {isEditing && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`glass-card p-3 flex flex-col items-center gap-2 transition-all ${
                  selectedCategory === category.id ? category.color : ""
                }`}
              >
                <span className="text-2xl">{category.icon}</span>
                <span className="text-xs font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Account */}
      <GlassCard className="p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Conto</p>
            <p className="font-semibold">{transaction.account}</p>
          </div>
        </div>
        {isEditing && (
          <div className="space-y-2 mt-4">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setSelectedAccount(account.id)}
                className={`w-full glass-card p-3 flex justify-between items-center transition-all ${
                  selectedAccount === account.id ? "gradient-blue" : ""
                }`}
              >
                <span className="font-medium text-sm">{account.name}</span>
                <span className="text-xs">$ {account.balance.toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Date */}
      <GlassCard className="p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Data</p>
            {isEditing ? (
              <Input
                type="date"
                defaultValue={transaction.date}
                className="bg-transparent border-none p-0 h-auto focus-visible:ring-0 font-semibold"
              />
            ) : (
              <p className="font-semibold">{new Date(transaction.date).toLocaleDateString('it-IT')}</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Note */}
      <GlassCard className="p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-2">Nota</p>
            {isEditing ? (
              <Textarea
                defaultValue={transaction.note}
                className="bg-transparent border-none resize-none min-h-[60px] focus-visible:ring-0 p-0"
              />
            ) : (
              <p>{transaction.note}</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Actions */}
      {isEditing ? (
        <div className="flex gap-3">
          <Button 
            onClick={() => setIsEditing(false)} 
            variant="outline" 
            className="flex-1"
          >
            Annulla
          </Button>
          <Button 
            onClick={() => setIsEditing(false)} 
            className="flex-1 gradient-blue text-white"
          >
            Salva
          </Button>
        </div>
      ) : (
        <Button 
          variant="destructive" 
          className="w-full"
        >
          Elimina Transazione
        </Button>
      )}
    </div>
  );
}
