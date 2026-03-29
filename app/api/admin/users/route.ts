import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { createManagedUser, listManagedUsers } from "@/lib/server/user-admin";

export const runtime = "nodejs";

const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  name: z.string().trim().min(3),
  role: z.enum([
    "Admin (Apoteker)",
    "Petugas Farmasi",
    "Petugas Jaringan",
    "Petugas Unit"
  ]),
  facilityId: z.string().trim().min(3).optional(),
  facilityName: z.string().trim().min(3).optional()
});

export async function GET() {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)"]);
    const users = await listManagedUsers();
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Gagal mengambil daftar user." },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)"]);
    const payload = createUserSchema.parse(await request.json());
    const result = await createManagedUser(payload, session);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Pembuatan user gagal." },
      { status: 400 }
    );
  }
}
