"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { FornasDrug, StockBatch } from "@/lib/types";
import { submitOrQueueMutation } from "@/lib/offline";
import { resolveMedicationScan } from "@/lib/scan-utils";
import { cn } from "@/lib/utils";

const ALPHABET_INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const COMMON_TOP_PICK_TERMS = [
  "parasetamol",
  "amoksisilin",
  "asam mefenamat",
  "metformin",
  "amlodipin",
  "salbutamol",
  "vitamin b",
  "oralit"
];

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): {
        detect(input: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>;
      };
    };
  }
}

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return "Belum diisi";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function buildDrugOptionLabel(drug: FornasDrug) {
  return `${drug.genericName} - ${drug.dosageForm} ${drug.strength}`.replace(/\s+/g, " ").trim();
}

function getDrugInitial(drug: FornasDrug) {
  const value = drug.genericName.trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(value) ? value : "#";
}

function formatDrugMetaBadge(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function ReceiveForm({
  catalog,
  stockBatches,
  facilityKey
}: {
  catalog: FornasDrug[];
  stockBatches: StockBatch[];
  facilityKey: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const drugSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [captureMode, setCaptureMode] = useState<"scan" | "manual">("scan");
  const [scanInput, setScanInput] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [drugId, setDrugId] = useState("");
  const [drugQuery, setDrugQuery] = useState("");
  const [isDrugPaletteOpen, setIsDrugPaletteOpen] = useState(false);
  const [isPaletteMounted, setIsPaletteMounted] = useState(false);
  const [recentDrugIds, setRecentDrugIds] = useState<string[]>([]);
  const [favoriteDrugIds, setFavoriteDrugIds] = useState<string[]>([]);
  const [activeInitial, setActiveInitial] = useState("");
  const [officialSearchResults, setOfficialSearchResults] = useState<FornasDrug[]>([]);
  const [isOfficialSearchLoading, setIsOfficialSearchLoading] = useState(false);
  const [officialSearchError, setOfficialSearchError] = useState("");
  const [officialInitialResults, setOfficialInitialResults] = useState<FornasDrug[]>([]);
  const [isOfficialInitialLoading, setIsOfficialInitialLoading] = useState(false);
  const [officialInitialError, setOfficialInitialError] = useState("");
  const [selectedDrugSnapshot, setSelectedDrugSnapshot] = useState<FornasDrug | null>(null);
  const [batch, setBatch] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [coverageScheme, setCoverageScheme] = useState<"" | "JKN" | "Reguler">("");
  const [unitPrice, setUnitPrice] = useState("");
  const [priceSource, setPriceSource] = useState("");
  const [physicalQty, setPhysicalQty] = useState(0);
  const [documentQty, setDocumentQty] = useState(0);
  const [message, setMessage] = useState("Siap menerima scan barcode/QR atau input manual penuh.");
  const deferredDrugQuery = useDeferredValue(drugQuery);
  const scanResolution = useMemo(
    () => resolveMedicationScan(scanInput, stockBatches),
    [scanInput, stockBatches]
  );
  const knownDrugPool = useMemo(
    () =>
      Array.from(
        new Map(
          [...catalog, ...officialSearchResults, ...officialInitialResults, ...(selectedDrugSnapshot ? [selectedDrugSnapshot] : [])].map(
            (drug) => [drug.id, drug]
          )
        ).values()
      ),
    [catalog, officialInitialResults, officialSearchResults, selectedDrugSnapshot]
  );

  const selectedDrug = useMemo(
    () => knownDrugPool.find((drug) => drug.id === drugId) ?? selectedDrugSnapshot,
    [drugId, knownDrugPool, selectedDrugSnapshot]
  );
  const selectedDrugLabel = selectedDrug ? buildDrugOptionLabel(selectedDrug) : "";
  const favoriteStorageKey = useMemo(
    () => `kss-favorite-drugs:${facilityKey.trim() || "default-facility"}`,
    [facilityKey]
  );
  const favoriteDrugs = useMemo(
    () =>
      favoriteDrugIds
        .map((id) => knownDrugPool.find((drug) => drug.id === id) ?? null)
        .filter((drug): drug is FornasDrug => Boolean(drug)),
    [favoriteDrugIds, knownDrugPool]
  );
  const recentDrugs = useMemo(
    () =>
      recentDrugIds
        .map((id) => knownDrugPool.find((drug) => drug.id === id) ?? null)
        .filter((drug): drug is FornasDrug => Boolean(drug)),
    [knownDrugPool, recentDrugIds]
  );
  const fallbackTopPickDrugs = useMemo(
    () =>
      Array.from(
        new Map(
          COMMON_TOP_PICK_TERMS.flatMap((term) => {
            const found = knownDrugPool.find((drug) =>
              `${drug.genericName} ${drug.dosageForm} ${drug.strength}`.toLowerCase().includes(term)
            );
            return found ? [[found.id, found] as const] : [];
          })
        ).values()
      ).slice(0, 8),
    [knownDrugPool]
  );
  const topPickDrugs = useMemo(
    () =>
      Array.from(
        new Map(
          [...favoriteDrugs, ...recentDrugs, ...fallbackTopPickDrugs, ...officialInitialResults.slice(0, 4)].map((drug) => [drug.id, drug])
        ).values()
      ).slice(0, 8),
    [favoriteDrugs, fallbackTopPickDrugs, officialInitialResults, recentDrugs]
  );
  const availableInitials = useMemo(() => ALPHABET_INITIALS, []);
  const localFilteredCatalog = useMemo(() => {
    const query = deferredDrugQuery.trim().toLowerCase();

    if (!query) {
      const initial = activeInitial || availableInitials[0] || "";
      return knownDrugPool.filter((drug) => getDrugInitial(drug) === initial).slice(0, 36);
    }

    const terms = query.split(/\s+/).filter(Boolean);
    return knownDrugPool
      .filter((drug) => {
        const haystack = `${drug.genericName} ${drug.dosageForm} ${drug.strength} ${drug.therapeuticClass}`.toLowerCase();
        return terms.every((term) => haystack.includes(term));
      })
      .slice(0, 40);
  }, [activeInitial, availableInitials, deferredDrugQuery, knownDrugPool]);
  const usesOfficialSearch = deferredDrugQuery.trim().length >= 2;
  const searchResults = useMemo(() => {
    if (usesOfficialSearch) {
      return officialSearchResults;
    }

    return Array.from(new Map([...officialInitialResults, ...localFilteredCatalog].map((drug) => [drug.id, drug])).values());
  }, [localFilteredCatalog, officialInitialResults, officialSearchResults, usesOfficialSearch]);
  const groupedFilteredCatalog = useMemo(() => {
    return searchResults.reduce<Array<{ initial: string; items: FornasDrug[] }>>((groups, drug) => {
      const initial = getDrugInitial(drug);
      const currentGroup = groups[groups.length - 1];

      if (currentGroup?.initial === initial) {
        currentGroup.items.push(drug);
        return groups;
      }

      groups.push({ initial, items: [drug] });
      return groups;
    }, []);
  }, [searchResults]);
  const parsedUnitPrice =
    unitPrice.trim().length > 0 && Number.isFinite(Number(unitPrice)) ? Number(unitPrice) : null;

  const discrepancy = physicalQty !== documentQty;

  const openDrugPalette = () => {
    const nextInitial = selectedDrug ? getDrugInitial(selectedDrug) : activeInitial || availableInitials[0] || "A";
    setActiveInitial(nextInitial);
    if (drugQuery.trim() === selectedDrugLabel.trim()) {
      setDrugQuery("");
    }
    setIsPaletteMounted(true);
    setIsDrugPaletteOpen(true);
  };

  const closeDrugPalette = () => {
    setIsDrugPaletteOpen(false);
    window.setTimeout(() => setIsPaletteMounted(false), 240);
  };

  const cachePickedDrug = async (drug: FornasDrug) => {
    if (catalog.some((item) => item.id === drug.id)) {
      return;
    }

    try {
      await fetch("/api/fornas/cache", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: drug.id,
          genericName: drug.genericName,
          therapeuticClass: drug.therapeuticClass,
          dosageForm: drug.dosageForm,
          strength: drug.strength,
          restriction: drug.restriction,
          facilityLevel: drug.facilityLevel,
          isPriority: drug.isPriority
        })
      });
    } catch {
      // Abaikan jika cache lokal Firestore gagal, pilihan tetap dipakai di form aktif.
    }
  };

  const toggleFavoriteDrug = (drugIdToToggle: string) => {
    setFavoriteDrugIds((current) =>
      current.includes(drugIdToToggle)
        ? current.filter((item) => item !== drugIdToToggle)
        : [drugIdToToggle, ...current].slice(0, 12)
    );
  };

  const handlePickDrug = (drug: FornasDrug) => {
    setDrugId(drug.id);
    setSelectedDrugSnapshot(drug);
    setDrugQuery(buildDrugOptionLabel(drug));
    setRecentDrugIds((current) => [drug.id, ...current.filter((item) => item !== drug.id)].slice(0, 6));
    setActiveInitial(getDrugInitial(drug));
    closeDrugPalette();
    setMessage(`Obat FORNAS dipilih: ${buildDrugOptionLabel(drug)}.`);
    void cachePickedDrug(drug);
  };

  const clearDrugSelection = () => {
    setDrugId("");
    setSelectedDrugSnapshot(null);
    setDrugQuery("");
    setMessage("Pilihan obat dibersihkan. Cari lagi dari daftar FORNAS resmi.");
  };

  useEffect(() => {
    if (!activeInitial && availableInitials.length > 0) {
      setActiveInitial(availableInitials[0]);
    }
  }, [activeInitial, availableInitials]);

  useEffect(() => {
    if (!isDrugPaletteOpen || usesOfficialSearch || !activeInitial) {
      return;
    }

    const controller = new AbortController();
    setIsOfficialInitialLoading(true);
    setOfficialInitialError("");

    const loadInitialResults = async () => {
      try {
        const response = await fetch(`/api/fornas/search?initial=${encodeURIComponent(activeInitial)}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const result = (await response.json()) as {
          ok?: boolean;
          error?: string;
          items?: FornasDrug[];
        };

        if (!response.ok || result.ok === false) {
          throw new Error(result.error ?? "Daftar huruf FORNAS gagal dimuat.");
        }

        setOfficialInitialResults(result.items ?? []);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setOfficialInitialResults([]);
        setOfficialInitialError(error instanceof Error ? error.message : "Daftar huruf FORNAS gagal dimuat.");
      } finally {
        if (!controller.signal.aborted) {
          setIsOfficialInitialLoading(false);
        }
      }
    };

    void loadInitialResults();

    return () => {
      controller.abort();
    };
  }, [activeInitial, isDrugPaletteOpen, usesOfficialSearch]);

  useEffect(() => {
    const query = deferredDrugQuery.trim();
    if (query.length < 2) {
      setOfficialSearchResults([]);
      setOfficialSearchError("");
      setIsOfficialSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsOfficialSearchLoading(true);
    setOfficialSearchError("");

    const loadOfficialResults = async () => {
      try {
        const response = await fetch(`/api/fornas/search?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const result = (await response.json()) as {
          ok?: boolean;
          error?: string;
          items?: FornasDrug[];
        };

        if (!response.ok || result.ok === false) {
          throw new Error(result.error ?? "Pencarian FORNAS resmi gagal.");
        }

        setOfficialSearchResults(result.items ?? []);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setOfficialSearchResults([]);
        setOfficialSearchError(error instanceof Error ? error.message : "Pencarian FORNAS resmi gagal.");
      } finally {
        if (!controller.signal.aborted) {
          setIsOfficialSearchLoading(false);
        }
      }
    };

    void loadOfficialResults();

    return () => {
      controller.abort();
    };
  }, [deferredDrugQuery]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(favoriteStorageKey);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed)) {
        setFavoriteDrugIds(
          parsed.filter((value): value is string => typeof value === "string").slice(0, 12)
        );
      }
    } catch {
      setFavoriteDrugIds([]);
    }
  }, [favoriteStorageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(favoriteStorageKey, JSON.stringify(favoriteDrugIds));
    } catch {
      // Abaikan jika localStorage dibatasi browser.
    }
  }, [favoriteDrugIds, favoriteStorageKey]);

  useEffect(() => {
    if (captureMode !== "scan") {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      return;
    }

    let detectorTimer: number | undefined;
    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

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
                setScanInput(firstCode);
                setMessage(`Kode penerimaan terdeteksi: ${firstCode}`);
              }
            } catch {
              setMessage("Kamera aktif, tetapi kode belum terbaca. Arahkan ulang atau isi manual.");
            }
          }, 1500);
        } else {
          setMessage("Kamera aktif. Jika browser belum mendukung scan native, tempel hasil scanner ke kolom scan.");
        }
      } catch {
        setMessage("Kamera tidak tersedia. Gunakan scanner eksternal atau input manual di menu penerimaan.");
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (detectorTimer) {
        window.clearInterval(detectorTimer);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [captureMode]);

  useEffect(() => {
    if (!isDrugPaletteOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      drugSearchInputRef.current?.focus();
      drugSearchInputRef.current?.select();
    }, 80);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrugPalette();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isDrugPaletteOpen]);

  const applyScannedData = () => {
    if (!scanResolution.normalized) {
      setMessage("Belum ada hasil scan yang bisa dipakai.");
      return;
    }

    if (scanResolution.drugId) {
      const matchedDrug = catalog.find((drug) => drug.id === scanResolution.drugId);
      if (matchedDrug) {
        handlePickDrug(matchedDrug);
      } else {
        setDrugId(scanResolution.drugId);
      }
    }

    if (scanResolution.batch) {
      setBatch(scanResolution.batch);
    }

    if (scanResolution.expiryDate) {
      setExpiryDate(scanResolution.expiryDate);
    }

    if (scanResolution.sourceDocument && !documentNumber) {
      setDocumentNumber(scanResolution.sourceDocument);
    }

    if (scanResolution.kind === "stock-batch") {
      setMessage("QR batch internal dikenali. Nama obat, batch, dan ED sudah diisi otomatis.");
      return;
    }

    if (scanResolution.kind === "gs1") {
      setMessage(
        scanResolution.expiryDate || scanResolution.batch
          ? "Barcode pabrikan terbaca. Batch dan/atau ED sudah diisi. Pilih obat jika nama belum terpetakan."
          : "Barcode terbaca, tetapi metadata lengkap belum tersedia. Lanjutkan isi manual."
      );
      return;
    }

    setMessage("Kode diterima. Lengkapi manual bila ada bagian yang belum terisi.");
  };

  const handleSubmit = async () => {
    if (!drugId || !selectedDrug) {
      setMessage("Pilih obat dari daftar FORNAS resmi terlebih dahulu.");
      return;
    }

    if (!coverageScheme) {
      setMessage("Pilih skema JKN atau Reguler secara manual sebelum menyimpan penerimaan.");
      return;
    }

    const result = await submitOrQueueMutation("receipt", "/api/receipts", {
      documentNumber,
      drugId,
      batch,
      expiryDate,
      coverageScheme,
      quantityDocument: documentQty,
      quantityPhysical: physicalQty,
      unitPrice: parsedUnitPrice ?? undefined,
      priceSource,
      location: "A1-R2-B3"
    });

    setMessage(
      result.queued
        ? `Penerimaan masuk antrean offline (${result.reference}).`
        : "Penerimaan tersimpan ke backend dan siap diaudit."
    );
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[32px] border border-line bg-white/5 p-5 shadow-glow">
        <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Penerimaan dari Dinkes</p>
        <h3 className="mt-2 font-heading text-2xl font-semibold text-white">Validasi fisik vs dokumen</h3>
        <p className="mt-2 text-sm text-mist/70">
          QR batch otomatis dihasilkan setelah data cocok. Jika tidak cocok, status langsung ditandai sebagai discrepancy.
        </p>
        <div className="mt-4 rounded-[24px] border border-teal/20 bg-teal/10 p-4 text-sm text-mist/75">
          <p className="font-semibold text-white">Kapan pakai menu ini?</p>
          <p className="mt-2">
            Jika obat masuk dari Dinkes/IFK ke Puskesmas, gunakan <span className="font-semibold text-aqua">menu Penerimaan</span>.
            Menu <span className="font-semibold text-aqua">Scan</span> dipakai untuk transaksi lapangan cepat seperti pengambilan obat
            atau verifikasi batch/distribusi, bukan untuk pencatatan penerimaan gudang utama.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setCaptureMode("scan")}
              className={`rounded-full border px-4 py-2 text-sm ${
                captureMode === "scan"
                  ? "border-teal/50 bg-teal/20 text-aqua"
                  : "border-white/10 bg-white/5 text-mist/70"
              }`}
            >
              Scan barcode / QR
            </button>
            <button
              type="button"
              onClick={() => setCaptureMode("manual")}
              className={`rounded-full border px-4 py-2 text-sm ${
                captureMode === "manual"
                  ? "border-teal/50 bg-teal/20 text-aqua"
                  : "border-white/10 bg-white/5 text-mist/70"
              }`}
            >
              Input manual
            </button>
          </div>

          <div className="rounded-[28px] border border-cyan/20 bg-cyan/10 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Smart capture</p>
            <p className="mt-2 text-sm text-mist/75">
              QR internal sistem bisa mengisi obat, batch, dan ED otomatis. Barcode pabrikan GS1 biasanya bisa menarik batch dan ED bila memang tersimpan di barcode.
            </p>
            <p className="mt-2 text-sm text-aqua">Jika barcode biasa hanya berisi kode produk, nama obat tetap dipilih dari daftar FORNAS resmi dan sisanya diisi manual.</p>
          </div>

          {captureMode === "scan" ? (
            <div className="space-y-4 rounded-[28px] border border-white/10 bg-black/20 p-5">
              <div className="overflow-hidden rounded-[24px] border border-cyan/20 bg-black/25">
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-aqua/75">Kamera penerimaan</p>
                </div>
                <div className="relative aspect-[16/10] bg-[radial-gradient(circle_at_top,rgba(54,247,215,0.16),transparent_34%),linear-gradient(180deg,rgba(7,17,30,1),rgba(5,8,18,1))]">
                  <video ref={videoRef} className="h-full w-full object-cover opacity-75" muted playsInline />
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="h-36 w-56 rounded-[28px] border border-dashed border-aqua/60 shadow-neon" />
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm text-mist/75">Hasil scan barcode / QR</span>
                <input
                  value={scanInput}
                  onChange={(event) => setScanInput(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
                  placeholder="Tempel hasil scan scanner atau ketik kode manual"
                />
              </label>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-mist/75">
                <p className="font-semibold text-white">
                  {scanResolution.kind === "stock-batch"
                    ? "QR batch dikenali"
                    : scanResolution.kind === "gs1"
                      ? "Barcode GS1 dikenali"
                      : scanResolution.kind === "distribution"
                        ? "QR distribusi dikenali"
                        : scanResolution.normalized
                          ? "Kode terbaca"
                          : "Menunggu scan"}
                </p>
                {scanResolution.batch ? <p className="mt-2">Batch: {scanResolution.batch}</p> : null}
                {scanResolution.expiryDate ? <p className="mt-1">ED: {scanResolution.expiryDate}</p> : null}
                {scanResolution.gtin ? <p className="mt-1">GTIN: {scanResolution.gtin}</p> : null}
                {scanResolution.location ? <p className="mt-1">Lokasi: {scanResolution.location}</p> : null}
              </div>

              <button
                type="button"
                onClick={applyScannedData}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
              >
                Isi otomatis dari hasil scan
              </button>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Nomor DO / Faktur</span>
            <input
              value={documentNumber}
              onChange={(event) => setDocumentNumber(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            />
          </label>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Master FORNAS A-Z</p>
                <p className="mt-2 text-sm text-mist/75">
                  Untuk HP, pencarian obat dibuka lewat panel cepat seperti command palette. Ketuk tombol cari, lalu pilih item dari daftar resmi.
                </p>
              </div>
              {selectedDrug ? (
                <button
                  type="button"
                  onClick={clearDrugSelection}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-mist/75"
                >
                  Hapus
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={openDrugPalette}
              className="mt-4 flex w-full items-center justify-between rounded-[24px] border border-cyan/20 bg-cyan/10 px-4 py-4 text-left transition hover:border-cyan/35 hover:bg-cyan/15"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-aqua/75">Cari obat FORNAS</p>
                <p className="mt-2 text-base font-semibold text-white">
                  {selectedDrug ? selectedDrug.genericName : "Ketuk untuk mencari obat"}
                </p>
                <p className="mt-1 text-sm text-mist/70">
                  {selectedDrug
                    ? `${selectedDrug.dosageForm} ${selectedDrug.strength}`
                    : "Masukkan nama obat, bentuk sediaan, kekuatan, atau pilih huruf awal"}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white">
                Buka
              </span>
            </button>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">
                {selectedDrug ? selectedDrug.genericName : "Belum ada obat yang dipilih"}
              </p>
              <p className="mt-2 text-sm text-mist/70">
                {selectedDrug
                  ? `${selectedDrug.dosageForm} ${selectedDrug.strength} • ${selectedDrug.therapeuticClass}`
                  : "Pilih satu item dari hasil pencarian FORNAS supaya identitas obat tersimpan resmi."}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {selectedDrug ? <p className="text-sm text-aqua">{selectedDrug.facilityLevel}</p> : null}
                {selectedDrug ? (
                  <button
                    type="button"
                    onClick={() => toggleFavoriteDrug(selectedDrug.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      favoriteDrugIds.includes(selectedDrug.id)
                        ? "border-amber-300/30 bg-amber-400/15 text-amber-100"
                        : "border-white/10 bg-white/5 text-mist/75"
                    )}
                  >
                    {favoriteDrugIds.includes(selectedDrug.id) ? "Favorit fasilitas" : "Simpan favorit"}
                  </button>
                ) : null}
              </div>
            </div>

            {favoriteDrugs.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Favorit fasilitas</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {favoriteDrugs.map((drug) => (
                    <button
                      key={drug.id}
                      type="button"
                      onClick={() => handlePickDrug(drug)}
                      className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-sm text-white"
                    >
                      {drug.genericName}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {recentDrugs.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.3em] text-mist/45">Pilihan terbaru</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recentDrugs.map((drug) => (
                    <button
                      key={drug.id}
                      type="button"
                      onClick={() => handlePickDrug(drug)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                    >
                      {drug.genericName}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-mist/75">Skema obat</span>
              <select
                value={coverageScheme}
                onChange={(event) => setCoverageScheme(event.target.value as "" | "JKN" | "Reguler")}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
              >
                <option value="">Pilih manual</option>
                <option value="JKN">JKN</option>
                <option value="Reguler">Reguler</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-mist/75">Harga satuan</span>
              <input
                type="number"
                min={0}
                step="1"
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
                placeholder="Isi manual sesuai dokumen penerimaan"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Sumber harga / catatan</span>
            <textarea
              value={priceSource}
              onChange={(event) => setPriceSource(event.target.value)}
              className="min-h-24 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
              placeholder="Opsional. Misalnya kontrak Dinkes, e-katalog, atau catatan pembiayaan internal"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-mist/75">Batch</span>
              <input
                value={batch}
                onChange={(event) => setBatch(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
                placeholder="Nomor batch"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-mist/75">ED</span>
              <input
                type="date"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-mist/75">Jumlah dokumen</span>
              <input
                type="number"
                value={documentQty}
                onChange={(event) => setDocumentQty(Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-mist/75">Jumlah fisik</span>
              <input
                type="number"
                value={physicalQty}
                onChange={(event) => setPhysicalQty(Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
              />
            </label>
          </div>

          <button
            onClick={() => void handleSubmit()}
            className="w-full rounded-2xl bg-gradient-to-r from-teal via-cyan to-aqua px-4 py-3 font-semibold text-slate-950 shadow-neon"
          >
            Simpan penerimaan
          </button>
        </div>
      </div>

        <div className="space-y-4 rounded-[32px] border border-line bg-white/5 p-5 shadow-glow">
        <div className="rounded-[28px] border border-cyan/20 bg-cyan/10 p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Ringkasan QR batch</p>
          <h4 className="mt-2 font-heading text-2xl font-semibold text-white">{batch || "Batch belum diisi"}</h4>
          <p className="mt-2 text-mist/70">
            {selectedDrug
              ? `${selectedDrug.genericName} • ${selectedDrug.dosageForm} ${selectedDrug.strength}`
              : "Pilih dulu obat dari master FORNAS resmi"}
          </p>
          <p className="mt-1 text-mist/70">
            Skema {coverageScheme || "Belum dipilih"} • Harga satuan {formatCurrency(parsedUnitPrice)} • Total{" "}
            {formatCurrency((parsedUnitPrice ?? 0) * physicalQty)}
          </p>
          <p className="mt-1 text-mist/70">ED {expiryDate || "Belum diisi"} • Lokasi rekomendasi A1-R2-B3</p>
          {selectedDrug && batch && documentNumber ? (
            <img
              src={`/api/qr?value=${encodeURIComponent(`${documentNumber}|${selectedDrug.id}|${batch}`)}`}
              alt="QR batch"
              className="mt-4 h-32 w-32 rounded-2xl bg-white p-2"
            />
          ) : (
            <div className="mt-4 grid h-32 w-32 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-center text-xs text-mist/55">
              QR batch akan dibuat setelah dokumen, obat, dan batch terisi.
            </div>
          )}
        </div>

        <div
          className={`rounded-[28px] border p-5 ${
            discrepancy ? "border-amber-300/30 bg-amber-400/10" : "border-teal/20 bg-teal/10"
          }`}
        >
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Status validasi</p>
          <p className="mt-2 font-heading text-2xl font-semibold text-white">
            {discrepancy ? "DISCREPANCY" : "MATCH"}
          </p>
          <p className="mt-2 text-sm text-mist/70">
            {discrepancy
              ? "Jumlah fisik tidak sama dengan dokumen. Sistem akan menahan finalisasi stok dan meminta berita acara digital."
              : "Data cocok. Batch siap dibuatkan QR dan stok akan masuk otomatis ke gudang."}
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
          <p className="text-sm text-mist/75">Output otomatis</p>
          <ul className="mt-3 space-y-2 text-sm text-mist/70">
            <li>Generate QR per batch untuk pelacakan ujung ke ujung.</li>
            <li>Update saldo stok, lokasi rak, dan log audit permanen.</li>
            <li>Flag FEFO dan alert hampir ED jika masa simpan pendek.</li>
          </ul>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-mist/75">
            <p className="font-semibold text-white">Referensi pembiayaan</p>
            <p className="mt-2">
              Master FORNAS dipakai untuk memastikan identitas obat resmi A-Z. Skema{" "}
              <span className="font-semibold text-aqua">{coverageScheme || "JKN / Reguler belum dipilih"}</span> dan harga satuan
              dicatat manual sesuai dokumen penerimaan.
            </p>
            <p className="mt-2 text-mist/70">
              Jika instansi memiliki master harga referensi tersendiri, data itu hanya dipakai sebagai acuan audit dan tidak akan
              mengunci input penerimaan.
            </p>
          </div>
          <p className="mt-4 text-sm text-aqua">{message}</p>
        </div>
        </div>
      </div>

      {isPaletteMounted ? (
        <div
          className={cn(
            "ios-sheet-backdrop fixed inset-0 z-[70] bg-[radial-gradient(circle_at_top,rgba(96,232,206,0.12),transparent_24%),rgba(2,6,14,0.82)] backdrop-blur-md",
            isDrugPaletteOpen ? "ios-sheet-backdrop-enter" : "ios-sheet-backdrop-exit"
          )}
        >
          <button
            type="button"
            aria-label="Tutup pencarian obat"
            onClick={closeDrugPalette}
            className="absolute inset-0"
          />

          <div
            className={cn(
              "ios-sheet-panel absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-[920px] flex-col overflow-hidden rounded-t-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,25,38,0.995),rgba(9,13,22,0.998))] shadow-[0_-28px_72px_rgba(0,0,0,0.54)] md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[88vh] md:w-[min(92vw,760px)] md:max-w-none md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[34px]",
              isDrugPaletteOpen ? "ios-sheet-panel-enter" : "ios-sheet-panel-exit"
            )}
          >
            <div className="sticky top-0 z-30 border-b border-white/10 bg-[linear-gradient(180deg,rgba(20,31,48,0.98),rgba(12,18,30,0.96))] px-4 pb-4 pt-3 backdrop-blur-xl">
              <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-white/15 md:hidden" />

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.38em] text-aqua/75">Picker FORNAS</p>
                  <h4 className="mt-2 font-heading text-[1.4rem] font-semibold text-white">Pilih obat resmi</h4>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-mist/72">
                    Ketik nama generik atau gunakan Top Picks dan huruf A-Z untuk membuka daftar lebih cepat.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDrugPalette}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  Tutup
                </button>
              </div>

              <div className="mt-4">
                <label className="block">
                  <span className="mb-2 block text-sm text-mist/75">Cari obat FORNAS</span>
                  <div className="flex items-center gap-3 rounded-[24px] border border-cyan/20 bg-[linear-gradient(135deg,rgba(112,235,210,0.14),rgba(88,155,255,0.08))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-black/20 text-aqua/85">
                      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="6" />
                        <path d="m20 20-3.5-3.5" />
                      </svg>
                    </span>
                    <input
                      ref={drugSearchInputRef}
                      value={drugQuery}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setDrugQuery(nextValue);
                        if (!nextValue.trim() || nextValue !== selectedDrugLabel) {
                          setDrugId("");
                        }
                      }}
                      className="w-full bg-transparent text-base text-white outline-none"
                      placeholder="Cari nama obat, tablet, sirup, atau 500 mg"
                    />
                    {drugQuery ? (
                      <button
                        type="button"
                        aria-label="Bersihkan pencarian"
                        onClick={() => {
                          setDrugQuery("");
                          setOfficialSearchError("");
                          setOfficialSearchResults([]);
                          drugSearchInputRef.current?.focus();
                        }}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-sm text-mist/80 transition hover:bg-white/10"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M6 6l12 12" />
                          <path d="M18 6 6 18" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.25em] text-mist/60">
                    {usesOfficialSearch
                      ? isOfficialSearchLoading
                        ? "Mencari e-FORNAS..."
                        : `${searchResults.length} hasil resmi`
                      : `${searchResults.length} item huruf ${activeInitial || availableInitials[0] || "-"}`}
                  </span>
                  <span className="text-sm text-mist/70">
                    {usesOfficialSearch
                      ? "Ketik minimal 2 huruf untuk ambil hasil langsung dari e-FORNAS resmi."
                      : "Belum mengetik? Gunakan Top Picks, favorit fasilitas, atau lompat huruf."}
                  </span>
                </div>
                {officialSearchError ? <p className="mt-2 text-sm text-amber-100">{officialSearchError}</p> : null}
                {!usesOfficialSearch && officialInitialError ? (
                  <p className="mt-2 text-sm text-amber-100">{officialInitialError}</p>
                ) : null}
              </div>

              {!deferredDrugQuery.trim() ? (
                <div className="mt-4 space-y-4">
                  {topPickDrugs.length > 0 ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.34em] text-mist/45">Top Picks fasilitas</p>
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {topPickDrugs.map((drug) => (
                          <button
                            key={drug.id}
                            type="button"
                            onClick={() => handlePickDrug(drug)}
                            className="shrink-0 rounded-[18px] border border-cyan/20 bg-[linear-gradient(135deg,rgba(126,242,204,0.16),rgba(125,211,252,0.1))] px-3 py-2 text-left shadow-[0_10px_24px_rgba(59,130,246,0.08)]"
                          >
                            <p className="text-sm font-semibold text-white">{drug.genericName}</p>
                            <p className="mt-1 text-xs text-mist/65">
                              {drug.dosageForm} {drug.strength}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {favoriteDrugs.length > 0 ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.34em] text-mist/45">Favorit fasilitas</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {favoriteDrugs.map((drug) => (
                          <button
                            key={drug.id}
                            type="button"
                            onClick={() => handlePickDrug(drug)}
                            className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-sm text-white"
                          >
                            {drug.genericName}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {recentDrugs.length > 0 ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.34em] text-mist/45">Pilihan terakhir</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {recentDrugs.map((drug) => (
                          <button
                            key={drug.id}
                            type="button"
                            onClick={() => handlePickDrug(drug)}
                            className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-2 text-sm text-white"
                          >
                            {drug.genericName}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.34em] text-mist/45">Lompat huruf</p>
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {availableInitials.map((initial) => (
                        <button
                          key={initial}
                          type="button"
                          onClick={() => {
                            setActiveInitial(initial);
                            setDrugQuery("");
                          }}
                          className={cn(
                            "shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition",
                            activeInitial === initial
                              ? "border-cyan/35 bg-cyan/15 text-white shadow-[0_10px_24px_rgba(60,195,255,0.14)]"
                              : "border-white/10 bg-white/5 text-mist/70"
                            )}
                          >
                          {initial}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              {(isOfficialSearchLoading || (!usesOfficialSearch && isOfficialInitialLoading)) ? (
                <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-5 text-sm text-mist/70">
                  Menyusun hasil resmi dari e-FORNAS...
                </div>
              ) : null}

              {groupedFilteredCatalog.map((group) => (
                <div key={group.initial} className="space-y-3">
                  <div className="sticky top-0 z-20 flex items-center justify-between rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(14,22,34,0.94),rgba(11,17,28,0.9))] px-3 py-2 text-xs uppercase tracking-[0.3em] text-aqua/80 backdrop-blur">
                    <span>Huruf {group.initial}</span>
                    <span className="text-[10px] tracking-[0.2em] text-mist/45">{group.items.length} item</span>
                  </div>

                  {group.items.map((drug) => {
                    const isActive = drug.id === drugId;
                    const isFavorite = favoriteDrugIds.includes(drug.id);

                    return (
                      <div
                        key={drug.id}
                        className={cn(
                          "overflow-hidden rounded-[28px] border transition",
                          isActive
                            ? "border-cyan/40 bg-[linear-gradient(145deg,rgba(74,196,255,0.18),rgba(107,239,210,0.12))] shadow-[0_18px_38px_rgba(28,144,255,0.18)]"
                            : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))]"
                        )}
                      >
                        <div className="flex items-start gap-3 px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handlePickDrug(drug)}
                            className="flex-1 text-left"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-white">{drug.genericName}</p>
                              <span className="rounded-full border border-teal/20 bg-teal/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-aqua">
                                {formatDrugMetaBadge(drug.dosageForm)}
                              </span>
                              <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/88">
                                {formatDrugMetaBadge(drug.strength)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-mist/72">{drug.therapeuticClass}</p>
                            <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-mist/45">{drug.facilityLevel}</p>
                          </button>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <button
                              type="button"
                              onClick={() => handlePickDrug(drug)}
                              className="rounded-full bg-[linear-gradient(135deg,#7ef2cc,#7dd3fc,#f6dd72)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.26em] text-slate-950 shadow-[0_12px_28px_rgba(111,218,255,0.24)]"
                            >
                              Pilih
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleFavoriteDrug(drug.id)}
                              className={cn(
                                "rounded-full border px-3 py-2 text-[11px] font-semibold transition",
                                isFavorite
                                  ? "border-amber-300/30 bg-amber-400/15 text-amber-100"
                                  : "border-white/10 bg-white/5 text-mist/75"
                              )}
                            >
                              {isFavorite ? "Tersimpan" : "Favorit"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {searchResults.length === 0 && !isOfficialSearchLoading && !isOfficialInitialLoading ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 px-4 py-5 text-sm text-mist/70">
                  Tidak ada obat FORNAS yang cocok dengan kata kunci ini. Coba nama generik, bentuk sediaan, kekuatan, atau pilih huruf awal.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
