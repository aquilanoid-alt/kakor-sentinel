import { AppShell } from "@/components/app-shell";
import { ReferencePricePanel } from "@/components/admin/reference-price-panel";
import { SectionCard } from "@/components/section-card";
import { requireRoles } from "@/lib/server/auth";
import { getFornasCatalog } from "@/lib/server/repository";

export default async function ReferencePricesPage() {
  const user = await requireRoles(["Admin (Apoteker)", "Petugas Farmasi"]);
  const catalog = await getFornasCatalog();

  return (
    <AppShell
      title="Harga Referensi"
      subtitle="Audit harga referensi obat berdasarkan master FORNAS, skema pembiayaan, dan tanggal update."
      user={user}
    >
      <ReferencePricePanel catalog={catalog} />

      <SectionCard
        eyebrow="Catatan audit"
        title="Cara membaca halaman ini"
        subtitle="Halaman ini dirancang untuk membantu admin memeriksa konsistensi harga referensi sebelum dipakai pada penerimaan obat."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">1. Filter obat</p>
            <p className="mt-3 text-sm text-mist/70">
              Cari berdasarkan nama generik, bentuk sediaan, kekuatan, atau ID obat agar pengecekan lebih cepat.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">2. Cek skema</p>
            <p className="mt-3 text-sm text-mist/70">
              Gunakan filter JKN atau reguler untuk memastikan pengelompokan harga sudah sesuai kebutuhan penerimaan.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">3. Validasi tanggal</p>
            <p className="mt-3 text-sm text-mist/70">
              Batasi tanggal update untuk menemukan harga yang sudah lama belum diperbarui atau baru saja diimport.
            </p>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
