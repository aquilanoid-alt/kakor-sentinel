import { AppShell } from "@/components/app-shell";
import { ReportExportPanel } from "@/components/report-export-panel";
import { SectionCard } from "@/components/section-card";
import { requireSession } from "@/lib/server/auth";

export default async function ReportsPage() {
  const user = await requireSession();

  return (
    <AppShell
      title="Laporan Otomatis"
      subtitle="Generate LPLPO, distribusi, pemakaian, dan stok akhir dalam format PDF maupun Excel tanpa rekap manual."
      user={user}
    >
      <ReportExportPanel user={user} />

      <SectionCard
        eyebrow="Jejak audit"
        title="Apa yang masuk ke laporan"
        subtitle="Hanya transaksi tervalidasi yang dihitung. Discrepancy, transaksi pending sync, dan anomali tetap terlihat sebagai catatan pengawasan."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">LPLPO</p>
            <p className="mt-3 text-sm text-mist/70">
              Menghimpun stok awal, penerimaan, pemakaian, kerusakan, redistribusi, dan stok akhir.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">Distribusi</p>
            <p className="mt-3 text-sm text-mist/70">
              Menampilkan status pending, dikirim, diterima, selisih, serta unit penerima dan QR referensi.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">Pemakaian</p>
            <p className="mt-3 text-sm text-mist/70">
              Menarik konsumsi berdasarkan klaster ILP, unit, user, dan periode waktu yang dipilih.
            </p>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
