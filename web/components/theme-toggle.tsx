"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
  }, []);

  function apply(next: Theme) {
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  }

  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      onClick={() => apply(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
