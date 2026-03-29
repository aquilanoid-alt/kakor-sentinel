"use client";

import { useState } from "react";

export function FornasImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [priceFile, setPriceFile] = useState<File | null>(null);
  const [message, setMessage] = useState(
    "Sinkron otomatis dari e-FORNAS atau unggah CSV/XLSX resmi agar katalog obat FORNAS lengkap A-Z tersedia di Firestore dan siap dipakai saat pencatatan penerimaan."
  );
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [loadingPriceUpload, setLoadingPriceUpload] = useState(false);

  const handleImport = async () => {
    if (!file) {
      setMessage("Pilih file FORNAS terlebih dahulu.");
      return;
    }

    setLoadingUpload(true);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/admin/fornas/import", {
        method: "POST",
        body: formData
      });

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        imported?: number;
        sampleIds?: string[];
      };

      if (!response.ok || result.ok === false) {
        throw new Error(result.error ?? "Import FORNAS gagal.");
      }

      setMessage(
        `Import selesai: ${result.imported} item. Contoh ID: ${(result.sampleIds ?? []).join(", ")}`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import FORNAS gagal.");
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleOfficialSync = async () => {
    setLoadingSync(true);

    try {
      const response = await fetch("/api/admin/fornas/sync", {
        method: "POST"
      });

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        imported?: number;
        purged?: number;
        fetchedDrugs?: number;
        fetchedVariants?: number;
        sampleIds?: string[];
        sourceUrl?: string;
      };

      if (!response.ok || result.ok === false) {
        throw new Error(result.error ?? "Sinkron e-FORNAS gagal.");
      }

      setMessage(
        `Sinkron e-FORNAS selesai: ${result.imported} item aktif dari ${result.fetchedDrugs} obat dan ${result.fetchedVariants} varian. Item lama yang diganti: ${result.purged}. Sumber: ${result.sourceUrl ?? "e-FORNAS"}.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sinkron e-FORNAS gagal.");
    } finally {
      setLoadingSync(false);
    }
  };

  const handlePriceImport = async () => {
    if (!priceFile) {
      setMessage("Pilih file harga JKN terlebih dahulu.");
      return;
    }

    setLoadingPriceUpload(true);

    try {
      const formData = new FormData();
      formData.set("file", priceFile);

      const response = await fetch("/api/admin/fornas/prices", {
        method: "POST",
        body: formData
      });

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        updated?: number;
        unmatched?: string[];
      };

      if (!response.ok || result.ok === false) {
        throw new Error(result.error ?? "Import harga JKN gagal.");
      }

      setMessage(
        `Import harga selesai: ${result.updated} item diperbarui.${
          (result.unmatched ?? []).length > 0 ? ` Tidak cocok: ${(result.unmatched ?? []).slice(0, 5).join(", ")}` : ""
        }`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import harga JKN gagal.");
    } finally {
      setLoadingPriceUpload(false);
    }
  };

  return (
    <div className="space-y-5 rounded-[32px] border border-line bg-white/5 p-6 shadow-glow">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Admin import</p>
        <h2 className="mt-2 font-heading text-3xl font-semibold text-white">Master FORNAS ke Firestore</h2>
        <p className="mt-3 text-sm leading-7 text-mist/75">{message}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-cyan/20 bg-cyan/10 p-5">
          <p className="font-semibold text-white">Sinkron resmi e-FORNAS</p>
          <p className="mt-2 text-sm leading-7 text-mist/75">
            Tombol ini mengambil daftar obat langsung dari situs resmi Kementerian Kesehatan, memetakan varian
            sediaan dan restriksinya, lalu mengganti katalog FORNAS aktif di Firestore. Katalog ini dipakai untuk
            pencarian obat resmi saat penerimaan, distribusi, dan audit.
          </p>
          <button
            disabled={loadingSync || loadingUpload}
            onClick={() => void handleOfficialSync()}
            className="mt-4 rounded-2xl bg-gradient-to-r from-teal via-cyan to-aqua px-5 py-3 font-semibold text-slate-950 shadow-neon disabled:opacity-60"
          >
            {loadingSync ? "Sinkron e-FORNAS..." : "Sinkron dari e-FORNAS"}
          </button>
          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-mist/45">
            Catatan: Klaster ILP diisi default `Farmasi`, sedangkan `isPriority` diinferensikan dari flag resmi
            OEN/Program/Kanker karena API e-FORNAS tidak menyediakan field prioritas literal.
          </p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
          <p className="font-semibold text-white">Kolom minimum file manual</p>
          <p className="mt-2 text-sm text-mist/75">
            `genericName`, `therapeuticClass`, `dosageForm`, `strength`, `restriction`, `facilityLevel`, `cluster`,
            `isPriority`, lalu opsional `coverageScheme`, `referencePrice`, `referencePriceSource`
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="/templates/fornas-template.csv"
              className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            >
              Template FORNAS
            </a>
            <a
              href="/templates/jkn-price-template.csv"
              className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            >
              Template harga JKN
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white"
        />
        <button
          disabled={loadingUpload || loadingSync || loadingPriceUpload}
          onClick={() => void handleImport()}
          className="rounded-2xl bg-gradient-to-r from-teal via-cyan to-aqua px-5 py-3 font-semibold text-slate-950 shadow-neon disabled:opacity-60"
        >
          {loadingUpload ? "Mengimpor..." : "Import file manual"}
        </button>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
        <p className="font-semibold text-white">Master harga JKN / reguler</p>
        <p className="mt-2 text-sm leading-7 text-mist/75">
          Unggah file resmi atau rekap internal yang sudah diturunkan dari regulasi harga klaim, kontrak Dinkes, atau
          e-katalog aktif. Sistem akan mencocokkan obat berdasarkan ID atau kombinasi nama generik, bentuk sediaan,
          dan kekuatan. Import ini bersifat opsional, karena saat penerimaan petugas tetap bisa memilih skema JKN /
          Reguler dan mengisi harga secara manual.
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => setPriceFile(event.target.files?.[0] ?? null)}
            className="block w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white"
          />
          <button
            disabled={loadingUpload || loadingSync || loadingPriceUpload}
            onClick={() => void handlePriceImport()}
            className="rounded-2xl bg-gradient-to-r from-teal via-cyan to-aqua px-5 py-3 font-semibold text-slate-950 shadow-neon disabled:opacity-60"
          >
            {loadingPriceUpload ? "Mengimpor harga..." : "Import harga JKN"}
          </button>
        </div>
        <p className="mt-3 text-xs uppercase tracking-[0.25em] text-mist/45">
          Catatan: master harga hanya untuk referensi audit. Input penerimaan tetap dapat diisi manual sesuai dokumen
          masuk dari Dinkes / IFK.
        </p>
      </div>
    </div>
  );
}
