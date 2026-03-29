import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-mesh px-6 text-center">
      <div className="max-w-lg rounded-[36px] border border-line bg-white/5 p-8 shadow-glow backdrop-blur">
        <p className="text-xs uppercase tracking-[0.4em] text-aqua/75">404</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold text-white">Data atau halaman tidak ditemukan.</h1>
        <p className="mt-4 text-sm leading-7 text-mist/75">
          Periksa kembali referensi distribusi, batch, atau buka dashboard utama untuk melanjutkan pekerjaan.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-gradient-to-r from-teal via-cyan to-aqua px-5 py-3 text-sm font-semibold text-slate-950 shadow-neon"
        >
          Buka overview
        </Link>
      </div>
    </main>
  );
}
