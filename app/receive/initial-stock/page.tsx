import { AppShell } from "@/components/app-shell";
import { InitialStockWizard } from "@/components/initial-stock-wizard";
import { SectionCard } from "@/components/section-card";
import { requireRoles } from "@/lib/server/auth";
import { getFornasCatalog } from "@/lib/server/repository";

export default async function InitialStockPage() {
  const user = await requireRoles(["Admin (Apoteker)", "Petugas Farmasi"]);
  const catalog = await getFornasCatalog();

  return (
    <AppShell
      title="Wizard Stok Awal"
      subtitle="Input cepat stok awal pilot dari Dinkes / IFK dengan banyak baris obat dalam satu dokumen."
      user={user}
    >
      <InitialStockWizard catalog={catalog} facilityKey={user.facilityId || user.facilityName || user.uid || "puskesmas-kakor"} />

      <SectionCard
        eyebrow="Cara pakai"
        title="Kapan gunakan wizard ini"
        subtitle="Gunakan wizard ini khusus untuk input awal pilot atau penerimaan besar yang berasal dari satu dokumen dengan banyak item."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">1. Satu dokumen, banyak item</p>
            <p className="mt-3 text-sm text-mist/70">
              Isi nomor DO/faktur sekali, lalu tambahkan beberapa baris obat tanpa kembali ke form penerimaan biasa.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">2. Tetap resmi</p>
            <p className="mt-3 text-sm text-mist/70">
              Setiap baris tetap disimpan sebagai penerimaan resmi, mempengaruhi stok batch, audit trail, dan QR.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">3. Discrepancy tetap aman</p>
            <p className="mt-3 text-sm text-mist/70">
              Jika qty dokumen dan qty fisik berbeda, baris tersebut otomatis masuk review discrepancy.
            </p>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
