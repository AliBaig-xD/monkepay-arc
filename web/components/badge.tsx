import React from "react";

type BadgeProps = {
  status: string;
  className?: string;
};

export function Badge({ status, className }: BadgeProps) {
  const normalized = status.toUpperCase();

  const variant =
    normalized === "COMPLETE" || normalized === "ACTIVE"
      ? "badge-success"
      : normalized === "PENDING"
        ? "badge-warning"
        : normalized === "FAILED" || normalized === "SUSPENDED"
          ? "badge-danger"
          : "badge-neutral";

  return (
    <span className={["badge", variant, className].filter(Boolean).join(" ")}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}
