import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { saveGoLiveConfig } from "@/lib/server/repository";

export const runtime = "nodejs";

const goLiveSchema = z.object({
  facilityName: z.string().trim().min(3, "Nama fasilitas wajib diisi."),
  facilityCode: z.string().trim().min(2, "Kode fasilitas wajib diisi."),
  districtCity: z.string().trim().min(2, "Kabupaten/Kota wajib diisi."),
  province: z.string().trim().min(2, "Provinsi wajib diisi."),
  address: z.string().trim().min(6, "Alamat wajib diisi."),
  contactPhone: z.string().trim().min(6, "Nomor kontak wajib diisi."),
  contactEmail: z.string().trim().email("Email kontak tidak valid."),
  pharmacyLeadName: z.string().trim().min(3, "Nama penanggung jawab farmasi wajib diisi."),
  pharmacyLeadLicense: z.string().trim().min(3, "Nomor SIPA/STRA/SIKA wajib diisi.")
});

export async function POST(request: Request) {
  const user = await getOptionalSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(user, ["Admin (Apoteker)"]);
    const payload = goLiveSchema.parse(await request.json());
    const config = await saveGoLiveConfig(payload, user);
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Konfigurasi go-live gagal disimpan." },
      { status: 400 }
    );
  }
}
