"use client";

import { useEffect } from "react";
import { applyTheme, resolveTheme } from "@/lib/theme";

export function ThemeSync() {
  useEffect(() => {
    applyTheme(resolveTheme());
  }, []);

  return null;
}
