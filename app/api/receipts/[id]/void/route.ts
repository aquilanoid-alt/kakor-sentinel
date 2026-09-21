import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { voidReceipt } from "@/lib/server/repository";

export const runtime = "nodejs";

const voidSchema = z.object({
  reason: z.string().trim().min(5, "Alasan pembatalan minimal 5 karakter.")
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)"]);
    const { id } = await context.params;
    const payload = voidSchema.parse(await request.json());
    const result = await voidReceipt(id, payload, session);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Pembatalan penerimaan gagal." },
      { status: 400 }
    );
  }
}