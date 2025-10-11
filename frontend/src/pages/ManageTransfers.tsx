import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const accounts = [
  { id: 1, name: "Conto Principale", balance: 1673.80 },
  { id: 2, name: "Risparmi", balance: 5420.00 },
  { id: 3, name: "Contanti", balance: 250.00 },
];

const transfers = [
  { id: 1, from: "Conto Principale", to: "Risparmi", amount: 500, date: "16/09/2020" },
  { id: 2, from: "Risparmi", to: "Contanti", amount: 150, date: "15/09/2020" },
];

export default function ManageTransfers() {
  const [fromAccount, setFromAccount] = useState<number>(1);
  const [toAccount, setToAccount] = useState<number>(2);

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/settings" className="p-2 glass-card rounded-2xl">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Trasferimenti</h1>
      </div>

      {/* New Transfer Form */}
      <GlassCard className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Nuovo Trasferimento</h2>
        
        {/* From Account */}
        <div className="mb-4">
          <label className="text-sm text-muted-foreground mb-2 block">Da</label>
          <div className="space-y-2">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setFromAccount(account.id)}
                className={`w-full glass-card p-3 flex justify-between items-center transition-all ${
                  fromAccount === account.id ? "gradient-pink" : ""
                }`}
              >
                <span className="font-medium text-sm">{account.name}</span>
                <span className="text-xs">$ {account.balance.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* To Account */}
        <div className="mb-4">
          <label className="text-sm text-muted-foreground mb-2 block">A</label>
          <div className="space-y-2">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setToAccount(account.id)}
                className={`w-full glass-card p-3 flex justify-between items-center transition-all ${
                  toAccount === account.id ? "gradient-green" : ""
                }`}
              >
                <span className="font-medium text-sm">{account.name}</span>
                <span className="text-xs">$ {account.balance.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="text-sm text-muted-foreground mb-2 block">Importo</label>
          <div className="flex items-center gap-2 glass-card p-4">
            <span className="text-2xl font-bold">$</span>
            <Input
              type="number"
              placeholder="0.00"
              className="text-2xl font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
            />
          </div>
        </div>

        <Button className="w-full gradient-blue text-white">
          Crea Trasferimento
        </Button>
      </GlassCard>

      {/* Transfers List */}
      <div className="space-y-4">
        {transfers.map((transfer) => (
          <GlassCard key={transfer.id} className="p-5">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{transfer.from}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{transfer.to}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{transfer.date}</p>
              </div>
            </div>
            <p className="text-2xl font-bold">$ {transfer.amount.toFixed(2)}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
