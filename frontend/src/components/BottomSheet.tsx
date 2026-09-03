import { useEffect, useRef, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  title?: string;
}

export function BottomSheet({ isOpen, onClose, children, className, title = "Nuovo Elemento" }: BottomSheetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const contentRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef(0);
  const currentTranslateYRef = useRef(0);

  // Track responsive screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTranslateY(0);
      currentTranslateYRef.current = 0;
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Setup touch event listeners with { passive: false } for mobile
  useEffect(() => {
    const content = contentRef.current;
    if (!content || !isOpen || !isMobile) return;

    const handleTouchStartNative = (e: TouchEvent) => {
      const touch = e.touches[0];
      const rect = content.getBoundingClientRect();
      
      // Only allow drag from the top 60px (handle area)
      if (touch.clientY - rect.top > 60) {
        return;
      }

      setIsDragging(true);
      setStartY(touch.clientY);
      dragStartYRef.current = touch.clientY;
      currentTranslateYRef.current = translateY;
    };

    const handleTouchMoveNative = (e: TouchEvent) => {
      if (!isDragging || !content) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - dragStartYRef.current;
      
      // Only allow dragging down
      if (deltaY > 0) {
        e.preventDefault();
        const newTranslateY = currentTranslateYRef.current + deltaY;
        setTranslateY(newTranslateY);
      }
    };

    const handleTouchEndNative = () => {
      if (!isDragging || !content) return;

      setIsDragging(false);
      const height = content.offsetHeight;
      const threshold = height * 0.3;

      if (translateY > threshold) {
        animateClose();
      } else {
        setTranslateY(0);
        currentTranslateYRef.current = 0;
      }
    };

    content.addEventListener('touchstart', handleTouchStartNative);
    content.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
    content.addEventListener('touchend', handleTouchEndNative);

    return () => {
      content.removeEventListener('touchstart', handleTouchStartNative);
      content.removeEventListener('touchmove', handleTouchMoveNative);
      content.removeEventListener('touchend', handleTouchEndNative);
    };
  }, [isOpen, isDragging, translateY, isMobile]);

  const handleClose = () => {
    setTranslateY(0);
    currentTranslateYRef.current = 0;
    onClose();
  };

  const animateClose = () => {
    if (isMobile && contentRef.current) {
      const height = contentRef.current.offsetHeight;
      setTranslateY(height);
      setTimeout(() => {
        handleClose();
      }, 300);
    } else {
      handleClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      animateClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end md:items-center md:justify-center"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        style={{
          opacity: isOpen && isMobile ? Math.max(0, 1 - translateY / 500) : 1,
        }}
      />

      {/* Bottom Sheet / Desktop Modal Content */}
      <div
        ref={contentRef}
        className={cn(
          "relative w-full max-w-md mx-auto bg-background rounded-t-3xl md:rounded-3xl border border-white/10 md:border-white/15 shadow-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col backdrop-blur-3xl",
          className
        )}
        style={{
          transform: isMobile ? `translateY(${translateY}px)` : 'none',
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Mobile Drag Handle Area */}
        <div
          ref={handleRef}
          className="flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing md:hidden shrink-0"
        >
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mb-3" />
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-center px-6 pt-5 pb-3 border-b border-white/10 shrink-0">
          <h3 className="font-bold text-white text-base tracking-tight">{title}</h3>
          <button
            onClick={animateClose}
            className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-28 md:pb-6 md:pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}


