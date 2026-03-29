import { NextResponse } from "next/server";
import { createGuidePdfBuffer, createGuideText } from "@/lib/server/guide-export";
import { getOptionalSessionUser } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  const { searchParams, origin } = new URL(request.url);
  const format = searchParams.get("format") ?? "pdf";

  if (format === "txt") {
    const text = createGuideText(origin);
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="panduan-kakor-sentinel-supply.txt"'
      }
    });
  }

  const { buffer, filename } = await createGuidePdfBuffer(origin);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
