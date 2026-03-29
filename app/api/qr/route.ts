import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getOptionalSessionUser } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return new NextResponse("Session tidak ditemukan.", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const value = searchParams.get("value");

  if (!value) {
    return new NextResponse("QR value wajib diisi.", { status: 400 });
  }

  const svg = await QRCode.toString(value, {
    type: "svg",
    color: {
      dark: "#031320",
      light: "#36F7D7"
    },
    margin: 1,
    width: 320
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
