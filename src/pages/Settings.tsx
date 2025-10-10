import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, ChevronRight, Wallet, Tag, RefreshCw, User, Download, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const settingsGroups = [
  {
    title: "Gestione",
    items: [
      { icon: Wallet, label: "Conti", path: "/settings/accounts" },
      { icon: Tag, label: "Categorie", path: "/settings/categories" },
      { icon: RefreshCw, label: "Trasferimenti", path: "/settings/transfers" },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: User, label: "Profilo", path: "/settings/profile" },
    ],
  },
];

export default function Settings() {
  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="p-2 glass-card rounded-2xl">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Impostazioni</h1>
      </div>

      {/* Settings Groups */}
      <div className="space-y-6">
        {settingsGroups.map((group, index) => (
          <div key={index}>
            <h2 className="text-sm text-muted-foreground mb-3 ml-1">{group.title}</h2>
            <GlassCard className="divide-y divide-white/5">
              {group.items.map((item, itemIndex) => (
                <Link
                  key={itemIndex}
                  to={item.path}
                  className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors first:rounded-t-3xl last:rounded-b-3xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Link>
              ))}
            </GlassCard>
          </div>
        ))}
      </div>

      {/* Account Info */}
      <GlassCard className="p-6 mt-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full gradient-purple flex items-center justify-center text-2xl font-bold">
            M
          </div>
          <div>
            <h3 className="font-semibold text-lg">Mark Johnson</h3>
            <p className="text-sm text-muted-foreground">mark@example.com</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button className="flex-1 gap-2" variant="outline">
            <Upload className="w-4 h-4" />
            Importa Backup
          </Button>
          <Button className="flex-1 gap-2" variant="outline">
            <Download className="w-4 h-4" />
            Esporta Backup
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
