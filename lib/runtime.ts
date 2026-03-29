import type { RuntimeMode } from "@/lib/types";

function normalizeRuntimeMode(raw?: string | null): RuntimeMode {
  return raw?.trim().toLowerCase() === "production" ? "production" : "demo";
}

export function getRuntimeMode(): RuntimeMode {
  return normalizeRuntimeMode(process.env.KSS_RUNTIME_MODE ?? process.env.NODE_ENV);
}

export function isStrictProductionMode() {
  return getRuntimeMode() === "production";
}

export function shouldUseDemoFallbackData() {
  return !isStrictProductionMode();
}

export function shouldAllowBootstrapAdmin() {
  if (!isStrictProductionMode()) {
    return true;
  }

  return process.env.KSS_ALLOW_BOOTSTRAP_IN_PRODUCTION === "true";
}
