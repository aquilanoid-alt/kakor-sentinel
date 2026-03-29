import type { UserRole } from "@/lib/types";

export const rolePriority: Record<UserRole, number> = {
  "Admin (Apoteker)": 4,
  "Petugas Farmasi": 3,
  "Petugas Jaringan": 2,
  "Petugas Unit": 1
};

export function hasRequiredRole(role: UserRole, allowed: UserRole[]) {
  return allowed.some((allowedRole) => rolePriority[role] >= rolePriority[allowedRole]);
}

