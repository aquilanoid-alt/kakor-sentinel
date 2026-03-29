import Link from "next/link";
import type { PilotReadinessSummary } from "@/lib/types";

function readinessTone(ok: boolean) {
  return ok
    ? "border-teal/20 bg-teal/10 text-aqua"
    : "border-amber-300/20 bg-amber-400/10 text-amber-100";
}

export function PilotReadinessPanel({ summary }: { summary: PilotReadinessSummary }) {
  const hasMinimumUsers =
    summary.usersByRole["Admin (Apoteker)"] >= 1 &&
    summary.usersByRole["Petugas Farmasi"] >= 1 &&
    summary.usersByRole["Petugas Jaringan"] >= 1 &&
    summary.usersByRole["Petugas Unit"] >= 1;
  const hasEnoughFornas = summary.fornasCount >= 500;
  const hasEnoughStock = summary.stockBatchCount >= 1 && summary.stockedDrugCount >= 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="surface-card rounded-[26px] p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Profil fasilitas</p>
          <p className="mt-2 font-heading text-2xl font-semibold text-white">
            {summary.facilityConfigured ? "Siap" : "Belum lengkap"}
          </p>
          <p className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs ${readinessTone(summary.facilityConfigured)}`}>
            {summary.facilityConfigured ? "Go-live profile ok" : "Lengkapi di panel Go-Live"}
          </p>
        </div>

        <div className="surface-card rounded-[26px] p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">FORNAS resmi</p>
          <p className="mt-2 font-heading text-2xl font-semibold text-white">{summary.fornasCount} item</p>
          <p className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs ${readinessTone(hasEnoughFornas)}`}>
            {hasEnoughFornas ? "Katalog pilot memadai" : "Perlu sinkron resmi e-FORNAS"}
          </p>
        </div>

        <div className="surface-card rounded-[26px] p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">User awal</p>
          <p className="mt-2 font-heading text-2xl font-semibold text-white">
            {Object.values(summary.usersByRole).reduce((total, count) => total + count, 0)} akun
          </p>
          <p className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs ${readinessTone(hasMinimumUsers)}`}>
            {hasMinimumUsers ? "Role minimum terpenuhi" : "Lengkapi admin + 3 role operasional"}
          </p>
        </div>

        <div className="surface-card rounded-[26px] p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Stok awal</p>
          <p className="mt-2 font-heading text-2xl font-semibold text-white">
            {summary.stockBatchCount} batch / {summary.stockedDrugCount} obat
          </p>
          <p className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs ${readinessTone(hasEnoughStock)}`}>
            {hasEnoughStock ? "Stok awal sudah masuk" : "Input stok awal via Penerimaan"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="surface-card rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Checklist pilot</p>
          <h3 className="mt-2 font-heading text-2xl font-semibold text-white">Yang harus beres sebelum dipakai lapangan</h3>
          <div className="mt-5 space-y-3 text-sm text-mist/75">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">1. FORNAS resmi lengkap</p>
              <p className="mt-2">
                Sinkron dari e-FORNAS sampai katalog cukup penuh untuk pilot. Saat ini terdeteksi{" "}
                <span className="font-semibold text-aqua">{summary.fornasCount} item</span>.
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">2. User per role</p>
              <p className="mt-2">
                Minimum 1 admin, 1 petugas farmasi, 1 petugas jaringan, dan 1 petugas unit agar alur approval dan
                transaksi pilot bisa diuji nyata.
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">3. Stok awal masuk lewat Penerimaan</p>
              <p className="mt-2">
                Obat masuk dari Dinkes / IFK dicatat di menu <span className="font-semibold text-aqua">Penerimaan</span>,
                bukan menu Scan. Di sanalah batch, ED, jumlah, dan harga awal direkam.
              </p>
            </div>
          </div>
        </div>

        <div className="surface-card rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Audit cepat</p>
          <h3 className="mt-2 font-heading text-2xl font-semibold text-white">Status detail pilot</h3>

          <div className="mt-5 space-y-4">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-white">Sebaran huruf FORNAS</p>
                <span className={`rounded-full border px-3 py-1 text-xs ${readinessTone(summary.fornasMissingInitials.length === 0)}`}>
                  {summary.fornasInitialCoverage.length}/26 huruf
                </span>
              </div>
              <p className="mt-2 text-sm text-mist/70">
                Huruf yang belum terwakili: {summary.fornasMissingInitials.length > 0 ? summary.fornasMissingInitials.join(", ") : "tidak ada"}
              </p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="font-semibold text-white">Komposisi user</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {Object.entries(summary.usersByRole).map(([role, count]) => (
                  <div key={role} className="rounded-[18px] border border-white/10 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-mist/45">{role}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{count}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/admin/fornas" className="action-brand rounded-full px-5 py-3 text-sm font-semibold shadow-neon">
                Lengkapi FORNAS
              </Link>
              <Link href="/admin/users" className="action-ghost rounded-full px-5 py-3 text-sm font-medium text-white">
                Lengkapi user awal
              </Link>
              <Link href="/receive" className="action-ghost rounded-full px-5 py-3 text-sm font-medium text-white">
                Input stok awal
              </Link>
              <Link href="/receive/initial-stock" className="action-ghost rounded-full px-5 py-3 text-sm font-medium text-white">
                Wizard stok awal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
