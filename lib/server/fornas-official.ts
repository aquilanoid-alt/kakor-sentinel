import type { FornasDrug, SessionUser } from "@/lib/types";
import { replaceFornasCatalog } from "@/lib/server/repository";
import { slugify } from "@/lib/utils";

const OFFICIAL_FORNAS_PUBLIC_URL = "https://e-fornas.kemkes.go.id/guest/daftar-obat";
const OFFICIAL_FORNAS_API_URL = "https://e-fornas.kemkes.go.id/api/daftar-obat";
const REQUEST_CONCURRENCY = 10;
const REQUEST_RETRIES = 3;

interface OfficialApiEnvelope<T> {
  status?: number;
  message?: string;
  error?: string;
  data?: T;
}

interface OfficialDrugIndexRow {
  _id_obat: number;
  _nama_obat: string;
  _nama_obat_internasional?: string;
}

interface OfficialDrugVariantRow extends OfficialDrugIndexRow {
  _kode_sediaan?: string;
  _sediaan?: string;
  _kekuatan?: string;
  _kode_satuan?: string;
  _satuan?: string;
  _label?: string;
}

interface OfficialDrugDetailRow {
  _kelas_terapi?: string | null;
  _sub_kelas_terapi?: string | null;
  _sub_sub_kelas_terapi?: string | null;
  _sub_sub_sub_kelas_terapi?: string | null;
  _nama_obat?: string | null;
  _id_obat?: number | null;
  _sediaan?: string | null;
  _kekuatan?: string | null;
  _satuan?: string | null;
  _fpktp?: boolean | null;
  _fpktl?: boolean | null;
  _pp?: boolean | null;
  _prb?: boolean | null;
  _oen?: boolean | null;
  _program?: boolean | null;
  _kanker?: boolean | null;
  _komposisi?: string | null;
  _restriksi_obat?: string | null;
  _restriksi_sediaan?: string | null;
  _peresepan_maksimal?: string | null;
}

function isFilled(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

async function fetchOfficialApi<T>(params: Record<string, string>) {
  for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt += 1) {
    try {
      const url = new URL(OFFICIAL_FORNAS_API_URL);

      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json"
        },
        signal: AbortSignal.timeout(20000)
      });

      if (!response.ok) {
        throw new Error(`Gagal mengambil data e-FORNAS (${response.status}).`);
      }

      const payload = (await response.json()) as OfficialApiEnvelope<T>;
      if (payload.error) {
        throw new Error(`e-FORNAS: ${payload.error}`);
      }

      if (!payload.data) {
        throw new Error("e-FORNAS tidak mengembalikan data.");
      }

      return payload.data;
    } catch (error) {
      if (attempt >= REQUEST_RETRIES) {
        throw error instanceof Error ? error : new Error("Gagal mengambil data e-FORNAS.");
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    }
  }

  throw new Error("Gagal mengambil data e-FORNAS.");
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
) {
  const results = new Array<R>(items.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (true) {
        const index = cursor++;
        if (index >= items.length) {
          return;
        }

        results[index] = await worker(items[index], index);
      }
    })
  );

  return results;
}

function buildTherapeuticClass(detail?: OfficialDrugDetailRow | null) {
  const parts = [
    detail?._kelas_terapi,
    detail?._sub_kelas_terapi,
    detail?._sub_sub_kelas_terapi,
    detail?._sub_sub_sub_kelas_terapi
  ].filter(isFilled);

  return parts.length > 0 ? parts.join(" > ") : "Belum tersedia dari e-FORNAS";
}

function buildRestriction(detail?: OfficialDrugDetailRow | null) {
  const parts = [
    isFilled(detail?._restriksi_obat) ? `Restriksi obat: ${detail?._restriksi_obat}` : null,
    isFilled(detail?._restriksi_sediaan) ? `Restriksi sediaan: ${detail?._restriksi_sediaan}` : null,
    isFilled(detail?._peresepan_maksimal) ? `Peresepan maksimal: ${detail?._peresepan_maksimal}` : null,
    isFilled(detail?._komposisi) ? `Komposisi: ${detail?._komposisi}` : null
  ].filter(isFilled);

  return parts.length > 0 ? parts.join(" | ") : "-";
}

function buildFacilityLevel(detail?: OfficialDrugDetailRow | null) {
  const levels = [
    detail?._fpktp ? "FKTP" : null,
    detail?._fpktl ? "FKRTL" : null,
    detail?._pp ? "PP" : null,
    detail?._prb ? "PRB" : null,
    detail?._oen ? "OEN" : null,
    detail?._program ? "Program" : null,
    detail?._kanker ? "Kanker" : null
  ].filter(isFilled);

  return levels.length > 0 ? levels.join(", ") : "-";
}

function buildStrength(variant: OfficialDrugVariantRow, detail?: OfficialDrugDetailRow | null) {
  const value = isFilled(detail?._kekuatan) ? detail?._kekuatan : variant._kekuatan;
  const unit = isFilled(detail?._satuan) ? detail?._satuan : variant._satuan;
  const strength = [value, unit].filter(isFilled).join(" ").replace(/\s+/g, " ").trim();

  return strength || "-";
}

function toFornasDrug(variant: OfficialDrugVariantRow, detail?: OfficialDrugDetailRow | null): FornasDrug {
  const rawId = [
    variant._id_obat,
    variant._kode_sediaan ?? "NOSEDIAAN",
    variant._kekuatan ?? "NOKEKUATAN",
    variant._kode_satuan ?? "NOSATUAN"
  ].join("-");

  return {
    id: slugify(`efornas-${rawId}`),
    genericName: isFilled(detail?._nama_obat) ? detail._nama_obat : variant._nama_obat,
    therapeuticClass: buildTherapeuticClass(detail),
    dosageForm: variant._sediaan ?? detail?._sediaan ?? "-",
    strength: buildStrength(variant, detail),
    restriction: buildRestriction(detail),
    facilityLevel: buildFacilityLevel(detail),
    cluster: ["Farmasi"],
    isPriority: Boolean(detail?._oen || detail?._program || detail?._kanker),
    coverageScheme: undefined,
    referencePrice: null,
    referencePriceSource: "",
    referencePriceUpdatedAt: ""
  };
}

function sortFornasRows(rows: FornasDrug[]) {
  return rows.sort((left, right) => {
    const genericOrder = left.genericName.localeCompare(right.genericName, "id");
    if (genericOrder !== 0) {
      return genericOrder;
    }

    const formOrder = left.dosageForm.localeCompare(right.dosageForm, "id");
    if (formOrder !== 0) {
      return formOrder;
    }

    return left.strength.localeCompare(right.strength, "id");
  });
}

async function searchOfficialFornasRows(query: string, minLength: number, mode: "query" | "initial") {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < minLength) {
    return [];
  }

  const indexRows = await fetchOfficialApi<OfficialDrugIndexRow[]>({
    type: "byname",
    value: normalizedQuery
  });

  const uniqueDrugIds = Array.from(
    new Map(indexRows.map((row) => [row._id_obat, row])).values()
  ).slice(0, mode === "initial" ? 80 : 24);

  const variantGroups = await mapWithConcurrency(uniqueDrugIds, 6, async (row) =>
    fetchOfficialApi<OfficialDrugVariantRow[]>({
      type: "byidobat",
      value: String(row._id_obat)
    })
  );

  const normalizedInitial = normalizedQuery.charAt(0).toLowerCase();
  const queryTerms = normalizedQuery.toLowerCase().split(/\s+/).filter(Boolean);
  const variants = variantGroups
    .flat()
    .filter((row) => row._id_obat && isFilled(row._nama_obat))
    .filter((variant) => {
      const normalizedName = variant._nama_obat.trim().toLowerCase();
      if (mode === "initial") {
        return normalizedName.startsWith(normalizedInitial);
      }

      const haystack = `${variant._nama_obat} ${variant._sediaan ?? ""} ${variant._kekuatan ?? ""} ${variant._satuan ?? ""}`.toLowerCase();
      return queryTerms.every((term) => haystack.includes(term));
    })
    .slice(0, mode === "initial" ? 120 : 40);

  const details = await mapWithConcurrency(variants, 6, async (variant) => {
    try {
      const rows = await fetchOfficialApi<OfficialDrugDetailRow[]>({
        type: "obatsks",
        _id_obat: String(variant._id_obat),
        _kekuatan: variant._kekuatan ?? "",
        _kode_satuan: variant._kode_satuan ?? "",
        _kode_sediaan: variant._kode_sediaan ?? ""
      });

      return rows[0] ?? null;
    } catch {
      return null;
    }
  });

  const rows = variants.map((variant, index) => toFornasDrug(variant, details[index]));
  return sortFornasRows(Array.from(new Map(rows.map((row) => [row.id, row])).values())).slice(
    0,
    mode === "initial" ? 120 : 40
  );
}

export async function searchOfficialFornasOptions(query: string) {
  return searchOfficialFornasRows(query, 2, "query");
}

export async function searchOfficialFornasByInitial(initial: string) {
  return searchOfficialFornasRows(initial, 1, "initial");
}

export async function syncOfficialFornasCatalog(actor: SessionUser) {
  const indexRows = await fetchOfficialApi<OfficialDrugIndexRow[]>({
    type: "byname",
    value: ""
  });

  const uniqueDrugIds = Array.from(
    new Map(indexRows.map((row) => [row._id_obat, row])).values()
  );

  const variantGroups = await mapWithConcurrency(uniqueDrugIds, REQUEST_CONCURRENCY, async (row) =>
    fetchOfficialApi<OfficialDrugVariantRow[]>({
      type: "byidobat",
      value: String(row._id_obat)
    })
  );

  const variants = variantGroups
    .flat()
    .filter((row) => row._id_obat && isFilled(row._nama_obat));

  const details = await mapWithConcurrency(variants, REQUEST_CONCURRENCY, async (variant) => {
    try {
      const rows = await fetchOfficialApi<OfficialDrugDetailRow[]>({
        type: "obatsks",
        _id_obat: String(variant._id_obat),
        _kekuatan: variant._kekuatan ?? "",
        _kode_satuan: variant._kode_satuan ?? "",
        _kode_sediaan: variant._kode_sediaan ?? ""
      });

      return rows[0] ?? null;
    } catch {
      return null;
    }
  });

  const rows = variants.map((variant, index) => toFornasDrug(variant, details[index]));
  const deduplicatedRows = sortFornasRows(Array.from(new Map(rows.map((row) => [row.id, row])).values()));
  const result = await replaceFornasCatalog(deduplicatedRows, actor, "e-FORNAS");

  return {
    ...result,
    fetchedDrugs: uniqueDrugIds.length,
    fetchedVariants: variants.length,
    sourceUrl: OFFICIAL_FORNAS_PUBLIC_URL
  };
}

export { OFFICIAL_FORNAS_PUBLIC_URL };
