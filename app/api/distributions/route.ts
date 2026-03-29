import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { createDistributionRequestRecord } from "@/lib/server/repository";

export const runtime = "nodejs";

const distributionSchema = z.object({
  requestingUnit: z.string().min(3),
  cluster: z.enum([
    "Manajemen",
    "Ibu & Anak",
    "Dewasa & Lansia",
    "Penyakit Menular",
    "UGD",
    "Lab",
    "Farmasi",
    "Rawat Inap"
  ]),
  drugId: z.string().min(3),
  quantityRequested: z.coerce.number().int().positive(),
  quantityApproved: z.coerce.number().int().nonnegative(),
  eta: z.string().min(8)
});

export async function POST(request: Request) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)", "Petugas Farmasi", "Petugas Jaringan"]);
    const payload = distributionSchema.parse(await request.json());
    const result = await createDistributionRequestRecord(payload, session);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Distribusi gagal." },
      { status: 400 }
    );
  }
}
