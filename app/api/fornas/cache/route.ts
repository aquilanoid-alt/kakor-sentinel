import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { importFornasCatalog } from "@/lib/server/repository";
import type { ClusterILP } from "@/lib/types";

export const runtime = "nodejs";

const cacheSchema = z.object({
  id: z.string().trim().min(3),
  genericName: z.string().trim().min(2),
  therapeuticClass: z.string().trim().min(1),
  dosageForm: z.string().trim().min(1),
  strength: z.string().trim().min(1),
  restriction: z.string().trim().default("-"),
  facilityLevel: z.string().trim().min(1),
  cluster: z.array(z.string()).optional(),
  isPriority: z.boolean().optional()
});

export async function POST(request: Request) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    ensureAllowedRole(session, ["Admin (Apoteker)", "Petugas Farmasi"]);
    const payload = cacheSchema.parse(await request.json());

    await importFornasCatalog(
      [
        {
          id: payload.id,
          genericName: payload.genericName,
          therapeuticClass: payload.therapeuticClass,
          dosageForm: payload.dosageForm,
          strength: payload.strength,
          restriction: payload.restriction,
          facilityLevel: payload.facilityLevel,
          cluster: (Array.isArray(payload.cluster) && payload.cluster.length > 0
            ? payload.cluster
            : ["Farmasi"]) as ClusterILP[],
          isPriority: payload.isPriority ?? false
        }
      ],
      session
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Cache FORNAS gagal." },
      { status: 400 }
    );
  }
}
