"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FornasDrug, ReceiptRecord } from "@/lib/types";

export function ReceiptReviewPanel({
  receipts,
  catalog,
  canVoid
}: {
  receipts: ReceiptRecord[];
  catalog: FornasDrug[];
  canVoid: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("Verifikasi apoteker selesai.");
  const [voidReason, setVoidReason] = useState("");
  const [message, setMessage] = useState("Review discrepancy dan verifikasi penerimaan dilakukan dari panel ini.");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [voidTargetId, setVoidTargetId] = useState<string | null>(null);

  const drugNameById = new Map(catalog.map((drug) => [drug.id, drug.genericName]));

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

  const submitVoid = async (receiptId: string) => {
    if (voidReason.trim().length < 5) {
      setMessage("Alasan pembatalan minimal 5 karakter. Mohon isi dulu.");
      return;
    }

    setBusyId(receiptId);

    try {
      const response = await fetch(`/api/receipts/${receiptId}/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: voidReason })
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || result.ok === false) {
        throw new Error(result.error ?? "Pembatalan penerimaan gagal.");
      }

      setMessage("Penerimaan berhasil dibatalkan dan stok sudah dikoreksi.");
      setVoidTargetId(null);
      setVoidReason("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pembatalan penerimaan gagal.");
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
          receipts.map((receipt) => {
            const isVoided = receipt.workflowStage === "voided";
            const drugName = drugNameById.get(receipt.drugId) ?? receipt.drugId;

            return (
              <div
                key={receipt.id}
                className={`rounded-[24px] border p-4 ${
                  isVoided
                    ? "border-rose-500/30 bg-rose-500/5 opacity-70"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${isVoided ? "text-mist/60 line-through" : "text-white"}`}>
                        {drugName}
                      </p>
                      {isVoided && (
                        <span className="rounded-full bg-rose-500/20 px-3 py-0.5 text-xs font-semibold text-rose-200">
                          DIBATALKAN
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-mist/70">
                      Dokumen {receipt.documentNumber} • Batch {receipt.batch} • Status {receipt.status} • Stage{" "}
                      {receipt.workflowStage ?? "-"}
                    </p>
                    <p className="mt-1 text-sm text-mist/65">
                      Skema {receipt.coverageScheme ?? "Belum ditetapkan"}
                      {typeof receipt.unitPrice === "number"
                        ? ` • Harga satuan Rp${receipt.unitPrice.toLocaleString("id-ID")}`
                        : ""}
                    </p>
                    {isVoided && receipt.voidReason && (
                      <p className="mt-2 text-sm text-rose-200">
                        Alasan: {receipt.voidReason} — oleh {receipt.voidedBy ?? "-"}
                      </p>
                    )}
                  </div>

                  {!isVoided && (
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
                  )}
                </div>

                {!isVoided && canVoid && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    {voidTargetId === receipt.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={voidReason}
                          onChange={(event) => setVoidReason(event.target.value)}
                          placeholder="Alasan pembatalan (wajib, minimal 5 karakter)"
                          className="w-full rounded-xl border border-rose-400/30 bg-black/25 px-3 py-2 text-sm text-white outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            disabled={busyId === receipt.id}
                            onClick={() => void submitVoid(receipt.id)}
                            className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            Konfirmasi Batalkan
                          </button>
                          <button
                            onClick={() => {
                              setVoidTargetId(null);
                              setVoidReason("");
                            }}
                            className="rounded-full bg-white/10 px-4 py-2 text-sm text-mist/80"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setVoidTargetId(receipt.id)}
                        className="text-sm text-rose-300 underline underline-offset-4"
                      >
                        Batalkan transaksi ini
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
