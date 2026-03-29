import type { StockBatch } from "@/lib/types";

export type MedicationScanKind =
  | "empty"
  | "stock-batch"
  | "distribution"
  | "gs1"
  | "plain";

export interface MedicationScanResolution {
  raw: string;
  normalized: string;
  kind: MedicationScanKind;
  drugId?: string;
  batch?: string;
  expiryDate?: string;
  gtin?: string;
  serial?: string;
  location?: string;
  sourceDocument?: string;
  matchedStockBatchId?: string;
}

function normalizeScan(raw: string) {
  return raw.replace(/\u001d/g, "\u001d").trim();
}

function normalizeBatch(value: string) {
  return value.trim().toLowerCase();
}

function formatGs1Expiry(value: string | undefined) {
  if (!value || !/^\d{6}$/.test(value)) {
    return undefined;
  }

  const year = 2000 + Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));

  if (!month || month > 12) {
    return undefined;
  }

  const resolvedDay =
    day === 0 ? new Date(Date.UTC(year, month, 0)).getUTCDate() : Math.min(day, 31);

  return `${year}-${String(month).padStart(2, "0")}-${String(resolvedDay).padStart(2, "0")}`;
}

function parseParenthesizedGs1(raw: string) {
  if (!raw.includes("(01)")) {
    return null;
  }

  const normalized = raw.replace(/\u001d/g, "");

  return {
    gtin: normalized.match(/\(01\)(\d{14})/)?.[1],
    expiryDate: formatGs1Expiry(normalized.match(/\(17\)(\d{6})/)?.[1]),
    batch: normalized.match(/\(10\)([^\(\u001d]+)/)?.[1]?.trim(),
    serial: normalized.match(/\(21\)([^\(\u001d]+)/)?.[1]?.trim()
  };
}

function parseConcatenatedGs1(raw: string) {
  const normalized = raw.trim();
  if (!normalized.startsWith("01") || normalized.length < 16) {
    return null;
  }

  const result: {
    gtin?: string;
    expiryDate?: string;
    batch?: string;
    serial?: string;
  } = {
    gtin: normalized.slice(2, 16)
  };

  let cursor = 16;

  while (cursor < normalized.length) {
    if (normalized[cursor] === "\u001d") {
      cursor += 1;
      continue;
    }

    const ai = normalized.slice(cursor, cursor + 2);
    cursor += 2;

    if (ai === "17") {
      result.expiryDate = formatGs1Expiry(normalized.slice(cursor, cursor + 6));
      cursor += 6;
      continue;
    }

    if (ai === "10" || ai === "21") {
      const nextSeparator = normalized.indexOf("\u001d", cursor);
      const value = normalized.slice(cursor, nextSeparator === -1 ? normalized.length : nextSeparator).trim();

      if (ai === "10") {
        result.batch = value;
      } else {
        result.serial = value;
      }

      cursor = nextSeparator === -1 ? normalized.length : nextSeparator + 1;
      continue;
    }

    break;
  }

  if (!result.gtin && !result.batch && !result.expiryDate && !result.serial) {
    return null;
  }

  return result;
}

function parseGs1(raw: string) {
  return parseParenthesizedGs1(raw) ?? parseConcatenatedGs1(raw);
}

function resolveStockBatch(normalized: string, stockBatches: StockBatch[]) {
  const normalizedLower = normalizeBatch(normalized);
  const parts = normalized
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  return stockBatches.find(
    (item) =>
      item.id === normalized ||
      normalizeBatch(item.batch) === normalizedLower ||
      parts.includes(item.id) ||
      parts.some((part) => normalizeBatch(part) === normalizeBatch(item.batch))
  );
}

export function resolveMedicationScan(raw: string, stockBatches: StockBatch[]): MedicationScanResolution {
  const normalized = normalizeScan(raw);

  if (!normalized) {
    return {
      raw,
      normalized,
      kind: "empty"
    };
  }

  const matchedBatch = resolveStockBatch(normalized, stockBatches);
  if (matchedBatch) {
    const parts = normalized
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);

    return {
      raw,
      normalized,
      kind: "stock-batch",
      drugId: matchedBatch.drugId,
      batch: matchedBatch.batch,
      expiryDate: matchedBatch.expiryDate,
      location: matchedBatch.location,
      sourceDocument:
        parts.find((part) => part !== matchedBatch.id && normalizeBatch(part) !== normalizeBatch(matchedBatch.batch)) ??
        matchedBatch.sourceDocument,
      matchedStockBatchId: matchedBatch.id
    };
  }

  const distributionParts = normalized
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalized.startsWith("DST-") || distributionParts[0]?.startsWith("DST-")) {
    return {
      raw,
      normalized,
      kind: "distribution",
      drugId: distributionParts[1],
      sourceDocument: distributionParts[0]
    };
  }

  const gs1 = parseGs1(normalized);
  if (gs1) {
    return {
      raw,
      normalized,
      kind: "gs1",
      batch: gs1.batch,
      expiryDate: gs1.expiryDate,
      gtin: gs1.gtin,
      serial: gs1.serial
    };
  }

  return {
    raw,
    normalized,
    kind: "plain"
  };
}
