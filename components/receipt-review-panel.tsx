"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReceiptRecord } from "@/lib/types";

export function ReceiptReviewPanel({ receipts }: { receipts: ReceiptRecord[] }) {
  const router = useRouter();
  const [note, setNote] = useState("Verifikasi apoteker selesai.");
  const [message, setMessage] = useState("Review discrepancy dan verifikasi penerimaan dilakukan dari panel ini.");
  const [busyId, setBusyId] = useState<string | null>(null);

  const submitReview = async (
    receiptId: string,
    stage: "verified" | "discrepancy-review" | "rejected"
  ) => {
    setBusyId(receiptId);

    try {
      const response = await fetch(`/api/receipts/${receiptId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ stage, note })
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || result.ok === false) {
        throw new Error(result.error ?? "Review penerimaan gagal.");
      }

      setMessage(`Review ${stage} berhasil disimpan.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review penerimaan gagal.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 rounded-[32px] border border-line bg-white/5 p-5 shadow-glow">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Review apoteker</p>
        <h3 className="mt-2 font-heading text-2xl font-semibold text-white">Verifikasi penerimaan</h3>
        <p className="mt-2 text-sm text-mist/70">{message}</p>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm text-mist/75">Catatan review</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="min-h-24 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
        />
      </label>

      <div className="space-y-3">
        {receipts.length === 0 ? (
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-mist/75">
            Belum ada penerimaan live dari Firestore. Setelah transaksi pertama tersimpan, daftar review akan muncul di sini.
          </div>
        ) : (
          receipts.map((receipt) => (
            <div key={receipt.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-white">{receipt.documentNumber}</p>
                  <p className="mt-1 text-sm text-mist/70">
                    Batch {receipt.batch} • Status {receipt.status} • Stage {receipt.workflowStage ?? "-"}
                  </p>
                  <p className="mt-1 text-sm text-mist/65">
                    Skema {receipt.coverageScheme ?? "Belum ditetapkan"}
                    {typeof receipt.unitPrice === "number"
                      ? ` • Harga satuan Rp${receipt.unitPrice.toLocaleString("id-ID")}`
                      : ""}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    disabled={busyId === receipt.id}
                    onClick={() => void submitReview(receipt.id, "verified")}
                    className="rounded-full bg-teal/20 px-3 py-2 text-sm text-aqua disabled:opacity-60"
                  >
                    Verify
                  </button>
                  <button
                    disabled={busyId === receipt.id}
                    onClick={() => void submitReview(receipt.id, "discrepancy-review")}
                    className="rounded-full bg-amber-400/10 px-3 py-2 text-sm text-amber-100 disabled:opacity-60"
                  >
                    Review selisih
                  </button>
                  <button
                    disabled={busyId === receipt.id}
                    onClick={() => void submitReview(receipt.id, "rejected")}
                    className="rounded-full bg-rose-500/20 px-3 py-2 text-sm text-rose-100 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
