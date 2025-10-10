import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import { Link } from "react-router-dom";

const transfers = [
  { id: 1, from: "Conto Principale", to: "Risparmi", amount: 500, date: "16/09/2020" },
  { id: 2, from: "Risparmi", to: "Contanti", amount: 150, date: "15/09/2020" },
];

export default function ManageTransfers() {
  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/settings" className="p-2 glass-card rounded-2xl">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Trasferimenti</h1>
      </div>

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
