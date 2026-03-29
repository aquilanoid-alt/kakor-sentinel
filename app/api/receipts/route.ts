import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { createReceipt } from "@/lib/server/repository";

export const runtime = "nodejs";

const receiptSchema = z.object({
  documentNumber: z.string().min(3),
  drugId: z.string().min(3),
  batch: z.string().min(2),
  expiryDate: z.string().min(8),
  coverageScheme: z.enum(["JKN", "Reguler"]).optional(),
  quantityDocument: z.coerce.number().int().positive(),
  quantityPhysical: z.coerce.number().int().nonnegative(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  priceSource: z.string().trim().optional(),
  location: z.string().min(2)
});

export async function POST(request: Request) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)", "Petugas Farmasi"]);
    const payload = receiptSchema.parse(await request.json());
    const result = await createReceipt(payload, session);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Penerimaan gagal." },
      { status: 400 }
    );
  }
}
