"use client";

import { LANDING_FEATURES } from "@/lib/constants/landing";
import { useInView } from "@/utils/hooks/useInView";
import { SectionHead } from "../section-head";

export function Features() {
  const { ref, inView } = useInView();
  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="wrap py-[56px]">
      <SectionHead eyebrow="Why Arc" title="Built for what Arc does differently" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        {LANDING_FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="panel panel-pad transition-transform duration-200 hover:-translate-y-0.5"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? undefined : "translateY(16px)",
              transition: `opacity .5s ease ${i * 80}ms, transform .5s ease ${i * 80}ms`,
            }}
          >
            <div
              className="w-[32px] h-[32px] rounded-md flex items-center justify-center text-[14px] mb-[14px] font-mono"
              style={{ background: "var(--accent-dim)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", color: "var(--accent)" }}
            >
              {f.icon}
            </div>
            <h3 className="text-[15px] font-semibold m-0 mb-[8px]" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
            <p className="text-[13px] leading-relaxed m-0 muted">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
