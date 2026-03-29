"use client";

import { useMemo, useState } from "react";
import type { SessionUser } from "@/lib/types";

const reportTypes = ["LPLPO", "Distribusi", "Pemakaian", "Stok Akhir"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

export function ReportExportPanel({ user }: { user: SessionUser }) {
  const [selected, setSelected] = useState("LPLPO");
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const [preparedByName, setPreparedByName] = useState(user.name);
  const [preparedByRole, setPreparedByRole] = useState<string>(user.role);
  const [acknowledgedByName, setAcknowledgedByName] = useState("Apoteker Penanggung Jawab");
  const [acknowledgedByRole, setAcknowledgedByRole] = useState("PJ Farmasi");
  const [message, setMessage] = useState(
    "Pilih periode dan format. Export akan memakai transaksi backend terbaru berikut metadata penandatangan."
  );

  const previewText = useMemo(
    () => `${selected} untuk periode ${startDate} s.d. ${endDate}`,
    [endDate, selected, startDate]
  );

  const handleExport = (format: "pdf" | "excel") => {
    if (startDate > endDate) {
      setMessage("Periode tidak valid. Tanggal mulai harus lebih kecil atau sama dengan tanggal akhir.");
      return;
    }

    const params = new URLSearchParams({
      type: selected,
      format,
      startDate,
      endDate,
      facilityName: user.facilityName,
      preparedByName,
      preparedByRole,
      acknowledgedByName,
      acknowledgedByRole
    });

    window.open(`/api/reports/export?${params.toString()}`, "_blank", "noopener,noreferrer");
    setMessage(`${selected} sedang diekspor ke ${format.toUpperCase()} dengan periode dan penandatangan terpilih.`);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <div className="rounded-[32px] border border-line bg-white/5 p-5 shadow-glow">
        <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Laporan otomatis</p>
        <h3 className="mt-2 font-heading text-2xl font-semibold text-white">Export institusional</h3>
        <p className="mt-2 text-sm text-mist/70">
          Mesin laporan mengambil transaksi tervalidasi dari backend, lalu membentuk PDF atau Excel siap kirim.
        </p>

        <div className="mt-6 grid gap-3">
          {reportTypes.map((reportType) => (
            <button
              key={reportType}
              onClick={() => setSelected(reportType)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                selected === reportType
                  ? "border-teal/40 bg-teal/10 text-white"
                  : "border-white/10 bg-black/20 text-mist/70"
              }`}
            >
              {reportType}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Periode mulai</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Periode akhir</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4 rounded-[32px] border border-line bg-white/5 p-5 shadow-glow">
        <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Preview dokumen</p>
          <h4 className="mt-2 font-heading text-2xl font-semibold text-white">{selected}</h4>
          <p className="mt-3 text-sm text-mist/70">{message}</p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-mist/60">Periode</p>
              <p className="mt-2 text-white">{previewText}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-mist/60">Fasilitas</p>
              <p className="mt-2 text-white">{user.facilityName || "Belum diisi"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-mist/60">Sumber data</p>
              <p className="mt-2 text-white">Firestore / backend live</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Disusun oleh</span>
            <input
              value={preparedByName}
              onChange={(event) => setPreparedByName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Jabatan penyusun</span>
            <input
              value={preparedByRole}
              onChange={(event) => setPreparedByRole(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Mengetahui</span>
            <input
              value={acknowledgedByName}
              onChange={(event) => setAcknowledgedByName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Jabatan penandatangan</span>
            <input
              value={acknowledgedByRole}
              onChange={(event) => setAcknowledgedByRole(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => handleExport("pdf")}
            className="rounded-2xl bg-gradient-to-r from-teal to-cyan px-4 py-3 font-semibold text-slate-950 shadow-neon"
          >
            Export PDF
          </button>
          <button
            onClick={() => handleExport("excel")}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-semibold text-white"
          >
            Export Excel
          </button>
        </div>
      </div>
    </div>
  );
}
