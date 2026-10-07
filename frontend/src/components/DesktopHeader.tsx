import { useSync } from "@/contexts/SyncContext";
import { useAuth } from "@/contexts/AuthContext";
import { Cloud, CloudOff, Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useLocation } from "react-router-dom";

export const DesktopHeader = () => {
  const { user, isLoaded } = useAuth();
  const { isOnline, isSyncing, pendingCount, hasPending, triggerSync } = useSync();
  const location = useLocation();

  if (location.pathname === '/auth' || location.pathname.startsWith('/privacy')) {
    return null;
  }

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path.startsWith("/transactions")) return "Transazioni";
    if (path.startsWith("/settings/accounts")) return "Gestione Conti";
    if (path.startsWith("/settings/categories")) return "Gestione Categorie";
    if (path.startsWith("/settings/transfers")) return "Gestione Trasferimenti";
    if (path.startsWith("/settings/loans")) return "Gestione Prestiti";
    if (path.startsWith("/settings/profile")) return "Profilo Utente";
    if (path.startsWith("/settings")) return "Impostazioni";
    return "Tracking Spese";
  };

  const getGreeting = () => {
    if (!isLoaded || !user) return "Bentornato!";
    const name = user.name || "Andrea";
    return `Ciao, ${name}!`;
  };

  return (
    <header className="hidden md:flex items-center justify-between h-16 px-8 border-b border-white/10 bg-black/50 backdrop-blur-md shrink-0 z-30">
      {/* Page Title & Greeting */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight leading-none">
          {getPageTitle()}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {getGreeting()}
        </p>
      </div>

      {/* Action Indicators */}
      <div className="flex items-center gap-4">
        {/* Sync Controls */}
        {isOnline ? (
          <div className="flex items-center gap-2">
            {isSyncing ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Sincronizzazione in corso...</span>
              </div>
            ) : hasPending ? (
              <button
                onClick={triggerSync}
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-white/90 text-black rounded-full text-xs font-semibold shadow-strong transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Sincronizza ora ({pendingCount})</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-success/12 border border-success/30 rounded-full text-xs text-green-400">
                <Cloud className="w-3.5 h-3.5 text-green-400" />
                <span>Dati sincronizzati</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-destructive/12 border border-destructive/30 rounded-full text-xs text-red-400">
            <CloudOff className="w-3.5 h-3.5 text-red-400" />
            <span>Sincronizzazione in pausa (offline)</span>
          </div>
        )}

        {/* Network Connection Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isOnline
              ? "bg-success/12 border-success/30 text-green-400"
              : "bg-destructive/12 border-destructive/30 text-red-400"
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-green-400" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
              <span>Offline</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
