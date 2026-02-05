import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/GlassCard";

interface CardListSkeletonProps {
    variant?: 'grid' | 'list';
}

export function CardListSkeleton({ variant = 'grid' }: CardListSkeletonProps) {
    if (variant === 'list') {
        return (
            <div className="space-y-3 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <GlassCard key={i} className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-10 h-10 rounded-xl" />
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-6 w-32" />
                                </div>
                            </div>
                            <Skeleton className="w-4 h-4 rounded-lg" />
                        </div>
                    </GlassCard>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-2 px-1.5 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <GlassCard key={i} className="p-3 h-28 relative overflow-hidden bg-white/5 border-none">
                    <div className="flex items-stretch gap-2 h-full">
                        <div className="flex-1 flex flex-col justify-between">
                            <div className="space-y-1">
                                <Skeleton className="h-3.5 w-full" />
                                <Skeleton className="h-2.5 w-12" />
                            </div>
                            <Skeleton className="w-8 h-8 rounded-lg" />
                        </div>
                        <Skeleton className="w-1.5 h-full rounded-full opacity-20" />
                    </div>
                </GlassCard>
            ))}
        </div>
    );
}
