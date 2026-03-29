import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";
import type { ReportType, SessionUser } from "@/lib/types";
import {
  getDispenseTransactions,
  getDistributionRequests,
  getFornasCatalog,
  getReceipts,
  getStockBatches
} from "@/lib/server/repository";

type ReportRow = Record<string, string | number>;

export interface ReportFilters {
  startDate?: string | null;
  endDate?: string | null;
  facilityName?: string | null;
  preparedByName?: string | null;
  preparedByRole?: string | null;
  acknowledgedByName?: string | null;
  acknowledgedByRole?: string | null;
}

function normalizeType(value: string | null): ReportType {
  switch (value) {
    case "Distribusi":
    case "Pemakaian":
    case "Stok Akhir":
      return value;
    default:
      return "LPLPO";
  }
}

function normalizeFilters(filters: ReportFilters, user: SessionUser) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = today.toISOString().slice(0, 10);

  return {
    startDate: filters.startDate ?? monthStart,
    endDate: filters.endDate ?? monthEnd,
    facilityName: filters.facilityName?.trim() || user.facilityName,
    preparedByName: filters.preparedByName?.trim() || user.name,
    preparedByRole: filters.preparedByRole?.trim() || user.role,
    acknowledgedByName: filters.acknowledgedByName?.trim() || "Apoteker Penanggung Jawab",
    acknowledgedByRole: filters.acknowledgedByRole?.trim() || "PJ Farmasi"
  };
}

function withinPeriod(dateString: string, startDate?: string | null, endDate?: string | null) {
  const timestamp = new Date(dateString).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
  const end = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;

  if (start !== null && timestamp < start) {
    return false;
  }

  if (end !== null && timestamp > end) {
    return false;
  }

  return true;
}

function buildPeriodLabel(startDate?: string | null, endDate?: string | null) {
  if (startDate && endDate) {
    return `${startDate} s.d. ${endDate}`;
  }

  if (startDate) {
    return `Mulai ${startDate}`;
  }

  if (endDate) {
    return `Sampai ${endDate}`;
  }

  return "Seluruh data";
}

function textValue(value: string | number | undefined) {
  return value === undefined ? "-" : String(value);
}

function truncate(value: string | number | undefined, maxLength: number) {
  const next = textValue(value);
  return next.length > maxLength ? `${next.slice(0, maxLength - 1)}...` : next;
}

function getColumns(type: ReportType) {
  if (type === "Distribusi") {
    return [
      { key: "requestedAt", label: "Tanggal", width: 84 },
      { key: "id", label: "Ref", width: 88 },
      { key: "unit", label: "Unit", width: 130 },
      { key: "drug", label: "Obat", width: 120 },
      { key: "requested", label: "Minta", width: 50 },
      { key: "approved", label: "Approve", width: 58 },
      { key: "received", label: "Terima", width: 50 },
      { key: "status", label: "Status", width: 62 }
    ];
  }

  if (type === "Pemakaian") {
    return [
      { key: "createdAt", label: "Tanggal", width: 84 },
      { key: "batch", label: "Batch", width: 88 },
      { key: "drug", label: "Obat", width: 120 },
      { key: "cluster", label: "Klaster", width: 92 },
      { key: "quantity", label: "Qty", width: 42 },
      { key: "unit", label: "Unit", width: 120 },
      { key: "actor", label: "Petugas", width: 110 },
      { key: "mode", label: "Mode", width: 58 }
    ];
  }

  if (type === "Stok Akhir") {
    return [
      { key: "batch", label: "Batch", width: 90 },
      { key: "drug", label: "Obat", width: 120 },
      { key: "expiryDate", label: "ED", width: 72 },
      { key: "quantity", label: "Saldo", width: 50 },
      { key: "reserved", label: "Reserve", width: 52 },
      { key: "available", label: "Ready", width: 48 },
      { key: "location", label: "Lokasi", width: 90 },
      { key: "discrepancy", label: "Status", width: 78 }
    ];
  }

  return [
    { key: "drug", label: "Obat", width: 140 },
    { key: "opening", label: "Stok Awal", width: 62 },
    { key: "receipts", label: "Masuk", width: 58 },
    { key: "dispenses", label: "Pakai", width: 56 },
    { key: "distributions", label: "Distribusi", width: 62 },
    { key: "closing", label: "Stok Akhir", width: 62 },
    { key: "notes", label: "Catatan", width: 170 }
  ];
}

function rowsForExcel(type: ReportType, rows: ReportRow[]) {
  const columns = getColumns(type);

  return rows.map((row) =>
    Object.fromEntries(columns.map((column) => [column.label, textValue(row[column.key])]))
  );
}

export async function buildReportRows(typeValue: string | null, filters: ReportFilters = {}) {
  const type = normalizeType(typeValue);
  const [distributionRequests, stockBatches, dispenses, receipts, catalog] = await Promise.all([
    getDistributionRequests(),
    getStockBatches(),
    getDispenseTransactions(),
    getReceipts(),
    getFornasCatalog()
  ]);

  const drugNameById = new Map(
    catalog.map((item) => [item.id, `${item.genericName} ${item.strength}`.trim()])
  );

  const distributionRows = distributionRequests
    .filter((item) => withinPeriod(item.requestedAt, filters.startDate, filters.endDate))
    .map((item) => ({
      id: item.id,
      requestedAt: new Date(item.requestedAt).toLocaleDateString("id-ID"),
      unit: item.requestingUnit,
      drug: drugNameById.get(item.drugId) ?? item.drugId,
      requested: item.quantityRequested,
      approved: item.quantityApproved,
      received: item.quantityReceived,
      status: item.status
    }));

  const dispenseRows = dispenses
    .filter((item) => withinPeriod(item.createdAt, filters.startDate, filters.endDate))
    .map((item) => ({
      createdAt: new Date(item.createdAt).toLocaleDateString("id-ID"),
      batch: item.batchCode,
      drug: drugNameById.get(item.drugId) ?? item.drugId,
      cluster: item.cluster,
      quantity: item.quantity,
      unit: item.unitName,
      actor: item.actorName,
      mode: item.mode
    }));

  const stockRows = stockBatches.map((batch) => ({
    batch: batch.batch,
    drug: drugNameById.get(batch.drugId) ?? batch.drugId,
    expiryDate: batch.expiryDate,
    quantity: batch.quantity,
    reserved: batch.reserved,
    available: Math.max(batch.quantity - batch.reserved, 0),
    location: batch.location,
    discrepancy: batch.discrepancy ? "Hold / review" : "Siap"
  }));

  const receiptRows = receipts.filter(
    (item) =>
      item.workflowStage !== "rejected" &&
      withinPeriod(item.createdAt, filters.startDate, filters.endDate)
  );

  const reportRows: ReportRow[] =
    type === "Distribusi"
      ? distributionRows
      : type === "Pemakaian"
        ? dispenseRows
        : type === "Stok Akhir"
          ? stockRows
          : Array.from(
              new Set([
                ...receiptRows.map((item) => item.drugId),
                ...dispenses
                  .filter((item) => withinPeriod(item.createdAt, filters.startDate, filters.endDate))
                  .map((item) => item.drugId),
                ...distributionRequests
                  .filter((item) => withinPeriod(item.requestedAt, filters.startDate, filters.endDate))
                  .map((item) => item.drugId),
                ...stockBatches.map((item) => item.drugId)
              ])
            )
              .sort()
              .map((drugId) => {
                const receiptsTotal = receiptRows
                  .filter((item) => item.drugId === drugId)
                  .reduce((sum, item) => sum + item.quantityPhysical, 0);
                const dispensesTotal = dispenses
                  .filter(
                    (item) =>
                      item.drugId === drugId &&
                      withinPeriod(item.createdAt, filters.startDate, filters.endDate)
                  )
                  .reduce((sum, item) => sum + item.quantity, 0);
                const distributionTotal = distributionRequests
                  .filter(
                    (item) =>
                      item.drugId === drugId &&
                      withinPeriod(item.requestedAt, filters.startDate, filters.endDate) &&
                      ["approved", "dispatched", "received", "variance"].includes(item.workflowStage ?? "")
                  )
                  .reduce((sum, item) => sum + item.quantityApproved, 0);
                const closing = stockBatches
                  .filter((item) => item.drugId === drugId)
                  .reduce((sum, item) => sum + item.quantity, 0);
                const opening = Math.max(closing - receiptsTotal + dispensesTotal + distributionTotal, 0);

                return {
                  drug: drugNameById.get(drugId) ?? drugId,
                  opening,
                  receipts: receiptsTotal,
                  dispenses: dispensesTotal,
                  distributions: distributionTotal,
                  closing,
                  notes:
                    closing <= 200
                      ? "Pantau stok kritis / reorder"
                      : distributionTotal > dispensesTotal
                        ? "Distribusi dominan"
                        : "Monitoring rutin"
                };
              });

  return {
    type,
    rows: reportRows,
    periodLabel: buildPeriodLabel(filters.startDate, filters.endDate)
  };
}

export async function createWorkbookBuffer(
  typeValue: string | null,
  user: SessionUser,
  filters: ReportFilters = {}
) {
  const normalizedFilters = normalizeFilters(filters, user);
  const { type, rows, periodLabel } = await buildReportRows(typeValue, normalizedFilters);
  const workbook = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.json_to_sheet(rowsForExcel(type, rows));
  const metaSheet = XLSX.utils.json_to_sheet([
    {
      system: "KAKOR SENTINEL SUPPLY",
      facility: normalizedFilters.facilityName,
      reportType: type,
      period: periodLabel,
      exportedBy: user.name,
      exportedRole: user.role,
      printedAt: new Date().toLocaleString("id-ID"),
      preparedBy: normalizedFilters.preparedByName,
      preparedRole: normalizedFilters.preparedByRole,
      acknowledgedBy: normalizedFilters.acknowledgedByName,
      acknowledgedRole: normalizedFilters.acknowledgedByRole
    }
  ]);

  XLSX.utils.book_append_sheet(workbook, metaSheet, "Metadata");
  XLSX.utils.book_append_sheet(workbook, dataSheet, type.replace(/\s+/g, "_"));

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const periodSuffix = `${normalizedFilters.startDate ?? "all"}_${normalizedFilters.endDate ?? "current"}`;

  return {
    buffer,
    filename: `${type.toLowerCase().replace(/\s+/g, "-")}-${periodSuffix}.xlsx`
  };
}

export async function createPdfBuffer(
  typeValue: string | null,
  user: SessionUser,
  filters: ReportFilters = {}
) {
  const normalizedFilters = normalizeFilters(filters, user);
  const { type, rows, periodLabel } = await buildReportRows(typeValue, normalizedFilters);
  const columns = getColumns(type);
  const pdf = await PDFDocument.create();
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 30;
  const rowHeight = 20;
  const tableTop = 430;
  const rowsPerPage = 14;
  const printableRows = rows.length > 0 ? rows : [{ notes: "Tidak ada data pada periode terpilih." }];

  const drawPage = (pageIndex: number, pageRows: ReportRow[]) => {
    const page = pdf.addPage([pageWidth, pageHeight]);
    const headerY = pageHeight - 42;

    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(1, 1, 1)
    });

    page.drawText("KAKOR SENTINEL SUPPLY", {
      x: margin,
      y: headerY,
      size: 18,
      font: titleFont,
      color: rgb(0.05, 0.18, 0.32)
    });
    page.drawText(type, {
      x: margin,
      y: headerY - 24,
      size: 14,
      font: titleFont,
      color: rgb(0.08, 0.49, 0.51)
    });

    page.drawText(`Fasilitas: ${normalizedFilters.facilityName}`, {
      x: margin,
      y: headerY - 48,
      size: 9,
      font: bodyFont,
      color: rgb(0.24, 0.29, 0.34)
    });
    page.drawText(`Periode: ${periodLabel}`, {
      x: margin,
      y: headerY - 62,
      size: 9,
      font: bodyFont,
      color: rgb(0.24, 0.29, 0.34)
    });
    page.drawText(`Dicetak: ${new Date().toLocaleString("id-ID")}`, {
      x: pageWidth - 220,
      y: headerY - 48,
      size: 9,
      font: bodyFont,
      color: rgb(0.24, 0.29, 0.34)
    });
    page.drawText(`Operator: ${user.name}`, {
      x: pageWidth - 220,
      y: headerY - 62,
      size: 9,
      font: bodyFont,
      color: rgb(0.24, 0.29, 0.34)
    });

    page.drawLine({
      start: { x: margin, y: headerY - 76 },
      end: { x: pageWidth - margin, y: headerY - 76 },
      thickness: 1,
      color: rgb(0.82, 0.86, 0.9)
    });

    page.drawRectangle({
      x: margin,
      y: tableTop,
      width: pageWidth - margin * 2,
      height: rowHeight,
      color: rgb(0.92, 0.97, 0.99)
    });

    let cursorX = margin;
    columns.forEach((column) => {
      page.drawText(column.label, {
        x: cursorX + 4,
        y: tableTop + 6,
        size: 8,
        font: titleFont,
        color: rgb(0.05, 0.18, 0.32)
      });
      cursorX += column.width;
    });

    pageRows.forEach((row, rowIndex) => {
      const y = tableTop - rowHeight * (rowIndex + 1);
      page.drawRectangle({
        x: margin,
        y,
        width: pageWidth - margin * 2,
        height: rowHeight,
        color: rowIndex % 2 === 0 ? rgb(0.985, 0.992, 0.998) : rgb(0.96, 0.978, 0.99)
      });

      let cellX = margin;
      columns.forEach((column) => {
        page.drawText(truncate(row[column.key], Math.max(6, Math.floor(column.width / 6))), {
          x: cellX + 4,
          y: y + 6,
          size: 7.5,
          font: bodyFont,
          color: rgb(0.24, 0.29, 0.34),
          maxWidth: column.width - 8
        });
        cellX += column.width;
      });
    });

    page.drawRectangle({
      x: margin,
      y: 72,
      width: 260,
      height: 110,
      borderWidth: 1,
      borderColor: rgb(0.82, 0.86, 0.9)
    });
    page.drawRectangle({
      x: pageWidth - margin - 260,
      y: 72,
      width: 260,
      height: 110,
      borderWidth: 1,
      borderColor: rgb(0.82, 0.86, 0.9)
    });

    page.drawText("Disusun oleh", {
      x: margin + 12,
      y: 164,
      size: 9,
      font: titleFont,
      color: rgb(0.05, 0.18, 0.32)
    });
    page.drawText(normalizedFilters.preparedByName, {
      x: margin + 12,
      y: 116,
      size: 9,
      font: bodyFont,
      color: rgb(0.24, 0.29, 0.34)
    });
    page.drawText(normalizedFilters.preparedByRole, {
      x: margin + 12,
      y: 102,
      size: 8,
      font: bodyFont,
      color: rgb(0.24, 0.29, 0.34)
    });

    page.drawText("Mengetahui", {
      x: pageWidth - margin - 248,
      y: 164,
      size: 9,
      font: titleFont,
      color: rgb(0.05, 0.18, 0.32)
    });
    page.drawText(normalizedFilters.acknowledgedByName, {
      x: pageWidth - margin - 248,
      y: 116,
      size: 9,
      font: bodyFont,
      color: rgb(0.24, 0.29, 0.34)
    });
    page.drawText(normalizedFilters.acknowledgedByRole, {
      x: pageWidth - margin - 248,
      y: 102,
      size: 8,
      font: bodyFont,
      color: rgb(0.24, 0.29, 0.34)
    });

    page.drawText(`Halaman ${pageIndex + 1}`, {
      x: pageWidth - margin - 64,
      y: 32,
      size: 8,
      font: bodyFont,
      color: rgb(0.38, 0.43, 0.47)
    });
  };

  for (let pageIndex = 0; pageIndex < Math.ceil(printableRows.length / rowsPerPage); pageIndex += 1) {
    const pageRows = printableRows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    drawPage(pageIndex, pageRows);
  }

  const buffer = Buffer.from(await pdf.save());
  const periodSuffix = `${normalizedFilters.startDate ?? "all"}_${normalizedFilters.endDate ?? "current"}`;

  return {
    buffer,
    filename: `${type.toLowerCase().replace(/\s+/g, "-")}-${periodSuffix}.pdf`
  };
}
