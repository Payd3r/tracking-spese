import { useEffect, useRef, useState } from "react";
import { Home, HandCoins, Plus, ReceiptText, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyboardOpen } from "../hooks/useKeyboardOpen";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onAddClick?: () => void;
}

export const BottomNav = ({ onAddClick }: BottomNavProps = {}) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isKeyboardOpen = useKeyboardOpen();
  const [isShrunk, setIsShrunk] = useState(false);
  const lastScrollY = useRef(0);

  // Detect scroll direction to shrink or expand the floating bottom nav
  useEffect(() => {
    const scrollContainer = document.querySelector(".scrollable-content") || window;

    const getScrollTop = () => {
      if (scrollContainer === window) {
        return window.scrollY || document.documentElement.scrollTop;
      }
      return (scrollContainer as HTMLElement).scrollTop;
    };

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = getScrollTop();
          const diff = currentScrollY - lastScrollY.current;

          if (Math.abs(diff) > 6) {
            if (diff > 0 && currentScrollY > 40) {
              setIsShrunk(true);
            } else if (diff < 0 || currentScrollY <= 20) {
              setIsShrunk(false);
            }
            lastScrollY.current = currentScrollY;
          }

          ticking = false;
        });

        ticking = true;
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Reset scale state when location changes
  useEffect(() => {
    setIsShrunk(false);
  }, [location.pathname]);

  // Detect if any BottomSheet, Dialog, Modal, or Sheet is currently open
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const checkIfModalOpen = () => {
      const isOverflowHidden = document.body.style.overflow === "hidden";
      const isScrollLocked = document.body.hasAttribute("data-scroll-locked");
      const hasOpenRadixState = document.querySelector('[data-state="open"]') !== null;
      const hasFixedModalOverlay = document.querySelector('.fixed.inset-0.z-\\[200\\]') !== null;
      setIsModalOpen(isOverflowHidden || isScrollLocked || hasOpenRadixState || hasFixedModalOverlay);
    };

    checkIfModalOpen();

    const observer = new MutationObserver(() => {
      checkIfModalOpen();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "class", "data-scroll-locked"],
      subtree: true,
      childList: true,
    });

    return () => observer.disconnect();
  }, []);

  if (!isAuthenticated || location.pathname === "/auth" || location.pathname.startsWith("/privacy")) {
    return null;
  }

  if (isKeyboardOpen || isModalOpen) {
    return null;
  }

  // Active path logic
  const isHomeActive = location.pathname === "/";
  const isLoansActive =
    location.pathname === "/loans" || location.pathname.startsWith("/settings/loans");
  const isTransactionsActive =
    location.pathname === "/transactions" || location.pathname.startsWith("/transaction/");
  const isSettingsActive =
    location.pathname === "/settings" ||
    (location.pathname.startsWith("/settings") && !location.pathname.startsWith("/settings/loans"));

  return (
    <div className="fixed bottom-[env(safe-area-inset-bottom,0px)] left-0 right-0 z-50 flex justify-center px-3 pointer-events-none md:hidden">
      <nav
        className={cn(
          "pointer-events-auto transition-all duration-300 ease-out",
          "flex items-center justify-between gap-1.5 sm:gap-3",
          "w-full rounded-full",
          "bg-black/60 text-white border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.7)]",
          "backdrop-blur-2xl saturate-180 [backdrop-filter:blur(24px)_saturate(180%)] [-webkit-backdrop-filter:blur(24px)_saturate(180%)]",
          isShrunk
            ? "max-w-[340px] py-1 px-4"
            : "max-w-[395px] py-1.5 px-5"
        )}
        aria-label="Bottom Navigation"
      >
        {/* 1. Home */}
        <Link
          to="/"
          aria-label="Home"
          className={cn(
            "relative flex items-center justify-center rounded-full transition-all duration-200",
            isShrunk ? "w-8 h-8" : "w-9 h-9",
            isHomeActive ? "text-white" : "text-white/40 hover:text-white/80"
          )}
        >
          <Home
            className={cn(
              "transition-all duration-200",
              isShrunk ? "w-4 h-4" : "w-5 h-5",
              isHomeActive ? "fill-current text-white scale-110" : "scale-100"
            )}
          />
        </Link>

        {/* 2. Prestiti */}
        <Link
          to="/settings/loans"
          aria-label="Prestiti"
          className={cn(
            "relative flex items-center justify-center rounded-full transition-all duration-200",
            isShrunk ? "w-8 h-8" : "w-9 h-9",
            isLoansActive ? "text-white" : "text-white/40 hover:text-white/80"
          )}
        >
          <HandCoins
            className={cn(
              "transition-all duration-200",
              isShrunk ? "w-4 h-4" : "w-5 h-5",
              isLoansActive ? "stroke-[2.6px] text-white scale-110" : "stroke-[1.8px] scale-100"
            )}
          />
        </Link>

        {/* 3. Aggiungi Transazione */}
        {onAddClick ? (
          <button
            onClick={onAddClick}
            type="button"
            aria-label="Aggiungi Transazione"
            className={cn(
              "relative flex items-center justify-center rounded-full transition-all duration-200",
              "bg-white text-black font-bold shadow-md hover:scale-105 active:scale-95",
              isShrunk ? "w-8 h-8" : "w-9 h-9"
            )}
          >
            <Plus
              className={cn(
                "stroke-[3px] transition-transform duration-200",
                isShrunk ? "w-4 h-4" : "w-5 h-5"
              )}
            />
          </button>
        ) : (
          <Link
            to="/add"
            aria-label="Aggiungi Transazione"
            className={cn(
              "relative flex items-center justify-center rounded-full transition-all duration-200",
              "bg-white text-black font-bold shadow-md hover:scale-105 active:scale-95",
              isShrunk ? "w-8 h-8" : "w-9 h-9"
            )}
          >
            <Plus
              className={cn(
                "stroke-[3px] transition-transform duration-200",
                isShrunk ? "w-4 h-4" : "w-5 h-5"
              )}
            />
          </Link>
        )}

        {/* 4. Tutte le transazioni */}
        <Link
          to="/transactions"
          aria-label="Tutte le transazioni"
          className={cn(
            "relative flex items-center justify-center rounded-full transition-all duration-200",
            isShrunk ? "w-8 h-8" : "w-9 h-9",
            isTransactionsActive ? "text-white" : "text-white/40 hover:text-white/80"
          )}
        >
          <ReceiptText
            className={cn(
              "transition-all duration-200",
              isShrunk ? "w-4 h-4" : "w-5 h-5",
              isTransactionsActive ? "stroke-[2.6px] text-white scale-110" : "stroke-[1.8px] scale-100"
            )}
          />
        </Link>

        {/* 5. Settings */}
        <Link
          to="/settings"
          aria-label="Settings"
          className={cn(
            "relative flex items-center justify-center rounded-full transition-all duration-200",
            isShrunk ? "w-8 h-8" : "w-9 h-9",
            isSettingsActive ? "text-white" : "text-white/40 hover:text-white/80"
          )}
        >
          <Settings
            className={cn(
              "transition-all duration-200",
              isShrunk ? "w-4 h-4" : "w-5 h-5",
              isSettingsActive ? "stroke-[2.6px] text-white scale-110" : "stroke-[1.8px] scale-100"
            )}
          />
        </Link>
      </nav>
    </div>
  );
};
