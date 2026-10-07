import { useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  title?: string;
  header?: ReactNode;
  footer?: ReactNode;
}

const DRAG_HANDLE_HEIGHT = 40;

let openSheetsCount = 0;

function lockBodyScroll() {
  openSheetsCount++;
  if (openSheetsCount === 1) {
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    const scrollables = document.querySelectorAll<HTMLElement>(".scrollable-content");
    scrollables.forEach((el) => {
      el.dataset.previousOverflow = el.style.overflow || "";
      el.style.overflow = "hidden";
    });
  }
}

function unlockBodyScroll() {
  openSheetsCount = Math.max(0, openSheetsCount - 1);
  if (openSheetsCount === 0) {
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
    const scrollables = document.querySelectorAll<HTMLElement>(".scrollable-content");
    scrollables.forEach((el) => {
      el.style.overflow = el.dataset.previousOverflow || "";
      delete el.dataset.previousOverflow;
    });
  }
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  className,
  title = "Nuovo Elemento",
  header,
  footer,
}: BottomSheetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const translateYRef = useRef(0);

  useEffect(() => {
    translateYRef.current = translateY;
  }, [translateY]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      setTranslateY(0);
      translateYRef.current = 0;
      return () => {
        unlockBodyScroll();
      };
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setTranslateY(0);
    translateYRef.current = 0;
    onClose();
  }, [onClose]);

  const animateClose = useCallback(() => {
    if (isMobile && contentRef.current) {
      const height = contentRef.current.offsetHeight;
      setTranslateY(height);
      translateYRef.current = height;
      setTimeout(() => {
        handleClose();
      }, 300);
    } else {
      handleClose();
    }
  }, [handleClose, isMobile]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || !isOpen || !isMobile) return;

    const handleTouchStartNative = (e: TouchEvent) => {
      const touch = e.touches[0];
      const rect = content.getBoundingClientRect();

      if (touch.clientY - rect.top > DRAG_HANDLE_HEIGHT) {
        return;
      }

      isDraggingRef.current = true;
      setIsDragging(true);
      dragStartYRef.current = touch.clientY;
    };

    const handleTouchMoveNative = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - dragStartYRef.current;

      if (deltaY > 0) {
        e.preventDefault();
        setTranslateY(deltaY);
        translateYRef.current = deltaY;
      }
    };

    const handleTouchEndNative = () => {
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      setIsDragging(false);
      const height = content.offsetHeight;
      const threshold = height * 0.3;

      if (translateYRef.current > threshold) {
        animateClose();
      } else {
        setTranslateY(0);
        translateYRef.current = 0;
      }
    };

    content.addEventListener("touchstart", handleTouchStartNative, { passive: true });
    content.addEventListener("touchmove", handleTouchMoveNative, { passive: false });
    content.addEventListener("touchend", handleTouchEndNative);

    return () => {
      content.removeEventListener("touchstart", handleTouchStartNative);
      content.removeEventListener("touchmove", handleTouchMoveNative);
      content.removeEventListener("touchend", handleTouchEndNative);
    };
  }, [isOpen, isMobile, animateClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      animateClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end md:items-center md:justify-center isolate"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop — blocks touch bleed-through to content below */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 touch-none"
        style={{
          opacity: isOpen && isMobile ? Math.max(0, 1 - translateY / 500) : 1,
        }}
        aria-hidden="true"
      />

      {/* Bottom Sheet / Desktop Modal Content */}
      <div
        ref={contentRef}
        className={cn(
          "relative w-full max-w-md mx-auto bg-background rounded-t-3xl md:rounded-3xl border border-white/10 md:border-white/15 shadow-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col backdrop-blur-3xl touch-auto",
          className
        )}
        style={{
          transform: isMobile ? `translateY(${translateY}px)` : "none",
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle Area */}
        <div
          className="flex w-full flex-col items-center justify-center pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing md:hidden shrink-0 select-none touch-none"
          style={{ minHeight: DRAG_HANDLE_HEIGHT }}
        >
          <div className="w-10 h-1.5 bg-white/25 rounded-full" />
        </div>

        {/* Custom header or default header */}
        {header ? (
          <div className="shrink-0 px-4 md:px-6 md:pt-4">{header}</div>
        ) : (
          <div className="flex justify-between items-center px-4 md:px-6 pt-1 md:pt-5 pb-3 border-b border-white/10 shrink-0">
            <h3 className="font-bold text-white text-base tracking-tight">{title}</h3>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div
            ref={scrollRef}
            className={cn(
              "flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 md:py-4 touch-pan-y",
              footer ? "pb-28 md:pb-2" : "pb-10 md:pb-6"
            )}
          >
            {children}
          </div>

          {footer && (
            <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none px-4 pb-5 pt-10 md:static md:p-4 md:pt-3 md:pb-4 md:border-t md:border-white/10 md:bg-black/40">
              <div
                className="absolute inset-x-0 bottom-0 h-28 pointer-events-none md:hidden"
                style={{
                  background:
                    "linear-gradient(to top, hsl(0 0% 5% / 0.98) 0%, hsl(0 0% 5% / 0.85) 50%, transparent 100%)",
                }}
                aria-hidden="true"
              />
              <div className="relative pointer-events-auto">{footer}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
