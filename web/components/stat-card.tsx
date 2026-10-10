import React from "react";

type Trend = {
  value: string;
  direction: "up" | "down" | "flat";
};

type StatCardProps = {
  label: string;
  value: string | number;
  prefix?: string;
  trend?: Trend;
  accent?: boolean;
};

export function StatCard({ label, value, prefix, trend, accent }: StatCardProps) {
  return (
    <div className="stat-card">
      <p className="stat-card-label">{label}</p>
      <p className={`stat-card-value ${accent ? "text-acc" : ""}`.trim()}>
        {prefix}
        {value}
      </p>
      {trend && (
        <p className={`stat-card-trend trend-${trend.direction}`}>{trend.value}</p>
      )}
    </div>
  );
}
