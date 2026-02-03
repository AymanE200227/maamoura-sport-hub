import { memo } from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = memo(({ className }: SkeletonProps) => (
  <div className={cn("animate-pulse rounded-md bg-muted/50", className)} />
));

Skeleton.displayName = 'Skeleton';

// Card skeleton for course cards
export const CardSkeleton = memo(() => (
  <div className="glass-card p-6 animate-pulse">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 rounded-xl bg-muted/50" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-muted/50" />
        <div className="h-3 w-1/2 rounded bg-muted/30" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 rounded bg-muted/40" />
      <div className="h-3 w-5/6 rounded bg-muted/30" />
    </div>
  </div>
));

CardSkeleton.displayName = 'CardSkeleton';

// Stage card skeleton
export const StageCardSkeleton = memo(() => (
  <div className="glass-card p-6 animate-pulse border-2 border-muted/30">
    <div className="flex items-center justify-between mb-3">
      <div className="h-6 w-24 rounded bg-muted/50" />
      <div className="h-5 w-16 rounded-full bg-muted/40" />
    </div>
    <div className="h-3 w-full rounded bg-muted/30 mb-4" />
    <div className="h-4 w-32 rounded bg-muted/40" />
  </div>
));

StageCardSkeleton.displayName = 'StageCardSkeleton';

// Stat card skeleton
export const StatCardSkeleton = memo(() => (
  <div className="stat-card-gold flex items-center gap-4 animate-pulse">
    <div className="w-12 h-12 rounded-xl bg-muted/50" />
    <div className="space-y-2">
      <div className="h-6 w-12 rounded bg-muted/50" />
      <div className="h-3 w-16 rounded bg-muted/30" />
    </div>
  </div>
));

StatCardSkeleton.displayName = 'StatCardSkeleton';

// File list skeleton
export const FileListSkeleton = memo(({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 animate-pulse">
        <div className="w-10 h-10 rounded-lg bg-muted/50" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted/50" />
          <div className="h-3 w-1/2 rounded bg-muted/30" />
        </div>
        <div className="w-20 h-8 rounded bg-muted/40" />
      </div>
    ))}
  </div>
));

FileListSkeleton.displayName = 'FileListSkeleton';

// Table row skeleton
export const TableRowSkeleton = memo(({ cols = 4 }: { cols?: number }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="p-4">
        <div className={`h-4 rounded bg-muted/50 ${i === 0 ? 'w-32' : 'w-24'}`} />
      </td>
    ))}
  </tr>
));

TableRowSkeleton.displayName = 'TableRowSkeleton';

// Full page loader skeleton
export const PageSkeleton = memo(() => (
  <div className="space-y-6 p-6 animate-fade-in">
    {/* Header */}
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-muted/50 animate-pulse" />
      <div className="space-y-2">
        <div className="h-6 w-48 rounded bg-muted/50 animate-pulse" />
        <div className="h-4 w-32 rounded bg-muted/30 animate-pulse" />
      </div>
    </div>
    
    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    
    {/* Cards */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <StageCardSkeleton key={i} />
      ))}
    </div>
  </div>
));

PageSkeleton.displayName = 'PageSkeleton';

// Accordion/Tree skeleton
export const TreeSkeleton = memo(({ depth = 0, children = 3 }: { depth?: number; children?: number }) => (
  <div className="space-y-2" style={{ paddingLeft: `${depth * 16}px` }}>
    {Array.from({ length: children }).map((_, i) => (
      <div key={i} className="flex items-center gap-2 py-2 animate-pulse">
        <div className="w-5 h-5 rounded bg-muted/40" />
        <div className="w-5 h-5 rounded bg-muted/50" />
        <div className={`h-4 rounded bg-muted/50 ${i % 2 === 0 ? 'w-32' : 'w-24'}`} />
      </div>
    ))}
  </div>
));

TreeSkeleton.displayName = 'TreeSkeleton';

export default Skeleton;
