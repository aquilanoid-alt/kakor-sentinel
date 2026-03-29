import { randomUUID } from "crypto";
import type {
  AlertItem,
  ApprovalEntry,
  AuditEvent,
  BatchAllocation,
  CoverageScheme,
  DashboardSnapshot,
  DispenseRecord,
  DistributionRequest,
  FornasDrug,
  GoLiveConfig,
  GuideSection,
  PilotReadinessSummary,
  RackCell,
  ReceiptRecord,
  SessionUser,
  StockBatch,
  StockOpnameRecord,
  SuspiciousPattern,
  UserProfile,
  UserRole,
  UsageStat,
  WorkflowStage
} from "@/lib/types";
import {
  alerts as fallbackAlerts,
  auditTrail as fallbackAuditTrail,
  clusterUsage as fallbackClusterUsage,
  distributionRequests as fallbackDistributionRequests,
  fornasCatalog as fallbackFornasCatalog,
  guideSections as fallbackGuideSections,
  rackMap as fallbackRackMap,
  roleMatrix as fallbackRoleMatrix,
  suspiciousPatterns as fallbackSuspiciousPatterns,
  stockBatches as fallbackStockBatches,
  usageStats as fallbackUsageStats
} from "@/lib/data";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { isFirebaseServerConfigured } from "@/lib/firebase/config";
import { isStrictProductionMode, shouldUseDemoFallbackData } from "@/lib/runtime";
import { slugify } from "@/lib/utils";

type CollectionName =
  | "users"
  | "fornas_catalog"
  | "stock_batches"
  | "alerts"
  | "audit_events"
  | "distribution_requests"
  | "guide_sections"
  | "dispense_transactions"
  | "receipts"
  | "stock_opnames"
  | "dashboard_summary"
  | "system_config";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const LOW_STOCK_THRESHOLD = 200;
const NEAR_EXPIRY_DAYS = 90;
const LARGE_DISPENSE_THRESHOLD = 300;
const BATCH_WRITE_SIZE = 400;
const COLLECTION_CACHE_TTL_MS = 20_000;
const DASHBOARD_REFRESH_MIN_INTERVAL_MS = 60_000;
const DEFAULT_DRUG_PRICE_NOTE =
  "FORNAS aktif JKN mengacu KMK HK.01.07/MENKES/1199/2025 (berlaku 1 April 2026). Nilai klaim harga obat tertentu mengacu KMK HK.01.07/MENKES/730/2025; selain itu gunakan kontrak/e-katalog aktif.";
const ALPHABET_INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const collectionCache = new Map<CollectionName, { expiresAt: number; rows: unknown[] }>();
let dashboardSummaryCache: { expiresAt: number; snapshot: DashboardSnapshot } | null = null;
let dashboardSummaryRefreshedAt = 0;
let dashboardSummaryRefreshInFlight: Promise<void> | null = null;

const emptyDashboardSnapshot: DashboardSnapshot = {
  alerts: [],
  auditTrail: [],
  clusterUsage: [],
  suspiciousPatterns: [],
  usageStats: []
};

function dbOrNull() {
  if (!isFirebaseServerConfigured()) {
    return null;
  }

  try {
    return getFirebaseAdminDb();
  } catch {
    return null;
  }
}

function isQuotaExceededError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? Number(error.code) : NaN;
  const message =
    "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";

  return code === 8 || message.includes("resource_exhausted") || message.includes("quota exceeded");
}

function getCachedCollection<T>(collectionName: CollectionName) {
  const cached = collectionCache.get(collectionName);
  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    collectionCache.delete(collectionName);
    return null;
  }

  return cached.rows as T[];
}

function setCachedCollection<T>(collectionName: CollectionName, rows: T[]) {
  collectionCache.set(collectionName, {
    expiresAt: Date.now() + COLLECTION_CACHE_TTL_MS,
    rows
  });
}

function invalidateCollectionCache(collectionName: CollectionName) {
  collectionCache.delete(collectionName);
}

function getCachedDashboardSummary() {
  if (!dashboardSummaryCache) {
    return null;
  }

  if (Date.now() > dashboardSummaryCache.expiresAt) {
    dashboardSummaryCache = null;
    return null;
  }

  return dashboardSummaryCache.snapshot;
}

function setCachedDashboardSummary(snapshot: DashboardSnapshot) {
  dashboardSummaryCache = {
    expiresAt: Date.now() + COLLECTION_CACHE_TTL_MS,
    snapshot
  };
  dashboardSummaryRefreshedAt = Date.now();
}

function invalidateDashboardSummaryCache() {
  dashboardSummaryCache = null;
}

function demoFallback<T>(fallback: T[]) {
  return shouldUseDemoFallbackData() ? fallback : [];
}

function requireWritableDb(collectionName: CollectionName) {
  const db = dbOrNull();
  if (db) {
    return db;
  }

  if (isStrictProductionMode()) {
    throw new Error(`Backend produksi untuk koleksi ${collectionName} belum dikonfigurasi.`);
  }

  return null;
}

async function readCollection<T>(collectionName: CollectionName, fallback: T[]): Promise<T[]> {
  const db = dbOrNull();
  if (!db) {
    return fallback;
  }

  const cached = getCachedCollection<T>(collectionName);
  if (cached) {
    return cached;
  }

  try {
    const snapshot = await db.collection(collectionName).get();
    const rows = snapshot.empty ? [] : snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T);
    setCachedCollection(collectionName, rows);
    return rows;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return fallback;
    }

    throw error;
  }
}

async function readStoredCollection<T>(collectionName: CollectionName): Promise<T[]> {
  const db = dbOrNull();
  if (!db) {
    return [];
  }

  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T);
}

async function readDocument<T>(collectionName: CollectionName, id: string) {
  const db = dbOrNull();
  if (!db) {
    return null;
  }

  try {
    const doc = await db.collection(collectionName).doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as T) : null;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return null;
    }

    throw error;
  }
}

async function writeDocument<T extends { id: string }>(collectionName: CollectionName, payload: T) {
  const db = requireWritableDb(collectionName);
  if (!db) {
    return payload;
  }

  await db.collection(collectionName).doc(payload.id).set(payload);
  invalidateCollectionCache(collectionName);
  if (collectionName === "dashboard_summary") {
    invalidateDashboardSummaryCache();
  }
  return payload;
}

async function writeDocuments<T extends { id: string }>(collectionName: CollectionName, payloads: T[]) {
  const db = requireWritableDb(collectionName);
  if (!db) {
    return payloads;
  }

  if (typeof db.bulkWriter === "function") {
    const writer = db.bulkWriter();
    await Promise.all(
      payloads.map((payload) => writer.set(db.collection(collectionName).doc(payload.id), payload))
    );
    await writer.close();
    invalidateCollectionCache(collectionName);
    if (collectionName === "dashboard_summary") {
      invalidateDashboardSummaryCache();
    }
    return payloads;
  }

  for (let index = 0; index < payloads.length; index += BATCH_WRITE_SIZE) {
    const chunk = payloads.slice(index, index + BATCH_WRITE_SIZE);
    const batch = db.batch();

    chunk.forEach((payload) => {
      batch.set(db.collection(collectionName).doc(payload.id), payload);
    });

    await batch.commit();
  }

  invalidateCollectionCache(collectionName);
  if (collectionName === "dashboard_summary") {
    invalidateDashboardSummaryCache();
  }
  return payloads;
}

async function updateDocument<T extends { id: string }>(
  collectionName: CollectionName,
  id: string,
  payload: Partial<T>
) {
  const db = requireWritableDb(collectionName);
  if (!db) {
    const current = (await readCollection<T>(collectionName, [] as T[])).find((item) => item.id === id);
    return { ...(current ?? ({ id } as T)), ...payload, id } as T;
  }

  await db.collection(collectionName).doc(id).set(payload, { merge: true });
  invalidateCollectionCache(collectionName);
  if (collectionName === "dashboard_summary") {
    invalidateDashboardSummaryCache();
  }
  const next = await db.collection(collectionName).doc(id).get();
  return { id: next.id, ...next.data() } as T;
}

async function deleteDocument(collectionName: CollectionName, id: string) {
  const db = requireWritableDb(collectionName);
  if (!db) {
    return;
  }

  await db.collection(collectionName).doc(id).delete();
  invalidateCollectionCache(collectionName);
  if (collectionName === "dashboard_summary") {
    invalidateDashboardSummaryCache();
  }
}

async function deleteDocuments(collectionName: CollectionName, ids: string[]) {
  const db = requireWritableDb(collectionName);
  if (!db || ids.length === 0) {
    return;
  }

  if (typeof db.bulkWriter === "function") {
    const writer = db.bulkWriter();
    await Promise.all(ids.map((id) => writer.delete(db.collection(collectionName).doc(id))));
    await writer.close();
    invalidateCollectionCache(collectionName);
    if (collectionName === "dashboard_summary") {
      invalidateDashboardSummaryCache();
    }
    return;
  }

  for (let index = 0; index < ids.length; index += BATCH_WRITE_SIZE) {
    const chunk = ids.slice(index, index + BATCH_WRITE_SIZE);
    const batch = db.batch();

    chunk.forEach((id) => {
      batch.delete(db.collection(collectionName).doc(id));
    });

    await batch.commit();
  }

  invalidateCollectionCache(collectionName);
  if (collectionName === "dashboard_summary") {
    invalidateDashboardSummaryCache();
  }
}

function buildApprovalEntry(
  actor: SessionUser,
  stage: WorkflowStage,
  note: string
): ApprovalEntry {
  return {
    id: randomUUID(),
    stage,
    actorName: actor.name,
    actorRole: actor.role,
    note,
    timestamp: new Date().toISOString()
  };
}

function availableQuantity(batch: StockBatch) {
  return Math.max(batch.quantity - batch.reserved, 0);
}

function sortByFefo(left: StockBatch, right: StockBatch) {
  const expiryOrder = left.expiryDate.localeCompare(right.expiryDate);
  if (expiryOrder !== 0) {
    return expiryOrder;
  }

  return left.lastUpdated.localeCompare(right.lastUpdated);
}

function daysUntil(dateString: string) {
  return Math.ceil((new Date(dateString).getTime() - Date.now()) / DAY_IN_MS);
}

function normalizeCoverageScheme(raw?: string): CoverageScheme | undefined {
  if (raw === "JKN" || raw === "Reguler") {
    return raw;
  }

  return undefined;
}

function normalizeFornasDrug(drug: FornasDrug): FornasDrug {
  return {
    ...drug,
    coverageScheme: normalizeCoverageScheme(drug.coverageScheme),
    referencePrice: typeof drug.referencePrice === "number" ? drug.referencePrice : null,
    referencePriceSource:
      typeof drug.referencePriceSource === "string" && drug.referencePriceSource.trim().length > 0
        ? drug.referencePriceSource
        : ""
  };
}

function withinPeriod(dateString: string, startDate?: string | null, endDate?: string | null) {
  const value = new Date(dateString).getTime();
  if (Number.isNaN(value)) {
    return false;
  }

  const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
  const end = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;

  if (start !== null && value < start) {
    return false;
  }

  if (end !== null && value > end) {
    return false;
  }

  return true;
}

function buildLowStockAlert(drugId: string, totalAvailable: number): AlertItem {
  return {
    id: `stock-low-${drugId}`,
    severity: totalAvailable <= LOW_STOCK_THRESHOLD / 2 ? "critical" : "warning",
    title: `Stok menipis ${drugId}`,
    detail: `Saldo tersedia ${totalAvailable} unit untuk ${drugId}. Segera evaluasi reorder atau redistribusi buffer.`,
    action: "Lakukan review pemakaian 7 hari, cek permintaan aktif, dan buat rencana suplai."
  };
}

function buildExpiryAlert(batch: StockBatch, daysLeft: number): AlertItem {
  return {
    id: `expiry-${batch.id}`,
    severity: daysLeft <= 30 ? "critical" : "warning",
    title: `Batch ${batch.batch} mendekati ED`,
    detail: `${batch.batch} akan kedaluwarsa dalam ${Math.max(daysLeft, 0)} hari. Prioritaskan FEFO dan evaluasi distribusi.`,
    action: "Masukkan batch ke prioritas distribusi/pemakaian dan lakukan monitoring harian."
  };
}

async function upsertOperationalAlert(alert: AlertItem) {
  await writeDocument<AlertItem>("alerts", alert);
}

async function syncDrugStockAlert(drugId: string) {
  const batches = await getStockBatches();
  const totalAvailable = batches
    .filter((batch) => batch.drugId === drugId && !batch.discrepancy)
    .reduce((sum, batch) => sum + availableQuantity(batch), 0);

  if (totalAvailable <= LOW_STOCK_THRESHOLD) {
    await upsertOperationalAlert(buildLowStockAlert(drugId, totalAvailable));
    return;
  }

  await deleteDocument("alerts", `stock-low-${drugId}`);
}

async function syncBatchExpiryAlert(batch: StockBatch) {
  const daysLeft = daysUntil(batch.expiryDate);
  if (daysLeft <= NEAR_EXPIRY_DAYS) {
    await upsertOperationalAlert(buildExpiryAlert(batch, daysLeft));
    return;
  }

  await deleteDocument("alerts", `expiry-${batch.id}`);
}

async function syncDistributionVarianceAlert(
  request: DistributionRequest,
  quantityReceived?: number
) {
  if (request.status === "selisih" || request.workflowStage === "variance") {
    const received = quantityReceived ?? request.quantityReceived;
    await upsertOperationalAlert({
      id: `variance-${request.id}`,
      severity: "critical",
      title: `Selisih distribusi ${request.id}`,
      detail: `Distribusi ${request.id} ke ${request.requestingUnit} berbeda ${request.quantityApproved - received} unit dari jumlah approve.`,
      action: "Lakukan konfirmasi penerimaan, pemeriksaan bukti serah terima, dan berita acara selisih."
    });
    return;
  }

  await deleteDocument("alerts", `variance-${request.id}`);
}

function summarizeUsageStats(
  stockBatches: StockBatch[],
  distributionRequests: DistributionRequest[],
  dispenses: DispenseRecord[]
): UsageStat[] {
  if (dispenses.length === 0 && distributionRequests.length === 0) {
    return [
      { label: "Pemakaian 7 hari", value: 0, delta: 0 },
      { label: "Distribusi aktif", value: 0, delta: 0 },
      { label: "Batch terpantau", value: stockBatches.length, delta: 0 },
      { label: "Kepatuhan scan", value: 0, delta: 0 }
    ];
  }

  const now = Date.now();
  const last7 = dispenses
    .filter((item) => now - new Date(item.createdAt).getTime() <= 7 * DAY_IN_MS)
    .reduce((sum, item) => sum + item.quantity, 0);
  const previous7 = dispenses
    .filter((item) => {
      const age = now - new Date(item.createdAt).getTime();
      return age > 7 * DAY_IN_MS && age <= 14 * DAY_IN_MS;
    })
    .reduce((sum, item) => sum + item.quantity, 0);
  const usageDelta = previous7 === 0 ? (last7 > 0 ? 100 : 0) : Math.round(((last7 - previous7) / previous7) * 100);

  const activeDistributions = distributionRequests.filter((item) =>
    ["pending", "dikirim", "selisih"].includes(item.status)
  ).length;
  const scanCompliance =
    dispenses.length === 0
      ? 100
      : Math.round(
          (dispenses.filter((item) => item.batchCode.trim().length > 0).length / dispenses.length) * 100
        );

  return [
    { label: "Pemakaian 7 hari", value: last7, delta: usageDelta },
    { label: "Distribusi aktif", value: activeDistributions, delta: distributionRequests.length },
    { label: "Batch terpantau", value: stockBatches.length, delta: stockBatches.filter((item) => item.discrepancy).length * -1 },
    { label: "Kepatuhan scan", value: scanCompliance, delta: scanCompliance === 100 ? 0 : -1 }
  ];
}

function summarizeClusterUsage(dispenses: DispenseRecord[]) {
  const orderedClusters = [
    "Manajemen",
    "Ibu & Anak",
    "Dewasa & Lansia",
    "Penyakit Menular",
    "UGD",
    "Lab",
    "Farmasi",
    "Rawat Inap"
  ] as const;

  return orderedClusters.map((cluster) => ({
    label: cluster,
    value: dispenses
      .filter((item) => item.cluster === cluster)
      .reduce((sum, item) => sum + item.quantity, 0),
    delta: 0
  }));
}

function summarizeSuspiciousPatterns(
  stockOpnames: StockOpnameRecord[],
  distributionRequests: DistributionRequest[],
  dispenses: DispenseRecord[]
): SuspiciousPattern[] {
  const patterns: SuspiciousPattern[] = [];

  stockOpnames
    .filter((item) => item.variance !== 0)
    .slice(0, 2)
    .forEach((item) => {
      patterns.push({
        id: `opname-${item.id}`,
        signal: "Selisih stock opname",
        description: `Batch ${item.batchId} memiliki selisih ${item.variance > 0 ? "+" : ""}${item.variance} unit dan perlu investigasi.`,
        riskScore: Math.min(95, 60 + Math.abs(item.variance))
      });
    });

  distributionRequests
    .filter((item) => item.status === "selisih")
    .slice(0, 2)
    .forEach((item) => {
      patterns.push({
        id: `distribution-${item.id}`,
        signal: "Selisih distribusi",
        description: `${item.requestingUnit} menerima ${item.quantityReceived} dari ${item.quantityApproved} unit approve.`,
        riskScore: 84
      });
    });

  dispenses
    .filter((item) => item.quantity >= LARGE_DISPENSE_THRESHOLD)
    .slice(0, 2)
    .forEach((item) => {
      patterns.push({
        id: `dispense-${item.id}`,
        signal: "Pengeluaran besar",
        description: `${item.unitName} mengambil ${item.quantity} unit ${item.drugId} pada ${item.cluster}.`,
        riskScore: 72
      });
    });

  return patterns.slice(0, 4);
}

function deriveAlerts(
  persistedAlerts: AlertItem[],
  stockBatches: StockBatch[],
  distributionRequests: DistributionRequest[]
) {
  const derived: AlertItem[] = [];
  const lowStockByDrug = new Map<string, number>();

  stockBatches.forEach((batch) => {
    const nextTotal = (lowStockByDrug.get(batch.drugId) ?? 0) + (batch.discrepancy ? 0 : availableQuantity(batch));
    lowStockByDrug.set(batch.drugId, nextTotal);

    const daysLeft = daysUntil(batch.expiryDate);
    if (daysLeft <= NEAR_EXPIRY_DAYS) {
      derived.push(buildExpiryAlert(batch, daysLeft));
    }
  });

  lowStockByDrug.forEach((total, drugId) => {
    if (total <= LOW_STOCK_THRESHOLD) {
      derived.push(buildLowStockAlert(drugId, total));
    }
  });

  distributionRequests
    .filter((item) => item.status === "selisih")
    .forEach((item) => {
      derived.push({
        id: `variance-${item.id}`,
        severity: "critical",
        title: `Selisih distribusi ${item.id}`,
        detail: `${item.requestingUnit} menerima ${item.quantityReceived} dari ${item.quantityApproved} unit yang disetujui.`,
        action: "Segera tutup investigasi dan lengkapi berita acara digital."
      });
    });

  const merged = new Map<string, AlertItem>();
  [...derived, ...persistedAlerts].forEach((alert) => {
    merged.set(alert.id, alert);
  });

  return Array.from(merged.values());
}

function buildDashboardSnapshotFromCollections(input: {
  stockBatches: StockBatch[];
  distributionRequests: DistributionRequest[];
  persistedAlerts: AlertItem[];
  auditTrail: AuditEvent[];
  dispenses: DispenseRecord[];
  stockOpnames: StockOpnameRecord[];
}): DashboardSnapshot {
  const alerts = deriveAlerts(input.persistedAlerts, input.stockBatches, input.distributionRequests)
    .sort((left, right) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 } as const;
      return severityOrder[left.severity] - severityOrder[right.severity];
    })
    .slice(0, 8);

  return {
    alerts,
    auditTrail: [...input.auditTrail]
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, 8),
    clusterUsage: summarizeClusterUsage(input.dispenses),
    suspiciousPatterns: summarizeSuspiciousPatterns(
      [...input.stockOpnames].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      [...input.distributionRequests].sort((left, right) => right.requestedAt.localeCompare(left.requestedAt)),
      [...input.dispenses].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    ),
    usageStats: summarizeUsageStats(input.stockBatches, input.distributionRequests, input.dispenses)
  };
}

async function refreshDashboardSummary() {
  const db = dbOrNull();
  if (!db) {
    return;
  }

  if (dashboardSummaryRefreshInFlight) {
    return dashboardSummaryRefreshInFlight;
  }

  if (Date.now() - dashboardSummaryRefreshedAt < DASHBOARD_REFRESH_MIN_INTERVAL_MS) {
    return;
  }

  dashboardSummaryRefreshInFlight = (async () => {
    const [
      stockBatches,
      distributionRequests,
      persistedAlerts,
      auditTrail,
      dispenses,
      stockOpnames
    ] = await Promise.all([
      getStockBatches(),
      getDistributionRequests(),
      getAlerts(),
      getAuditTrail(),
      getDispenseTransactions(),
      getStockOpnameRecords()
    ]);

    const snapshot = buildDashboardSnapshotFromCollections({
      stockBatches,
      distributionRequests,
      persistedAlerts,
      auditTrail,
      dispenses,
      stockOpnames
    });

    await writeDocument<DashboardSnapshot & { id: string; updatedAt: string }>("dashboard_summary", {
      id: "main",
      updatedAt: new Date().toISOString(),
      ...snapshot
    });
    setCachedDashboardSummary(snapshot);
  })()
    .catch(() => undefined)
    .finally(() => {
      dashboardSummaryRefreshInFlight = null;
    });

  return dashboardSummaryRefreshInFlight;
}

async function getStockBatchById(id: string) {
  const live = await readDocument<StockBatch>("stock_batches", id);
  if (live) {
    return live;
  }

  const batches = await getStockBatches();
  return batches.find((item) => item.id === id) ?? null;
}

async function getStockBatchByDrugAndBatch(drugId: string, batchCode: string) {
  const batches = await getStockBatches();
  return (
    batches.find(
      (item) => item.drugId === drugId && item.batch.toLowerCase() === batchCode.trim().toLowerCase()
    ) ?? null
  );
}

async function buildFefoAllocations(drugId: string, quantityNeeded: number) {
  const candidates = (await getStockBatches())
    .filter((batch) => batch.drugId === drugId && !batch.discrepancy && availableQuantity(batch) > 0)
    .sort(sortByFefo);

  const allocations: BatchAllocation[] = [];
  let remaining = quantityNeeded;

  for (const batch of candidates) {
    if (remaining <= 0) {
      break;
    }

    const quantity = Math.min(availableQuantity(batch), remaining);
    allocations.push({
      batchId: batch.id,
      batchCode: batch.batch,
      expiryDate: batch.expiryDate,
      location: batch.location,
      quantity
    });
    remaining -= quantity;
  }

  if (remaining > 0) {
    throw new Error(
      `Stok FEFO tidak cukup untuk ${drugId}. Tersedia ${quantityNeeded - remaining} dari ${quantityNeeded} unit.`
    );
  }

  return allocations;
}

async function reserveAllocations(allocations: BatchAllocation[]) {
  const updated: StockBatch[] = [];

  for (const allocation of allocations) {
    const batch = await getStockBatchById(allocation.batchId);
    if (!batch) {
      throw new Error(`Batch ${allocation.batchId} tidak ditemukan.`);
    }

    if (batch.discrepancy) {
      throw new Error(`Batch ${batch.batch} sedang ditahan karena discrepancy.`);
    }

    if (availableQuantity(batch) < allocation.quantity) {
      throw new Error(`Batch ${batch.batch} tidak memiliki stok cukup untuk reservasi.`);
    }

    const next = await updateDocument<StockBatch>("stock_batches", batch.id, {
      reserved: batch.reserved + allocation.quantity,
      lastUpdated: new Date().toISOString()
    });
    updated.push(next);
  }

  return updated;
}

async function releaseAllocations(allocations: BatchAllocation[]) {
  for (const allocation of allocations) {
    const batch = await getStockBatchById(allocation.batchId);
    if (!batch) {
      continue;
    }

    await updateDocument<StockBatch>("stock_batches", batch.id, {
      reserved: Math.max(0, batch.reserved - allocation.quantity),
      lastUpdated: new Date().toISOString()
    });
  }
}

async function consumeAllocations(allocations: BatchAllocation[], releaseReserved: boolean) {
  const touchedDrugIds = new Set<string>();

  for (const allocation of allocations) {
    const batch = await getStockBatchById(allocation.batchId);
    if (!batch) {
      throw new Error(`Batch ${allocation.batchId} tidak ditemukan saat pengiriman.`);
    }

    if (batch.quantity < allocation.quantity) {
      throw new Error(`Saldo batch ${batch.batch} tidak cukup untuk pengiriman.`);
    }

    if (releaseReserved && batch.reserved < allocation.quantity) {
      throw new Error(`Reservasi batch ${batch.batch} tidak cukup untuk dikirim.`);
    }

    const nextReserved = releaseReserved ? Math.max(0, batch.reserved - allocation.quantity) : batch.reserved;
    await updateDocument<StockBatch>("stock_batches", batch.id, {
      quantity: batch.quantity - allocation.quantity,
      reserved: nextReserved,
      lastUpdated: new Date().toISOString()
    });
    touchedDrugIds.add(batch.drugId);
  }

  for (const drugId of touchedDrugIds) {
    await syncDrugStockAlert(drugId);
  }
}

async function resolveDispenseBatch(batchCode: string, drugId: string, quantity: number) {
  const batches = (await getStockBatches())
    .filter((item) => item.drugId === drugId && !item.discrepancy)
    .sort(sortByFefo);

  const normalized = batchCode.trim();
  const codeParts = normalized
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  const direct = batches.find((item) => item.id === normalized || item.batch === normalized);
  if (direct) {
    return direct;
  }

  const composite = batches.find(
    (item) => codeParts.includes(item.id) || codeParts.includes(item.batch)
  );
  if (composite) {
    return composite;
  }

  if (codeParts.includes(drugId) || normalized.startsWith("DST-")) {
    return batches.find((item) => availableQuantity(item) >= quantity) ?? null;
  }

  return null;
}

export async function getFornasCatalog() {
  const rows = await readCollection<FornasDrug>("fornas_catalog", demoFallback(fallbackFornasCatalog));

  return rows.map(normalizeFornasDrug).sort((left, right) => {
    const genericOrder = left.genericName.localeCompare(right.genericName, "id");
    if (genericOrder !== 0) {
      return genericOrder;
    }

    const formOrder = left.dosageForm.localeCompare(right.dosageForm, "id");
    if (formOrder !== 0) {
      return formOrder;
    }

    return left.strength.localeCompare(right.strength, "id");
  });
}

export async function getStockBatches() {
  const rows = await readCollection<StockBatch>("stock_batches", demoFallback(fallbackStockBatches));
  return rows.sort(sortByFefo);
}

export async function getDistributionRequests() {
  const rows = await readCollection<DistributionRequest>(
    "distribution_requests",
    demoFallback(fallbackDistributionRequests)
  );

  return rows.sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
}

export async function getReceipts() {
  const rows = await readCollection<ReceiptRecord>("receipts", []);
  return rows.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getDispenseTransactions() {
  const rows = await readCollection<DispenseRecord>("dispense_transactions", []);
  return rows.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getStockOpnameRecords() {
  const rows = await readCollection<StockOpnameRecord>("stock_opnames", []);
  return rows.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getAlerts() {
  return readCollection<AlertItem>("alerts", demoFallback(fallbackAlerts));
}

export async function getAuditTrail() {
  const rows = await readCollection<AuditEvent>("audit_events", demoFallback(fallbackAuditTrail));
  return rows.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export async function getGuideSections() {
  const rows = await readCollection<GuideSection>("guide_sections", fallbackGuideSections);
  return rows.length > 0 ? rows : fallbackGuideSections;
}

export async function getRackMap() {
  return demoFallback(fallbackRackMap as RackCell[]);
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const cached = getCachedDashboardSummary();
  if (cached) {
    return cached;
  }

  const summary = await readDocument<DashboardSnapshot & { id: string; updatedAt?: string }>(
    "dashboard_summary",
    "main"
  );
  if (summary) {
    const snapshot: DashboardSnapshot = {
      alerts: summary.alerts ?? [],
      auditTrail: summary.auditTrail ?? [],
      clusterUsage: summary.clusterUsage ?? demoFallback(fallbackClusterUsage),
      suspiciousPatterns: summary.suspiciousPatterns ?? demoFallback(fallbackSuspiciousPatterns),
      usageStats: summary.usageStats ?? demoFallback(fallbackUsageStats)
    };
    setCachedDashboardSummary(snapshot);
    return snapshot;
  }

  const [
    stockBatches,
    distributionRequests,
    persistedAlerts,
    auditTrail,
    dispenses,
    stockOpnames
  ] = await Promise.all([
    getStockBatches(),
    getDistributionRequests(),
    getAlerts(),
    getAuditTrail(),
    getDispenseTransactions(),
    getStockOpnameRecords()
  ]);

  const snapshot = buildDashboardSnapshotFromCollections({
    stockBatches,
    distributionRequests,
    persistedAlerts,
    auditTrail,
    dispenses,
    stockOpnames
  });
  if (dbOrNull()) {
    await writeDocument<DashboardSnapshot & { id: string; updatedAt: string }>("dashboard_summary", {
      id: "main",
      updatedAt: new Date().toISOString(),
      ...snapshot
    });
  }
  setCachedDashboardSummary(snapshot);
  return snapshot ?? emptyDashboardSnapshot;
}

export async function getDistributionRequestById(id: string) {
  const live = await readDocument<DistributionRequest>("distribution_requests", id);
  if (live) {
    return live;
  }

  const requests = await getDistributionRequests();
  return requests.find((item) => item.id === id) ?? null;
}

export async function getReceiptById(id: string) {
  const live = await readDocument<ReceiptRecord>("receipts", id);
  if (live) {
    return live;
  }

  const receipts = await getReceipts();
  return receipts.find((item) => item.id === id) ?? null;
}

export async function getUserProfile(uid: string) {
  const db = dbOrNull();
  if (!db) {
    return null;
  }

  try {
    const doc = await db.collection("users").doc(uid).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as UserProfile & { id: string }) : null;
  } catch {
    return null;
  }
}

export async function getGoLiveConfig() {
  const config = await readDocument<GoLiveConfig>("system_config", "facility_profile");
  return config;
}

export async function saveGoLiveConfig(
  input: Omit<GoLiveConfig, "id" | "updatedAt" | "updatedBy" | "productionActivatedAt">,
  actor: SessionUser
) {
  const current = await getGoLiveConfig();
  const timestamp = new Date().toISOString();

  const payload: GoLiveConfig = {
    id: "facility_profile",
    facilityName: input.facilityName.trim(),
    facilityCode: input.facilityCode.trim(),
    districtCity: input.districtCity.trim(),
    province: input.province.trim(),
    address: input.address.trim(),
    contactPhone: input.contactPhone.trim(),
    contactEmail: input.contactEmail.trim(),
    pharmacyLeadName: input.pharmacyLeadName.trim(),
    pharmacyLeadLicense: input.pharmacyLeadLicense.trim(),
    updatedAt: timestamp,
    updatedBy: actor.name,
    productionActivatedAt: current?.productionActivatedAt ?? (isStrictProductionMode() ? timestamp : undefined)
  };

  await writeDocument<GoLiveConfig>("system_config", payload);
  return payload;
}

export async function getPilotReadinessSummary(usersByRole: Record<UserRole, number>): Promise<PilotReadinessSummary> {
  const [config, catalog, stockBatches] = await Promise.all([getGoLiveConfig(), getFornasCatalog(), getStockBatches()]);
  const fornasInitialCoverage = Array.from(
    new Set(
      catalog
        .map((item) => item.genericName.trim().charAt(0).toUpperCase())
        .filter((initial) => /^[A-Z]$/.test(initial))
    )
  ).sort((left, right) => left.localeCompare(right, "id"));

  const stockedDrugCount = new Set(stockBatches.map((item) => item.drugId)).size;

  return {
    facilityConfigured: Boolean(config?.facilityName && config?.facilityCode),
    fornasCount: catalog.length,
    fornasInitialCoverage,
    fornasMissingInitials: ALPHABET_INITIALS.filter((initial) => !fornasInitialCoverage.includes(initial)),
    stockBatchCount: stockBatches.length,
    stockedDrugCount,
    usersByRole
  };
}

export async function upsertUserProfile(profile: UserProfile) {
  return writeDocument<UserProfile & { id: string }>("users", { ...profile, id: profile.uid });
}

async function createAuditEvent(
  actor: SessionUser,
  action: string,
  entity: string,
  reference: string,
  mode: "online" | "offline"
) {
  const audit: AuditEvent = {
    id: randomUUID(),
    actor: actor.name,
    role: actor.role,
    action,
    entity,
    reference,
    timestamp: new Date().toISOString(),
    mode
  };

  await writeDocument<AuditEvent>("audit_events", audit);
  void refreshDashboardSummary();
  return audit;
}

export async function createReceipt(
  input: {
    documentNumber: string;
    drugId: string;
    batch: string;
    expiryDate: string;
    coverageScheme?: CoverageScheme;
    quantityDocument: number;
    quantityPhysical: number;
    unitPrice?: number | null;
    priceSource?: string;
    location: string;
  },
  actor: SessionUser
) {
  const status = input.quantityDocument === input.quantityPhysical ? "MATCH" : "DISCREPANCY";
  const workflowStage: WorkflowStage = status === "DISCREPANCY" ? "discrepancy-review" : "submitted";
  const existingBatch = await getStockBatchByDrugAndBatch(input.drugId, input.batch);
  const stockBatchId = existingBatch?.id ?? randomUUID();
  const createdAt = new Date().toISOString();

  const receipt: ReceiptRecord = {
    id: randomUUID(),
    documentNumber: input.documentNumber,
    drugId: input.drugId,
    batch: input.batch,
    expiryDate: input.expiryDate,
    coverageScheme: normalizeCoverageScheme(input.coverageScheme),
    quantityDocument: input.quantityDocument,
    quantityPhysical: input.quantityPhysical,
    unitPrice: typeof input.unitPrice === "number" && input.unitPrice > 0 ? input.unitPrice : null,
    totalValue:
      typeof input.unitPrice === "number" && input.unitPrice > 0
        ? Number((input.unitPrice * input.quantityPhysical).toFixed(2))
        : null,
    priceSource: input.priceSource?.trim() || "",
    status,
    location: input.location,
    createdBy: actor.name,
    createdAt,
    workflowStage,
    qrValue: `${input.documentNumber}|${input.drugId}|${input.batch}`,
    stockBatchId,
    reviewTrail: [
      buildApprovalEntry(
        actor,
        workflowStage,
        status === "DISCREPANCY"
          ? "Penerimaan tercatat dan menunggu review discrepancy."
          : "Penerimaan tercatat dan menunggu verifikasi apoteker."
      )
    ]
  };

  await writeDocument<ReceiptRecord>("receipts", receipt);

  const stockBatch: StockBatch = {
    id: stockBatchId,
    drugId: input.drugId,
    batch: input.batch,
    expiryDate: input.expiryDate,
    quantity: (existingBatch?.quantity ?? 0) + input.quantityPhysical,
    reserved: existingBatch?.reserved ?? 0,
    location: input.location,
    lastUpdated: createdAt,
    sourceDocument: input.documentNumber,
    discrepancy: (existingBatch?.discrepancy ?? false) || status === "DISCREPANCY"
  };

  await writeDocument<StockBatch>("stock_batches", stockBatch);
  await syncBatchExpiryAlert(stockBatch);
  await syncDrugStockAlert(stockBatch.drugId);
  await createAuditEvent(actor, "Penerimaan obat", "Penerimaan", receipt.id, "online");

  return receipt;
}

export async function createInitialStockReceipts(
  input: {
    documentNumber: string;
    rows: Array<{
      drugId: string;
      batch: string;
      expiryDate: string;
      coverageScheme?: CoverageScheme;
      quantityDocument: number;
      quantityPhysical: number;
      unitPrice?: number | null;
      priceSource?: string;
      location: string;
    }>;
  },
  actor: SessionUser
) {
  const created: ReceiptRecord[] = [];

  for (const row of input.rows) {
    const receipt = await createReceipt(
      {
        documentNumber: input.documentNumber,
        drugId: row.drugId,
        batch: row.batch,
        expiryDate: row.expiryDate,
        coverageScheme: row.coverageScheme,
        quantityDocument: row.quantityDocument,
        quantityPhysical: row.quantityPhysical,
        unitPrice: row.unitPrice,
        priceSource: row.priceSource,
        location: row.location
      },
      actor
    );
    created.push(receipt);
  }

  return {
    createdCount: created.length,
    discrepancyCount: created.filter((item) => item.status === "DISCREPANCY").length,
    sampleIds: created.slice(0, 5).map((item) => item.id)
  };
}

export async function reviewReceiptRecord(
  id: string,
  input: {
    stage: Extract<WorkflowStage, "verified" | "discrepancy-review" | "rejected">;
    note: string;
  },
  actor: SessionUser
) {
  const current = await getReceiptById(id);
  if (!current) {
    throw new Error("Data penerimaan tidak ditemukan.");
  }

  const trail = [...(current.reviewTrail ?? []), buildApprovalEntry(actor, input.stage, input.note)];
  const next = await updateDocument<ReceiptRecord>("receipts", id, {
    workflowStage: input.stage,
    reviewedBy: actor.name,
    reviewedAt: new Date().toISOString(),
    reviewTrail: trail
  });

  if (current.stockBatchId) {
    const batch = await getStockBatchById(current.stockBatchId);
    if (batch) {
      const nextDiscrepancy = input.stage !== "verified";
      const updatedBatch = await updateDocument<StockBatch>("stock_batches", batch.id, {
        discrepancy: nextDiscrepancy,
        lastUpdated: new Date().toISOString()
      });
      await syncBatchExpiryAlert(updatedBatch);
      await syncDrugStockAlert(updatedBatch.drugId);
    }
  }

  await createAuditEvent(actor, "Review penerimaan", "Penerimaan", id, "online");
  return next;
}

export async function createDistributionRequestRecord(
  input: {
    requestingUnit: string;
    cluster: DistributionRequest["cluster"];
    drugId: string;
    quantityRequested: number;
    quantityApproved: number;
    eta: string;
  },
  actor: SessionUser
) {
  const distributionId = `DST-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 900 + 100)}`;
  const autoApproved =
    (actor.role === "Admin (Apoteker)" || actor.role === "Petugas Farmasi") &&
    input.quantityApproved > 0;
  const allocations = autoApproved ? await buildFefoAllocations(input.drugId, input.quantityApproved) : [];

  try {
    if (autoApproved) {
      await reserveAllocations(allocations);
    }

    const approvalTrail = [buildApprovalEntry(actor, "submitted", "Permintaan distribusi dibuat.")];

    if (autoApproved) {
      approvalTrail.push(
        buildApprovalEntry(actor, "approved", `Disetujui ${input.quantityApproved} unit dengan alokasi FEFO.`)
      );
    }

    const distribution: DistributionRequest = {
      id: distributionId,
      requestingUnit: input.requestingUnit,
      cluster: input.cluster,
      requestedBy: actor.name,
      status: "pending",
      drugId: input.drugId,
      quantityRequested: input.quantityRequested,
      quantityApproved: autoApproved ? input.quantityApproved : 0,
      quantityReceived: 0,
      requestedAt: new Date().toISOString(),
      eta: input.eta,
      workflowStage: autoApproved ? "approved" : "submitted",
      approvalTrail,
      approvedBy: autoApproved ? actor.name : undefined,
      approvedAt: autoApproved ? new Date().toISOString() : undefined,
      qrValue: autoApproved
        ? `${distributionId}|${input.drugId}|${input.quantityApproved}|${input.requestingUnit}`
        : undefined,
      allocations: allocations.length > 0 ? allocations : undefined
    };

    await writeDocument<DistributionRequest>("distribution_requests", distribution);
    await syncDrugStockAlert(input.drugId);
    await createAuditEvent(actor, "Distribusi dibuat", "Distribusi", distribution.id, "online");
    return distribution;
  } catch (error) {
    if (autoApproved && allocations.length > 0) {
      await releaseAllocations(allocations);
    }

    throw error;
  }
}

export async function updateDistributionWorkflow(
  id: string,
  input: {
    action: "approve" | "dispatch" | "receive" | "variance";
    quantityApproved?: number;
    quantityReceived?: number;
    note: string;
  },
  actor: SessionUser
) {
  const current = await getDistributionRequestById(id);
  if (!current) {
    throw new Error("Distribusi tidak ditemukan.");
  }

  const trail = [...(current.approvalTrail ?? [])];
  const patch: Partial<DistributionRequest> = {};

  if (input.action === "approve") {
    if (["dispatched", "received", "variance"].includes(current.workflowStage ?? "")) {
      throw new Error("Distribusi yang sudah dikirim atau ditutup tidak bisa di-approve ulang.");
    }

    const previousAllocations = current.allocations ?? [];

    try {
      if (previousAllocations.length) {
        await releaseAllocations(previousAllocations);
      }

      const approvedQty = input.quantityApproved ?? current.quantityRequested;
      if (approvedQty <= 0) {
        throw new Error("Jumlah approve harus lebih besar dari nol.");
      }

      const allocations = await buildFefoAllocations(current.drugId, approvedQty);
      await reserveAllocations(allocations);

      patch.workflowStage = "approved";
      patch.status = "pending";
      patch.quantityApproved = approvedQty;
      patch.approvedBy = actor.name;
      patch.approvedAt = new Date().toISOString();
      patch.qrValue = `${current.id}|${current.drugId}|${approvedQty}|${current.requestingUnit}`;
      patch.allocations = allocations;
      trail.push(buildApprovalEntry(actor, "approved", input.note || `Disetujui ${approvedQty} unit.`));
      await syncDrugStockAlert(current.drugId);
    } catch (error) {
      if (previousAllocations.length) {
        await reserveAllocations(previousAllocations);
      }

      throw error;
    }
  }

  if (input.action === "dispatch") {
    if (current.workflowStage !== "approved") {
      throw new Error("Distribusi harus berada pada stage approved sebelum dikirim.");
    }

    const allocations =
      current.allocations && current.allocations.length > 0
        ? current.allocations
        : await buildFefoAllocations(current.drugId, current.quantityApproved);
    const hasReservedAllocations = Boolean(current.allocations?.length);

    await consumeAllocations(allocations, hasReservedAllocations);
    patch.workflowStage = "dispatched";
    patch.status = "dikirim";
    patch.dispatchedAt = new Date().toISOString();
    patch.allocations = allocations;
    trail.push(buildApprovalEntry(actor, "dispatched", input.note || "Distribusi dikirim ke unit."));
  }

  if (input.action === "receive") {
    if (current.workflowStage !== "dispatched") {
      throw new Error("Penerimaan hanya bisa ditutup setelah distribusi berstatus dikirim.");
    }

    const receivedQty = input.quantityReceived ?? current.quantityApproved;
    patch.quantityReceived = receivedQty;
    patch.receivedBy = actor.name;
    patch.receivedAt = new Date().toISOString();
    const variance = receivedQty !== current.quantityApproved;
    patch.workflowStage = variance ? "variance" : "received";
    patch.status = variance ? "selisih" : "diterima";
    trail.push(
      buildApprovalEntry(
        actor,
        variance ? "variance" : "received",
        input.note || `Penerimaan distribusi ${receivedQty} unit.`
      )
    );
  }

  if (input.action === "variance") {
    if (!["dispatched", "received", "variance"].includes(current.workflowStage ?? "")) {
      throw new Error("Selisih hanya bisa ditandai setelah barang dikirim.");
    }

    patch.workflowStage = "variance";
    patch.status = "selisih";
    trail.push(buildApprovalEntry(actor, "variance", input.note || "Terdapat selisih pada distribusi."));
  }

  patch.approvalTrail = trail;
  const next = await updateDocument<DistributionRequest>("distribution_requests", id, patch);
  await syncDistributionVarianceAlert(next, patch.quantityReceived);
  await createAuditEvent(actor, "Update workflow distribusi", "Distribusi", id, "online");
  return next;
}

export async function createDispenseRecord(
  input: {
    drugId: string;
    batchCode: string;
    cluster: DispenseRecord["cluster"];
    quantity: number;
    unitName: string;
    mode?: "online" | "offline";
  },
  actor: SessionUser
) {
  const batch = await resolveDispenseBatch(input.batchCode, input.drugId, input.quantity);
  if (!batch) {
    throw new Error("QR batch tidak dikenali atau batch tidak ditemukan untuk obat yang dipilih.");
  }

  if (batch.discrepancy) {
    throw new Error("Batch sedang ditahan karena discrepancy dan tidak bisa dikeluarkan.");
  }

  if (availableQuantity(batch) < input.quantity) {
    throw new Error(`Saldo tersedia batch ${batch.batch} tidak cukup untuk pengambilan ${input.quantity} unit.`);
  }

  await updateDocument<StockBatch>("stock_batches", batch.id, {
    quantity: batch.quantity - input.quantity,
    lastUpdated: new Date().toISOString()
  });

  const record: DispenseRecord = {
    id: randomUUID(),
    drugId: input.drugId,
    batchCode: batch.batch,
    cluster: input.cluster,
    quantity: input.quantity,
    unitName: input.unitName,
    actorName: actor.name,
    role: actor.role,
    mode: input.mode ?? "online",
    createdAt: new Date().toISOString()
  };

  await writeDocument<DispenseRecord>("dispense_transactions", record);
  await syncBatchExpiryAlert({
    ...batch,
    quantity: batch.quantity - input.quantity,
    lastUpdated: record.createdAt
  });
  await syncDrugStockAlert(input.drugId);

  if (input.quantity >= LARGE_DISPENSE_THRESHOLD) {
    await upsertOperationalAlert({
      id: `dispense-large-${record.id}`,
      severity: "warning",
      title: "Pengeluaran besar terdeteksi",
      detail: `${input.unitName} mengambil ${input.quantity} unit ${input.drugId} pada ${input.cluster}.`,
      action: "Pastikan resep, register layanan, dan stok fisik unit sudah sesuai."
    });
  }

  await createAuditEvent(actor, "Pengambilan obat", "Pengambilan", record.id, record.mode);
  return record;
}

export async function createStockOpnameRecord(
  input: {
    batchId: string;
    systemQuantity: number;
    physicalQuantity: number;
  },
  actor: SessionUser
) {
  const batch = await getStockBatchById(input.batchId);
  if (!batch) {
    throw new Error("Batch stock opname tidak ditemukan.");
  }

  const systemQuantity = batch.quantity;
  const variance = input.physicalQuantity - systemQuantity;
  const record: StockOpnameRecord = {
    id: randomUUID(),
    batchId: input.batchId,
    systemQuantity,
    physicalQuantity: input.physicalQuantity,
    variance,
    actorName: actor.name,
    createdAt: new Date().toISOString()
  };

  await writeDocument<StockOpnameRecord>("stock_opnames", record);
  const updatedBatch = await updateDocument<StockBatch>("stock_batches", batch.id, {
    quantity: input.physicalQuantity,
    reserved: Math.min(batch.reserved, input.physicalQuantity),
    discrepancy: variance !== 0,
    lastUpdated: record.createdAt
  });
  await createAuditEvent(actor, "Stock opname", "Stok", record.id, "online");

  if (variance !== 0) {
    await upsertOperationalAlert({
      id: `opname-${batch.id}`,
      severity: "warning",
      title: "Selisih stock opname",
      detail: `Batch ${batch.batch} memiliki selisih ${variance > 0 ? "+" : ""}${variance} unit.`,
      action: "Lakukan investigasi fisik, cek log scan, dan tutup dengan berita acara."
    });
  } else {
    await deleteDocument("alerts", `opname-${batch.id}`);
  }

  await syncBatchExpiryAlert(updatedBatch);
  await syncDrugStockAlert(updatedBatch.drugId);

  return record;
}

export async function importFornasCatalog(
  rows: Array<Omit<FornasDrug, "id"> & { id?: string }>,
  actor: SessionUser
) {
  const payloads = rows.map((row) => {
    const id =
      row.id ??
      slugify(`${row.genericName}-${row.dosageForm}-${row.strength}`.replace(/\//g, "-"));

    return normalizeFornasDrug({
      ...row,
      id
    } satisfies FornasDrug);
  });

  await writeDocuments<FornasDrug>("fornas_catalog", payloads);

  await createAuditEvent(
    actor,
    `Import FORNAS ${payloads.length} item`,
    "FORNAS",
    payloads[0]?.id ?? "bulk-import",
    "online"
  );

  return {
    imported: payloads.length,
    sampleIds: payloads.slice(0, 5).map((item) => item.id)
  };
}

export async function replaceFornasCatalog(
  rows: Array<Omit<FornasDrug, "id"> & { id?: string }>,
  actor: SessionUser,
  sourceLabel = "FORNAS resmi"
) {
  const currentRows = await readStoredCollection<FornasDrug>("fornas_catalog");
  const payloads = rows.map((row) => {
    const id =
      row.id ??
      slugify(`${row.genericName}-${row.dosageForm}-${row.strength}`.replace(/\//g, "-"));

    return normalizeFornasDrug({
      ...row,
      id
    } satisfies FornasDrug);
  });

  await writeDocuments<FornasDrug>("fornas_catalog", payloads);
  const importedIds = new Set(payloads.map((item) => item.id));

  const staleIds = currentRows
    .map((item) => item.id)
    .filter((id) => !importedIds.has(id));

  await deleteDocuments("fornas_catalog", staleIds);

  await createAuditEvent(
    actor,
    `Sinkron ${sourceLabel} ${importedIds.size} item`,
    "FORNAS",
    Array.from(importedIds)[0] ?? "bulk-sync",
    "online"
  );

  return {
    imported: importedIds.size,
    purged: staleIds.length,
    sampleIds: Array.from(importedIds).slice(0, 5)
  };
}

export async function importFornasReferencePrices(
  rows: Array<{
    id?: string;
    genericName?: string;
    dosageForm?: string;
    strength?: string;
    coverageScheme?: CoverageScheme;
    referencePrice: number;
    referencePriceSource?: string;
    referencePriceUpdatedAt?: string;
  }>,
  actor: SessionUser
) {
  const currentRows = await getFornasCatalog();
  const currentById = new Map(currentRows.map((item) => [item.id, item]));
  const currentBySignature = new Map(
    currentRows.map((item) => [
      slugify(`${item.genericName}-${item.dosageForm}-${item.strength}`.replace(/\//g, "-")),
      item
    ])
  );

  const updatedRows: FornasDrug[] = [];
  const unmatchedRows: string[] = [];

  rows.forEach((row, index) => {
    const directMatch = row.id ? currentById.get(row.id) : null;
    const signature = slugify(
      `${row.genericName ?? ""}-${row.dosageForm ?? ""}-${row.strength ?? ""}`.replace(/\//g, "-")
    );
    const matched = directMatch ?? currentBySignature.get(signature);

    if (!matched) {
      unmatchedRows.push(row.id || signature || `baris-${index + 2}`);
      return;
    }

    updatedRows.push({
      ...matched,
      coverageScheme: normalizeCoverageScheme(row.coverageScheme ?? matched.coverageScheme),
      referencePrice: row.referencePrice,
      referencePriceSource:
        row.referencePriceSource?.trim() || matched.referencePriceSource || DEFAULT_DRUG_PRICE_NOTE,
      referencePriceUpdatedAt: row.referencePriceUpdatedAt || new Date().toISOString().slice(0, 10)
    });
  });

  if (updatedRows.length === 0) {
    throw new Error("Tidak ada baris harga yang cocok dengan katalog FORNAS aktif.");
  }

  await writeDocuments<FornasDrug>("fornas_catalog", updatedRows.map(normalizeFornasDrug));

  await createAuditEvent(
    actor,
    `Import harga JKN ${updatedRows.length} item`,
    "FORNAS",
    updatedRows[0]?.id ?? "bulk-price-import",
    "online"
  );

  return {
    updated: updatedRows.length,
    unmatched: unmatchedRows,
    sampleIds: updatedRows.slice(0, 5).map((item) => item.id)
  };
}

export function resolveRole(rawRole?: string): UserRole {
  switch (rawRole) {
    case "Admin (Apoteker)":
    case "Petugas Farmasi":
    case "Petugas Jaringan":
    case "Petugas Unit":
      return rawRole;
    default:
      return "Petugas Unit";
  }
}
