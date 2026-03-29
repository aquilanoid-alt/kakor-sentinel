import { NextResponse } from "next/server";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { createPdfBuffer, createWorkbookBuffer } from "@/lib/server/reporting";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)", "Petugas Farmasi"]);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const format = searchParams.get("format");
    const filters = {
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      facilityName: searchParams.get("facilityName"),
      preparedByName: searchParams.get("preparedByName"),
      preparedByRole: searchParams.get("preparedByRole"),
      acknowledgedByName: searchParams.get("acknowledgedByName"),
      acknowledgedByRole: searchParams.get("acknowledgedByRole")
    };

    if (format === "excel") {
      const { buffer, filename } = await createWorkbookBuffer(type, session, filters);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    }

    const { buffer, filename } = await createPdfBuffer(type, session, filters);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Export gagal." },
      { status: 400 }
    );
  }
}
