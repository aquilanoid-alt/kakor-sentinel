import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionUser, UserProfile } from "@/lib/types";
import { hasRequiredRole } from "@/lib/auth-roles";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { isFirebaseServerConfigured, sessionCookieName } from "@/lib/firebase/config";
import { normalizeFacilityId, normalizeFacilityName } from "@/lib/placeholders";
import { getUserProfile, resolveRole, upsertUserProfile } from "@/lib/server/repository";

export async function getOptionalSessionUser() {
  if (!isFirebaseServerConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(sessionCookieName)?.value;

  if (!session) {
    return null;
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(session, false);
    let profile = null;

    try {
      profile = await getUserProfile(decoded.uid);
    } catch {
      profile = null;
    }

    const role = resolveRole((decoded.role as string | undefined) ?? profile?.role);

    const nextProfile: UserProfile = {
      uid: decoded.uid,
      email: decoded.email ?? profile?.email ?? "",
      name: (decoded.name as string | undefined) ?? profile?.name ?? decoded.email ?? "Petugas",
      role,
      facilityId: normalizeFacilityId(profile?.facilityId),
      facilityName: normalizeFacilityName(profile?.facilityName),
      active: true,
      createdAt: profile?.createdAt ?? new Date().toISOString()
    };

    if (!profile) {
      try {
        await upsertUserProfile(nextProfile);
      } catch {
        // Session tetap dianggap valid walau sinkron profil gagal.
      }
    }

    const sessionUser: SessionUser = {
      uid: nextProfile.uid,
      email: nextProfile.email,
      name: nextProfile.name,
      role: nextProfile.role,
      facilityId: nextProfile.facilityId,
      facilityName: nextProfile.facilityName
    };

    return sessionUser;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const user = await getOptionalSessionUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}

export function ensureAllowedRole(user: SessionUser, allowedRoles: SessionUser["role"][]) {
  if (!hasRequiredRole(user.role, allowedRoles)) {
    throw new Error("Akses role tidak mencukupi untuk aksi ini.");
  }
}

export async function requireRoles(allowedRoles: SessionUser["role"][]) {
  const user = await requireSession();
  if (!hasRequiredRole(user.role, allowedRoles)) {
    redirect("/");
  }

  return user;
}
