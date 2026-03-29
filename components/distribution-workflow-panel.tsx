"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DistributionRequest } from "@/lib/types";

export function DistributionWorkflowPanel({ request }: { request: DistributionRequest }) {
  const router = useRouter();
  const [quantityApproved, setQuantityApproved] = useState(request.quantityApproved || request.quantityRequested);
  const [quantityReceived, setQuantityReceived] = useState(
    request.quantityReceived || request.quantityApproved || request.quantityRequested
  );
  const [note, setNote] = useState("Workflow diverifikasi oleh petugas.");
  const [message, setMessage] = useState(
    "Approval akan mengunci alokasi batch FEFO. Pengiriman akan mengurangi stok dari batch yang sudah direservasi."
  );
  const [loading, setLoading] = useState(false);

  const stage = request.workflowStage ?? "submitted";
  const allocationText = useMemo(() => {
    if (!request.allocations?.length) {
      return "Belum ada alokasi batch. Sistem akan memilih FEFO saat approval.";
    }

    return request.allocations
      .map((allocation) => `${allocation.batchCode} (${allocation.quantity}) • ${allocation.location}`)
      .join(" | ");
  }, [request.allocations]);

  const canApprove = stage === "submitted" || stage === "approved";
  const canDispatch = stage === "approved";
  const canReceive = stage === "dispatched";
  const canVariance = stage === "dispatched" || stage === "received" || stage === "variance";

  const submitAction = async (action: "approve" | "dispatch" | "receive" | "variance") => {
    setLoading(true);

    try {
      const response = await fetch(`/api/distributions/${request.id}/workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          quantityApproved,
          quantityReceived,
          note
        })
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || result.ok === false) {
        throw new Error(result.error ?? "Workflow distribusi gagal.");
      }

      setMessage(`Aksi ${action} berhasil disimpan dan jejak distribusi diperbarui.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Workflow distribusi gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-[28px] border border-line bg-white/5 p-5 shadow-glow">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Workflow</p>
        <h3 className="mt-2 font-heading text-2xl font-semibold text-white">Approval multi-step</h3>
        <p className="mt-2 text-sm text-mist/70">{message}</p>
        <p className="mt-2 text-sm text-aqua">Stage saat ini: {stage}</p>
      </div>

      <div className="rounded-[24px] border border-cyan/20 bg-cyan/10 p-4">
        <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Alokasi FEFO</p>
        <p className="mt-2 text-sm text-white">{allocationText}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm text-mist/75">Qty approve</span>
          <input
            type="number"
            min={0}
            value={quantityApproved}
            onChange={(event) => setQuantityApproved(Number(event.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-mist/75">Qty diterima</span>
          <input
            type="number"
            min={0}
            value={quantityReceived}
            onChange={(event) => setQuantityReceived(Number(event.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm text-mist/75">Catatan workflow</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          disabled={loading || !canApprove}
          onClick={() => void submitAction("approve")}
          className="rounded-2xl bg-gradient-to-r from-teal via-cyan to-aqua px-4 py-3 font-semibold text-slate-950 shadow-neon disabled:opacity-40"
        >
          Approve distribusi
        </button>
        <button
          disabled={loading || !canDispatch}
          onClick={() => void submitAction("dispatch")}
          className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-semibold text-white disabled:opacity-40"
        >
          Tandai dikirim
        </button>
        <button
          disabled={loading || !canReceive}
          onClick={() => void submitAction("receive")}
          className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-semibold text-white disabled:opacity-40"
        >
          Tutup penerimaan
        </button>
        <button
          disabled={loading || !canVariance}
          onClick={() => void submitAction("variance")}
          className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 font-semibold text-amber-100 disabled:opacity-40"
        >
          Tandai selisih
        </button>
      </div>
    </div>
  );
}
