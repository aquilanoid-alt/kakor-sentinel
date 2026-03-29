import { NextResponse } from "next/server";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { syncOfficialFornasCatalog } from "@/lib/server/fornas-official";

export const runtime = "nodejs";

export async function POST() {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)", "Petugas Farmasi"]);
    const result = await syncOfficialFornasCatalog(session);

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
