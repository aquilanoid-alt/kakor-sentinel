"use client";

import { useMemo, useState } from "react";
import type { StockBatch } from "@/lib/types";
import { submitOrQueueMutation } from "@/lib/offline";

export function StockOpnameForm({ batches }: { batches: StockBatch[] }) {
  const [batchId, setBatchId] = useState(batches[0]?.id ?? "");
  const [physical, setPhysical] = useState(batches[0]?.quantity ?? 0);
  const [message, setMessage] = useState("Siap mengirim hasil stock opname ke backend.");

  const selected = useMemo(
    () => batches.find((batch) => batch.id === batchId) ?? batches[0],
    [batchId, batches]
  );

  const variance = physical - (selected?.quantity ?? 0);

  const handleSubmit = async () => {
    if (!selected) {
      return;
    }

    const result = await submitOrQueueMutation("stock-opname", "/api/stock-opnames", {
      batchId,
      systemQuantity: selected.quantity,
      physicalQuantity: physical
    });

    setMessage(
      result.queued
        ? `Stock opname masuk antrean offline (${result.reference}).`
        : "Stock opname berhasil tersimpan ke backend."
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[32px] border border-line bg-white/5 p-5 shadow-glow">
        <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Stock opname</p>
        <h3 className="mt-2 font-heading text-2xl font-semibold text-white">Bandingkan fisik vs sistem</h3>
        <p className="mt-2 text-sm text-mist/70">
          Petugas cukup pilih batch, scan QR, lalu input stok fisik. Sistem akan menghitung selisih dan memaksa investigasi bila ada varians.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Batch</span>
            <select
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            >
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batch} - {batch.location}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Stok fisik</span>
            <input
              type="number"
              value={physical}
              onChange={(event) => setPhysical(Number(event.target.value))}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            />
          </label>

          <button
            onClick={() => void handleSubmit()}
            className="w-full rounded-2xl bg-gradient-to-r from-teal via-cyan to-aqua px-4 py-3 font-semibold text-slate-950 shadow-neon"
          >
            Simpan stock opname
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-[32px] border border-line bg-white/5 p-5 shadow-glow">
        <div className="rounded-[28px] border border-cyan/20 bg-cyan/10 p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Sistem FEFO</p>
          <p className="mt-2 font-heading text-2xl font-semibold text-white">{selected?.batch}</p>
          <p className="mt-2 text-mist/70">
            Lokasi {selected?.location} • ED {selected?.expiryDate}
          </p>
          <p className="mt-2 text-mist/70">
            Saldo sistem {selected?.quantity} • Reserved {selected?.reserved}
          </p>
        </div>

        <div
          className={`rounded-[28px] border p-5 ${
            variance === 0 ? "border-teal/20 bg-teal/10" : "border-rose-300/20 bg-rose-500/10"
          }`}
        >
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Hasil perbandingan</p>
          <p className="mt-2 font-heading text-2xl font-semibold text-white">
            {variance === 0 ? "Tidak ada selisih" : `${variance > 0 ? "+" : ""}${variance} unit`}
          </p>
          <p className="mt-2 text-sm text-mist/70">
            {variance === 0
              ? "Stok fisik sesuai sistem. Audit trail otomatis ditutup."
              : "Sistem akan membuat tiket investigasi kehilangan/kelebihan dan mengunci batch sampai diverifikasi."}
          </p>
          <p className="mt-4 text-sm text-aqua">{message}</p>
        </div>
      </div>
    </div>
  );
}
