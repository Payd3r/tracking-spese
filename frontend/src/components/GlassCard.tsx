import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  gradient?: "blue" | "purple" | "green" | "pink" | "teal" | "orange";
  hover?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export const GlassCard = ({ children, className, gradient, hover = false, onClick, compact = false }: GlassCardProps) => {
  return (
    <div
      className={cn(
        hover ? "glass-card-hover" : "glass-card",
        gradient && `gradient-${gradient}`,
        onClick && "cursor-pointer",
        compact && "p-2.5",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
