import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, ChevronRight, Wallet, Tag, RefreshCw, User, LogOut, Wifi, WifiOff, CloudUpload, Loader2, HandCoins, ShieldCheck, RotateCcw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSync } from "@/contexts/SyncContext";
import { useAuth } from "@/contexts/AuthContext";
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
      { icon: ShieldCheck, label: "Pulizia prestiti", path: "/settings/loans/cleanup" },
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
  const { logout } = useAuth();
  const { isOnline, isSyncing, pendingCount, hasPending, triggerSync } = useSync();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);

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

  const handleForceAppUpdate = async () => {
    setIsClearingCache(true);
    try {
      // 1. Disregistra tutti i Service Worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // 2. Svuota tutta la CacheStorage (bundle JS/CSS/HTML)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }

      // 3. Svuota snapshot di avvio
      clearStartupSnapshot();

      toast.success("Cache svuotata con successo! Ricaricamento in corso...");

      // 4. Forza il ricaricamento della pagina con cache busting URL
      setTimeout(() => {
        const targetUrl = new URL(window.location.href);
        targetUrl.searchParams.set('v', Date.now().toString());
        window.location.href = targetUrl.toString();
      }, 600);
    } catch (error) {
      console.error("Errore durante lo svuotamento della cache:", error);
      toast.error("Impossibile svuotare la cache automaticamente");
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleLogout = async () => {
    try {
      await clearCache();
      clearStartupSnapshot();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      await logout();
      toast.success("Logout effettuato con successo");
      navigate("/auth", { replace: true });
    }
  };

  return (
    <div className="px-3 pt-4 pb-28 max-w-md mx-auto md:max-w-5xl md:px-8 md:py-8">
      {/* Mobile-only Header */}
      <div className="flex items-center gap-3 mb-5 md:hidden">
        <Link to="/" className="p-1.5 glass-card rounded-2xl interactive-press">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Impostazioni</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
        
        {/* Sync Box (Column 1 on desktop) */}
        <div className="md:col-span-1 space-y-4">
          <h2 className="text-xs text-muted-foreground mb-2 ml-1 font-semibold uppercase tracking-wider">Sincronizzazione</h2>
          <GlassCard className="p-5">
            {/* Online Status */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
                <span className="text-sm font-semibold text-white">Stato</span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${isOnline ? 'bg-success/12 border-success/30 text-green-400' : 'bg-destructive/12 border-destructive/30 text-red-400'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Last Sync Time */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5 text-xs">
              <span className="text-muted-foreground">Ultimo Sync</span>
              <span className="text-white font-medium">
                {lastSync ? formatDistanceToNow(lastSync, { addSuffix: true, locale: it }) : 'Mai'}
              </span>
            </div>

            {/* Pending Operations */}
            <div className="flex items-center justify-between mb-4 pb-1 text-xs">
              <span className="text-muted-foreground">Operazioni in coda</span>
              <span className={`font-semibold ${hasPending ? 'text-warning' : 'text-muted-foreground'}`}>
                {pendingCount}
              </span>
            </div>

            {/* Sync Button */}
            <Button
              onClick={handleManualSync}
              disabled={!isOnline || !hasPending || isSyncing}
              className="w-full gap-2 h-9 text-xs font-semibold pill-active disabled:opacity-40"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sincronizzazione...
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  Sincronizza ora
                </>
              )}
            </Button>
          </GlassCard>

          {/* App Cache & Updates Card */}
          <div className="pt-2">
            <h2 className="text-xs text-muted-foreground mb-2 ml-1 font-semibold uppercase tracking-wider">Applicazione & Cache</h2>
            <GlassCard className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Forza l'aggiornamento e pulisci la cache dei file PWA se non vedi le modifiche recenti dell'interfaccia.
              </p>
              <Button
                onClick={handleForceAppUpdate}
                disabled={isClearingCache}
                variant="outline"
                className="w-full gap-2 h-9 text-xs font-semibold bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-white rounded-xl shadow-none"
              >
                {isClearingCache ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Aggiornamento in corso...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                    Forza Aggiornamento PWA
                  </>
                )}
              </Button>
            </GlassCard>
          </div>

          {/* Desktop Logout Button */}
          <div className="hidden md:block">
            <Button
              variant="outline"
              className="w-full gap-2 h-10 font-semibold bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-white rounded-xl shadow-none"
              onClick={() => setLogoutDialogOpen(true)}
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              Esci dal conto
            </Button>
          </div>
        </div>

        {/* Management Options Grid (Column 2-3 on desktop) */}
        <div className="md:col-span-2 space-y-6">
          {settingsGroups.map((group, index) => (
            <div key={index}>
              <h2 className="text-xs text-muted-foreground mb-3 ml-1 font-semibold uppercase tracking-wider">{group.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.items.map((item, itemIndex) => (
                  <Link
                    key={itemIndex}
                    to={item.path}
                    className="flex items-center gap-3.5 p-4 bg-white/5 border border-white/10 hover:border-white/15 rounded-2xl hover:bg-white/10 transition-colors interactive-press group"
                  >
                    <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center shrink-0 border border-white/5 transition-colors">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1 flex items-center justify-between">
                      <span className="font-semibold text-sm text-white tracking-tight">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* Mobile Logout Button */}
          <div className="md:hidden">
            <Button
              className="w-full mt-4 gap-2 h-10 pill-active"
              onClick={() => setLogoutDialogOpen(true)}
            >
              <LogOut className="w-3.5 h-3.5" />
              Esci
            </Button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Conferma logout</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Sei sicuro di voler uscire dal tuo account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="m-0 text-sm">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="m-0 text-sm pill-active">Esci</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
