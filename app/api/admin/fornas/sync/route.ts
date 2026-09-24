import { NextResponse } from "next/server";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { syncOfficialFornasCatalog, syncOfficialFornasCatalogByInitial } from "@/lib/server/fornas-official";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)", "Petugas Farmasi"]);

    // Kalau klien mengirim ?initial=a, sinkron HANYA huruf itu (cepat, tidak
    // pernah timeout). Tanpa parameter, jalankan sinkron lama (semua obat
    // sekaligus) — dipertahankan untuk kompatibilitas, tapi berisiko timeout
    // untuk katalog nasional yang besar.
    const url = new URL(request.url);
    const initial = url.searchParams.get("initial");

    const result = initial
      ? await syncOfficialFornasCatalogByInitial(initial, session)
      : await syncOfficialFornasCatalog(session);

    return NextResponse.json({
      ok: true,
      imported: result.imported,
      purged: result.purged,
      fetchedDrugs: result.fetchedDrugs,
      fetchedVariants: result.fetchedVariants,
      sampleIds: result.sampleIds,
      sourceUrl: result.sourceUrl
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Sinkron e-FORNAS gagal." },
      { status: 400 }
    );
  }
}
