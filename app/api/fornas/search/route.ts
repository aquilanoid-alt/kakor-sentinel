import { NextResponse } from "next/server";
import { searchOfficialFornasByInitial, searchOfficialFornasOptions } from "@/lib/server/fornas-official";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const initial = url.searchParams.get("initial")?.trim().toUpperCase() ?? "";

  if (query.length < 2 && !/^[A-Z]$/.test(initial)) {
    return NextResponse.json({ ok: true, items: [] });
  }

  try {
    const items = query.length >= 2 ? await searchOfficialFornasOptions(query) : await searchOfficialFornasByInitial(initial);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Pencarian FORNAS resmi gagal.",
        items: []
      },
      { status: 400 }
    );
  }
}
