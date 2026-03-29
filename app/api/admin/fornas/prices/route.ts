import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { z } from "zod";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { importFornasReferencePrices } from "@/lib/server/repository";

export const runtime = "nodejs";

const rowSchema = z.object({
  id: z.string().trim().optional(),
  genericName: z.string().trim().optional(),
  dosageForm: z.string().trim().optional(),
  strength: z.string().trim().optional(),
  coverageScheme: z.enum(["JKN", "Reguler"]).optional(),
  referencePrice: z.coerce.number().nonnegative(),
  referencePriceSource: z.string().trim().optional(),
  referencePriceUpdatedAt: z.string().trim().optional()
});

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
      return NextResponse.json({ ok: false, error: "File harga JKN wajib diunggah." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const parsedRows = rows.map((raw) =>
      rowSchema.parse({
        id: raw.id ?? raw.kode ?? raw["ID"],
        genericName: raw.genericName ?? raw.nama_generik ?? raw["Nama Generik"],
        dosageForm: raw.dosageForm ?? raw.bentuk_sediaan ?? raw["Bentuk Sediaan"],
        strength: raw.strength ?? raw.dosis ?? raw["Kekuatan/Dosis"],
        coverageScheme: raw.coverageScheme ?? raw.skema ?? raw["Skema"] ?? raw["JKN/Reguler"],
        referencePrice: raw.referencePrice ?? raw.harga ?? raw["Harga Referensi"] ?? raw["Harga Satuan"],
        referencePriceSource:
          raw.referencePriceSource ?? raw.sumber_harga ?? raw["Sumber Harga"] ?? raw["Dasar Harga"],
        referencePriceUpdatedAt:
          raw.referencePriceUpdatedAt ?? raw.tanggal_update ?? raw["Tanggal Update"] ?? raw["Updated At"]
      })
    );

    const result = await importFornasReferencePrices(parsedRows, session);

    return NextResponse.json({
      ok: true,
      updated: result.updated,
      unmatched: result.unmatched,
      sampleIds: result.sampleIds
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Import harga JKN gagal." },
      { status: 400 }
    );
  }
}
