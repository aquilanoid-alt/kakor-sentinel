import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { isFirebaseServerConfigured, sessionCookieName } from "@/lib/firebase/config";
import { getOptionalSessionUser } from "@/lib/server/auth";

export const runtime = "nodejs";

const sessionSchema = z.object({
  idToken: z.string().min(10)
});

const cookieSecure = process.env.NODE_ENV === "production";

export async function GET() {
  const user = await getOptionalSessionUser();

  return NextResponse.json({
    ok: true,
    configured: isFirebaseServerConfigured(),
    user
  });
}

export async function POST(request: Request) {
  if (!isFirebaseServerConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Firebase server belum dikonfigurasi." },
      { status: 503 }
    );
  }

  try {
    const payload = sessionSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json({ ok: false, error: "ID token tidak valid." }, { status: 400 });
    }

    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(payload.data.idToken);
    const authTime = Number(decoded.auth_time ?? 0) * 1000;

    if (Date.now() - authTime > 5 * 60 * 1000) {
      return NextResponse.json(
        { ok: false, error: "Silakan login ulang untuk membuat session aman." },
        { status: 401 }
      );
    }

    const expiresIn = 1000 * 60 * 60 * 24 * 5;
    const sessionCookie = await auth.createSessionCookie(payload.data.idToken, { expiresIn });
    const cookieStore = await cookies();

    cookieStore.set(sessionCookieName, sessionCookie, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Session gagal dibuat." },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, "", {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return NextResponse.json({ ok: true });
}
