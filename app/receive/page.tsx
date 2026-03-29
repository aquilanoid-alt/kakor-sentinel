import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ReceiveForm } from "@/components/receive-form";
import { ReceiptReviewPanel } from "@/components/receipt-review-panel";
import { SectionCard } from "@/components/section-card";
import { requireSession } from "@/lib/server/auth";
import { getFornasCatalog, getReceipts, getStockBatches } from "@/lib/server/repository";

export default async function ReceivePage() {
  const user = await requireSession();
  const [catalog, receipts, stockBatches] = await Promise.all([
    getFornasCatalog(),
    getReceipts(),
    getStockBatches()
  ]);

  return (
    <AppShell
      title="Penerimaan Obat"
      subtitle="Validasi obat dari Dinkes menggunakan DO/faktur, kecocokan fisik, QR batch, dan stok otomatis."
      user={user}
    >
      <SectionCard
        eyebrow="Pilot shortcut"
        title="Perlu input stok awal lebih cepat?"
        subtitle="Untuk satu DO/faktur yang berisi banyak item, gunakan wizard stok awal agar penerimaan tidak perlu diisi satu per satu dari nol."
        action={
          <Link
            href="/receive/initial-stock"
            className="action-brand rounded-full px-4 py-2 text-sm font-semibold shadow-neon"
          >
            Buka wizard stok awal
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">Satu dokumen</p>
            <p className="mt-3 text-sm text-mist/70">Nomor DO/faktur diisi sekali lalu dipakai untuk banyak baris obat.</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">Banyak batch</p>
            <p className="mt-3 text-sm text-mist/70">Cocok untuk input stok awal pilot yang datang dari IFK / Dinkes dalam jumlah besar.</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">Tetap audit-ready</p>
            <p className="mt-3 text-sm text-mist/70">Setiap baris tetap masuk sebagai penerimaan resmi, bukan data dummy atau draft lepas.</p>
          </div>
        </div>
      </SectionCard>

      <ReceiveForm
        catalog={catalog}
        stockBatches={stockBatches}
        facilityKey={user.facilityId:"puskesmas-kakor" || user.facilityName: "Puskesmas Kakor" || user.uid:"userkakor1"}
      />
      <ReceiptReviewPanel receipts={receipts.slice(0, 4)} />

      <SectionCard
        eyebrow="Checklist"
        title="Kontrol wajib saat penerimaan"
        subtitle="Setiap tahap mengunci titik rawan kehilangan sejak obat pertama kali masuk gudang."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">Cocokkan dokumen</p>
            <p className="mt-3 text-sm text-mist/70">
              DO/faktur diverifikasi dengan jenis obat, batch, ED, dan jumlah yang diterima.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">Tandai discrepancy</p>
            <p className="mt-3 text-sm text-mist/70">
              Jika data tidak cocok, sistem memberi flag dan menahan finalisasi stok.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">Generate QR batch</p>
            <p className="mt-3 text-sm text-mist/70">
              Batch yang lolos validasi langsung siap dipantau sampai distribusi dan pemakaian.
            </p>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
