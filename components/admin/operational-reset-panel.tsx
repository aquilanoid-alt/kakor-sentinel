"use client";

import { useState } from "react";

type ResetResult = {
  deleted: Record<string, number>;
  preserved: string[];
  totalDeleted: number;
};

const RESET_PHRASE = "HAPUS DATA OBAT";

const COLLECTION_LABELS: Record<string, string> = {
  stock_batches: "Stok batch",
  receipts: "Penerimaan",
  distribution_requests: "Distribusi",
  dispense_transactions: "Pengambilan/scan",
  stock_opnames: "Stock opname",
  alerts: "Alert",
  audit_events: "Audit lama",
  dashboard_summary: "Snapshot dashboard"
};

export function OperationalResetPanel() {
  const [confirmation, setConfirmation] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [result, setResult] = useState<ResetResult | null>(null);
  const [message, setMessage] = useState(
    "Gunakan hanya saat ingin membersihkan data uji/input lama sebelum pilot resmi. Master FORNAS dan sumber obat tidak dihapus."
  );

  const canReset = confirmation.trim() === RESET_PHRASE;

  const handleReset = async () => {
    setIsResetting(true);
    setResult(null);
    setMessage("Menghapus data operasional obat...");

    try {
      const response = await fetch("/api/admin/operational-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ confirmation: confirmation.trim() })
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        result?: ResetResult;
      };

      if (!response.ok || payload.ok === false || !payload.result) {
        throw new Error(payload.error ?? "Reset data operasional gagal.");
      }

      setResult(payload.result);
      setConfirmation("");
      setMessage(
        `Reset selesai. ${payload.result.totalDeleted} dokumen operasional dihapus, master sumber obat tetap dipertahankan.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reset data operasional gagal.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="surface-card rounded-[30px] border-rose-300/25 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-rose-200">Reset data operasional</p>
          <h2 className="mt-2 font-heading text-3xl font-semibold text-white">Bersihkan input stok dan transaksi</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/75">
            Fitur ini menghapus data obat yang sudah pernah diinput selama uji coba: stok batch, penerimaan, distribusi,
            pengambilan/scan, stock opname, alert, audit lama, dan snapshot dashboard. Master FORNAS/sumber obat, harga
            referensi, user, panduan, dan konfigurasi Go-Live tetap disimpan.
          </p>
        </div>
        <span className="w-fit rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-100">
          irreversible
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border border-rose-300/20 bg-rose-500/10 p-4">
          <p className="font-semibold text-white">Akan dihapus</p>
          <p className="mt-2 text-sm leading-7 text-mist/75">
            Stok batch, penerimaan, distribusi, scan/pengambilan, stock opname, alert, audit lama, dan dashboard ringkas.
          </p>
        </div>
        <div className="rounded-[24px] border border-teal/20 bg-teal/10 p-4">
          <p className="font-semibold text-white">Tetap aman</p>
          <p className="mt-2 text-sm leading-7 text-mist/75">
            Master FORNAS/sumber obat, harga referensi, akun user, panduan, serta identitas Go-Live.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="block">
          <span className="mb-2 block text-sm text-mist/75">
            Ketik <span className="font-semibold text-rose-100">{RESET_PHRASE}</span> untuk konfirmasi
          </span>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
            placeholder={RESET_PHRASE}
          />
        </label>
        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={!canReset || isResetting}
          className="rounded-2xl border border-rose-300/25 bg-rose-500/15 px-5 py-3 text-sm font-semibold text-rose-100 shadow-[0_16px_40px_rgba(244,63,94,0.14)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isResetting ? "Menghapus..." : "Hapus data input obat"}
        </button>
      </div>

      <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm text-mist/75">
        {message}
      </div>

      {result ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(result.deleted).map(([collection, count]) => (
            <div key={collection} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-mist/45">
                {COLLECTION_LABELS[collection] ?? collection}
              </p>
              <p className="mt-2 font-heading text-2xl font-semibold text-white">{count}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
