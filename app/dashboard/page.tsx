import { AppShell } from "@/components/app-shell";
import { ChartBlock } from "@/components/chart-block";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { requireSession } from "@/lib/server/auth";
import { getDashboardSnapshot } from "@/lib/server/repository";
import { formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireSession();
  const { alerts, auditTrail, clusterUsage, suspiciousPatterns, usageStats } =
    await getDashboardSnapshot();

  return (
    <AppShell
      title="Dashboard Cerdas"
      subtitle="Pantauan stok, distribusi, kepatuhan scan, indikasi kehilangan, dan pola pemakaian obat dari satu panel komando."
      user={user}
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {usageStats.map((stat, index) => (
          <MetricCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            delta={stat.delta}
            tone={index % 2 === 0 ? "teal" : "cyan"}
          />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Heatmap distribusi"
          title="Penggunaan per klaster"
          subtitle="Semakin panjang bar, semakin tinggi konsumsi obat dan kebutuhan monitoring per klaster."
        >
          <div className="space-y-5">
            {clusterUsage.map((cluster) => (
              <ChartBlock
                key={cluster.label}
                label={cluster.label}
                value={cluster.value}
                delta={cluster.delta}
                maxValue={Math.max(...clusterUsage.map((item) => item.value))}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Anti-kehilangan"
          title="Indikasi risiko yang perlu investigasi"
          subtitle="Mesin sentinel menggabungkan selisih batch, transaksi offline, dan anomali pemakaian."
        >
          <div className="space-y-4">
            {suspiciousPatterns.length > 0 ? (
              suspiciousPatterns.map((pattern) => (
                <div key={pattern.id} className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-white">{pattern.signal}</p>
                    <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs text-rose-200">
                      Risk {pattern.riskScore}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-mist/70">{pattern.description}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[26px] border border-white/10 bg-black/20 p-5 text-sm text-mist/70">
                Belum ada indikasi risiko. Sistem akan mulai menilai pola setelah transaksi pertama masuk.
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          eyebrow="Smart alert"
          title="Alert prioritas"
          subtitle="Panel ini dirancang agar apoteker langsung melihat apa yang perlu ditindak hari ini."
        >
          <div className="space-y-4">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div key={alert.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{alert.title}</p>
                    <span className="text-xs uppercase tracking-[0.25em] text-mist/60">{alert.severity}</span>
                  </div>
                  <p className="mt-2 text-sm text-mist/70">{alert.detail}</p>
                  <p className="mt-3 text-sm text-aqua">{alert.action}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm text-mist/70">
                Belum ada alert prioritas. Dashboard akan terisi otomatis saat ada stok, distribusi, atau selisih.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Audit trail"
          title="Log aktivitas permanen"
          subtitle="Semua tindakan penting dicatat dengan role, referensi transaksi, timestamp, dan mode online/offline."
        >
          <div className="space-y-3">
            {auditTrail.length > 0 ? (
              auditTrail.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-white">
                        {item.actor ? `${item.actor} • ${item.action}` : item.action}
                      </p>
                      <p className="mt-1 text-sm text-mist/70">
                        {item.entity} • {item.reference} • {item.role}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <span className="rounded-full border border-white/10 px-3 py-1 text-aqua">{item.mode}</span>
                      <p className="mt-2 text-mist/60">{formatDateTime(item.timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm text-mist/70">
                Belum ada log aktivitas. Audit trail akan mulai terbentuk setelah transaksi pertama tersimpan.
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
