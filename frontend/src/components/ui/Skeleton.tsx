import { cn } from '../../lib/utils';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'card';
    width?: string | number;
    height?: string | number;
    animate?: boolean;
}

/**
 * Skeleton loading component for content placeholders.
 * 
 * Shows a pulsing placeholder while content is loading.
 * Improves UX by preventing layout shift and indicating loading state.
 */
export function Skeleton({
    className = '',
    variant = 'rectangular',
    width,
    height,
    animate = true
}: SkeletonProps) {
    const baseClasses = cn(
        'bg-slate-200 dark:bg-slate-700',
        animate && 'animate-pulse',
        variant === 'text' && 'rounded h-4',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-lg',
        variant === 'card' && 'rounded-xl',
        className
    );

    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return <div className={baseClasses} style={style} />;
}

/**
 * Skeleton for a typical card component.
 */
export function CardSkeleton({ className = '' }: { className?: string }) {
    return (
        <div className={cn('p-4 border rounded-xl bg-white dark:bg-slate-800 space-y-3', className)}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="rectangular" height={40} />
            <div className="flex gap-2">
                <Skeleton variant="text" width="30%" />
                <Skeleton variant="text" width="40%" />
            </div>
        </div>
    );
}

/**
 * Skeleton for metrics/stats display.
 */
export function MetricSkeleton({ className = '' }: { className?: string }) {
    return (
        <div className={cn('p-4 text-center', className)}>
            <Skeleton variant="text" width="50%" className="mx-auto mb-2" />
            <Skeleton variant="rectangular" height={32} width="70%" className="mx-auto" />
        </div>
    );
}

/**
 * Skeleton for a grid of cards.
 */
export function GridSkeleton({ count = 3, className = '' }: { count?: number; className?: string }) {
    return (
        <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}>
            {Array.from({ length: count }).map((_, i) => (
                <CardSkeleton key={i} />
            ))}
        </div>
    );
}
