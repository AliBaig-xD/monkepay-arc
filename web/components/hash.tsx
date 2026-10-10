"use client";

import { useEffect, useState } from "react";

type HashProps = {
  value: string;
  type?: "address" | "tx";
  truncate?: boolean;
  className?: string;
};

const EXPLORER = "https://explorer.arc.io";

/** Address / tx pill: links to the Arc explorer, copies on click. */
export function Hash({ value, type = "address", truncate = true, className = "" }: HashProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 900);
    return () => window.clearTimeout(t);
  }, [copied]);

  if (!value) return null;
  const label = truncate ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;

  return (
    <a
      className={`hash-pill ${className}`}
      href={`${EXPLORER}/${type === "tx" ? "tx" : "address"}/${value}`}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => undefined);
        setCopied(true);
      }}
      title={`${value} (opens Arc explorer, copies to clipboard)`}
    >
      <span className="truncate">{label}</span>
      <span className="copy-hint">{copied ? "✓" : "↗"}</span>
    </a>
  );
}
