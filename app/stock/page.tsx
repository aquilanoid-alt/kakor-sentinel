import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StockOpnameForm } from "@/components/stock-opname-form";
import { requireSession } from "@/lib/server/auth";
import { getFornasCatalog, getRackMap, getStockBatches } from "@/lib/server/repository";
import { cn } from "@/lib/utils";
import { getExpiryStatus } from "@/lib/visual-status";

export default async function StockPage() {
  const user = await requireSession();
  const [stockBatches, rackMap, catalog] = await Promise.all([
    getStockBatches(),
    getRackMap(),
    getFornasCatalog()
  ]);
  const drugNameById = new Map(catalog.map((drug) => [drug.id, drug.genericName]));

  return (
    <AppShell
      title="Manajemen Stok"
      subtitle="FEFO, mapping lokasi rak, monitoring batch hampir expired, dan stock opname otomatis untuk menjaga gudang selalu terkendali."
      user={user}
    >
      <StockOpnameForm batches={stockBatches} catalog={catalog} />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          eyebrow="Lokasi gudang"
          title="Mapping rak"
          subtitle="Setiap rak bisa dipantau item count dan zona penyimpanan prioritas."
        >
          {rackMap.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {rackMap.map((rack) => (
                <div key={rack.code} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="font-semibold text-white">{rack.code}</p>
                  <p className="mt-2 text-sm text-mist/70">{rack.zone}</p>
                  <p className="mt-2 text-sm text-mist/60">
                    {rack.itemCount} item • {rack.temperature}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm text-mist/70">
              Mapping rak resmi belum dikonfigurasi untuk fasilitas ini. Lengkapi saat tahap go-live agar lokasi gudang
              tidak lagi memakai template demo.
            </div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="FEFO priority"
          title="Batch yang perlu diprioritaskan"
          subtitle="Semakin dekat ED, semakin tinggi prioritas distribusi atau pemakaian."
        >
          <div className="space-y-4">
            {stockBatches
              .slice()
              .sort((left, right) => left.expiryDate.localeCompare(right.expiryDate))
              .map((batch) => {
                const expiry = getExpiryStatus(batch.expiryDate);
                const drugName = drugNameById.get(batch.drugId) ?? batch.drugId;

                return (
                <div key={batch.id} className={cn("rounded-[24px] border p-4", expiry.cardClass)}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("size-2.5 rounded-full", expiry.dotClass)} />
                        <p className="font-semibold text-white">{drugName}</p>
                        <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", expiry.badgeClass)}>
                          {expiry.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-mist/70">
                        Batch {batch.batch} • Lokasi {batch.location} • ED {batch.expiryDate}
                      </p>
                      <p className="mt-1 text-xs font-medium text-mist/65">{expiry.detail}</p>
                      <p className="mt-2 text-sm text-mist/60">
                        Saldo {batch.quantity} • Reserved {batch.reserved} • Siap pakai {Math.max(batch.quantity - batch.reserved, 0)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        batch.discrepancy ? "bg-rose-500/20 text-rose-200" : "bg-teal/20 text-aqua"
                      }`}
                    >
                      {batch.discrepancy ? "Perlu review" : "FEFO ok"}
                    </span>
                  </div>
                </div>
              );
              })}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
