import React from "react";

type SkeletonProps = {
  className?: string;
};

type TableSkeletonProps = {
  rows?: number;
  cols?: number;
};

export function Skeleton({ className }: SkeletonProps) {
  return <div className={["skeleton", className].filter(Boolean).join(" ")} />;
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <Skeleton className="h-[12px] w-28" />
      <div className="h-3" />
      <Skeleton className="h-[28px] w-32" />
      <div className="h-2" />
      <Skeleton className="h-[10px] w-24" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: TableSkeletonProps) {
  const total = rows * cols;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: "12px",
      }}
    >
      {Array.from({ length: total }).map((_, index) => (
        <Skeleton key={index} className="h-[12px] w-full" />
      ))}
    </div>
  );
}
