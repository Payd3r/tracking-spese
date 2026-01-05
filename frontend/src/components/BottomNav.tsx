import { Home, Plus, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { BottomFixed } from "react-bottom-fixed";

interface BottomNavProps {
  onAddClick?: () => void;
}

export const BottomNav = ({ onAddClick }: BottomNavProps = {}) => {
  const { isSignedIn } = useAuth();

  // Don't render if not authenticated
  if (!isSignedIn) {
    return null;
  }

  return (
    <BottomFixed>
      <nav className="ios-bottom-nav">
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
      </nav>
    </BottomFixed>
  );
};
