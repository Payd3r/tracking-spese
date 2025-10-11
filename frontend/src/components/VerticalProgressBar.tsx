import { cn } from "@/lib/utils";

interface VerticalProgressBarProps {
  percentage: number;
  className?: string;
}

export function VerticalProgressBar({ percentage, className }: VerticalProgressBarProps) {
  return (
    <div className={cn("w-3 h-full bg-white/10 rounded-full overflow-hidden", className)}>
      <div
        className="w-full bg-gradient-to-t from-green-400/80 to-green-300/90 transition-all duration-500 ease-out rounded-full"
        style={{ height: `${Math.min(Math.max(percentage, 0), 100)}%` }}
      />
    </div>
  );
}
