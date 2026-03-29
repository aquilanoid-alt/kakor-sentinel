import { AppShell } from "@/components/app-shell";
import { MedScanPanel } from "@/components/med-scan-panel";
import { SectionCard } from "@/components/section-card";
import { requireSession } from "@/lib/server/auth";
import { getFornasCatalog, getStockBatches } from "@/lib/server/repository";

export default async function ScanPage() {
  const user = await requireSession();
  const [catalog, stockBatches] = await Promise.all([getFornasCatalog(), getStockBatches()]);

  return (
    <AppShell
      title="Mode Scan Lapangan"
      subtitle="Kamera langsung aktif untuk transaksi cepat di HP. Wajib scan QR obat atau QR distribusi sebelum submit."
      user={user}
    >
      <MedScanPanel catalog={catalog} stockBatches={stockBatches} unitName={user.facilityName} />

      <SectionCard
        eyebrow="Protokol operasional"
        title="Tiga aturan yang tidak boleh dilewati"
        subtitle="Aturan ini dibuat untuk menjaga kepatuhan scan dan mencegah obat hilang tanpa jejak."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">1. Wajib login</p>
            <p className="mt-3 text-sm text-mist/70">
              Semua transaksi ditandatangani identitas user dan role agar audit trail lengkap.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">2. Wajib scan</p>
            <p className="mt-3 text-sm text-mist/70">
              Tanpa QR yang valid, transaksi tidak boleh lanjut ke input jumlah maupun submit.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">3. Wajib pilih klaster</p>
            <p className="mt-3 text-sm text-mist/70">
              Klaster ILP memastikan pemakaian obat bisa ditarik ke laporan dan analitik yang benar.
            </p>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
