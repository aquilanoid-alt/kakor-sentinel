import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DistributionWorkflowPanel } from "@/components/distribution-workflow-panel";
import { SectionCard } from "@/components/section-card";
import { requireSession } from "@/lib/server/auth";
import { getDistributionRequestById, getFornasCatalog } from "@/lib/server/repository";
import { cn, formatDateTime } from "@/lib/utils";
import { getExpiryStatus, getUnitVisual } from "@/lib/visual-status";

export default async function DistributionDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSession();
  const { id } = await params;
  const request = await getDistributionRequestById(id);

  if (!request) {
    notFound();
  }

  const fornasCatalog = await getFornasCatalog();
  const drug = fornasCatalog.find((item) => item.id === request.drugId);
  const unitVisual = getUnitVisual(request.requestingUnit);
  const timeline =
    request.approvalTrail?.map((entry) => ({
      label: entry.stage.toUpperCase(),
      detail: `${entry.actorName} (${entry.actorRole}) • ${entry.note}`,
      time: entry.timestamp
    })) ??
    [
      {
        label: "SUBMITTED",
        detail: `${request.requestedBy ? `${request.requestedBy} mengajukan` : "Permintaan dibuat untuk"} ${request.quantityRequested} unit`,
        time: request.requestedAt
      }
    ];

  return (
    <AppShell
      title={`Jejak Distribusi ${request.id}`}
      subtitle="Setiap distribusi memiliki jejak lengkap dari permintaan sampai penerimaan untuk mencegah titik buta pergerakan obat."
      user={user}
    >
      <SectionCard
        eyebrow="Tracking"
        title={request.requestingUnit || "Belum diisi"}
        subtitle={`${drug?.genericName ?? "Obat"} • ${request.cluster} • status ${request.status}`}
        action={
          <Link href="/distribution" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
            Kembali ke daftar
          </Link>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div className={cn("space-y-4 rounded-[28px] border p-5", unitVisual.cardClass)}>
            <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Ringkasan distribusi</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("size-3 rounded-full", unitVisual.dotClass)} />
              <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", unitVisual.badgeClass)}>
                {unitVisual.unitName}
              </span>
            </div>
            <p className="font-heading text-3xl font-semibold text-white">{drug?.genericName}</p>
            <p className="text-mist/70">
              Diminta {request.quantityRequested} • Disetujui {request.quantityApproved} • Diterima {request.quantityReceived}
            </p>
            <p className="text-sm text-mist/60">ETA {formatDateTime(request.eta)}</p>
            <p className="text-sm text-aqua">Stage aktif: {request.workflowStage ?? "submitted"}</p>
            {request.qrValue ? (
              <img
                src={`/api/qr?value=${encodeURIComponent(request.qrValue)}`}
                alt="QR distribusi"
                className="h-36 w-36 rounded-2xl bg-white p-2"
              />
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-mist/75">
                QR final akan muncul setelah approval distribusi disimpan.
              </p>
            )}

            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Batch FEFO</p>
              {request.allocations?.length ? (
                <div className="mt-3 space-y-2 text-sm text-white">
                  {request.allocations.map((allocation) => {
                    const expiry = getExpiryStatus(allocation.expiryDate);

                    return (
                    <div key={allocation.batchId} className={cn("rounded-2xl border p-3", expiry.cardClass)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("size-2.5 rounded-full", expiry.dotClass)} />
                        <p className="font-semibold">{allocation.batchCode}</p>
                        <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", expiry.badgeClass)}>
                          {expiry.label}
                        </span>
                      </div>
                      <p className="mt-1 text-mist/70">
                        {allocation.quantity} unit • {allocation.location} • ED {allocation.expiryDate}
                      </p>
                      <p className="mt-1 text-xs text-mist/60">{expiry.detail}</p>
                    </div>
                  );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-sm text-mist/75">
                  Alokasi batch akan muncul setelah approval FEFO dilakukan.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <DistributionWorkflowPanel request={request} />
            {timeline.map((entry, index) => (
              <div key={entry.label} className="relative rounded-[26px] border border-white/10 bg-black/20 p-5">
                {index < timeline.length - 1 ? (
                  <div className="absolute bottom-[-22px] left-8 top-[78px] w-px bg-white/10" />
                ) : null}
                <div className="flex gap-4">
                  <div className="mt-1 size-4 rounded-full bg-aqua shadow-neon" />
                  <div>
                    <p className="font-semibold text-white">{entry.label}</p>
                    <p className="mt-2 text-sm text-mist/70">{entry.detail}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.25em] text-mist/50">
                      {formatDateTime(entry.time)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
