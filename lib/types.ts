export type ClusterILP =
  | "Manajemen"
  | "Ibu & Anak"
  | "Dewasa & Lansia"
  | "Penyakit Menular"
  | "UGD"
  | "Lab"
  | "Farmasi"
  | "Rawat Inap";

export type UserRole =
  | "Admin (Apoteker)"
  | "Petugas Farmasi"
  | "Petugas Jaringan"
  | "Petugas Unit";

export type DistributionStatus = "pending" | "dikirim" | "diterima" | "selisih";

export type AlertSeverity = "critical" | "warning" | "info";

export type ReceiptStatus = "MATCH" | "DISCREPANCY";
export type CoverageScheme = "JKN" | "Reguler";

export type WorkflowStage =
  | "submitted"
  | "approved"
  | "rejected"
  | "packed"
  | "dispatched"
  | "received"
  | "variance"
  | "verified"
  | "discrepancy-review";

export type MutationType = "dispense" | "receipt" | "distribution" | "stock-opname";

export type ReportType = "LPLPO" | "Distribusi" | "Pemakaian" | "Stok Akhir";
export type RuntimeMode = "demo" | "production";

export interface RegulationReference {
  title: string;
  code: string;
  publishDate: string;
  effectiveDate: string;
  status: string;
  description: string;
  sourceUrl: string;
}

export interface FornasDrug {
  id: string;
  genericName: string;
  therapeuticClass: string;
  dosageForm: string;
  strength: string;
  restriction: string;
  facilityLevel: string;
  cluster: ClusterILP[];
  isPriority: boolean;
  coverageScheme?: CoverageScheme;
  referencePrice?: number | null;
  referencePriceSource?: string;
  referencePriceUpdatedAt?: string;
}

export interface StockBatch {
  id: string;
  drugId: string;
  batch: string;
  expiryDate: string;
  quantity: number;
  reserved: number;
  location: string;
  lastUpdated: string;
  sourceDocument: string;
  discrepancy: boolean;
}

export interface BatchAllocation {
  batchId: string;
  batchCode: string;
  expiryDate: string;
  location: string;
  quantity: number;
}

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  action: string;
}

export interface DistributionRequest {
  id: string;
  requestingUnit: string;
  cluster: ClusterILP;
  requestedBy: string;
  status: DistributionStatus;
  drugId: string;
  quantityRequested: number;
  quantityApproved: number;
  quantityReceived: number;
  requestedAt: string;
  eta: string;
  workflowStage?: WorkflowStage;
  approvalTrail?: ApprovalEntry[];
  approvedBy?: string;
  approvedAt?: string;
  dispatchedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
  qrValue?: string;
  allocations?: BatchAllocation[];
}

export interface AuditEvent {
  id: string;
  actor: string;
  role: UserRole;
  action: string;
  entity: string;
  reference: string;
  timestamp: string;
  mode: "online" | "offline";
}

export interface GuideSection {
  id: string;
  title: string;
  subtitle: string;
  content: string[];
}

export interface RackCell {
  code: string;
  zone: string;
  itemCount: number;
  temperature: string;
}

export interface UsageStat {
  label: string;
  value: number;
  delta: number;
}

export interface SuspiciousPattern {
  id: string;
  signal: string;
  description: string;
  riskScore: number;
}

export interface PendingMutation {
  id: string;
  type: MutationType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ApprovalEntry {
  id: string;
  stage: WorkflowStage;
  actorName: string;
  actorRole: UserRole;
  note: string;
  timestamp: string;
}

export interface SessionUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  facilityId: string;
  facilityName: string;
}

export interface UserProfile extends SessionUser {
  active: boolean;
  createdAt: string;
}

export interface GoLiveConfig {
  id: string;
  facilityName: string;
  facilityCode: string;
  districtCity: string;
  province: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
  pharmacyLeadName: string;
  pharmacyLeadLicense: string;
  updatedAt: string;
  updatedBy: string;
  productionActivatedAt?: string;
}

export interface PilotReadinessSummary {
  facilityConfigured: boolean;
  fornasCount: number;
  fornasInitialCoverage: string[];
  fornasMissingInitials: string[];
  stockBatchCount: number;
  stockedDrugCount: number;
  usersByRole: Record<UserRole, number>;
}

export interface ManagedUserSummary extends UserProfile {
  emailVerified?: boolean;
  lastSignInAt?: string;
  lastRefreshAt?: string;
  disabled?: boolean;
}

export interface ReceiptRecord {
  id: string;
  documentNumber: string;
  drugId: string;
  batch: string;
  expiryDate: string;
  coverageScheme?: CoverageScheme;
  quantityDocument: number;
  quantityPhysical: number;
  unitPrice?: number | null;
  totalValue?: number | null;
  priceSource?: string;
  status: ReceiptStatus;
  location: string;
  createdBy: string;
  createdAt: string;
  workflowStage?: WorkflowStage;
  reviewTrail?: ApprovalEntry[];
  reviewedBy?: string;
  reviewedAt?: string;
  qrValue?: string;
  stockBatchId?: string;
}

export interface DispenseRecord {
  id: string;
  drugId: string;
  batchCode: string;
  cluster: ClusterILP;
  quantity: number;
  unitName: string;
  actorName: string;
  role: UserRole;
  mode: "online" | "offline";
  createdAt: string;
}

export interface StockOpnameRecord {
  id: string;
  batchId: string;
  systemQuantity: number;
  physicalQuantity: number;
  variance: number;
  actorName: string;
  createdAt: string;
}

export interface DashboardSnapshot {
  alerts: AlertItem[];
  auditTrail: AuditEvent[];
  clusterUsage: UsageStat[];
  suspiciousPatterns: SuspiciousPattern[];
  usageStats: UsageStat[];
}
