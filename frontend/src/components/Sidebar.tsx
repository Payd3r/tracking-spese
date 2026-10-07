import { Home, Plus, Settings, Wallet, Tag, RefreshCw, HandCoins, User, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { clearCache, clearStartupSnapshot } from "@/lib/cacheManager";
import { toast } from "sonner";
import { GlassCard } from "./GlassCard";

interface SidebarProps {
  onAddClick?: () => void;
}

export const Sidebar = ({ onAddClick }: SidebarProps) => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated || location.pathname === '/auth' || location.pathname.startsWith('/privacy')) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await clearCache();
      clearStartupSnapshot();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      await logout();
      navigate('/auth', { replace: true });
      toast.success("Logout effettuato con successo");
    }
  };

  const menuItems = [
    { label: "Dashboard", path: "/", icon: Home },
    { label: "Transazioni", path: "/transactions", icon: ArrowIconLeftRight },
    { label: "Conti", path: "/settings/accounts", icon: Wallet },
    { label: "Categorie", path: "/settings/categories", icon: Tag },
    { label: "Trasferimenti", path: "/settings/transfers", icon: RefreshCw },
    { label: "Prestiti", path: "/settings/loans", icon: HandCoins },
    { label: "Profilo", path: "/settings/profile", icon: User },
    { label: "Impostazioni", path: "/settings", icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    if (path === "/settings") {
      return location.pathname === "/settings";
    }
    if (path === "/transactions") {
      return location.pathname.startsWith("/transactions") || location.pathname.startsWith("/transaction/");
    }
    return location.pathname.startsWith(path);
  };

  const displayName = user?.name || "Andrea Mauri";
  const displayEmail = user?.email || "andreamauri2013";

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-black border-r border-white/10 p-5 shrink-0 z-40">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold text-base shadow-strong">
          TS
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight leading-none">Tracking Spese</h1>
          <span className="text-[10px] text-muted-foreground">Gestione Finanze</span>
        </div>
      </div>

      {/* Add Transaction Button */}
      <button
        onClick={onAddClick}
        className="w-full mb-6 py-3 rounded-2xl bg-white text-black font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:bg-white/90 active:scale-95 shadow-strong"
      >
        <Plus className="w-5 h-5" />
        Nuova Transazione
      </button>

      {/* Menu Links */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item, idx) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-white/10 text-white border border-white/10 shadow-glow"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-white" : "text-muted-foreground"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section / Logout */}
      <div className="pt-4 border-t border-white/5">
        <GlassCard className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-white/15 overflow-hidden flex items-center justify-center text-xs font-bold border border-white/10 shrink-0">
            {displayName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {displayName}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {displayEmail}
            </p>
          </div>
        </GlassCard>

        <button
          onClick={handleLogout}
          className="w-full py-2.5 rounded-xl text-xs font-medium text-destructive hover:text-white hover:bg-destructive/20 border border-transparent hover:border-destructive/30 transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          Esci dal conto
        </button>
      </div>
    </aside>
  );
};

const ArrowIconLeftRight = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m3 16 4 4 4-4" />
    <path d="M7 20V4" />
    <path d="m21 8-4-4-4 4" />
    <path d="M17 4v16" />
  </svg>
);
