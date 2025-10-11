import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  gradient?: "blue" | "purple" | "green" | "pink" | "teal";
  hover?: boolean;
  onClick?: () => void;
}

export const GlassCard = ({ children, className, gradient, hover = false, onClick }: GlassCardProps) => {
  return (
    <div
      className={cn(
        hover ? "glass-card-hover" : "glass-card",
        gradient && `gradient-${gradient}`,
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
