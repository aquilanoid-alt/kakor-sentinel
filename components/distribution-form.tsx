"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DistributionRequest, FornasDrug } from "@/lib/types";
import { submitOrQueueMutation } from "@/lib/offline";
import { formatDateTime } from "@/lib/utils";

export function DistributionForm({
  catalog,
  requests
}: {
  catalog: FornasDrug[];
  requests: DistributionRequest[];
}) {
  const [requestingUnit, setRequestingUnit] = useState("");
  const [cluster, setCluster] = useState<DistributionRequest["cluster"]>("Penyakit Menular");
  const [drugId, setDrugId] = useState(catalog[0]?.id ?? "");
  const [quantityRequested, setQuantityRequested] = useState(240);
  const [quantityApproved, setQuantityApproved] = useState(0);
  const [eta, setEta] = useState("2026-03-27T12:00");
  const [status, setStatus] = useState("pending");
  const [message, setMessage] = useState(
    "Buat permintaan distribusi dulu. Approval, pengiriman, dan penerimaan ditutup dari halaman detail distribusi."
  );

  const selectedDrug = useMemo(
    () => catalog.find((drug) => drug.id === drugId),
    [catalog, drugId]
  );

  const filtered = requests.filter((item) => item.status === status || status === "all");

  const handleSubmit = async () => {
    const result = await submitOrQueueMutation("distribution", "/api/distributions", {
      requestingUnit,
      cluster,
      drugId,
      quantityRequested,
      quantityApproved,
      eta: new Date(eta).toISOString()
    });

    setMessage(
      result.queued
        ? `Distribusi masuk antrean offline (${result.reference}).`
        : "Permintaan distribusi tersimpan. Lanjutkan approval dari halaman detail distribusi."
    );
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-[32px] border border-line bg-white/5 p-5 shadow-glow">
        <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Distribusi ke jaringan</p>
        <h3 className="mt-2 font-heading text-2xl font-semibold text-white">Permintaan → approval → kirim → terima</h3>
        <p className="mt-2 text-sm text-mist/70">
          QR distribusi dihasilkan saat approval. Unit penerima wajib scan dan input jumlah diterima untuk menutup transaksi.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Unit peminta</span>
            <input
              value={requestingUnit}
              onChange={(event) => setRequestingUnit(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Klaster ILP</span>
            <select
              value={cluster}
              onChange={(event) => setCluster(event.target.value as DistributionRequest["cluster"])}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            >
              <option>Penyakit Menular</option>
              <option>Ibu & Anak</option>
              <option>Dewasa & Lansia</option>
              <option>UGD</option>
              <option>Rawat Inap</option>
              <option>Farmasi</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Obat FORNAS</span>
            <select
              value={drugId}
              onChange={(event) => setDrugId(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            >
              {catalog.map((drug) => (
                <option key={drug.id} value={drug.id}>
                  {drug.genericName} - {drug.strength}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-mist/75">Jumlah minta</span>
              <input
                type="number"
                value={quantityRequested}
                onChange={(event) => setQuantityRequested(Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-mist/75">Rencana approve awal</span>
              <input
                type="number"
                value={quantityApproved}
                onChange={(event) => setQuantityApproved(Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">ETA</span>
            <input
              type="datetime-local"
              value={eta}
              onChange={(event) => setEta(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            />
          </label>

          <div className="rounded-2xl border border-teal/20 bg-teal/10 p-4 text-sm text-mist/75">
            <p className="font-semibold text-white">Auto-check distribusi</p>
            <p className="mt-2">
              {selectedDrug?.genericName} hanya dapat dikirim dari batch FEFO prioritas. QR final aktif setelah approval workflow disimpan.
            </p>
            {quantityApproved > 0 ? (
              <img
                src={`/api/qr?value=${encodeURIComponent(`${requestingUnit}|${drugId}|${quantityApproved}|${eta}`)}`}
                alt="QR distribusi"
                className="mt-4 h-32 w-32 rounded-2xl bg-white p-2"
              />
            ) : (
              <p className="mt-4 text-aqua">QR preview akan muncul setelah ada qty approve awal.</p>
            )}
          </div>

          <button
            onClick={() => void handleSubmit()}
            className="w-full rounded-2xl bg-gradient-to-r from-teal via-cyan to-aqua px-4 py-3 font-semibold text-slate-950 shadow-neon"
          >
            Buat permintaan distribusi
          </button>
          <p className="text-sm text-aqua">{message}</p>
        </div>
      </div>

      <div className="space-y-4 rounded-[32px] border border-line bg-white/5 p-5 shadow-glow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Live queue</p>
            <h3 className="mt-2 font-heading text-2xl font-semibold text-white">Status distribusi</h3>
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-white outline-none"
          >
            <option value="all">Semua status</option>
            <option value="pending">Pending</option>
            <option value="dikirim">Dikirim</option>
            <option value="diterima">Diterima</option>
            <option value="selisih">Selisih</option>
          </select>
        </div>

        <div className="space-y-3">
          {filtered.map((request) => (
            <div key={request.id} className="rounded-[26px] border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-white">{request.requestingUnit || "Belum diisi"}</p>
                  <p className="mt-1 text-sm text-mist/60">
                    {[request.cluster, request.requestedBy].filter(Boolean).join(" • ")}
                  </p>
                  <p className="mt-2 text-sm text-mist/70">
                    Diminta {request.quantityRequested} • Disetujui {request.quantityApproved} • Diterima {request.quantityReceived}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-aqua">
                    {request.status}
                  </span>
                  <p className="mt-3 text-mist/60">{formatDateTime(request.requestedAt)}</p>
                  <Link href={`/distribution/${request.id}`} className="mt-2 inline-block text-aqua underline-offset-4 hover:underline">
                    Lihat jejak distribusi
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
