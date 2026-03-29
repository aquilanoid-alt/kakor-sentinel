import { AppShell } from "@/components/app-shell";
import { GoLivePanel } from "@/components/admin/go-live-panel";
import { PilotReadinessPanel } from "@/components/admin/pilot-readiness-panel";
import { SectionCard } from "@/components/section-card";
import { isFirebaseServerConfigured } from "@/lib/firebase/config";
import { isStrictProductionMode, shouldAllowBootstrapAdmin } from "@/lib/runtime";
import { requireRoles } from "@/lib/server/auth";
import { getGoLiveConfig, getPilotReadinessSummary } from "@/lib/server/repository";
import { listManagedUsers } from "@/lib/server/user-admin";
import type { UserRole } from "@/lib/types";

export default async function GoLivePage() {
  const user = await requireRoles(["Admin (Apoteker)"]);
  const [config, managedUsers] = await Promise.all([getGoLiveConfig(), listManagedUsers()]);
  const usersByRole = managedUsers.reduce<Record<UserRole, number>>(
    (accumulator, item) => {
      accumulator[item.role] += 1;
      return accumulator;
    },
    {
      "Admin (Apoteker)": 0,
      "Petugas Farmasi": 0,
      "Petugas Jaringan": 0,
      "Petugas Unit": 0
    }
  );
  const readiness = await getPilotReadinessSummary(usersByRole);

  return (
    <AppShell
      title="Go-Live"
      subtitle="Kunci identitas fasilitas resmi dan checklist produksi sebelum website dipakai secara operasional."
      user={user}
    >
      <GoLivePanel
        initialConfig={config}
        runtimeMode={isStrictProductionMode() ? "production" : "demo"}
        firebaseReady={isFirebaseServerConfigured()}
        bootstrapLocked={!shouldAllowBootstrapAdmin()}
      />

      <PilotReadinessPanel summary={readiness} />

      <SectionCard
        eyebrow="Checklist produksi"
        title="Langkah minimum sebelum dipakai resmi"
        subtitle="Gunakan daftar ini sebagai pagar agar aplikasi tidak lagi berperilaku seperti mode dummy."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">1. Runtime produksi</p>
            <p className="mt-3 text-sm text-mist/70">
              Set env <span className="font-semibold text-aqua">KSS_RUNTIME_MODE=production</span>, lalu restart server
              agar fallback demo untuk data operasional mati total.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">2. Backend siap</p>
            <p className="mt-3 text-sm text-mist/70">
              Pastikan Firebase Auth, Firestore, rules, indexes, dan billing produksi aktif sebelum transaksi nyata
              disimpan.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">3. Identitas fasilitas</p>
            <p className="mt-3 text-sm text-mist/70">
              Lengkapi nama Puskesmas, kode fasilitas, alamat, kontak resmi, dan penanggung jawab farmasi di panel
              go-live ini.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">4. Lock bootstrap</p>
            <p className="mt-3 text-sm text-mist/70">
              Endpoint bootstrap admin sebaiknya hanya dipakai saat awal setup. Di mode produksi, endpoint ini
              otomatis dikunci kecuali Anda sengaja membuka override env.
            </p>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
