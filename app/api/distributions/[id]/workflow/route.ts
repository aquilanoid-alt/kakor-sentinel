import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAllowedRole, getOptionalSessionUser } from "@/lib/server/auth";
import { updateDistributionWorkflow } from "@/lib/server/repository";

export const runtime = "nodejs";

const workflowSchema = z.object({
  action: z.enum(["approve", "dispatch", "receive", "variance"]),
  quantityApproved: z.coerce.number().int().nonnegative().optional(),
  quantityReceived: z.coerce.number().int().nonnegative().optional(),
  note: z.string().trim().min(3)
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const payload = workflowSchema.parse(await request.json());

    if (payload.action === "approve" || payload.action === "dispatch") {
      ensureAllowedRole(session, ["Admin (Apoteker)", "Petugas Farmasi"]);
    } else {
      ensureAllowedRole(session, ["Admin (Apoteker)", "Petugas Farmasi", "Petugas Jaringan", "Petugas Unit"]);
    }

    const result = await updateDistributionWorkflow(id, payload, session);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Workflow distribusi gagal." },
      { status: 400 }
    );
  }
}
