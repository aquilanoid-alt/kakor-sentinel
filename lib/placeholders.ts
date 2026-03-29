const legacyFacilityIds = new Set(["PKM-SENTINEL"]);
const legacyFacilityNames = new Set(["Puskesmas Sentinel Makassar"]);

export function normalizeFacilityId(value?: string | null) {
  const nextValue = typeof value === "string" ? value.trim() : "";
  return legacyFacilityIds.has(nextValue) ? "" : nextValue;
}

export function normalizeFacilityName(value?: string | null) {
  const nextValue = typeof value === "string" ? value.trim() : "";
  return legacyFacilityNames.has(nextValue) ? "" : nextValue;
}
