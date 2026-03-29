# KAKOR SENTINEL SUPPLY

Smart Pharmacy Control & Distribution System berbasis Next.js PWA untuk Puskesmas, dengan fokus pada:

- zero loss system
- end-to-end QR tracking
- audit trail permanen
- offline-first untuk lapangan
- dashboard cerdas dan laporan otomatis

## Modul yang sudah disiapkan

- Dashboard cerdas
- Scan obat / distribusi
- Penerimaan obat dari Dinkes
- Distribusi ke Pustu, Poskesdes, dan unit
- Manajemen stok + stock opname
- Laporan otomatis
- Panduan petugas dengan mode print/PDF dan share
- Login role-based Firebase Auth
- Firestore repository + security rules
- QR SVG generator backend
- Approval workflow multi-step
- Mutasi stok FEFO live saat approve, kirim, scan, dan stock opname
- Alert stok menipis, batch mendekati ED, dan selisih distribusi
- Admin web untuk tambah user dan reset password
- Admin import master FORNAS
- Sinkron otomatis master FORNAS dari e-FORNAS resmi
- Export PDF/Excel dengan filter periode dan metadata penandatangan

## Stack

- Next.js App Router
- Tailwind CSS
- Firebase Auth + Firestore
- PWA manifest + service worker manual
- IndexedDB queue untuk transaksi offline
- API routes untuk auth, transaksi, QR, dan export

## Catatan runtime

Environment kerja saat ini belum memiliki `node`, `npm`, atau `pnpm`, sehingga aplikasi belum dapat di-install dan dijalankan langsung dari sesi ini.

Saat runtime tersedia, jalankan:

```bash
npm install
npm run dev
```

## Setup Firebase

1. Salin `.env.example` menjadi `.env.local`
2. Set `KSS_RUNTIME_MODE=demo` saat pengembangan, lalu ubah ke `KSS_RUNTIME_MODE=production` saat go-live resmi
3. Isi `NEXT_PUBLIC_FIREBASE_*` untuk web app Firebase
4. Isi `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, dan `FIREBASE_PRIVATE_KEY` untuk Admin SDK
5. Deploy `firestore.rules` dan `firestore.indexes.json`
6. Buat admin awal memakai endpoint bootstrap setelah `BOOTSTRAP_ADMIN_*` dan `BOOTSTRAP_ADMIN_SECRET` diisi

Contoh bootstrap admin:

```bash
curl -X POST http://localhost:3000/api/admin/bootstrap \
  -H "x-bootstrap-secret: isi-secret-anda"
```

## Struktur penting

- `app/` halaman utama dan API route
- `app/api/auth/session/route.ts` session cookie Firebase
- `app/api/reports/export/route.ts` export PDF/Excel hidup
- `app/api/qr/route.ts` generator QR SVG
- `app/api/distributions/[id]/workflow/route.ts` approval workflow distribusi
- `app/api/receipts/[id]/review/route.ts` review discrepancy/verifikasi penerimaan
- `app/api/admin/fornas/import/route.ts` import master FORNAS
- `app/api/admin/fornas/sync/route.ts` sinkron otomatis dari e-FORNAS resmi
- `app/api/admin/users/route.ts` daftar dan pembuatan user dari web
- `app/api/admin/users/[uid]/password/route.ts` reset password dari web
- `app/admin/fornas/page.tsx` panel admin import
- `app/admin/go-live/page.tsx` panel konfigurasi fasilitas resmi sebelum go-live
- `app/admin/users/page.tsx` panel admin user
- `components/` UI operasional
- `lib/data.ts` seed data FORNAS, stok, distribusi, audit, panduan
- `lib/offline.ts` antrean offline berbasis IndexedDB
- `lib/firebase/` init client dan admin Firebase
- `lib/server/` auth server, repository Firestore, reporting
- `scripts/manage-user.mjs` helper CLI untuk buat user dan ganti password
- `public/sw.js` service worker
- `docs/architecture.md` blueprint backend dan integrasi produksi

## Perilaku backend yang sudah hidup

- Approval distribusi akan mengalokasikan batch FEFO dan menahan `reserved stock`
- Pengiriman distribusi akan mengurangi saldo batch yang sudah direservasi
- Scan pengambilan akan memotong batch yang dipilih dan menolak batch yang sedang hold/discrepancy
- Stock opname akan menyesuaikan saldo batch, mengoreksi reserve, dan membuat alert investigasi jika ada selisih
- Receipt discrepancy ditahan dari penggunaan sampai diverifikasi
- Export laporan bisa difilter periode dan menyertakan nama/jabatan penyusun serta penandatangan

## Perintah cepat user management

Ganti password admin:

```bash
npm run user:password -- --email admin@kakor.local --password 'PasswordBaru123!'
```

Buat user baru:

```bash
npm run user:create -- --email farmasi1@kakor.local --password 'Farmasi123!' --name 'Petugas Farmasi 1' --role 'Petugas Farmasi'
```

## Sinkron e-FORNAS dari web

1. Login sebagai `Admin (Apoteker)` atau `Petugas Farmasi`
2. Buka `/admin/fornas`
3. Klik `Sinkron dari e-FORNAS`

Catatan:

- sumber resmi yang dipakai: [https://e-fornas.kemkes.go.id/guest/daftar-obat](https://e-fornas.kemkes.go.id/guest/daftar-obat)
- klaster ILP diset default ke `Farmasi`
- `isPriority` diinferensikan dari flag resmi `OEN`, `Program`, atau `Kanker` karena API e-FORNAS tidak menyediakan field prioritas literal

## Baseline regulasi

- Permenkes No. 74 Tahun 2016
- Permenkes No. 26 Tahun 2020
- KMK HK.01.07/MENKES/1199/2025 tentang Formularium Nasional, ditetapkan `2025-12-31` dan berlaku mulai `2026-04-01`

## Langkah produksi berikutnya

1. Set `KSS_RUNTIME_MODE=production` agar fallback demo untuk data operasional dimatikan total.
2. Buka `/admin/go-live` lalu isi identitas fasilitas resmi, kontak, dan penanggung jawab farmasi.
3. Pastikan master FORNAS resmi dan stok awal nyata sudah diimport ke Firestore.
4. Setelah admin awal terbentuk, biarkan `KSS_ALLOW_BOOTSTRAP_IN_PRODUCTION=false` agar endpoint bootstrap terkunci.
5. Tambahkan lampiran berita acara, tanda tangan digital, backup, observability, dan audit retention policy.
