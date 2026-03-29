import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";
import type { SessionUser } from "@/lib/types";
import { filterReferencePriceCatalog, normalizeReferencePriceScheme, type ReferencePriceFilters } from "@/lib/reference-price-utils";
import { getFornasCatalog } from "@/lib/server/repository";

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return "Belum tersedia";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Belum diisi";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium"
  }).format(parsed);
}

function buildPeriodLabel(filters: ReferencePriceFilters) {
  const from = filters.updatedFrom?.trim();
  const to = filters.updatedTo?.trim();

  if (from && to) {
    return `${from} s.d. ${to}`;
  }
  if (from) {
    return `Mulai ${from}`;
  }
  if (to) {
    return `Sampai ${to}`;
  }

  return "Semua tanggal update";
}

async function buildExportDataset(filters: ReferencePriceFilters = {}) {
  const catalog = await getFornasCatalog();
  const rows = filterReferencePriceCatalog(catalog, filters);

  return rows.map((item) => ({
    id: item.id,
    drug: `${item.genericName} • ${item.dosageForm} ${item.strength}`.trim(),
    genericName: item.genericName,
    dosageForm: item.dosageForm,
    strength: item.strength,
    scheme: normalizeReferencePriceScheme(item),
    referencePrice: item.referencePrice ?? null,
    referencePriceLabel: formatCurrency(item.referencePrice),
    updatedAt: item.referencePriceUpdatedAt ?? "",
    updatedAtLabel: formatDate(item.referencePriceUpdatedAt),
    therapeuticClass: item.therapeuticClass,
    facilityLevel: item.facilityLevel,
    restriction: item.restriction,
    source: item.referencePriceSource || "Belum ada sumber harga tercatat."
  }));
}

export async function createReferencePriceWorkbookBuffer(
  user: SessionUser,
  filters: ReferencePriceFilters = {}
) {
  const rows = await buildExportDataset(filters);
  const workbook = XLSX.utils.book_new();
  const metadataSheet = XLSX.utils.json_to_sheet([
    {
      system: "KAKOR SENTINEL SUPPLY",
      reportType: "Audit Harga Referensi",
      facility: user.facilityName,
      exportedBy: user.name,
      exportedRole: user.role,
      filterQuery: filters.query?.trim() || "Semua obat",
      filterScheme: filters.scheme ?? "all",
      filterUpdated: buildPeriodLabel(filters),
      exportedAt: new Date().toLocaleString("id-ID")
    }
  ]);
  const dataSheet = XLSX.utils.json_to_sheet(
    rows.map((item) => ({
      ID: item.id,
      Obat: item.drug,
      "Nama Generik": item.genericName,
      "Bentuk Sediaan": item.dosageForm,
      Kekuatan: item.strength,
      Skema: item.scheme,
      "Harga Referensi": item.referencePriceLabel,
      "Tanggal Update": item.updatedAtLabel,
      "Kelas Terapi": item.therapeuticClass,
      "Level Fasilitas": item.facilityLevel,
      Restriksi: item.restriction,
      "Sumber Harga": item.source
    }))
  );

  XLSX.utils.book_append_sheet(workbook, metadataSheet, "Metadata");
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Harga_Referensi");

  return {
    buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    filename: `harga-referensi-audit-${new Date().toISOString().slice(0, 10)}.xlsx`
  };
}

export async function createReferencePricePdfBuffer(
  user: SessionUser,
  filters: ReferencePriceFilters = {}
) {
  const rows = await buildExportDataset(filters);
  const pdf = await PDFDocument.create();
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 30;
  const rowHeight = 18;
  const tableTop = 430;
  const rowsPerPage = 14;
  const printableRows = rows.length > 0 ? rows : [
    {
      id: "-",
      drug: "Tidak ada item yang cocok dengan filter.",
      scheme: "-",
      referencePriceLabel: "-",
      updatedAtLabel: "-",
      source: "-"
    }
  ];
  const columns = [
    { key: "id", label: "ID", width: 64 },
    { key: "drug", label: "Obat", width: 176 },
    { key: "scheme", label: "Skema", width: 58 },
    { key: "referencePriceLabel", label: "Harga", width: 88 },
    { key: "updatedAtLabel", label: "Update", width: 82 },
    { key: "source", label: "Sumber", width: 314 }
  ] as const;

  const drawPage = (
    pageIndex: number,
    pageRows: Array<Record<(typeof columns)[number]["key"], string>>
  ) => {
    const page = pdf.addPage([pageWidth, pageHeight]);
    const headerY = pageHeight - 42;

    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(0.995, 0.998, 1)
    });

    page.drawText("KAKOR SENTINEL SUPPLY", {
      x: margin,
      y: headerY,
      size: 18,
      font: titleFont,
      color: rgb(0.08, 0.18, 0.28)
    });
    page.drawText("Audit Harga Referensi", {
      x: margin,
      y: headerY - 24,
      size: 14,
      font: titleFont,
      color: rgb(0.09, 0.52, 0.46)
    });
    page.drawText(`Fasilitas: ${user.facilityName}`, {
      x: margin,
      y: headerY - 48,
      size: 9,
      font: bodyFont,
      color: rgb(0.26, 0.3, 0.34)
    });
    page.drawText(`Filter obat: ${filters.query?.trim() || "Semua obat"}`, {
      x: margin,
      y: headerY - 62,
      size: 9,
      font: bodyFont,
      color: rgb(0.26, 0.3, 0.34)
    });
    page.drawText(`Skema: ${filters.scheme ?? "all"}`, {
      x: 300,
      y: headerY - 62,
      size: 9,
      font: bodyFont,
      color: rgb(0.26, 0.3, 0.34)
    });
    page.drawText(`Tanggal update: ${buildPeriodLabel(filters)}`, {
      x: 430,
      y: headerY - 62,
      size: 9,
      font: bodyFont,
      color: rgb(0.26, 0.3, 0.34)
    });
    page.drawText(`Dicetak: ${new Date().toLocaleString("id-ID")}`, {
      x: 565,
      y: headerY - 48,
      size: 9,
      font: bodyFont,
      color: rgb(0.26, 0.3, 0.34)
    });

    let cursorX = margin;
    page.drawRectangle({
      x: margin,
      y: tableTop,
      width: columns.reduce((sum, column) => sum + column.width, 0),
      height: 22,
      color: rgb(0.87, 0.95, 0.94)
    });

    columns.forEach((column) => {
      page.drawText(column.label, {
        x: cursorX + 4,
        y: tableTop + 7,
        size: 8.5,
        font: titleFont,
        color: rgb(0.08, 0.18, 0.28)
      });
      cursorX += column.width;
    });

    pageRows.forEach((row, rowIndex) => {
      const y = tableTop - (rowIndex + 1) * rowHeight;
      let x = margin;

      if (rowIndex % 2 === 0) {
        page.drawRectangle({
          x: margin,
          y,
          width: columns.reduce((sum, column) => sum + column.width, 0),
          height: rowHeight,
          color: rgb(0.97, 0.985, 0.985)
        });
      }

      columns.forEach((column) => {
        const raw = String(row[column.key] ?? "-");
        const value = raw.length > 62 ? `${raw.slice(0, 59)}...` : raw;
        page.drawText(value, {
          x: x + 4,
          y: y + 5,
          size: 8,
          font: bodyFont,
          color: rgb(0.22, 0.27, 0.31),
          maxWidth: column.width - 8
        });
        x += column.width;
      });
    });

    page.drawText(`Halaman ${pageIndex + 1}`, {
      x: pageWidth - 92,
      y: 18,
      size: 8,
      font: bodyFont,
      color: rgb(0.4, 0.45, 0.5)
    });
  };

  for (let index = 0; index < printableRows.length; index += rowsPerPage) {
    const pageRows = printableRows.slice(index, index + rowsPerPage).map((row) => ({
      id: row.id,
      drug: row.drug,
      scheme: row.scheme,
      referencePriceLabel: row.referencePriceLabel,
      updatedAtLabel: row.updatedAtLabel,
      source: row.source
    }));

    drawPage(index / rowsPerPage, pageRows);
  }

  return {
    buffer: Buffer.from(await pdf.save()),
    filename: `harga-referensi-audit-${new Date().toISOString().slice(0, 10)}.pdf`
  };
}
