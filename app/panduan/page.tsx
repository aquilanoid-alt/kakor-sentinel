import { AppShell } from "@/components/app-shell";
import { GuideActions } from "@/components/guide-actions";
import { SectionCard } from "@/components/section-card";
import { guideFoundationCards, guideMenuMap, roleMatrix } from "@/lib/data";
import { regulationReferences } from "@/lib/compliance";
import { requireSession } from "@/lib/server/auth";
import { getGuideSections } from "@/lib/server/repository";

export default async function GuidePage() {
  const user = await requireSession();
  const guideSections = await getGuideSections();

  return (
    <AppShell
      title="Panduan Petugas"
      subtitle="Panduan classy-modern yang bisa dibaca di web, dicetak ke PDF, dan dibagikan langsung ke WhatsApp atau email."
      user={user}
    >
      <SectionCard
        eyebrow="Guide / SOP"
        title="KAKOR SENTINEL SUPPLY Operational Playbook"
        subtitle="Panduan lengkap penggunaan aplikasi, dasar pembuatannya, fungsi tiap modul, dan SOP per menu agar kerja petugas konsisten, cepat, dan audit-ready."
        action={<GuideActions />}
      >
        <div className="print-guide grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            <article className="rounded-[28px] border border-cyan/20 bg-cyan/10 p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Manual lengkap</p>
              <h3 className="mt-2 font-heading text-3xl font-semibold text-white">Mengapa aplikasi ini dibuat</h3>
              <div className="mt-4 space-y-3 text-sm leading-7 text-mist/75">
                <p>
                  KAKOR SENTINEL SUPPLY dibuat untuk menutup celah kehilangan obat, mempercepat transaksi lapangan,
                  dan memastikan seluruh pergerakan obat dapat ditelusuri dari penerimaan, penyimpanan, distribusi,
                  sampai pemakaian.
                </p>
                <p>
                  Karena dipakai di Puskesmas dan jaringan layanan, aplikasi ini disusun sebagai web app dan PWA
                  agar bisa dibuka di browser biasa, diinstal ke HP, tetap ringan, dan tidak bergantung pada satu
                  komputer tertentu.
                </p>
                <p>
                  Panduan ini menjelaskan fondasi sistem, alasan arsitektur, fungsi tiap menu, alur kerja petugas,
                  serta langkah yang harus diambil saat terjadi alert, discrepancy, atau kendala lapangan.
                </p>
              </div>
            </article>

            {guideSections.map((section) => (
              <article key={section.id} className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">{section.subtitle}</p>
                <h3 className="mt-2 font-heading text-3xl font-semibold text-white">{section.title}</h3>
                <div className="mt-4 space-y-3 text-sm leading-7 text-mist/75">
                  {section.content.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Fondasi sistem</p>
              <div className="mt-4 space-y-4">
                {guideFoundationCards.map((item) => (
                  <div key={item.title}>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-mist/75">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Peta menu</p>
              <div className="mt-4 space-y-4">
                {guideMenuMap.map((item) => (
                  <div key={item.menu}>
                    <p className="font-semibold text-white">{item.menu}</p>
                    <p className="mt-2 text-sm leading-7 text-mist/75">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-cyan/20 bg-cyan/10 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Alur kerja inti</p>
              <h3 className="mt-2 font-heading text-3xl font-semibold text-white">SCAN → INPUT → SUBMIT</h3>
              <p className="mt-3 text-sm leading-7 text-mist/75">
                Target operasional: transaksi selesai kurang dari 5 detik dengan data lengkap, QR valid, klaster dipilih, dan audit trail tersimpan.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Role matrix</p>
              <div className="mt-4 space-y-4">
                {roleMatrix.map((item) => (
                  <div key={item.role}>
                    <p className="font-semibold text-white">{item.role}</p>
                    <p className="mt-2 text-sm leading-7 text-mist/75">{item.can}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Regulasi acuan</p>
              <div className="mt-4 space-y-4 text-sm leading-7 text-mist/75">
                {regulationReferences.map((item) => (
                  <div key={item.code}>
                    <p className="font-semibold text-white">{item.code}</p>
                    <p>{item.title}</p>
                    <p className="text-mist/60">
                      Terbit {item.publishDate} • Berlaku {item.effectiveDate}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
