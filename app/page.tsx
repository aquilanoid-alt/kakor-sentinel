import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { regulationReferences } from "@/lib/compliance";
import { guideSections as fallbackGuideSections, roleMatrix as fallbackRoleMatrix } from "@/lib/data";
import { requireSession } from "@/lib/server/auth";
import { getDashboardSnapshot } from "@/lib/server/repository";

export default async function HomePage() {
  const user = await requireSession();
  const { alerts, clusterUsage, usageStats } = await getDashboardSnapshot();

  return (
    <AppShell
      title="KAKOR SENTINEL SUPPLY"
      subtitle="Smart Pharmacy Control & Distribution System untuk Puskesmas: zero loss, QR-first, offline-ready, dan audit trail permanen."
      user={user}
    >
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[36px] border border-line bg-white/5 p-6 shadow-glow backdrop-blur">
          <p className="text-xs uppercase tracking-[0.4em] text-aqua/75">Mission Control</p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-[0.03em] text-white sm:text-4xl">
            Designed for Precision. Built For Control.
          </h2>
          <p className="mt-4 max-w-3xl text-base text-mist/70">
            Sistem ini dirancang untuk alur lapangan ≤ 5 detik: scan, input, submit. Semua transaksi terhubung ke batch, klaster ILP, user, unit, dan timestamp.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/scan"
              className="rounded-full bg-gradient-to-r from-teal via-cyan to-aqua px-5 py-3 text-sm font-semibold text-slate-950 shadow-neon"
            >
              Buka mode scan
            </Link>
            <Link
              href="/panduan"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white"
            >
              Panduan petugas
            </Link>
            <Link
              href="/reports"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white"
            >
              Laporan otomatis
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {usageStats.map((stat, index) => (
              <MetricCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                delta={stat.delta}
                tone={index % 2 === 0 ? "teal" : "cyan"}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-[36px] border border-line bg-black/25 p-6 shadow-glow">
          <div className="rounded-[28px] border border-cyan/20 bg-cyan/10 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Operator aktif</p>
            <p className="mt-3 font-heading text-2xl font-semibold text-white">{user.name || "Belum diisi"}</p>
            <p className="mt-2 text-sm text-mist/70">{user.role}</p>
            {user.facilityName ? <p className="text-sm text-mist/70">{user.facilityName}</p> : null}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Core promise</p>
            <ul className="mt-4 space-y-3 text-sm text-mist/70">
              <li>Zero loss system dengan audit permanen.</li>
              <li>NO SCAN = NO TRANSACTION pada pengambilan dan penerimaan.</li>
              <li>Offline queue berbasis IndexedDB dengan auto sync.</li>
              <li>FEFO, discrepancy, dan smart alert berjalan real-time.</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Standar nasional"
          title="Baseline regulasi dan formularium"
          subtitle="Tanggal ditampilkan eksplisit agar implementasi lapangan mudah diaudit dan tidak rancu."
        >
          <div className="grid gap-4">
            {regulationReferences.map((item) => (
              <a
                key={item.code}
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-[26px] border border-white/10 bg-black/20 p-4 transition hover:border-cyan/30"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{item.code}</p>
                    <p className="mt-1 text-sm text-mist/70">{item.title}</p>
                  </div>
                  <span className="rounded-full border border-teal/20 bg-teal/10 px-3 py-1 text-xs text-aqua">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-mist/70">{item.description}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-mist/50">
                  Terbit {item.publishDate} • Berlaku {item.effectiveDate}
                </p>
              </a>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Alert feed"
          title="Situasi yang harus direspon hari ini"
          subtitle="Panel ini menempatkan sinyal kehilangan, stok kritis, dan anomali pemakaian di titik paling atas."
        >
          <div className="space-y-4">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-[26px] border p-4 ${
                    alert.severity === "critical"
                      ? "border-rose-300/30 bg-rose-500/10"
                      : alert.severity === "warning"
                        ? "border-amber-300/25 bg-amber-400/10"
                        : "border-cyan/20 bg-cyan/10"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-semibold text-white">{alert.title}</p>
                    <span className="text-xs uppercase tracking-[0.25em] text-mist/60">{alert.severity}</span>
                  </div>
                  <p className="mt-2 text-sm text-mist/70">{alert.detail}</p>
                  <p className="mt-3 text-sm text-aqua">{alert.action}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[26px] border border-white/10 bg-black/20 p-5 text-sm text-mist/70">
                Belum ada alert operasional. Data akan muncul setelah stok, distribusi, atau transaksi mulai tercatat.
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          eyebrow="ILP cluster"
          title="Distribusi pemakaian per klaster"
          subtitle="Semua transaksi wajib memilih klaster agar pemakaian, stok, dan laporan tidak putus konteks."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {clusterUsage.map((cluster) => (
              <div key={cluster.label} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-mist/60">{cluster.label}</p>
                <p className="mt-2 font-heading text-3xl font-semibold text-white">{cluster.value}</p>
                <p className="mt-1 text-sm text-aqua">
                  {cluster.delta >= 0 ? "+" : ""}
                  {cluster.delta}% vs minggu lalu
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Panduan peran"
          title="Hak akses berbasis role"
          subtitle="Role dibatasi ketat agar jejak pergerakan obat selalu jelas dan dapat dipertanggungjawabkan."
        >
          <div className="space-y-4">
            {fallbackRoleMatrix.map((item) => (
              <div key={item.role} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="font-semibold text-white">{item.role}</p>
                <p className="mt-2 text-sm text-mist/70">{item.can}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Panduan cepat"
        title="SOP operasional untuk petugas lapangan"
        subtitle="Panduan ringkas ini ditampilkan langsung di web dan dipakai juga sebagai versi print/PDF."
        action={
          <Link href="/panduan" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
            Buka panduan penuh
          </Link>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {fallbackGuideSections.slice(0, 4).map((section) => (
            <div key={section.id} className="rounded-[26px] border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.32em] text-aqua/75">{section.subtitle}</p>
              <h3 className="mt-2 font-heading text-2xl font-semibold text-white">{section.title}</h3>
              <ul className="mt-4 space-y-3 text-sm text-mist/70">
                {section.content.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>
    </AppShell>
  );
}
