import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { isFirebaseServerConfigured } from "@/lib/firebase/config";
import { shouldAllowBootstrapAdmin } from "@/lib/runtime";
import { upsertUserProfile } from "@/lib/server/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isFirebaseServerConfigured()) {
    return NextResponse.json({ ok: false, error: "Firebase server belum dikonfigurasi." }, { status: 503 });
  }

  if (!shouldAllowBootstrapAdmin()) {
    return NextResponse.json(
      { ok: false, error: "Bootstrap admin dinonaktifkan pada mode produksi." },
      { status: 403 }
    );
  }

  const secret = request.headers.get("x-bootstrap-secret");
  if (!secret || secret !== process.env.BOOTSTRAP_ADMIN_SECRET) {
    return NextResponse.json({ ok: false, error: "Bootstrap secret tidak valid." }, { status: 401 });
  }

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const name = process.env.BOOTSTRAP_ADMIN_NAME ?? "Admin Farmasi";
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "BOOTSTRAP_ADMIN_EMAIL dan BOOTSTRAP_ADMIN_PASSWORD wajib diisi." },
      { status: 400 }
    );
  }

  const auth = getFirebaseAdminAuth();
  let userRecord;

  try {
    userRecord = await auth.getUserByEmail(email);
  } catch {
    userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true
    });
  }

  await auth.setCustomUserClaims(userRecord.uid, {
    role: "Admin (Apoteker)"
  });

  await upsertUserProfile({
    uid: userRecord.uid,
    email,
    name,
    role: "Admin (Apoteker)",
    facilityId: "",
    facilityName: "",
    active: true,
    createdAt: new Date().toISOString()
  });

  return NextResponse.json({
    ok: true,
    email,
    uid: userRecord.uid,
    role: "Admin (Apoteker)"
  });
}
