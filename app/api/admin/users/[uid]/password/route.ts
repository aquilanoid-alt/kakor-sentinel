import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { updateManagedUserPassword } from "@/lib/server/user-admin";

export const runtime = "nodejs";

const passwordSchema = z.object({
  password: z.string().min(8)
});

export async function POST(
  request: Request,
  context: { params: Promise<{ uid: string }> }
) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)"]);
    const { uid } = await context.params;
    const payload = passwordSchema.parse(await request.json());
    const result = await updateManagedUserPassword(uid, payload.password, session);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Reset password gagal." },
      { status: 400 }
    );
  }
}
