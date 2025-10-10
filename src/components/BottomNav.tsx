import { Home, Plus, Receipt, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export const BottomNav = () => {
  const location = useLocation();
  
  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Receipt, label: "Transazioni", path: "/transactions" },
    { icon: Plus, label: "Aggiungi", path: "/add" },
    { icon: Settings, label: "Impostazioni", path: "/settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-card border-t border-white/10 rounded-t-3xl z-50">
      <div className="flex items-center justify-around px-4 py-3 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300",
                isActive && "gradient-blue"
              )}
            >
              <Icon className={cn(
                "w-6 h-6 transition-colors",
                isActive ? "text-white" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-xs transition-colors",
                isActive ? "text-white font-medium" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
