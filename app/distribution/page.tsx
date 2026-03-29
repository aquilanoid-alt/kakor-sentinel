import { AppShell } from "@/components/app-shell";
import { DistributionForm } from "@/components/distribution-form";
import { requireSession } from "@/lib/server/auth";
import { getDistributionRequests, getFornasCatalog } from "@/lib/server/repository";

export default async function DistributionPage() {
  const user = await requireSession();
  const [catalog, requests] = await Promise.all([getFornasCatalog(), getDistributionRequests()]);

  return (
    <AppShell
      title="Distribusi Ke Jaringan"
      subtitle="Permintaan dari Pustu, Poskesdes, dan unit internal dikelola dengan approval apoteker, QR distribusi, dan status penerimaan."
      user={user}
    >
      <DistributionForm catalog={catalog} requests={requests} />
    </AppShell>
  );
}
