import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const accounts = [
  { id: 1, name: "Conto Principale", balance: 1673.80, icon: "💳" },
  { id: 2, name: "Risparmi", balance: 5420.50, icon: "🏦" },
  { id: 3, name: "Contanti", balance: 150.00, icon: "💵" },
];

export default function ManageAccounts() {
  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/settings" className="p-2 glass-card rounded-2xl">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Gestione Conti</h1>
      </div>

      {/* Add Account Button */}
      <Button className="w-full mb-6 gap-2">
        <Plus className="w-5 h-5" />
        Aggiungi Conto
      </Button>

      {/* Accounts List */}
      <div className="space-y-4">
        {accounts.map((account) => (
          <GlassCard key={account.id} className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl gradient-blue flex items-center justify-center text-2xl">
                  {account.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{account.name}</h3>
                  <p className="text-2xl font-bold mt-1">$ {account.balance.toFixed(2)}</p>
                </div>
              </div>
              <button className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <Trash2 className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
