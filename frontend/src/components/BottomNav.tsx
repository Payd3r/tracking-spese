import { Home, Plus, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export const BottomNav = () => {
  const location = useLocation();
  
  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Plus, label: "Aggiungi", path: "/add" },
    { icon: Settings, label: "Impostazioni", path: "/settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-card border-t border-white/10 rounded-t-3xl z-50">
      <div className="flex items-center justify-around px-4 py-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const isAddButton = item.path === "/add";
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "p-3 rounded-2xl transition-all duration-300",
                isAddButton && "gradient-blue scale-110 shadow-lg",
                isActive && !isAddButton && "gradient-blue",
                !isActive && !isAddButton && "text-muted-foreground"
              )}
            >
              <Icon className={cn(
                "transition-colors",
                isAddButton ? "w-7 h-7 text-white" : "w-6 h-6",
                isActive && !isAddButton ? "text-white" : ""
              )} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
