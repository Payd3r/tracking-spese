import { cn } from "@/lib/utils";

interface VerticalProgressBarProps {
  percentage: number;
  className?: string;
}

export function VerticalProgressBar({ percentage, className }: VerticalProgressBarProps) {
  return (
    <div className={cn("w-3 h-full bg-white/10 rounded-full overflow-hidden", className)}>
      <div
        className="w-full bg-[linear-gradient(180deg,_hsl(0_0%_95%/_0.9),_hsl(0_0%_25%/_0.9))] transition-all duration-500 ease-out rounded-full shadow-[0_0_12px_hsl(0_0%_100%/_0.3)]"
        style={{ height: `${Math.min(Math.max(percentage, 0), 100)}%` }}
      />
    </div>
  );
}
