import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { resetOperationalDrugData } from "@/lib/server/repository";

export const runtime = "nodejs";

const resetSchema = z.object({
  confirmation: z.string().trim()
});

export async function POST(request: Request) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)"]);
    const payload = resetSchema.parse(await request.json());

    if (payload.confirmation !== "HAPUS DATA OBAT") {
      return NextResponse.json(
        { ok: false, error: "Konfirmasi tidak sesuai. Ketik HAPUS DATA OBAT untuk melanjutkan." },
        { status: 400 }
      );
    }

    const result = await resetOperationalDrugData(session);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Reset data operasional gagal." },
      { status: 400 }
    );
  }
}
