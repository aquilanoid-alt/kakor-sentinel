"use client";

import { useEffect, useState } from "react";
import { applyTheme, resolveTheme, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const initialTheme = resolveTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => {
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }}
      className={cn(
        "inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-cyan/30 hover:text-aqua",
        className
      )}
    >
      <span className="grid size-8 place-items-center rounded-full border border-white/10 bg-black/20">
        {theme === "dark" ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
            <path
              d="M12 3.75V6.25M12 17.75v2.5M5.65 5.65l1.77 1.77M16.58 16.58l1.77 1.77M3.75 12h2.5M17.75 12h2.5M5.65 18.35l1.77-1.77M16.58 7.42l1.77-1.77M15.5 12A3.5 3.5 0 1 1 8.5 12a3.5 3.5 0 0 1 7 0Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
            <path
              d="M14.5 3.25A8.75 8.75 0 1 0 20.75 15.5c-1.12.48-2.36.75-3.66.75a8.9 8.9 0 0 1-8.84-8.84c0-1.3.27-2.54.75-3.66 1.52-.66 3.02-.72 5.5-.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="text-left">
        <span className="block text-[11px] uppercase tracking-[0.32em] text-mist/55">Tampilan</span>
        <span className="block font-medium">{theme === "dark" ? "Gelap futuristik" : "Terang elegan"}</span>
      </span>
    </button>
  );
}
