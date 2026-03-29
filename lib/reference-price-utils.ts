import type { CoverageScheme, FornasDrug } from "@/lib/types";

export type ReferencePriceSchemeFilter = "all" | CoverageScheme;

export interface ReferencePriceFilters {
  query?: string | null;
  scheme?: ReferencePriceSchemeFilter | null;
  updatedFrom?: string | null;
  updatedTo?: string | null;
}

export function normalizeReferencePriceScheme(item: FornasDrug): CoverageScheme | "Belum ditetapkan" {
  if (item.coverageScheme === "JKN" || item.coverageScheme === "Reguler") {
    return item.coverageScheme;
  }

  return "Belum ditetapkan";
}

export function hasReferencePrice(item: FornasDrug) {
  return typeof item.referencePrice === "number" && !Number.isNaN(item.referencePrice) && item.referencePrice > 0;
}

function normalizeDateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function filterReferencePriceCatalog(catalog: FornasDrug[], filters: ReferencePriceFilters = {}) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const scheme = filters.scheme ?? "all";
  const updatedFrom = normalizeDateOnly(filters.updatedFrom);
  const updatedTo = normalizeDateOnly(filters.updatedTo);

  return [...catalog]
    .filter((item) => {
      const haystack = `${item.genericName} ${item.dosageForm} ${item.strength} ${item.id}`.toLowerCase();
      if (query && !haystack.includes(query)) {
        return false;
      }

      const itemScheme = item.coverageScheme;
      if (scheme !== "all" && itemScheme !== scheme) {
        return false;
      }

      const updatedAt = normalizeDateOnly(item.referencePriceUpdatedAt);
      if (updatedFrom && (!updatedAt || updatedAt < updatedFrom)) {
        return false;
      }

      if (updatedTo && (!updatedAt || updatedAt > updatedTo)) {
        return false;
      }

      return true;
    })
    .sort((left, right) => {
      const leftUpdated = normalizeDateOnly(left.referencePriceUpdatedAt);
      const rightUpdated = normalizeDateOnly(right.referencePriceUpdatedAt);
      if (leftUpdated !== rightUpdated) {
        return rightUpdated.localeCompare(leftUpdated);
      }

      const leftPrice = left.referencePrice ?? -1;
      const rightPrice = right.referencePrice ?? -1;
      if (leftPrice !== rightPrice) {
        return rightPrice - leftPrice;
      }

      return left.genericName.localeCompare(right.genericName, "id");
    });
}
