import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, ChevronRight, Wallet, Tag, RefreshCw, User, LogOut, Wifi, WifiOff, CloudUpload, Loader2, HandCoins } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useSync } from "@/contexts/SyncContext";
import { getLastSyncTime } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { clearCache, clearStartupSnapshot } from "@/lib/cacheManager";
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
      { icon: HandCoins, label: "Prestiti", path: "/settings/loans" },
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
  const { isOnline, isSyncing, pendingCount, hasPending, triggerSync } = useSync();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    loadLastSyncTime();
  }, []);

  const loadLastSyncTime = async () => {
    const time = await getLastSyncTime();
    setLastSync(time);
  };

  const handleManualSync = async () => {
    await triggerSync();
    await loadLastSyncTime();
  };

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
      
      // Clear cache and startup snapshot
      await clearCache();
      clearStartupSnapshot();
      
      toast.success("Logout effettuato con successo");
      navigate("/auth", { replace: true });
    }
  };


  return (
    <div className="px-3 pt-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/" className="p-1.5 glass-card rounded-2xl interactive-press">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Impostazioni</h1>
      </div>

      {/* Sync Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xs text-muted-foreground mb-2 ml-1 font-medium">Sincronizzazione</h2>
          <GlassCard className="p-4">
            {/* Online Status */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
                <span className="text-sm font-medium">Stato</span>
              </div>
              <span className={`text-sm font-medium ${isOnline ? 'text-success' : 'text-destructive'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Last Sync Time */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/5">
              <span className="text-sm font-medium">Ultima sincronizzazione</span>
              <span className="text-xs text-muted-foreground">
                {lastSync ? formatDistanceToNow(lastSync, { addSuffix: true, locale: it }) : 'Mai'}
              </span>
            </div>

            {/* Pending Operations */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Operazioni in attesa</span>
              <span className={`text-sm font-medium ${hasPending ? 'text-warning' : 'text-muted-foreground'}`}>
                {pendingCount}
              </span>
            </div>

            {/* Sync Button */}
            <Button
              onClick={handleManualSync}
              disabled={!isOnline || !hasPending || isSyncing}
              className="w-full gap-2 h-9 text-sm"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sincronizzazione...
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  Sincronizza ora
                </>
              )}
            </Button>
          </GlassCard>
        </div>
      </div>

      {/* Settings Groups */}
      <div className="space-y-4 mt-4">
        {settingsGroups.map((group, index) => (
          <div key={index}>
            <h2 className="text-xs text-muted-foreground mb-2 ml-1 font-medium">{group.title}</h2>
            <GlassCard className="divide-y divide-white/5">
              {group.items.map((item, itemIndex) => (
                <Link
                  key={itemIndex}
                  to={item.path}
                  className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors first:rounded-t-3xl last:rounded-b-3xl interactive-press"
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
        className="w-full mt-4 mb-4 gap-2 h-10 text-sm pill-active"
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
