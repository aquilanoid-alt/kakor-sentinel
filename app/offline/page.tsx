import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-mesh px-6 text-center">
      <div className="max-w-xl rounded-[36px] border border-line bg-white/5 p-8 shadow-glow backdrop-blur">
        <p className="text-xs uppercase tracking-[0.4em] text-aqua/75">Offline mode</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold text-white">Jaringan sedang tidak tersedia.</h1>
        <p className="mt-4 text-sm leading-7 text-mist/75">
          KAKOR SENTINEL SUPPLY tetap bisa dipakai untuk transaksi inti yang sudah tersimpan di perangkat. Saat koneksi kembali stabil, antrean akan disinkronkan otomatis.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-gradient-to-r from-teal via-cyan to-aqua px-5 py-3 text-sm font-semibold text-slate-950 shadow-neon"
        >
          Kembali ke dashboard
        </Link>
      </div>
    </main>
  );
}

