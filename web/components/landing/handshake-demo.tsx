"use client";

import { HANDSHAKE_LINES, SERVER_CODE } from "@/lib/constants/landing";
import { useInView } from "@/utils/hooks/useInView";
import { useEffect, useState } from "react";
import { CodeLine } from "../code-line";
import { SectionHead } from "../section-head";

export function HandshakeDemo() {
  const { ref, inView } = useInView(0.2);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const ids = HANDSHAKE_LINES.map((_, i) => setTimeout(() => setShown(i + 1), 250 + i * 480));
    return () => ids.forEach(clearTimeout);
  }, [inView]);

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="py-[56px]" style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
      <div className="wrap">
        <SectionHead eyebrow="The 402 handshake" title="How sellers write it vs. how agents pay it" />
        <div className="grid grid-cols-1 md:grid-cols-2 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="p-[18px] sm:p-[24px] min-w-0" style={{ background: "#161b22" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest m-0 mb-[16px]" style={{ color: "rgba(169,171,178,0.55)" }}>
              ⌗ Your API server
            </p>
            <div className="font-mono text-[12px] leading-[1.7] overflow-x-auto scrollbar-hide" style={{ color: "#c9d1d9" }}>
              {SERVER_CODE.map((line, i) => (
                <CodeLine key={i} tokens={line} />
              ))}
            </div>
          </div>
          <div className="p-[18px] sm:p-[24px] min-w-0" style={{ background: "#0d1117" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest m-0 mb-[16px]" style={{ color: "#00d4aa" }}>
              <span style={{ animation: "pulse-dot 2s ease infinite" }}>●</span> Agent log
            </p>
            <div className="font-mono leading-[1.85] overflow-x-auto scrollbar-hide">
              {HANDSHAKE_LINES.map((line, i) => (
                <div
                  key={i}
                  className="whitespace-pre transition-all duration-300"
                  style={{
                    color: line.color,
                    fontWeight: line.bold ? 700 : 400,
                    fontSize: line.small ? 10.5 : 12,
                    opacity: i < shown ? 1 : 0,
                    transform: i < shown ? "translateX(0)" : "translateX(8px)",
                  }}
                >
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
