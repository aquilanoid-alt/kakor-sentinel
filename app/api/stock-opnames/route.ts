import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { createStockOpnameRecord } from "@/lib/server/repository";

export const runtime = "nodejs";

const stockOpnameSchema = z.object({
  batchId: z.string().min(2),
  systemQuantity: z.coerce.number().int().nonnegative(),
  physicalQuantity: z.coerce.number().int().nonnegative()
});

export async function POST(request: Request) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)", "Petugas Farmasi"]);
    const payload = stockOpnameSchema.parse(await request.json());
    const result = await createStockOpnameRecord(payload, session);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Stock opname gagal." },
      { status: 400 }
    );
  }
}
