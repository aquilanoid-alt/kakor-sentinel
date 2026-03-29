import { randomUUID } from "crypto";
import type { UserRecord } from "firebase-admin/auth";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";
import { isFirebaseServerConfigured } from "@/lib/firebase/config";
import type {
  AuditEvent,
  ManagedUserSummary,
  SessionUser,
  UserProfile,
  UserRole
} from "@/lib/types";
import { normalizeFacilityId, normalizeFacilityName } from "@/lib/placeholders";
import { resolveRole } from "@/lib/server/repository";

const allowedRoles: UserRole[] = [
  "Admin (Apoteker)",
  "Petugas Farmasi",
  "Petugas Jaringan",
  "Petugas Unit"
];

function ensureConfigured() {
  if (!isFirebaseServerConfigured()) {
    throw new Error("Firebase server belum dikonfigurasi.");
  }
}

function normalizeRole(role: string): UserRole {
  const resolved = resolveRole(role);
  if (!allowedRoles.includes(resolved)) {
    throw new Error(`Role ${role} tidak didukung.`);
  }

  return resolved;
}

function mapUserRecord(
  userRecord: UserRecord,
  profile?: UserProfile | null
): ManagedUserSummary {
  const role = normalizeRole(
    String((userRecord.customClaims?.role as string | undefined) ?? profile?.role ?? "Petugas Unit")
  );

  return {
    uid: userRecord.uid,
    email: userRecord.email ?? profile?.email ?? "",
    name: userRecord.displayName ?? profile?.name ?? userRecord.email ?? "Petugas",
    role,
    facilityId: normalizeFacilityId(profile?.facilityId),
    facilityName: normalizeFacilityName(profile?.facilityName),
    active: profile?.active ?? !userRecord.disabled,
    createdAt: profile?.createdAt ?? userRecord.metadata.creationTime ?? new Date().toISOString(),
    emailVerified: userRecord.emailVerified,
    lastSignInAt: userRecord.metadata.lastSignInTime,
    lastRefreshAt: userRecord.tokensValidAfterTime,
    disabled: userRecord.disabled
  };
}

async function appendAuditEvent(
  actor: SessionUser,
  action: string,
  reference: string
) {
  if (!isFirebaseServerConfigured()) {
    return;
  }

  const db = getFirebaseAdminDb();
  const audit: AuditEvent = {
    id: randomUUID(),
    actor: actor.name,
    role: actor.role,
    action,
    entity: "User Management",
    reference,
    timestamp: new Date().toISOString(),
    mode: "online"
  };

  await db.collection("audit_events").doc(audit.id).set(audit);
}

async function getProfilesMap() {
  ensureConfigured();

  const snapshot = await getFirebaseAdminDb().collection("users").get();
  const map = new Map<string, UserProfile>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as UserProfile & { uid?: string };
    map.set(doc.id, {
      uid: data.uid ?? doc.id,
      email: data.email ?? "",
      name: data.name ?? "",
      role: resolveRole(data.role),
      facilityId: normalizeFacilityId(data.facilityId),
      facilityName: normalizeFacilityName(data.facilityName),
      active: data.active ?? true,
      createdAt: data.createdAt ?? new Date().toISOString()
    });
  });

  return map;
}

export async function listManagedUsers() {
  ensureConfigured();

  const auth = getFirebaseAdminAuth();
  const profiles = await getProfilesMap();
  const users: ManagedUserSummary[] = [];
  let pageToken: string | undefined;

  do {
    const page = await auth.listUsers(1000, pageToken);
    page.users.forEach((userRecord) => {
      users.push(mapUserRecord(userRecord, profiles.get(userRecord.uid)));
      profiles.delete(userRecord.uid);
    });
    pageToken = page.pageToken;
  } while (pageToken);

  profiles.forEach((profile, uid) => {
    users.push({
      ...profile,
      uid,
      emailVerified: false,
      disabled: false
    });
  });

  return users.sort((left, right) => left.name.localeCompare(right.name, "id"));
}

export async function createManagedUser(
  input: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    facilityId?: string;
    facilityName?: string;
  },
  actor: SessionUser
) {
  ensureConfigured();

  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminDb();

  let existing: UserRecord | null = null;

  try {
    existing = await auth.getUserByEmail(input.email);
  } catch {
    existing = null;
  }

  if (existing) {
    throw new Error("Email sudah terdaftar. Gunakan email lain atau reset password user tersebut.");
  }

  const userRecord = await auth.createUser({
    email: input.email,
    password: input.password,
    displayName: input.name,
    emailVerified: true
  });

  await auth.setCustomUserClaims(userRecord.uid, { role: input.role });

  const profile: UserProfile = {
    uid: userRecord.uid,
    email: input.email,
    name: input.name,
    role: input.role,
    facilityId: input.facilityId ?? actor.facilityId,
    facilityName: input.facilityName ?? actor.facilityName,
    active: true,
    createdAt: new Date().toISOString()
  };

  await db.collection("users").doc(userRecord.uid).set(profile);
  await appendAuditEvent(actor, `Buat user ${input.role}`, userRecord.uid);

  return mapUserRecord(userRecord, profile);
}

export async function updateManagedUserPassword(
  uid: string,
  password: string,
  actor: SessionUser
) {
  ensureConfigured();

  const auth = getFirebaseAdminAuth();
  const userRecord = await auth.updateUser(uid, { password });
  await appendAuditEvent(actor, "Reset password user", uid);

  const profileDoc = await getFirebaseAdminDb().collection("users").doc(uid).get();
  const profile = profileDoc.exists ? (profileDoc.data() as UserProfile) : null;

  return mapUserRecord(userRecord, profile);
}
