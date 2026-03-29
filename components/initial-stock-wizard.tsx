"use client";

import { useEffect, useMemo, useState } from "react";
import type { CoverageScheme, FornasDrug } from "@/lib/types";

type WizardRow = {
  id: string;
  drugId: string;
  query: string;
  batch: string;
  expiryDate: string;
  quantityDocument: number;
  quantityPhysical: number;
  coverageScheme: "" | CoverageScheme;
  unitPrice: string;
  priceSource: string;
  location: string;
};

type ParsedCsvRow = Record<string, string>;
const FAVORITE_EXPORT_FALLBACK_TERMS = [
  "paracetamol",
  "amoksisilin",
  "oralit",
  "amlodipin",
  "metformin",
  "salbutamol",
  "omeprazol",
  "zink"
];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function detectDelimiter(headerLine: string) {
  const delimiters = [",", ";", "\t"] as const;
  return delimiters
    .map((delimiter) => ({
      delimiter,
      count: headerLine.split(delimiter).length
    }))
    .sort((left, right) => right.count - left.count)[0]?.delimiter ?? ",";
}

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvText(text: string): ParsedCsvRow[] {
  const normalizedText = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalizedText) {
    return [];
  }

  const [headerLine, ...bodyLines] = normalizedText.split("\n").filter((line) => line.trim().length > 0);
  const delimiter = detectDelimiter(headerLine);
  const headers = splitDelimitedLine(headerLine, delimiter).map(normalizeHeader);

  return bodyLines.map((line) => {
    const values = splitDelimitedLine(line, delimiter);
    return headers.reduce<ParsedCsvRow>((row, header, index) => {
      row[header] = values[index]?.trim() ?? "";
      return row;
    }, {});
  });
}

function toNumber(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeScheme(value: string): "" | CoverageScheme {
  const normalized = value.trim().toLowerCase();
  if (normalized === "jkn") {
    return "JKN";
  }
  if (normalized === "reguler" || normalized === "regular") {
    return "Reguler";
  }
  return "";
}

function normalizeSignature(...parts: string[]) {
  return parts.join("|").toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeCsvCell(value: string | number) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function createRow(defaultLocation: string): WizardRow {
  return {
    id: crypto.randomUUID(),
    drugId: "",
    query: "",
    batch: "",
    expiryDate: "",
    quantityDocument: 0,
    quantityPhysical: 0,
    coverageScheme: "",
    unitPrice: "",
    priceSource: "",
    location: defaultLocation
  };
}

function buildDrugLabel(drug: FornasDrug) {
  return `${drug.genericName} • ${drug.dosageForm} ${drug.strength}`;
}

export function InitialStockWizard({
  catalog,
  facilityKey
}: {
  catalog: FornasDrug[];
  facilityKey: string;
}) {
  const [documentNumber, setDocumentNumber] = useState("");
  const [defaultLocation, setDefaultLocation] = useState("A1-R1-B1");
  const [rows, setRows] = useState<WizardRow[]>([createRow("A1-R1-B1")]);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [favoriteDrugIds, setFavoriteDrugIds] = useState<string[]>([]);
  const [message, setMessage] = useState(
    "Wizard ini dipakai untuk stok awal pilot: satu DO/faktur bisa langsung berisi banyak baris obat."
  );
  const favoriteStorageKey = useMemo(
    () => `kss-favorite-drugs:${facilityKey.trim() || "default-facility"}`,
    [facilityKey]
  );
  const catalogById = useMemo(() => new Map(catalog.map((drug) => [drug.id, drug])), [catalog]);
  const catalogBySignature = useMemo(
    () =>
      new Map(
        catalog.map((drug) => [
          normalizeSignature(drug.genericName, drug.dosageForm, drug.strength),
          drug
        ])
      ),
    [catalog]
  );
  const catalogByGenericName = useMemo(() => {
    const map = new Map<string, FornasDrug[]>();
    catalog.forEach((drug) => {
      const key = normalizeSignature(drug.genericName);
      map.set(key, [...(map.get(key) ?? []), drug]);
    });
    return map;
  }, [catalog]);
  const favoriteDrugs = useMemo(
    () =>
      favoriteDrugIds
        .map((id) => catalogById.get(id) ?? null)
        .filter((drug): drug is FornasDrug => Boolean(drug)),
    [catalogById, favoriteDrugIds]
  );
  const fallbackTemplateDrugs = useMemo(
    () =>
      FAVORITE_EXPORT_FALLBACK_TERMS.map((term) =>
        catalog.find((drug) => normalizeSignature(drug.genericName).includes(term))
      ).filter((drug): drug is FornasDrug => Boolean(drug)),
    [catalog]
  );
  const exportTemplateDrugs = useMemo(
    () =>
      Array.from(new Map([...favoriteDrugs, ...fallbackTemplateDrugs].map((drug) => [drug.id, drug])).values()).slice(0, 12),
    [fallbackTemplateDrugs, favoriteDrugs]
  );

  const selectedIds = useMemo(() => new Set(rows.map((row) => row.drugId).filter(Boolean)), [rows]);
  const totals = useMemo(
    () => ({
      rows: rows.length,
      drugs: new Set(rows.map((row) => row.drugId).filter(Boolean)).size,
      quantity: rows.reduce((total, row) => total + (Number.isFinite(row.quantityPhysical) ? row.quantityPhysical : 0), 0)
    }),
    [rows]
  );

  const updateRow = (rowId: string, patch: Partial<WizardRow>) => {
    setRows((current) => current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(favoriteStorageKey);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed)) {
        setFavoriteDrugIds(parsed.filter((value): value is string => typeof value === "string").slice(0, 20));
      }
    } catch {
      setFavoriteDrugIds([]);
    }
  }, [favoriteStorageKey]);

  const addRow = () => {
    setRows((current) => [...current, createRow(defaultLocation)]);
  };

  const duplicateLastRow = () => {
    setRows((current) => {
      const last = current[current.length - 1];
      if (!last) {
        return [createRow(defaultLocation)];
      }

      return [
        ...current,
        {
          ...last,
          id: crypto.randomUUID(),
          batch: "",
          quantityDocument: 0,
          quantityPhysical: 0
        }
      ];
    });
  };

  const removeRow = (rowId: string) => {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== rowId)));
  };

  const applyDefaultLocationToAll = () => {
    setRows((current) => current.map((row) => ({ ...row, location: defaultLocation })));
  };

  const handlePickDrug = (rowId: string, drug: FornasDrug) => {
    updateRow(rowId, {
      drugId: drug.id,
      query: buildDrugLabel(drug)
    });
  };

  const handleImportCsv = async (file: File | null) => {
    if (!file) {
      setMessage("Pilih file CSV stok awal terlebih dahulu.");
      return;
    }

    setImporting(true);
    setMessage(`Membaca file ${file.name}...`);

    try {
      const parsedRows = parseCsvText(await file.text());
      if (parsedRows.length === 0) {
        throw new Error("File CSV kosong atau formatnya belum terbaca.");
      }

      const importedDocument =
        parsedRows[0]?.documentnumber ||
        parsedRows[0]?.nodokumen ||
        parsedRows[0]?.nomordokumen ||
        parsedRows[0]?.donumber ||
        parsedRows[0]?.dofaktur ||
        parsedRows[0]?.faktur ||
        "";

      const unmatchedRows: number[] = [];
      const nextRows = parsedRows.map((row, index) => {
        const directDrugId = row.drugid || row.idobat || row.id || "";
        const genericName = row.genericname || row.namaobat || row.nama || "";
        const dosageForm = row.dosageform || row.bentuksediaan || row.sediaan || "";
        const strength = row.strength || row.kekuatan || row.dosis || "";
        const batch = row.batch || row.nobatch || row.nomorbatch || "";
        const expiryDate = row.expirydate || row.ed || row.expired || row.tanggalkadaluarsa || "";
        const quantityDocument = toNumber(row.quantitydocument || row.qtydocument || row.qtydok || row.quantity || row.qty || "0");
        const quantityPhysical = toNumber(row.quantityphysical || row.qtyphysical || row.qtyfisik || row.quantity || row.qty || "0");
        const coverageScheme = normalizeScheme(row.coveragescheme || row.skema || row.jenis || "");
        const unitPrice = row.unitprice || row.hargasatuan || row.harga || "";
        const priceSource = row.pricesource || row.sumberharga || row.keteranganharga || "";
        const location = row.location || row.lokasirak || row.lokasi || defaultLocation;

        const matchedDrug =
          (directDrugId ? catalogById.get(directDrugId) : null) ??
          (genericName && dosageForm && strength
            ? catalogBySignature.get(normalizeSignature(genericName, dosageForm, strength))
            : null) ??
          (() => {
            const genericMatches = catalogByGenericName.get(normalizeSignature(genericName)) ?? [];
            return genericMatches.length === 1 ? genericMatches[0] : null;
          })();

        if (!matchedDrug) {
          unmatchedRows.push(index + 2);
        }

        return {
          id: crypto.randomUUID(),
          drugId: matchedDrug?.id ?? "",
          query: matchedDrug ? buildDrugLabel(matchedDrug) : [genericName, dosageForm, strength].filter(Boolean).join(" • "),
          batch,
          expiryDate,
          quantityDocument,
          quantityPhysical,
          coverageScheme,
          unitPrice,
          priceSource,
          location
        } satisfies WizardRow;
      });

      setRows(nextRows.length > 0 ? nextRows : [createRow(defaultLocation)]);
      if (!documentNumber.trim() && importedDocument) {
        setDocumentNumber(importedDocument);
      }

      setMessage(
        `CSV dimuat: ${nextRows.length} baris. ${
          unmatchedRows.length > 0
            ? `${unmatchedRows.length} baris belum cocok dengan FORNAS (baris ${unmatchedRows.slice(0, 8).join(", ")}).`
            : "Semua obat berhasil dipetakan ke master FORNAS."
        }`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import CSV stok awal gagal.");
    } finally {
      setImporting(false);
    }
  };

  const handleSaveAll = async () => {
    if (!documentNumber.trim()) {
      setMessage("Nomor DO/faktur wajib diisi.");
      return;
    }

    const payloadRows = rows
      .filter((row) => row.drugId && row.batch.trim() && row.expiryDate)
      .map((row) => ({
        drugId: row.drugId,
        batch: row.batch.trim(),
        expiryDate: row.expiryDate,
        coverageScheme: row.coverageScheme || undefined,
        quantityDocument: row.quantityDocument,
        quantityPhysical: row.quantityPhysical,
        unitPrice: row.unitPrice.trim() ? Number(row.unitPrice) : undefined,
        priceSource: row.priceSource.trim(),
        location: row.location.trim() || defaultLocation
      }));

    if (payloadRows.length === 0) {
      setMessage("Isi minimal 1 baris obat lengkap sebelum menyimpan.");
      return;
    }

    setSaving(true);
    setMessage("Menyimpan stok awal...");

    try {
      const response = await fetch("/api/receipts/initial-stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          documentNumber: documentNumber.trim(),
          rows: payloadRows
        })
      });

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        result?: {
          createdCount: number;
          discrepancyCount: number;
        };
      };

      if (!response.ok || result.ok === false || !result.result) {
        throw new Error(result.error ?? "Penyimpanan stok awal gagal.");
      }

      setMessage(
        `Stok awal tersimpan: ${result.result.createdCount} baris. ${
          result.result.discrepancyCount > 0
            ? `${result.result.discrepancyCount} baris perlu review discrepancy.`
            : "Semua baris masuk normal."
        }`
      );
      setRows([createRow(defaultLocation)]);
      setDocumentNumber("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Penyimpanan stok awal gagal.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportFavoriteTemplate = () => {
    if (exportTemplateDrugs.length === 0) {
      setMessage("Belum ada favorit fasilitas atau top picks yang bisa diekspor sebagai template.");
      return;
    }

    const header = [
      "documentNumber",
      "drugId",
      "genericName",
      "dosageForm",
      "strength",
      "batch",
      "expiryDate",
      "quantityDocument",
      "quantityPhysical",
      "coverageScheme",
      "unitPrice",
      "priceSource",
      "location"
    ];

    const documentValue = documentNumber.trim();
    const rowsToExport = exportTemplateDrugs.map((drug) =>
      [
        documentValue,
        drug.id,
        drug.genericName,
        drug.dosageForm,
        drug.strength,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        defaultLocation
      ]
        .map(escapeCsvCell)
        .join(",")
    );

    const csv = [header.join(","), ...rowsToExport].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `template-stok-awal-${facilityKey || "fasilitas"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);

    setMessage(
      `Template stok awal favorit berhasil diekspor untuk ${exportTemplateDrugs.length} obat. Lengkapi batch, ED, dan jumlah di file CSV sebelum diunggah kembali.`
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="surface-card rounded-[30px] p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Wizard stok awal</p>
          <h2 className="mt-2 font-heading text-3xl font-semibold text-white">Input cepat obat awal pilot</h2>
          <p className="mt-3 text-sm leading-7 text-mist/75">
            Gunakan wizard ini jika satu dokumen dari Dinkes / IFK berisi banyak item. Setiap baris tetap disimpan
            sebagai penerimaan resmi, tetapi Anda tidak perlu mengisi form satu per satu dari nol.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="surface-card rounded-[26px] p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Baris aktif</p>
            <p className="mt-2 font-heading text-2xl font-semibold text-white">{totals.rows}</p>
          </div>
          <div className="surface-card rounded-[26px] p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Obat unik</p>
            <p className="mt-2 font-heading text-2xl font-semibold text-white">{totals.drugs}</p>
          </div>
          <div className="surface-card rounded-[26px] p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Qty fisik</p>
            <p className="mt-2 font-heading text-2xl font-semibold text-white">{totals.quantity}</p>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-[30px] p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_0.9fr_0.7fr]">
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Nomor DO / Faktur</span>
            <input
              value={documentNumber}
              onChange={(event) => setDocumentNumber(event.target.value)}
              className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
              placeholder="Contoh DO-IFK-001/III/2026"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Lokasi default</span>
            <input
              value={defaultLocation}
              onChange={(event) => setDefaultLocation(event.target.value)}
              className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
              placeholder="A1-R1-B1"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={applyDefaultLocationToAll}
              className="action-ghost w-full rounded-2xl px-4 py-3 text-sm font-medium text-white"
            >
              Terapkan lokasi ke semua
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={addRow} className="action-brand rounded-full px-5 py-3 text-sm font-semibold shadow-neon">
            Tambah baris
          </button>
          <button type="button" onClick={duplicateLastRow} className="action-ghost rounded-full px-5 py-3 text-sm font-medium text-white">
            Duplikasi baris terakhir
          </button>
          <a
            href="/templates/initial-stock-template.csv"
            className="action-ghost rounded-full px-5 py-3 text-sm font-medium text-white"
          >
            Template CSV stok awal
          </a>
          <button
            type="button"
            onClick={handleExportFavoriteTemplate}
            className="action-ghost rounded-full px-5 py-3 text-sm font-medium text-white"
          >
            Export template favorit
          </button>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-5">
          <p className="font-semibold text-white">Import CSV dari Excel / DO</p>
          <p className="mt-2 text-sm leading-7 text-mist/75">
            Export file Excel menjadi CSV, lalu unggah di sini. Wizard akan mencoba mencocokkan obat ke master FORNAS
            berdasarkan `drugId` atau kombinasi `genericName + dosageForm + strength`.
          </p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(event) => void handleImportCsv(event.target.files?.[0] ?? null)}
              className="surface-input block w-full rounded-2xl px-4 py-3 text-sm"
            />
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist/70">
              {importing ? "Mengimpor CSV..." : "Unggah CSV untuk isi otomatis"}
            </span>
          </div>
          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-mist/45">
            Header yang didukung: documentNumber, drugId, genericName, dosageForm, strength, batch, expiryDate,
            quantityDocument, quantityPhysical, coverageScheme, unitPrice, priceSource, location
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => {
          const normalizedQuery = row.query.trim().toLowerCase();
          const selectedDrug = catalog.find((item) => item.id === row.drugId) ?? null;
          const suggestions = normalizedQuery.length < 2
            ? []
            : catalog
                .filter((drug) => {
                  const haystack = `${drug.genericName} ${drug.dosageForm} ${drug.strength}`.toLowerCase();
                  return haystack.includes(normalizedQuery);
                })
                .slice(0, 8);

          return (
            <div key={row.id} className="surface-card rounded-[28px] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Baris {index + 1}</p>
                  <p className="mt-2 text-sm text-mist/70">Cari obat resmi, lalu isi batch, ED, qty, skema, dan harga manual.</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  className="action-ghost rounded-full px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  Hapus
                </button>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_0.8fr_0.7fr_0.55fr_0.55fr_0.7fr]">
                <div className="xl:col-span-2">
                  <label className="block">
                    <span className="mb-2 block text-sm text-mist/75">Cari obat FORNAS</span>
                    <input
                      value={row.query}
                      onChange={(event) =>
                        updateRow(row.id, {
                          query: event.target.value,
                          drugId: event.target.value === row.query ? row.drugId : ""
                        })
                      }
                      className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
                      placeholder="Ketik nama generik, bentuk, atau kekuatan"
                    />
                  </label>

                  {suggestions.length > 0 ? (
                    <div className="mt-3 space-y-2 rounded-[22px] border border-white/10 bg-black/20 p-3">
                      {suggestions.map((drug) => (
                        <button
                          key={drug.id}
                          type="button"
                          onClick={() => handlePickDrug(row.id, drug)}
                          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-cyan/25 hover:bg-white/10"
                        >
                          <span>
                            <span className="block font-semibold text-white">{drug.genericName}</span>
                            <span className="mt-1 block text-sm text-mist/65">
                              {drug.dosageForm} {drug.strength}
                            </span>
                          </span>
                          <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs text-aqua">
                            Pilih
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {row.drugId ? (
                    <p className="mt-3 text-sm text-aqua">
                      Obat terpilih: {selectedDrug ? buildDrugLabel(selectedDrug) : row.query}
                    </p>
                  ) : null}
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm text-mist/75">Batch</span>
                  <input
                    value={row.batch}
                    onChange={(event) => updateRow(row.id, { batch: event.target.value })}
                    className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-mist/75">ED</span>
                  <input
                    type="date"
                    value={row.expiryDate}
                    onChange={(event) => updateRow(row.id, { expiryDate: event.target.value })}
                    className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-mist/75">Qty dok</span>
                  <input
                    type="number"
                    min={0}
                    value={row.quantityDocument}
                    onChange={(event) => updateRow(row.id, { quantityDocument: Number(event.target.value) })}
                    className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-mist/75">Qty fisik</span>
                  <input
                    type="number"
                    min={0}
                    value={row.quantityPhysical}
                    onChange={(event) => updateRow(row.id, { quantityPhysical: Number(event.target.value) })}
                    className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-mist/75">Skema</span>
                  <select
                    value={row.coverageScheme}
                    onChange={(event) => updateRow(row.id, { coverageScheme: event.target.value as WizardRow["coverageScheme"] })}
                    className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
                  >
                    <option value="">Pilih</option>
                    <option value="JKN">JKN</option>
                    <option value="Reguler">Reguler</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-mist/75">Harga satuan</span>
                  <input
                    type="number"
                    min={0}
                    value={row.unitPrice}
                    onChange={(event) => updateRow(row.id, { unitPrice: event.target.value })}
                    className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
                    placeholder="Manual"
                  />
                </label>
                <label className="block xl:col-span-2">
                  <span className="mb-2 block text-sm text-mist/75">Sumber harga / catatan</span>
                  <input
                    value={row.priceSource}
                    onChange={(event) => updateRow(row.id, { priceSource: event.target.value })}
                    className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
                    placeholder="Opsional"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-mist/75">Lokasi rak</span>
                  <input
                    value={row.location}
                    onChange={(event) => updateRow(row.id, { location: event.target.value })}
                    className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
                  />
                </label>
              </div>

              {row.quantityDocument !== row.quantityPhysical ? (
                <p className="mt-4 text-sm text-amber-100">Baris ini akan masuk sebagai discrepancy dan perlu review apoteker.</p>
              ) : null}
              {row.drugId && selectedIds.has(row.drugId) && rows.filter((item) => item.drugId === row.drugId).length > 1 ? (
                <p className="mt-2 text-xs text-mist/55">Obat yang sama boleh muncul lebih dari satu baris bila batch atau ED berbeda.</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="surface-card rounded-[30px] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm leading-7 text-mist/75">{message}</p>
          <button
            type="button"
            onClick={() => void handleSaveAll()}
            disabled={saving}
            className="action-brand rounded-full px-6 py-3 text-sm font-semibold shadow-neon disabled:opacity-60"
          >
            {saving ? "Menyimpan stok awal..." : "Simpan semua baris stok awal"}
          </button>
        </div>
      </div>
    </div>
  );
}
