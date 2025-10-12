import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, ChevronRight, Wallet, Tag, RefreshCw, User, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      // Call logout API
      await api.auth.logout();
    } catch (err) {
      console.error("Logout error:", err);
      // Continue with logout even if API call fails
    } finally {
      // Clear auth data
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      
      toast.success("Logout effettuato con successo");
      navigate("/auth", { replace: true });
    }
  };


  return (
    <div className="px-3 pt-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/" className="p-1.5 glass-card rounded-2xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Impostazioni</h1>
      </div>

      {/* Settings Groups */}
      <div className="space-y-4">
        {settingsGroups.map((group, index) => (
          <div key={index}>
            <h2 className="text-xs text-muted-foreground mb-2 ml-1 font-medium">{group.title}</h2>
            <GlassCard className="divide-y divide-white/5">
              {group.items.map((item, itemIndex) => (
                <Link
                  key={itemIndex}
                  to={item.path}
                  className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors first:rounded-t-3xl last:rounded-b-3xl"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg gradient-blue flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </GlassCard>
          </div>
        ))}
      </div>


      {/* Logout Button */}
      <Button
        variant="destructive"
        className="w-full mt-4 gap-2 h-10 text-sm"
        onClick={() => setLogoutDialogOpen(true)}
      >
        <LogOut className="w-3.5 h-3.5" />
        Esci
      </Button>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Conferma logout</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Sei sicuro di voler uscire dal tuo account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="m-0 text-sm">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="m-0 text-sm">Esci</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
