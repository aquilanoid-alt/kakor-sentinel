import { AppShell } from "@/components/app-shell";
import { UserManagementPanel } from "@/components/admin/user-management-panel";
import { SectionCard } from "@/components/section-card";
import { requireRoles } from "@/lib/server/auth";
import { listManagedUsers } from "@/lib/server/user-admin";

export default async function AdminUsersPage() {
  const user = await requireRoles(["Admin (Apoteker)"]);
  const users = await listManagedUsers();

  return (
    <AppShell
      title="Admin User"
      subtitle="Kelola akun petugas, role operasional, dan reset password langsung dari panel web tanpa membuka Terminal."
      user={user}
    >
      <UserManagementPanel currentUser={user} users={users} />

      <SectionCard
        eyebrow="Aturan role"
        title="Hak akses yang disarankan"
        subtitle="Gunakan pembagian role paling minimum yang diperlukan agar audit trail tetap kuat dan akses tidak terlalu luas."
      >
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">Admin (Apoteker)</p>
            <p className="mt-3 text-sm text-mist/70">
              Penuh untuk approval, laporan, FORNAS, user management, dan pengawasan audit.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">Petugas Farmasi</p>
            <p className="mt-3 text-sm text-mist/70">
              Operasional gudang, penerimaan, distribusi, dan laporan tanpa hak admin user.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">Petugas Jaringan</p>
            <p className="mt-3 text-sm text-mist/70">
              Permintaan distribusi, penerimaan jaringan, dan transaksi lapangan sesuai unit.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="font-semibold text-white">Petugas Unit</p>
            <p className="mt-3 text-sm text-mist/70">
              Pengambilan obat dan transaksi unit, tanpa akses approval atau laporan penuh.
            </p>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
