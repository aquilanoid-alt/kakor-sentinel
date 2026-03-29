import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { createDispenseRecord } from "@/lib/server/repository";

export const runtime = "nodejs";

const dispenseSchema = z.object({
  drugId: z.string().min(3),
  batchCode: z.string().min(2),
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
  quantity: z.coerce.number().int().positive(),
  unitName: z.string().min(3),
  mode: z.enum(["online", "offline"]).optional()
});

export async function POST(request: Request) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)", "Petugas Farmasi", "Petugas Unit", "Petugas Jaringan"]);
    const payload = dispenseSchema.parse(await request.json());
    const result = await createDispenseRecord(payload, session);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Pengambilan obat gagal." },
      { status: 400 }
    );
  }
}
