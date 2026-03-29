import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { reviewReceiptRecord } from "@/lib/server/repository";

export const runtime = "nodejs";

const reviewSchema = z.object({
  stage: z.enum(["verified", "discrepancy-review", "rejected"]),
  note: z.string().trim().min(3)
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
    ensureAllowedRole(session, ["Admin (Apoteker)", "Petugas Farmasi"]);
    const { id } = await context.params;
    const payload = reviewSchema.parse(await request.json());
    const result = await reviewReceiptRecord(id, payload, session);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Review penerimaan gagal." },
      { status: 400 }
    );
  }
}

