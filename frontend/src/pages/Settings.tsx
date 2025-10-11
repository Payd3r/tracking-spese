import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, ChevronRight, Wallet, Tag, RefreshCw, User, LogOut, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { User as UserType } from "@/types/api";
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
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await api.auth.me();
      setUser(response.data);
    } catch (err: any) {
      console.error("Failed to load user:", err);
      toast.error("Errore nel caricamento del profilo");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear auth data
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    
    toast.success("Logout effettuato con successo");
    navigate("/auth");
  };

  const initial = user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U";

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
      {loading ? (
        <GlassCard className="p-6 mt-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </GlassCard>
      ) : (
        <Link to="/settings/profile">
          <GlassCard className="p-6 mt-8 hover:scale-[1.02] transition-transform cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full gradient-purple flex items-center justify-center text-2xl font-bold">
                {initial}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{user?.name || "Utente"}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </GlassCard>
        </Link>
      )}

      {/* Logout Button */}
      <Button
        variant="destructive"
        className="w-full mt-6 gap-2"
        onClick={() => setLogoutDialogOpen(true)}
      >
        <LogOut className="w-4 h-4" />
        Esci
      </Button>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma logout</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler uscire dal tuo account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Esci</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
