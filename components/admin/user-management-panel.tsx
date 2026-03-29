"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ManagedUserSummary, SessionUser, UserRole } from "@/lib/types";

const roles: UserRole[] = [
  "Admin (Apoteker)",
  "Petugas Farmasi",
  "Petugas Jaringan",
  "Petugas Unit"
];

export function UserManagementPanel({
  currentUser,
  users
}: {
  currentUser: SessionUser;
  users: ManagedUserSummary[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Petugas Farmasi");
  const [facilityId, setFacilityId] = useState(currentUser.facilityId);
  const [facilityName, setFacilityName] = useState(currentUser.facilityName);
  const [message, setMessage] = useState(
    "Buat akun petugas baru langsung dari web. Role akan otomatis disimpan ke Firebase Auth dan Firestore."
  );
  const [loading, setLoading] = useState(false);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [passwordBusyUid, setPasswordBusyUid] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!email || !name || !password) {
      setMessage("Email, nama, dan password wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password,
          name,
          role,
          facilityId,
          facilityName
        })
      });

      const result = (await response.json()) as { ok?: boolean; error?: string; result?: ManagedUserSummary };
      if (!response.ok || result.ok === false) {
        throw new Error(result.error ?? "Pembuatan user gagal.");
      }

      setEmail("");
      setName("");
      setPassword("");
      setRole("Petugas Farmasi");
      setMessage(`User ${result.result?.email ?? email} berhasil dibuat dengan role ${result.result?.role ?? role}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pembuatan user gagal.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (uid: string, targetEmail: string) => {
    const nextPassword = passwordDrafts[uid]?.trim();
    if (!nextPassword || nextPassword.length < 8) {
      setMessage("Password baru minimal 8 karakter.");
      return;
    }

    setPasswordBusyUid(uid);

    try {
      const response = await fetch(`/api/admin/users/${uid}/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password: nextPassword
        })
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || result.ok === false) {
        throw new Error(result.error ?? "Reset password gagal.");
      }

      setPasswordDrafts((current) => ({ ...current, [uid]: "" }));
      setMessage(`Password untuk ${targetEmail} berhasil diganti.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reset password gagal.");
    } finally {
      setPasswordBusyUid(null);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-5 rounded-[32px] border border-line bg-white/5 p-6 shadow-glow">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Admin user</p>
          <h2 className="mt-2 font-heading text-3xl font-semibold text-white">Tambah akun petugas</h2>
          <p className="mt-3 text-sm leading-7 text-mist/75">{message}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Nama petugas</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
              placeholder="Petugas Farmasi 1"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Email login</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
                placeholder="email@instansi.id"
              />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Password awal</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
              placeholder="Minimal 8 karakter"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            >
              {roles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Facility ID</span>
            <input
              value={facilityId}
              onChange={(event) => setFacilityId(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Nama fasilitas</span>
            <input
              value={facilityName}
              onChange={(event) => setFacilityName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            />
          </label>
        </div>

        <div className="rounded-[24px] border border-cyan/20 bg-cyan/10 p-5">
          <p className="font-semibold text-white">Yang terjadi saat Anda klik simpan</p>
          <ul className="mt-3 space-y-2 text-sm text-mist/75">
            <li>Akun dibuat di Firebase Authentication.</li>
            <li>Role disimpan ke custom claims.</li>
            <li>Profil petugas ditulis ke Firestore collection `users`.</li>
          </ul>
        </div>

        <button
          disabled={loading}
          onClick={() => void handleCreate()}
          className="w-full rounded-2xl bg-gradient-to-r from-teal via-cyan to-aqua px-4 py-3 font-semibold text-slate-950 shadow-neon disabled:opacity-60"
        >
          {loading ? "Menyimpan user..." : "Simpan user baru"}
        </button>
      </div>

      <div className="space-y-4 rounded-[32px] border border-line bg-white/5 p-6 shadow-glow">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Daftar user</p>
          <h2 className="mt-2 font-heading text-3xl font-semibold text-white">User aktif di sistem</h2>
          <p className="mt-3 text-sm leading-7 text-mist/75">
            Admin dapat meninjau role setiap akun dan mengganti password sementara tanpa membuka Firebase Console.
          </p>
        </div>

        <div className="space-y-3">
          {users.map((item) => (
            <div key={item.uid} className="rounded-[26px] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="mt-1 text-sm text-mist/65">{item.email}</p>
                  <p className="mt-2 text-sm text-aqua">{item.role}</p>
                  <p className="mt-1 text-sm text-mist/65">
                    {item.facilityName ? `${item.facilityName} • ` : ""}
                    {item.active ? "Aktif" : "Nonaktif"}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.25em] text-mist/45">
                    Login terakhir {item.lastSignInAt ? new Date(item.lastSignInAt).toLocaleString("id-ID") : "belum ada"}
                  </p>
                </div>

                <div className="w-full max-w-md space-y-3">
                  <input
                    type="password"
                    value={passwordDrafts[item.uid] ?? ""}
                    onChange={(event) =>
                      setPasswordDrafts((current) => ({
                        ...current,
                        [item.uid]: event.target.value
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
                    placeholder="Password baru minimal 8 karakter"
                  />
                  <button
                    disabled={passwordBusyUid === item.uid}
                    onClick={() => void handleResetPassword(item.uid, item.email)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white disabled:opacity-60"
                  >
                    {passwordBusyUid === item.uid ? "Mengganti password..." : "Ganti password"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
