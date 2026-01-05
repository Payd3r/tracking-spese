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
    if (!isKeyboardOpen) {
      // iOS PWA Fix: The visual viewport and layout viewport can get out of sync
      // after keyboard interaction. We force multiple scroll resets to ensure
      // the document snaps back to the top (preventing the "floating" bottom nav).

      const resetScroll = () => {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
      };

      // Immediate reset
      resetScroll();

      // Reset after short delay (debounce/animation start)
      const t1 = setTimeout(resetScroll, 100);

      // Reset after standard iOS keyboard animation (approx 300ms)
      const t2 = setTimeout(resetScroll, 300);

      // Reset after longer safety buffer
      const t3 = setTimeout(resetScroll, 600);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isKeyboardOpen]);

  // Don't render if not authenticated
  if (!isSignedIn) {
    return null;
  }

  return (
    <nav
      className="ios-bottom-nav"
      style={{
        transform: isKeyboardOpen ? 'translateY(200%)' : 'translateY(0)',
        transition: 'transform 0.3s ease-in-out',
        willChange: 'transform'
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
