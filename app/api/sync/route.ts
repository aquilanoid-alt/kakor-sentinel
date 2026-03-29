import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import {
  createDispenseRecord,
  createDistributionRequestRecord,
  createReceipt,
  createStockOpnameRecord
} from "@/lib/server/repository";

export const runtime = "nodejs";

const syncSchema = z.object({
  id: z.string().min(4),
  type: z.enum(["dispense", "receipt", "distribution", "stock-opname"]),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string()
});

export async function POST(request: Request) {
  const session = await getOptionalSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Session tidak ditemukan." }, { status: 401 });
  }

  const parsed = syncSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Payload sinkronisasi tidak valid." }, { status: 400 });
  }

  const { type, payload } = parsed.data;

  if (type === "dispense") {
    await createDispenseRecord(
      {
        drugId: String(payload.drugId ?? ""),
        batchCode: String(payload.batchCode ?? payload.scanResult ?? ""),
        cluster: String(payload.cluster ?? "Farmasi") as
          | "Manajemen"
          | "Ibu & Anak"
          | "Dewasa & Lansia"
          | "Penyakit Menular"
          | "UGD"
          | "Lab"
          | "Farmasi"
          | "Rawat Inap",
        quantity: Number(payload.quantity ?? 0),
        unitName: String(payload.unitName ?? "Unit lapangan"),
        mode: "offline"
      },
      session
    );
  }

  if (type === "receipt") {
    await createReceipt(
      {
        documentNumber: String(payload.documentNumber ?? ""),
        drugId: String(payload.drugId ?? ""),
        batch: String(payload.batch ?? ""),
        expiryDate: String(payload.expiryDate ?? ""),
        quantityDocument: Number(payload.quantityDocument ?? 0),
        quantityPhysical: Number(payload.quantityPhysical ?? 0),
        location: String(payload.location ?? "A1-R1-B1")
      },
      session
    );
  }

  if (type === "distribution") {
    await createDistributionRequestRecord(
      {
        requestingUnit: String(payload.requestingUnit ?? ""),
        cluster: String(payload.cluster ?? "Farmasi") as
          | "Manajemen"
          | "Ibu & Anak"
          | "Dewasa & Lansia"
          | "Penyakit Menular"
          | "UGD"
          | "Lab"
          | "Farmasi"
          | "Rawat Inap",
        drugId: String(payload.drugId ?? ""),
        quantityRequested: Number(payload.quantityRequested ?? 0),
        quantityApproved: Number(payload.quantityApproved ?? 0),
        eta: String(payload.eta ?? new Date().toISOString())
      },
      session
    );
  }

  if (type === "stock-opname") {
    await createStockOpnameRecord(
      {
        batchId: String(payload.batchId ?? ""),
        systemQuantity: Number(payload.systemQuantity ?? 0),
        physicalQuantity: Number(payload.physicalQuantity ?? 0)
      },
      session
    );
  }

  return NextResponse.json({
    ok: true,
    syncedAt: new Date().toISOString(),
    receivedType: type,
    reference: parsed.data.id
  });
}
