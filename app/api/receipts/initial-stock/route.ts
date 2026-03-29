import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { createInitialStockReceipts } from "@/lib/server/repository";

export const runtime = "nodejs";

const initialStockRowSchema = z.object({
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

const initialStockSchema = z.object({
  documentNumber: z.string().min(3),
  rows: z.array(initialStockRowSchema).min(1)
});

export async function POST(request: Request) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)", "Petugas Farmasi"]);
    const payload = initialStockSchema.parse(await request.json());
    const result = await createInitialStockReceipts(payload, session);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Wizard stok awal gagal diproses." },
      { status: 400 }
    );
  }
}
