# Arsitektur Implementasi

## 1. Frontend

- Next.js App Router untuk shell aplikasi, route modul, dan API edge awal.
- Tailwind CSS untuk dark futuristic interface.
- Kamera browser untuk scan QR, dengan fallback manual input.
- PWA manifest + service worker agar shell aplikasi dapat tetap terbuka saat koneksi buruk.
- Session cookie auth untuk proteksi halaman dan endpoint sensitif.

## 2. Offline-first

- Semua transaksi lapangan disimpan lebih dulu ke IndexedDB.
- Saat perangkat kembali online, queue dikirim ke endpoint `/api/sync`.
- Setiap mutation membawa:
  - `id`
  - `type`
  - `payload`
  - `createdAt`

## 3. Domain model inti

- `FornasDrug`
- `StockBatch`
- `DistributionRequest`
- `AuditEvent`
- `PendingMutation`

Model ini sudah ada di `lib/types.ts` dan bisa langsung dipetakan ke Firestore collection atau tabel PostgreSQL.

Tambahan penting yang sekarang sudah dipakai:

- `BatchAllocation` untuk alokasi FEFO eksplisit pada distribusi
- `stockBatchId` pada penerimaan agar discrepancy bisa ditahan/dibuka kembali saat review

## 4. Rekomendasi backend produksi

### Opsi A: Firebase / Firestore

- Auth: Firebase Authentication
- DB: Firestore
- File: Cloud Storage untuk lampiran BA discrepancy, PDF, QR label
- Functions: validasi, sinkronisasi queue, notifikasi, dan analitik ringan
- Session: Firebase ID token ditukar menjadi cookie server di route auth

Kelebihan:

- cepat untuk MVP dan mode offline
- integrasi realtime mudah
- cocok untuk Puskesmas dengan tim IT kecil

### Opsi B: Node.js + PostgreSQL

- Auth: NextAuth / internal SSO / Keycloak
- DB: PostgreSQL
- Queue: BullMQ / Cloud Tasks
- Report service: worker terpisah untuk PDF/Excel

Kelebihan:

- governance data lebih kuat
- query laporan kompleks lebih fleksibel
- cocok jika ingin integrasi lintas sistem kabupaten/kota

## 5. Koleksi / tabel minimum

### Firestore collections atau tabel SQL

- `users`
- `facilities`
- `fornas_catalog`
- `stock_batches`
- `receipts`
- `distribution_requests`
- `distribution_receipts`
- `dispense_transactions`
- `audit_events`
- `alerts`
- `sync_jobs`
- `system_config`

## 5A. Endpoint backend yang sudah ada di proyek

- `POST /api/auth/session`
- `DELETE /api/auth/session`
- `POST /api/dispense`
- `POST /api/receipts`
- `POST /api/distributions`
- `POST /api/stock-opnames`
- `POST /api/sync`
- `GET /api/qr`
- `GET /api/reports/export`
- `POST /api/admin/bootstrap`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `POST /api/admin/users/[uid]/password`

## 6. Rules operasional wajib

- No scan = no transaction
- Semua transaksi wajib punya `clusterILP`
- Semua transaksi wajib punya `actorId`, `role`, `deviceId`, `timestamp`
- Selisih stok wajib membuat `investigation_case`
- Batch mendekati ED otomatis masuk priority FEFO

## 7. Laporan otomatis

Laporan sebaiknya dibangkitkan dari snapshot transaksi tervalidasi:

- LPLPO
- distribusi
- pemakaian per klaster
- stok akhir
- daftar discrepancy

PDF generator di proyek ini sekarang sudah memiliki:

- header fasilitas
- filter periode
- metadata operator pencetak
- metadata penyusun dan penandatangan
- tabel formal
- blok tanda tangan

## 8A. Workflow approval

- Distribusi: `submitted -> approved -> dispatched -> received/variance`
- Penerimaan: `submitted/discrepancy-review -> verified/rejected`
- Jejak approval disimpan sebagai trail terurut pada dokumen transaksi
- Approval distribusi sekarang juga membuat reservasi stok FEFO pada `stock_batches`
- Dispatch mengurangi saldo batch yang direservasi, bukan hanya mengubah status
- Scan dispense memotong saldo batch langsung dan menolak batch yang masih `discrepancy`

## 9. Data FORNAS

Seed di aplikasi ini adalah starter dataset untuk memperlihatkan alur dropdown dan validasi. Pada implementasi produksi, katalog dapat diganti penuh dari sumber resmi e-FORNAS.

Admin import web tersedia di `/admin/fornas` dengan dua mode:

- sinkron otomatis dari `https://e-fornas.kemkes.go.id/guest/daftar-obat`
- import CSV/XLSX dengan template yang disediakan di `public/templates/fornas-template.csv`

Catatan implementasi:

- sinkron resmi mengambil indeks obat, varian sediaan, lalu detail restriksi/fasilitas dari API e-FORNAS
- `cluster` ILP diisi default `Farmasi` karena tidak tersedia di sumber resmi
- `isPriority` diinferensikan dari flag `OEN`, `Program`, atau `Kanker`

## 10. Role-based auth

- Role direkomendasikan berada di custom claims Firebase dan disalin ke `users`
- Role yang didukung:
  - `Admin (Apoteker)`
  - `Petugas Farmasi`
  - `Petugas Jaringan`
  - `Petugas Unit`
- Rules Firestore contoh tersedia di `firestore.rules`
- Panel web admin user tersedia di `/admin/users` untuk membuat akun dan reset password tanpa Terminal

## 11. Mode produksi ketat

Untuk membedakan mode demo/staging dengan go-live resmi, proyek ini sekarang memakai env:

- `KSS_RUNTIME_MODE=demo`
- `KSS_RUNTIME_MODE=production`

Saat `production`:

- fallback demo untuk data operasional seperti `fornas_catalog`, `stock_batches`, `distribution_requests`, `alerts`, `audit_events`, dan snapshot dashboard dimatikan
- operasi tulis ke repository akan gagal eksplisit jika backend Firebase belum siap, bukan pura-pura sukses secara lokal
- endpoint bootstrap admin dikunci default, kecuali override khusus diaktifkan

## 12. Konfigurasi go-live

Panel `/admin/go-live` dipakai untuk menyimpan identitas fasilitas resmi yang menggantikan placeholder demo:

- nama fasilitas
- kode fasilitas
- kabupaten/kota
- provinsi
- alamat
- kontak telepon
- email fasilitas
- nama penanggung jawab farmasi
- nomor SIPA/STRA/SIKA

Dokumen ini disimpan di koleksi `system_config` dengan `id = facility_profile`.
