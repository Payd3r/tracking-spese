import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/GlassCard";
import { TransactionRowSkeleton } from "./TransactionRowSkeleton";

export function DashboardSkeleton() {
    return (
        <div className="space-y-4">
            {/* Balance Card Skeleton */}
            <GlassCard className="p-4 mb-4">
                {/* Toggle buttons */}
                <div className="p-2 glass-card flex gap-2 mb-4">
                    <Skeleton className="flex-1 h-9 rounded-2xl" />
                    <Skeleton className="flex-1 h-9 rounded-2xl" />
                </div>

                {/* Balance Amount */}
                <div className="mb-3 flex items-center justify-between">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="w-9 h-9 rounded-full" />
                </div>

                {/* Chart Area */}
                <div className="neon-chart-container mb-3">
                    <div className="flex justify-between items-center mb-2 px-2">
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} className="h-3 w-8 rounded" />
                        ))}
                    </div>
                    <div className="h-[100px] flex items-end justify-between px-2 pb-2 gap-1 border-t border-white/5 pt-4">
                        <Skeleton className="w-[12%] h-[40%] rounded-t-sm opacity-20" />
                        <Skeleton className="w-[12%] h-[70%] rounded-t-sm opacity-20" />
                        <Skeleton className="w-[12%] h-[50%] rounded-t-sm opacity-20" />
                        <Skeleton className="w-[12%] h-[80%] rounded-t-sm opacity-20" />
                        <Skeleton className="w-[12%] h-[60%] rounded-t-sm opacity-20" />
                        <Skeleton className="w-[12%] h-[90%] rounded-t-sm opacity-20" />
                        <Skeleton className="w-[12%] h-[30%] rounded-t-sm opacity-20" />
                    </div>
                </div>

                {/* Period Selector */}
                <div className="flex gap-1.5">
                    <Skeleton className="flex-1 h-7 rounded-xl" />
                    <Skeleton className="flex-1 h-7 rounded-xl" />
                    <Skeleton className="flex-1 h-7 rounded-xl" />
                    <Skeleton className="flex-1 h-7 rounded-xl" />
                </div>
            </GlassCard>

            {/* Recent Transactions Skeleton */}
            <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-6 w-6 rounded-xl" />
                </div>

                <div className="space-y-2">
                    <TransactionRowSkeleton />
                    <TransactionRowSkeleton />
                    <TransactionRowSkeleton />
                </div>
            </GlassCard>
        </div>
    );
}
