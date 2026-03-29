import { NextResponse } from "next/server";
import { z } from "zod";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { isFirebaseServerConfigured, sessionCookieName } from "@/lib/firebase/config";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const cookieSecure = process.env.NODE_ENV === "production";

function resolveApiKey() {
  return process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
}

function mapLoginError(message?: string) {
  switch (message) {
    case "INVALID_LOGIN_CREDENTIALS":
    case "INVALID_PASSWORD":
    case "EMAIL_NOT_FOUND":
      return "Email atau password tidak cocok.";
    case "USER_DISABLED":
      return "Akun ini dinonaktifkan.";
    default:
      return "Login ke Firebase gagal.";
  }
}

function isJsonRequest(request: Request) {
  return request.headers.get("content-type")?.includes("application/json");
}

function createRelativeRedirect(path: string) {
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: path
    }
  });
}

function decodeAuthTime(idToken: string) {
  const [, payload = ""] = idToken.split(".");
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as {
    auth_time?: number | string;
  };

  return Number(decoded.auth_time ?? 0) * 1000;
}

async function parseLoginRequest(request: Request) {
  if (isJsonRequest(request)) {
    const payload = loginSchema.safeParse(await request.json());

    return {
      payload,
      email: payload.success ? payload.data.email : "",
      returnTo: "/"
    };
  }

  const formData = await request.formData();
  const nextPayload = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? "")
  });

  return {
    payload: nextPayload,
    email: String(formData.get("email") ?? "").trim(),
    returnTo: String(formData.get("returnTo") ?? "/") || "/"
  };
}

function createErrorResponse(request: Request, error: string, email: string) {
  if (isJsonRequest(request)) {
    return NextResponse.json({ ok: false, error }, { status: 401 });
  }

  const loginUrl = new URLSearchParams();
  loginUrl.set("error", error);
  if (email) {
    loginUrl.set("email", email);
  }

  return createRelativeRedirect(`/login?${loginUrl.toString()}`);
}

export async function POST(request: Request) {
  if (!isFirebaseServerConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Firebase server belum dikonfigurasi." },
      { status: 503 }
    );
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "NEXT_PUBLIC_FIREBASE_API_KEY belum diisi." },
      { status: 503 }
    );
  }

  const { payload, email, returnTo } = await parseLoginRequest(request);
  if (!payload.success) {
    return createErrorResponse(request, "Email dan password wajib diisi dengan benar.", email);
  }

  try {
    const loginResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: payload.data.email,
          password: payload.data.password,
          returnSecureToken: true
        }),
        cache: "no-store"
      }
    );

    const loginResult = (await loginResponse.json()) as {
      idToken?: string;
      error?: { message?: string };
    };

    if (!loginResponse.ok || !loginResult.idToken) {
      return createErrorResponse(request, mapLoginError(loginResult.error?.message), payload.data.email);
    }

    const auth = getFirebaseAdminAuth();
    const authTime = decodeAuthTime(loginResult.idToken);

    if (Date.now() - authTime > 5 * 60 * 1000) {
      return createErrorResponse(request, "Silakan login ulang untuk membuat session aman.", payload.data.email);
    }

    const expiresIn = 1000 * 60 * 60 * 24 * 5;
    const sessionCookie = await auth.createSessionCookie(loginResult.idToken, { expiresIn });
    const redirectTarget = returnTo.startsWith("/") ? returnTo : "/";
    const response = isJsonRequest(request)
      ? NextResponse.json({ ok: true })
      : createRelativeRedirect(redirectTarget);

    response.cookies.set(sessionCookieName, sessionCookie, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000
    });

    return response;
  } catch (error) {
    return createErrorResponse(
      request,
      error instanceof Error ? error.message : "Login gagal.",
      payload.data.email
    );
  }
}
