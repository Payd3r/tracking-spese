import { Home, Plus, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

interface BottomNavProps {
  onAddClick?: () => void;
}

export const BottomNav = ({ onAddClick }: BottomNavProps = {}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("authToken");
      setIsAuthenticated(!!token);
    };

    checkAuth();

    // Listen for storage changes
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(checkAuth, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav>
      <div className="ios-bottom-nav">
        <div className="flex items-center justify-evenly">
          {/* Home - Icona sinistra */}
          <Link to="/" className="nav-btn-secondary">
            <Home className="w-6 h-6" />
          </Link>
          
          {/* Add - Pulsante centrale prominente */}
          {onAddClick ? (
            <button onClick={onAddClick} className="nav-btn-primary">
              <Plus className="w-14 h-14" />
            </button>
          ) : (
            <Link to="/add" className="nav-btn-primary">
              <Plus className="w-14 h-14" />
            </Link>
          )}
          
          {/* Settings - Icona destra */}
          <Link to="/settings" className="nav-btn-secondary">
            <Settings className="w-6 h-6" />
          </Link>
        </div>
      </div>
    </nav>
  );
};
