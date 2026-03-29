import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { isFirebaseServerConfigured } from "@/lib/firebase/config";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { BrandMark } from "@/components/brand-mark";
import { BrandCopy } from "@/components/brand-copy";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; email?: string }>;
}) {
  const session = await getOptionalSessionUser();
  const params = (await searchParams) ?? {};

  if (session) {
    redirect("/");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-mesh px-6">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel-sheen surface-hero glass-grid rounded-[38px] p-8 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.4em] text-aqua/75">Secure entry</p>
            <div className="space-y-2">
              <ThemeToggle className="w-full justify-between sm:w-auto" />
              <p className="text-right text-[11px] uppercase tracking-[0.28em] text-mist/50">
                Ubah tema sebelum login
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-4">
            <BrandMark compact />
            <BrandCopy
              titleClassName="text-[clamp(1.9rem,4.8vw,3.4rem)] tracking-[0.14em]"
              subtitleClassName="text-base italic text-mist/72"
              taglineClassName="text-base font-semibold tracking-[0.1em] text-white"
            />
          </div>
          <p className="mt-4 max-w-2xl text-base leading-8 text-mist/75">
            Login role-based untuk apoteker, petugas farmasi, petugas jaringan, dan petugas unit. Session server dipakai untuk melindungi laporan, ekspor, dan transaksi obat.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="surface-card rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Backend</p>
              <p className="mt-2 font-semibold text-white">Firebase Auth + Firestore</p>
            </div>
            <div className="surface-card rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Status</p>
              <p className="mt-2 font-semibold text-white">
                {isFirebaseServerConfigured() ? "Siap dikonfigurasi" : "Menunggu env server"}
              </p>
            </div>
          </div>
        </section>

        <section className="panel-sheen surface-hero rounded-[38px] p-8 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Login petugas</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[0.04em] text-white">Masuk aman dengan session server</h2>
          <p className="mt-3 text-sm leading-7 text-mist/75">
            Pastikan akun sudah dibuat di Firebase Authentication dan profile role sudah tersimpan.
          </p>
          <div className="mt-8">
            <LoginForm initialEmail={params.email} initialMessage={params.error} />
          </div>
        </section>
      </div>
    </main>
  );
}
