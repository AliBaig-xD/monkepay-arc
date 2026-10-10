"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { label: "Try it", href: "/#try" },
  { label: "Sellers", href: "/sellers/" },
  { label: "Activity", href: "/activity/" },
  { label: "Docs", href: "/docs/" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const active = (href: string) => href !== "/#try" && !!pathname?.startsWith(href.replace(/\/$/, ""));
  const solid = scrolled || open;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: solid ? "color-mix(in srgb, var(--bg-base) 92%, transparent)" : "transparent",
        backdropFilter: solid ? "blur(12px)" : "none",
        borderBottom: `1px solid ${solid ? "var(--border-subtle)" : "transparent"}`,
      }}
    >
      <div className="wrap h-14 flex items-center justify-between">
        <div className="flex items-center gap-[28px]">
          <Link href="/" className="flex items-center gap-[8px] no-underline" aria-label="MonkePay on Arc home">
            <Logo size={22} />
            <span className="font-mono font-bold text-[14px] tracking-tight" style={{ color: "var(--text-primary)" }}>
              MonkePay <span style={{ color: "var(--accent)" }}>on Arc</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-[22px]">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-mono text-[11px] no-underline uppercase tracking-widest transition-colors"
                style={{ color: active(l.href) ? "var(--accent)" : "var(--text-secondary)" }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-[8px]">
          <a
            href="https://github.com/AliBaig-xD/monkepay-arc"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex btn btn-ghost btn-sm font-mono"
          >
            GitHub ↗
          </a>
          <ThemeToggle />
          <Link href="/#try" className="hidden sm:inline-flex btn btn-primary btn-sm font-mono font-bold">
            Pay $0.01 →
          </Link>
          <button
            type="button"
            className="md:hidden btn btn-secondary btn-sm"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden wrap pb-[14px] flex flex-col gap-[4px]">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="nav-item">
              {l.label}
            </Link>
          ))}
          <a href="https://github.com/AliBaig-xD/monkepay-arc" target="_blank" rel="noreferrer" className="nav-item">
            GitHub ↗
          </a>
        </div>
      )}
    </nav>
  );
}
