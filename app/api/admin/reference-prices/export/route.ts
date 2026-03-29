import { NextResponse } from "next/server";
import type { ReferencePriceFilters, ReferencePriceSchemeFilter } from "@/lib/reference-price-utils";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import {
  createReferencePricePdfBuffer,
  createReferencePriceWorkbookBuffer
} from "@/lib/server/reference-price-export";

export const runtime = "nodejs";

function normalizeScheme(value: string | null): ReferencePriceSchemeFilter {
  switch (value) {
    case "JKN":
    case "Reguler":
      return value;
    default:
      return "all";
  }
}

function normalizeFilters(request: Request): ReferencePriceFilters {
  const { searchParams } = new URL(request.url);

  return {
    query: searchParams.get("query"),
    scheme: normalizeScheme(searchParams.get("scheme")),
    updatedFrom: searchParams.get("updatedFrom"),
    updatedTo: searchParams.get("updatedTo")
  };
}

export async function GET(request: Request) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)", "Petugas Farmasi"]);
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    const filters = normalizeFilters(request);

    if (format === "excel") {
      const { buffer, filename } = await createReferencePriceWorkbookBuffer(session, filters);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    }

    const { buffer, filename } = await createReferencePricePdfBuffer(session, filters);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Export audit harga gagal." },
      { status: 400 }
    );
  }
}
