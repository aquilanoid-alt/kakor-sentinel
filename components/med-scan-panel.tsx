"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FornasDrug, StockBatch } from "@/lib/types";
import { submitOrQueueMutation } from "@/lib/offline";
import { resolveMedicationScan } from "@/lib/scan-utils";

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): {
        detect(input: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>;
      };
    };
  }
}

export function MedScanPanel({
  catalog,
  stockBatches,
  unitName
}: {
  catalog: FornasDrug[];
  stockBatches: StockBatch[];
  unitName: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanResult, setScanResult] = useState("");
  const [drugId, setDrugId] = useState(catalog[0]?.id ?? "");
  const [quantity, setQuantity] = useState(10);
  const [cluster, setCluster] = useState("UGD");
  const [message, setMessage] = useState("Kamera siap. Arahkan ke QR batch atau QR distribusi.");
  const scanResolution = useMemo(
    () => resolveMedicationScan(scanResult, stockBatches),
    [scanResult, stockBatches]
  );

  useEffect(() => {
    let detectorTimer: number | undefined;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (window.BarcodeDetector && videoRef.current) {
          const detector = new window.BarcodeDetector({
            formats: ["qr_code", "ean_13", "ean_8", "code_128", "upc_a", "upc_e"]
          });
          detectorTimer = window.setInterval(async () => {
            if (!videoRef.current) {
              return;
            }

            try {
              const codes = await detector.detect(videoRef.current);
              const firstCode = codes[0]?.rawValue;
              if (firstCode) {
                setScanResult(firstCode);
                setMessage(`QR terdeteksi: ${firstCode}`);
              }
            } catch {
              setMessage("QR belum terbaca. Arahkan ulang kamera atau gunakan input manual.");
            }
          }, 1500);
        } else {
          setMessage("Kamera aktif. Browser belum mendukung QR native, gunakan input manual bila perlu.");
        }
      } catch {
        setMessage("Kamera tidak tersedia. Gunakan mode simulasi scan untuk tetap mencatat transaksi.");
      }
    };

    void startCamera();

    return () => {
      if (detectorTimer) {
        window.clearInterval(detectorTimer);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!scanResolution.normalized) {
      return;
    }

    if (scanResolution.drugId && scanResolution.drugId !== drugId) {
      setDrugId(scanResolution.drugId);
    }

    if (scanResolution.kind === "stock-batch") {
      setMessage(
        `Batch dikenali: ${scanResolution.batch} • ED ${scanResolution.expiryDate ?? "-"}${scanResolution.location ? ` • ${scanResolution.location}` : ""}`
      );
      return;
    }

    if (scanResolution.kind === "distribution") {
      setMessage("QR distribusi dikenali. Obat akan dipilih otomatis bila referensi batch tersedia.");
      return;
    }

    if (scanResolution.kind === "gs1") {
      setMessage(
        scanResolution.expiryDate || scanResolution.batch
          ? "Barcode pabrikan dikenali. Batch dan/atau ED sudah dibaca, lalu Anda bisa melengkapi obat bila belum terpetakan."
          : "Barcode pabrikan terbaca, tetapi metadata batch/ED belum tersedia di kode."
      );
      return;
    }

    setMessage("Kode terbaca. Jika obat belum dikenali otomatis, pilih dari daftar FORNAS dan lanjutkan manual.");
  }, [drugId, scanResolution]);

  const selectedDrug = catalog.find((drug) => drug.id === drugId) ?? catalog[0];

  const handleSubmit = async () => {
    if (!selectedDrug) {
      setMessage("Obat belum dipilih.");
      return;
    }

    try {
      const result = await submitOrQueueMutation("dispense", "/api/dispense", {
        drugId: selectedDrug.id,
        batchCode: scanResult,
        cluster,
        quantity,
        unitName
      });

      setMessage(
        result.queued
          ? `Offline tersimpan. Ref lokal ${result.reference}. Akan disinkronkan otomatis.`
          : "Transaksi berhasil tersimpan ke backend."
      );
    } catch {
      setMessage("Penyimpanan lokal belum tersedia di perangkat ini. Coba gunakan browser modern atau koneksi online.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="overflow-hidden rounded-[32px] border border-cyan/20 bg-black/30 shadow-glow">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">No Scan = No Transaction</p>
          <h3 className="mt-2 font-heading text-2xl font-semibold text-white">Scan obat / distribusi</h3>
        </div>
        <div className="relative aspect-[4/5] bg-[radial-gradient(circle_at_top,rgba(54,247,215,0.16),transparent_32%),linear-gradient(180deg,rgba(7,17,30,1),rgba(5,8,18,1))]">
          <video ref={videoRef} className="h-full w-full object-cover opacity-70" muted playsInline />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-56 w-56 rounded-[36px] border border-dashed border-aqua/60 shadow-neon" />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-[32px] border border-line bg-white/5 p-5 shadow-glow backdrop-blur">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Input cepat</p>
          <h3 className="mt-2 font-heading text-2xl font-semibold text-white">Scan → input → submit</h3>
          <p className="mt-2 text-sm text-mist/70">{message}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-mist/75">
          <p className="font-semibold text-white">Smart scan</p>
          <p className="mt-2">
            QR internal sistem bisa mengisi obat, batch, dan ED otomatis. Barcode pabrikan tipe GS1 biasanya bisa menarik batch dan ED bila memang dikodekan.
          </p>
          <p className="mt-2 text-aqua">Jika barcode hanya berisi kode produk biasa, Anda tetap bisa lanjut pilih obat dan isi manual.</p>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm text-mist/75">QR / Barcode / Batch</span>
          <input
            value={scanResult}
            onChange={(event) => setScanResult(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-cyan/40"
            placeholder="Scan dengan kamera atau isi manual"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-mist/75">Obat FORNAS</span>
          <select
            value={drugId}
            onChange={(event) => setDrugId(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-cyan/40"
          >
            {catalog.map((drug) => (
              <option key={drug.id} value={drug.id}>
                {drug.genericName} - {drug.strength}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl border border-teal/20 bg-teal/10 p-4 text-sm">
          <p className="font-semibold text-white">{selectedDrug?.genericName}</p>
          <p className="mt-1 text-mist/70">
            {selectedDrug?.dosageForm} {selectedDrug?.strength} • {selectedDrug?.therapeuticClass}
          </p>
          <p className="mt-2 text-mist/70">
            Skema {selectedDrug?.coverageScheme ?? "Belum ditetapkan"}
            {typeof selectedDrug?.referencePrice === "number"
              ? ` • Harga referensi Rp${selectedDrug.referencePrice.toLocaleString("id-ID")}`
              : ""}
          </p>
          <p className="mt-2 text-aqua">{selectedDrug?.restriction}</p>
          {scanResolution.batch ? (
            <p className="mt-3 text-mist/70">
              Batch {scanResolution.batch}
              {scanResolution.expiryDate ? ` • ED ${scanResolution.expiryDate}` : ""}
              {scanResolution.location ? ` • ${scanResolution.location}` : ""}
            </p>
          ) : null}
          {scanResolution.gtin ? <p className="mt-2 text-mist/60">GTIN {scanResolution.gtin}</p> : null}
        </div>

        <label className="block">
          <span className="mb-2 block text-sm text-mist/75">Klaster ILP</span>
          <select
            value={cluster}
            onChange={(event) => setCluster(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-cyan/40"
          >
            <option>Manajemen</option>
            <option>Ibu & Anak</option>
            <option>Dewasa & Lansia</option>
            <option>Penyakit Menular</option>
            <option>UGD</option>
            <option>Lab</option>
            <option>Farmasi</option>
            <option>Rawat Inap</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-mist/75">Jumlah</span>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-cyan/40"
          />
        </label>

        <button
          onClick={() => void handleSubmit()}
          className="w-full rounded-2xl bg-gradient-to-r from-teal via-cyan to-aqua px-4 py-3 font-semibold text-slate-950 shadow-neon transition hover:scale-[1.01]"
        >
          Submit transaksi
        </button>
      </div>
    </div>
  );
}
