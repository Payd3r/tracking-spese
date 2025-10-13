import { useEffect, useRef, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({ isOpen, onClose, children, className }: BottomSheetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const [startY, setStartY] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef(0);
  const currentTranslateYRef = useRef(0);

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

  // Setup touch event listeners with { passive: false }
  useEffect(() => {
    const content = contentRef.current;
    if (!content || !isOpen) return;

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
  }, [isOpen, isDragging, translateY]);

  const handleClose = () => {
    setTranslateY(0);
    currentTranslateYRef.current = 0;
    onClose();
  };

  const animateClose = () => {
    if (!contentRef.current) return;
    const height = contentRef.current.offsetHeight;
    setTranslateY(height);
    setTimeout(() => {
      handleClose();
    }, 300);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      animateClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        style={{
          opacity: isOpen ? Math.max(0, 1 - translateY / 500) : 0,
        }}
      />

      {/* Bottom Sheet Content */}
      <div
        ref={contentRef}
        className={cn(
          "relative w-full max-w-md mx-auto bg-background rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col",
          className
        )}
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Handle Area */}
        <div
          ref={handleRef}
          className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
        >
          {/* Drag Handle */}
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mb-3" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}

