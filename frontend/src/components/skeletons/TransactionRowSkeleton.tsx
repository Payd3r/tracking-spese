import { Skeleton } from "@/components/ui/skeleton";

interface TransactionRowSkeletonProps {
    variant?: 'card' | 'list';
}

export function TransactionRowSkeleton({ variant = 'card' }: TransactionRowSkeletonProps) {
    if (variant === 'list') {
        return (
            <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 px-1.5">
                <div className="flex items-center gap-2.5">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <div className="space-y-1">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2 w-20" />
                    </div>
                </div>
                <Skeleton className="h-4 w-16" />
            </div>
        );
    }

    return (
        <div className="glass-card p-2.5 mb-2 rounded-xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-2.5 w-16" />
                    </div>
                </div>
                <div className="text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                </div>
            </div>
        </div>
    );
}
