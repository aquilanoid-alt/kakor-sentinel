import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { z } from "zod";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { importFornasCatalog } from "@/lib/server/repository";
import type { ClusterILP, CoverageScheme } from "@/lib/types";

export const runtime = "nodejs";

const rowSchema = z.object({
  genericName: z.string().trim().min(2),
  therapeuticClass: z.string().trim().min(2),
  dosageForm: z.string().trim().min(2),
  strength: z.string().trim().min(1),
  restriction: z.string().trim().default("-"),
  facilityLevel: z.string().trim().min(2),
  cluster: z.string().trim().default("Farmasi"),
  isPriority: z.union([z.boolean(), z.string(), z.number()]).optional(),
  coverageScheme: z.string().trim().optional(),
  referencePrice: z.union([z.number(), z.string()]).optional(),
  referencePriceSource: z.string().trim().optional(),
  referencePriceUpdatedAt: z.string().trim().optional()
});

function parsePriority(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value > 0;
  }

  if (typeof value === "string") {
    return ["1", "true", "ya", "yes", "prioritas"].includes(value.toLowerCase());
  }

  return false;
}

function parseClusters(value: string): ClusterILP[] {
  const clusters = value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return clusters.length > 0
    ? (clusters as ClusterILP[])
    : ["Farmasi"];
}

function parseCoverageScheme(value: string | undefined): CoverageScheme | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return value.toLowerCase() === "reguler" ? "Reguler" : "JKN";
}

function parseReferencePrice(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = Number(value.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
    return Number.isFinite(normalized) ? normalized : null;
  }

  return null;
}

export async function POST(request: Request) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)", "Petugas Farmasi"]);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "File FORNAS wajib diunggah." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const parsedRows = rows.map((raw) =>
      rowSchema.parse({
        genericName: raw.genericName ?? raw.nama_generik ?? raw["Nama Generik"],
        therapeuticClass: raw.therapeuticClass ?? raw.kelas_terapi ?? raw["Kelas Terapi"],
        dosageForm: raw.dosageForm ?? raw.bentuk_sediaan ?? raw["Bentuk Sediaan"],
        strength: raw.strength ?? raw.dosis ?? raw["Kekuatan/Dosis"],
        restriction: raw.restriction ?? raw.pembatasan ?? raw["Pembatasan"],
        facilityLevel: raw.facilityLevel ?? raw.level_fasilitas ?? raw["Level Fasilitas"],
        cluster: raw.cluster ?? raw.klaster ?? raw["Klaster ILP"],
        isPriority: raw.isPriority ?? raw.prioritas ?? raw["Prioritas"],
        coverageScheme: raw.coverageScheme ?? raw.skema ?? raw["Skema"] ?? raw["JKN/Reguler"],
        referencePrice: raw.referencePrice ?? raw.harga ?? raw["Harga Referensi"] ?? raw["Harga Satuan"],
        referencePriceSource:
          raw.referencePriceSource ?? raw.sumber_harga ?? raw["Sumber Harga"] ?? raw["Dasar Harga"],
        referencePriceUpdatedAt:
          raw.referencePriceUpdatedAt ?? raw.tanggal_update ?? raw["Tanggal Update"] ?? raw["Updated At"]
      })
    );

    const result = await importFornasCatalog(
      parsedRows.map((row) => ({
        genericName: row.genericName,
        therapeuticClass: row.therapeuticClass,
        dosageForm: row.dosageForm,
        strength: row.strength,
        restriction: row.restriction,
        facilityLevel: row.facilityLevel,
        cluster: parseClusters(row.cluster),
        isPriority: parsePriority(row.isPriority),
        coverageScheme: parseCoverageScheme(row.coverageScheme),
        referencePrice: parseReferencePrice(row.referencePrice),
        referencePriceSource: row.referencePriceSource,
        referencePriceUpdatedAt: row.referencePriceUpdatedAt
      })),
      session
    );

    return NextResponse.json({
      ok: true,
      imported: result.imported,
      sampleIds: result.sampleIds
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Import FORNAS gagal." },
      { status: 400 }
    );
  }
}
