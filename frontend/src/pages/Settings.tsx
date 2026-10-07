import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, ChevronRight, Wallet, Tag, RefreshCw, User, LogOut, Wifi, WifiOff, CloudUpload, Loader2, HandCoins, ShieldCheck, RotateCcw, Landmark, Bell, BellOff, Link2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useSync } from "@/contexts/SyncContext";
import { useAuth } from "@/contexts/AuthContext";
import { getLastSyncTime } from "@/lib/db";
import { formatDistanceToNow, format } from "date-fns";
import { it } from "date-fns/locale";
import { clearCache, clearStartupSnapshot } from "@/lib/cacheManager";
import { api } from "@/lib/api";
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";
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
    title: "Account & Sicurezza",
    items: [
      { icon: User, label: "Profilo", path: "/settings/profile" },
      { icon: ShieldCheck, label: "Informativa Privacy", path: "/privacy" },
    ],
  },
];

type BankingSession = {
  id: number;
  aspsp_name: string;
  aspsp_country: string;
  valid_until: string | null;
  status: string;
  last_sync_at: string | null;
  last_sync_error: string | null;
  accounts: Array<{
    id: number;
    accountUid: string;
    localAccountId: number | null;
    accountName: string | null;
  }>;
};

const SUGGESTED_BANKS = [
  { name: "Revolut", country: "LT", label: "Revolut", match: "revolut" },
  { name: "FinecoBank", country: "IT", label: "Fineco", match: "fineco" },
  { name: "PayPal", country: "IT", label: "PayPal", match: "paypal" },
];

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isOnline, isSyncing, pendingCount, hasPending, triggerSync } = useSync();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const [bankingSessions, setBankingSessions] = useState<BankingSession[]>([]);
  const [bankingLoading, setBankingLoading] = useState(false);
  const [bankingSyncing, setBankingSyncing] = useState(false);
  const [linkingBank, setLinkingBank] = useState<string | null>(null);

  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    loadLastSyncTime();
    loadBankingStatus();
    loadPushStatus();
  }, []);

  const loadLastSyncTime = async () => {
    const time = await getLastSyncTime();
    setLastSync(time);
  };

  const loadBankingStatus = useCallback(async () => {
    try {
      setBankingLoading(true);
      const { data } = await api.banking.getStatus();
      setBankingSessions((data.sessions || []).filter((s: BankingSession) => s.status === "active"));
    } catch (err) {
      console.error("Banking status error:", err);
    } finally {
      setBankingLoading(false);
    }
  }, []);

  const loadPushStatus = async () => {
    const supported = isPushSupported();
    setPushSupported(supported);
    if (!supported) return;
    try {
      const permission = await getNotificationPermission();
      const { data } = await api.push.getStatus();
      setPushEnabled(permission === "granted" && (data.count || 0) > 0);
    } catch {
      const permission = await getNotificationPermission();
      setPushEnabled(permission === "granted");
    }
  };

  const handleManualSync = async () => {
    await triggerSync();
    await loadLastSyncTime();
  };

  const handleForceAppUpdate = async () => {
    setIsClearingCache(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }

      clearStartupSnapshot();
      toast.success("Cache svuotata con successo! Ricaricamento in corso...");

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

  const handleLinkBank = async (bank: { name: string; country: string; label: string }) => {
    try {
      setLinkingBank(bank.label);
      const { data } = await api.banking.startAuth({
        aspspName: bank.name,
        country: bank.country,
      });
      if (!data.url) {
        throw new Error("URL di autorizzazione mancante");
      }
      window.location.href = data.url;
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Impossibile avviare il collegamento");
      setLinkingBank(null);
    }
  };

  const handleBankingSync = async () => {
    try {
      setBankingSyncing(true);
      const { data } = await api.banking.sync({
        lookbackDays: 0,
        createNew: true,
        linkExisting: true,
        sendPush: true,
      });
      toast.success(
        `Sync completato: ${data.created || 0} nuove, ${data.linked || 0} collegate`
      );
      if (data.errors?.length) {
        toast.warning(`${data.errors.length} errori (es. rate limit banca)`);
      }
      await loadBankingStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Sync bancaria fallita");
    } finally {
      setBankingSyncing(false);
    }
  };

  const handleTogglePush = async (enabled: boolean) => {
    if (!pushSupported) {
      toast.error("Notifiche non supportate. Su iPhone serve PWA installata (iOS 16.4+)");
      return;
    }
    setPushBusy(true);
    try {
      if (enabled) {
        await subscribeToPush({
          getVapidPublicKey: () => api.push.getVapidPublicKey(),
          subscribe: (subscription) => api.push.subscribe(subscription),
        });
        setPushEnabled(true);
        toast.success("Notifiche attivate");
      } else {
        await unsubscribeFromPush({
          unsubscribe: (endpoint) => api.push.unsubscribe(endpoint),
        });
        setPushEnabled(false);
        toast.success("Notifiche disattivate");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Impossibile aggiornare le notifiche");
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="px-3 pt-4 pb-28 max-w-md mx-auto md:max-w-5xl md:px-8 md:py-8">
      <div className="flex items-center gap-3 mb-5 md:hidden">
        <Link to="/" className="p-1.5 glass-card rounded-2xl interactive-press">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Impostazioni</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
        
        <div className="md:col-span-1 space-y-4">
          <h2 className="text-xs text-muted-foreground mb-2 ml-1 font-semibold uppercase tracking-wider">Sincronizzazione</h2>
          <GlassCard className="p-5">
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

            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5 text-xs">
              <span className="text-muted-foreground">Ultimo Sync</span>
              <span className="text-white font-medium">
                {lastSync ? formatDistanceToNow(lastSync, { addSuffix: true, locale: it }) : 'Mai'}
              </span>
            </div>

            <div className="flex items-center justify-between mb-4 pb-1 text-xs">
              <span className="text-muted-foreground">Operazioni in coda</span>
              <span className={`font-semibold ${hasPending ? 'text-warning' : 'text-muted-foreground'}`}>
                {pendingCount}
              </span>
            </div>

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

          {/* Open Banking */}
          <div>
            <h2 className="text-xs text-muted-foreground mb-3 ml-1 font-semibold uppercase tracking-wider">Open Banking</h2>
            <GlassCard className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">Conti collegati</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sync automatica alle 8, 12, 16 e 20: solo movimenti di oggi, in Altro.
                  </p>
                </div>
              </div>

              {bankingLoading ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {SUGGESTED_BANKS.map((bank) => {
                    const linked = bankingSessions.find((s) =>
                      s.aspsp_name.toLowerCase().includes(bank.match)
                    );
                    return (
                      <div
                        key={bank.label}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">{bank.label}</p>
                          {linked ? (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Collegato
                              {linked.valid_until
                                ? ` · fino al ${format(new Date(linked.valid_until), "dd/MM/yyyy")}`
                                : ""}
                              {linked.last_sync_at
                                ? ` · sync ${formatDistanceToNow(new Date(linked.last_sync_at), { addSuffix: true, locale: it })}`
                                : ""}
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground mt-0.5">Non collegato</p>
                          )}
                          {linked?.last_sync_error && (
                            <p className="text-[11px] text-red-400 mt-0.5 truncate">{linked.last_sync_error}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!isOnline || linkingBank === bank.label}
                          onClick={() => handleLinkBank(bank)}
                          className="h-8 text-xs bg-white/5 border-white/10 shrink-0"
                        >
                          {linkingBank === bank.label ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Link2 className="w-3.5 h-3.5 mr-1" />
                              {linked ? "Ricollega" : "Collega"}
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button
                onClick={handleBankingSync}
                disabled={!isOnline || bankingSyncing || bankingSessions.length === 0}
                className="w-full gap-2 h-9 text-xs font-semibold pill-active disabled:opacity-40"
              >
                {bankingSyncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sincronizzazione in corso...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sincronizza movimenti ora
                  </>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Sincronizzazione automatica attiva (4 volte al giorno alle 8, 12, 16 e 20). Le nuove transazioni vengono create nella categoria Altro.
              </p>
            </GlassCard>
          </div>

          {/* Notifications */}
          <div>
            <h2 className="text-xs text-muted-foreground mb-3 ml-1 font-semibold uppercase tracking-wider">Notifiche</h2>
            <GlassCard className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center shrink-0">
                    {pushEnabled ? (
                      <Bell className="w-5 h-5 text-white" />
                    ) : (
                      <BellOff className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Notifiche push</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avviso per ogni nuova transazione automatica. Su iPhone: installa la PWA (iOS 16.4+).
                    </p>
                  </div>
                </div>
                <Switch
                  checked={pushEnabled}
                  disabled={pushBusy || !pushSupported}
                  onCheckedChange={handleTogglePush}
                />
              </div>
              {!pushSupported && (
                <p className="text-[11px] text-amber-400 mt-3">
                  Browser senza supporto push, oppure PWA non installata.
                </p>
              )}
            </GlassCard>
          </div>

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
