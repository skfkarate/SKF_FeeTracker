"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius-row)] bg-[color:var(--color-panel-strong)] ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card-panel space-y-[16px] p-[20px]">
      <Skeleton className="h-[16px] w-[96px]" />
      <Skeleton className="h-[32px] w-[128px]" />
      <Skeleton className="h-[12px] w-[80px]" />
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-[12px]">
      <div className="flex gap-[16px]">
        {Array.from({ length: cols }).map((_, index) => (
          <Skeleton key={index} className="h-[16px] flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-[16px]">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-[40px] flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="content-shell mx-auto pb-[96px] pt-[96px] sm:pt-[112px]">
      <div className="mb-[24px]">
        <Skeleton className="mb-[8px] h-[32px] w-[192px]" />
        <Skeleton className="h-[16px] w-[288px] max-w-full" />
      </div>
      <div className="mb-[24px] grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <Skeleton className="h-[256px] w-full rounded-[var(--radius-card)]" />
    </div>
  );
}
