import { useEffect } from "react";
import { Home, Plus, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useKeyboardOpen } from "../hooks/useKeyboardOpen";

interface BottomNavProps {
  onAddClick?: () => void;
}

export const BottomNav = ({ onAddClick }: BottomNavProps = {}) => {
  const { isSignedIn } = useAuth();
  const isKeyboardOpen = useKeyboardOpen();

  useEffect(() => {
    // Permanent Scroll Lock:
    // Since we use an internal container for scrolling, the window/body
    // should NEVER scroll. This listener fights back against iOS keyboard panning.
    const handleScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: false });

    // Also force reset on keyboard close
    if (!isKeyboardOpen) {
      window.scrollTo(0, 0);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isKeyboardOpen]);

  // Don't render if not authenticated
  if (!isSignedIn) {
    return null;
  }

  // Hide completely when keyboard key is open to avoid visual glitches
  if (isKeyboardOpen) {
    return null;
  }

  return (
    <nav
      className="ios-bottom-nav"
      style={{
        transform: 'translateY(0)',
        transition: 'transform 0.3s ease-in-out',
      }}
    >
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
  );
};
