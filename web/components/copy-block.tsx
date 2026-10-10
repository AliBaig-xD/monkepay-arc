"use client";

import { useState } from "react";

/** Dark code block with a copy button. */
export function CopyBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative min-w-0">
      {label && <p className="font-mono text-[10px] uppercase tracking-[0.14em] m-0 mb-[6px] faint">{label}</p>}
      <pre className="code m-0 pr-[64px]">{code}</pre>
      <button
        type="button"
        className="absolute right-[8px] font-mono text-[10px] px-[8px] py-[3px] rounded cursor-pointer"
        style={{ top: label ? 30 : 8, background: "rgba(255,255,255,0.06)", color: copied ? "#4ade80" : "#8b95a1", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={() => {
          navigator.clipboard?.writeText(code).catch(() => undefined);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
