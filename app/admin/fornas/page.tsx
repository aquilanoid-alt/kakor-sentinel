import { AppShell } from "@/components/app-shell";
import { FornasImportPanel } from "@/components/admin/fornas-import-panel";
import { SectionCard } from "@/components/section-card";
import { requireRoles } from "@/lib/server/auth";

export default async function FornasAdminPage() {
  const user = await requireRoles(["Admin (Apoteker)", "Petugas Farmasi"]);

  return (
    <AppShell
      title="Admin FORNAS"
      subtitle="Sinkronkan master FORNAS resmi langsung dari e-FORNAS atau lakukan import file manual agar daftar obat resmi lengkap A-Z siap dipakai pada form pencarian obat."
      user={user}
    >
      <FornasImportPanel />

      <SectionCard
        eyebrow="Workflow"
        title="Aturan import yang disarankan"
        subtitle="Import hanya dilakukan oleh admin/apoteker agar katalog obat tetap terkendali dan sesuai regulasi."
      >
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">1. Utamakan sinkron resmi</p>
            <p className="mt-3 text-sm text-mist/70">
              Gunakan sinkron satu klik dari e-FORNAS agar katalog di aplikasi mengikuti sumber resmi terbaru dan tetap lengkap dari A sampai Z.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">2. File manual tetap tersedia</p>
            <p className="mt-3 text-sm text-mist/70">
              Jika memakai CSV/XLSX, cocokkan nama kolom dengan template agar parser tidak salah memetakan pembatasan dan level fasilitas.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">3. Skema dan harga bisa manual</p>
            <p className="mt-3 text-sm text-mist/70">
              Saat penerimaan obat, petugas tetap bisa memilih JKN / Reguler dan mengisi harga satuan manual. Import harga hanya opsional untuk audit referensi.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">4. Audit trail aktif</p>
            <p className="mt-3 text-sm text-mist/70">
              Setiap import mencatat jumlah item dan user pelaksana ke audit event untuk kebutuhan monitoring.
            </p>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
