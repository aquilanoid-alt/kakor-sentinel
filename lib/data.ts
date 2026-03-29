import type {
  AlertItem,
  AuditEvent,
  DistributionRequest,
  FornasDrug,
  GuideSection,
  RackCell,
  StockBatch,
  SuspiciousPattern,
  UsageStat,
  UserRole
} from "@/lib/types";

export const currentOperator = {
  name: "",
  role: "Admin (Apoteker)" as UserRole,
  facility: "",
  syncStatus: "Sinkron terakhir 27 Maret 2026 08.34 WITA"
};

export const fornasCatalog: FornasDrug[] = [
  {
    id: "paracetamol-500",
    genericName: "Paracetamol",
    therapeuticClass: "Analgesik-antipiretik",
    dosageForm: "Tablet",
    strength: "500 mg",
    restriction: "Sesuai indikasi demam/nyeri ringan-sedang",
    facilityLevel: "FKTP, FKRTL",
    cluster: ["Dewasa & Lansia", "Ibu & Anak", "UGD", "Farmasi"],
    isPriority: true
  },
  {
    id: "amoxicillin-500",
    genericName: "Amoksisilin",
    therapeuticClass: "Antibiotik beta-laktam",
    dosageForm: "Kapsul",
    strength: "500 mg",
    restriction: "Antibiotik rasional sesuai diagnosis dan panduan",
    facilityLevel: "FKTP, FKRTL",
    cluster: ["Penyakit Menular", "Dewasa & Lansia", "Ibu & Anak", "Farmasi"],
    isPriority: true
  },
  {
    id: "oralit-sachet",
    genericName: "Oralit",
    therapeuticClass: "Rehidrasi oral",
    dosageForm: "Serbuk oral",
    strength: "200 mL",
    restriction: "Prioritas diare akut dengan dehidrasi ringan-sedang",
    facilityLevel: "FKTP, FKRTL",
    cluster: ["Ibu & Anak", "Penyakit Menular", "UGD"],
    isPriority: true
  },
  {
    id: "zinc-20",
    genericName: "Zink",
    therapeuticClass: "Mineral",
    dosageForm: "Tablet dispersibel",
    strength: "20 mg",
    restriction: "Suplementasi diare anak sesuai durasi terapi",
    facilityLevel: "FKTP, FKRTL",
    cluster: ["Ibu & Anak", "Penyakit Menular"],
    isPriority: true
  },
  {
    id: "amlodipine-10",
    genericName: "Amlodipin",
    therapeuticClass: "Antihipertensi",
    dosageForm: "Tablet",
    strength: "10 mg",
    restriction: "Manajemen hipertensi sesuai protokol PRB/FKTP",
    facilityLevel: "FKTP, FKRTL",
    cluster: ["Dewasa & Lansia", "Farmasi"],
    isPriority: true
  },
  {
    id: "metformin-500",
    genericName: "Metformin",
    therapeuticClass: "Antidiabetik oral",
    dosageForm: "Tablet",
    strength: "500 mg",
    restriction: "DM tipe 2 dengan evaluasi fungsi ginjal",
    facilityLevel: "FKTP, FKRTL",
    cluster: ["Dewasa & Lansia", "Farmasi"],
    isPriority: true
  },
  {
    id: "salbutamol-inhaler",
    genericName: "Salbutamol",
    therapeuticClass: "Bronkodilator",
    dosageForm: "Inhaler",
    strength: "100 mcg/dosis",
    restriction: "Asma/COPD dengan edukasi teknik inhalasi",
    facilityLevel: "FKTP, FKRTL",
    cluster: ["Dewasa & Lansia", "Ibu & Anak", "UGD"],
    isPriority: true
  },
  {
    id: "fe-folat",
    genericName: "Ferro sulfat + asam folat",
    therapeuticClass: "Suplemen hematinik",
    dosageForm: "Tablet",
    strength: "60 mg + 0.4 mg",
    restriction: "Program ibu hamil dan anemia",
    facilityLevel: "FKTP, FKRTL",
    cluster: ["Ibu & Anak"],
    isPriority: true
  },
  {
    id: "vitamin-a-200000",
    genericName: "Vitamin A",
    therapeuticClass: "Vitamin",
    dosageForm: "Kapsul",
    strength: "200.000 IU",
    restriction: "Program balita dan nifas sesuai jadwal",
    facilityLevel: "FKTP",
    cluster: ["Ibu & Anak"],
    isPriority: true
  },
  {
    id: "ceftriaxone-1g",
    genericName: "Seftriakson",
    therapeuticClass: "Antibiotik sefalosporin",
    dosageForm: "Injeksi",
    strength: "1 g",
    restriction: "Kasus infeksi tertentu dengan kewenangan klinis",
    facilityLevel: "FKRTL, UGD emergensi terpilih",
    cluster: ["UGD", "Rawat Inap", "Penyakit Menular"],
    isPriority: false
  },
  {
    id: "omeprazole-20",
    genericName: "Omeprazol",
    therapeuticClass: "Gastroprotektor",
    dosageForm: "Kapsul",
    strength: "20 mg",
    restriction: "Indikasi dispepsia/ulkus sesuai pembatasan klinis",
    facilityLevel: "FKTP, FKRTL",
    cluster: ["Dewasa & Lansia", "UGD"],
    isPriority: false
  },
  {
    id: "gentamicin-eye",
    genericName: "Gentamisin",
    therapeuticClass: "Antibiotik topikal",
    dosageForm: "Tetes mata",
    strength: "0,3%",
    restriction: "Infeksi bakteri mata sesuai diagnosis",
    facilityLevel: "FKTP, FKRTL",
    cluster: ["Dewasa & Lansia", "Ibu & Anak"],
    isPriority: false
  }
];

export const stockBatches: StockBatch[] = [
  {
    id: "BATCH-001",
    drugId: "paracetamol-500",
    batch: "PCM-26A01",
    expiryDate: "2026-09-30",
    quantity: 4200,
    reserved: 600,
    location: "A1-R2-B3",
    lastUpdated: "2026-03-27T08:15:00+08:00",
    sourceDocument: "DO-274/III/2026",
    discrepancy: false
  },
  {
    id: "BATCH-002",
    drugId: "amoxicillin-500",
    batch: "AMX-25K17",
    expiryDate: "2026-06-30",
    quantity: 1800,
    reserved: 300,
    location: "A2-R1-B2",
    lastUpdated: "2026-03-27T08:11:00+08:00",
    sourceDocument: "DO-274/III/2026",
    discrepancy: false
  },
  {
    id: "BATCH-003",
    drugId: "oralit-sachet",
    batch: "ORL-26B88",
    expiryDate: "2027-01-31",
    quantity: 920,
    reserved: 120,
    location: "A1-R4-B1",
    lastUpdated: "2026-03-27T07:59:00+08:00",
    sourceDocument: "DO-271/III/2026",
    discrepancy: false
  },
  {
    id: "BATCH-004",
    drugId: "ceftriaxone-1g",
    batch: "CTX-25N03",
    expiryDate: "2026-05-31",
    quantity: 80,
    reserved: 20,
    location: "C1-R1-B1",
    lastUpdated: "2026-03-27T07:42:00+08:00",
    sourceDocument: "DO-201/II/2026",
    discrepancy: true
  },
  {
    id: "BATCH-005",
    drugId: "vitamin-a-200000",
    batch: "VITA-26C20",
    expiryDate: "2026-11-30",
    quantity: 600,
    reserved: 0,
    location: "B2-R2-B2",
    lastUpdated: "2026-03-27T07:35:00+08:00",
    sourceDocument: "DO-229/II/2026",
    discrepancy: false
  }
];

export const alerts: AlertItem[] = [
  {
    id: "ALT-01",
    severity: "critical",
    title: "Risiko stok kritis oralit",
    detail: "Sisa 920 sachet dengan tren pemakaian 310 sachet/minggu. Butuh reorder < 3 hari.",
    action: "Ajukan permintaan buffer ke Dinkes hari ini."
  },
  {
    id: "ALT-02",
    severity: "warning",
    title: "Batch seftriakson mendekati ED",
    detail: "BATCH-004 berakhir 31 Mei 2026. Prioritaskan distribusi FEFO dan review kebutuhan UGD.",
    action: "Masukkan batch ke prioritas distribusi UGD."
  },
  {
    id: "ALT-03",
    severity: "warning",
    title: "Anomali pemakaian amoksisilin",
    detail: "Pemakaian salah satu unit jaringan naik 42% dibanding rerata 4 minggu.",
    action: "Minta konfirmasi resep dan stok fisik hari ini."
  },
  {
    id: "ALT-04",
    severity: "info",
    title: "7 transaksi offline menunggu sinkronisasi",
    detail: "Seluruh transaksi sudah tersimpan lokal. Sinkron otomatis saat koneksi stabil.",
    action: "Pastikan perangkat kembali online sebelum tutup shift."
  }
];

export const usageStats: UsageStat[] = [
  { label: "Pemakaian 7 hari", value: 4820, delta: 8 },
  { label: "Distribusi aktif", value: 37, delta: 12 },
  { label: "Batch terpantau", value: 124, delta: 3 },
  { label: "Kepatuhan scan", value: 99, delta: 1 }
];

export const clusterUsage: UsageStat[] = [
  { label: "Manajemen", value: 320, delta: -4 },
  { label: "Ibu & Anak", value: 1220, delta: 16 },
  { label: "Dewasa & Lansia", value: 1740, delta: 9 },
  { label: "Penyakit Menular", value: 890, delta: 11 },
  { label: "Lintas Klaster", value: 650, delta: 6 }
];

export const distributionRequests: DistributionRequest[] = [
  {
    id: "DST-260327-01",
    requestingUnit: "",
    cluster: "Penyakit Menular",
    requestedBy: "",
    status: "pending",
    drugId: "amoxicillin-500",
    quantityRequested: 240,
    quantityApproved: 200,
    quantityReceived: 0,
    requestedAt: "2026-03-27T06:45:00+08:00",
    eta: "2026-03-27T12:00:00+08:00"
  },
  {
    id: "DST-260327-02",
    requestingUnit: "",
    cluster: "Ibu & Anak",
    requestedBy: "",
    status: "dikirim",
    drugId: "vitamin-a-200000",
    quantityRequested: 160,
    quantityApproved: 160,
    quantityReceived: 0,
    requestedAt: "2026-03-27T07:10:00+08:00",
    eta: "2026-03-27T11:00:00+08:00"
  },
  {
    id: "DST-260326-12",
    requestingUnit: "",
    cluster: "UGD",
    requestedBy: "",
    status: "selisih",
    drugId: "ceftriaxone-1g",
    quantityRequested: 30,
    quantityApproved: 20,
    quantityReceived: 18,
    requestedAt: "2026-03-26T14:00:00+08:00",
    eta: "2026-03-26T15:30:00+08:00"
  },
  {
    id: "DST-260326-09",
    requestingUnit: "",
    cluster: "Rawat Inap",
    requestedBy: "",
    status: "diterima",
    drugId: "paracetamol-500",
    quantityRequested: 500,
    quantityApproved: 500,
    quantityReceived: 500,
    requestedAt: "2026-03-26T09:15:00+08:00",
    eta: "2026-03-26T10:15:00+08:00"
  }
];

export const rackMap: RackCell[] = [
  { code: "A1-R1", zone: "Fast moving", itemCount: 18, temperature: "24 C" },
  { code: "A1-R2", zone: "Antibiotik oral", itemCount: 24, temperature: "24 C" },
  { code: "B2-R2", zone: "Program KIA", itemCount: 12, temperature: "23 C" },
  { code: "C1-R1", zone: "Emergensi injeksi", itemCount: 9, temperature: "22 C" },
  { code: "D1-R3", zone: "Cadangan buffer", itemCount: 14, temperature: "24 C" }
];

export const suspiciousPatterns: SuspiciousPattern[] = [
  {
    id: "RISK-01",
    signal: "Repeated offline issue",
    description: "Salah satu perangkat unit mencatat 5 transaksi offline berturut-turut pada jam sibuk.",
    riskScore: 72
  },
  {
    id: "RISK-02",
    signal: "Variance on receipt",
    description: "Selisih 2 vial pada penerimaan batch CTX-25N03 belum ditutup dengan BA discrepancy.",
    riskScore: 84
  },
  {
    id: "RISK-03",
    signal: "Outlier demand",
    description: "Permintaan amoksisilin dari salah satu unit jaringan melebihi pola historis 42%.",
    riskScore: 65
  }
];

export const auditTrail: AuditEvent[] = [
  {
    id: "AUD-001",
    actor: "",
    role: "Admin (Apoteker)",
    action: "Approval distribusi",
    entity: "Distribusi",
    reference: "DST-260327-01",
    timestamp: "2026-03-27T08:05:00+08:00",
    mode: "online"
  },
  {
    id: "AUD-002",
    actor: "",
    role: "Petugas Farmasi",
    action: "Generate QR batch",
    entity: "Penerimaan",
    reference: "DO-274/III/2026",
    timestamp: "2026-03-27T07:58:00+08:00",
    mode: "online"
  },
  {
    id: "AUD-003",
    actor: "",
    role: "Petugas Unit",
    action: "Ambil obat dengan scan",
    entity: "Pengambilan",
    reference: "TXN-UGD-260327-005",
    timestamp: "2026-03-27T07:35:00+08:00",
    mode: "offline"
  },
  {
    id: "AUD-004",
    actor: "",
    role: "Petugas Jaringan",
    action: "Konfirmasi penerimaan",
    entity: "Distribusi",
    reference: "DST-260326-09",
    timestamp: "2026-03-26T10:25:00+08:00",
    mode: "online"
  }
];

export const guideSections: GuideSection[] = [
  {
    id: "guide-1",
    title: "Prinsip Harian",
    subtitle: "Aturan emas supaya zero loss benar-benar jalan",
    content: [
      "Setiap transaksi wajib login, pilih klaster ILP, lalu scan QR obat atau QR distribusi. Bila QR tidak terbaca, transaksi dihentikan dan dicatat sebagai exception untuk supervisor.",
      "Gunakan prinsip FEFO setiap kali memilih batch. Sistem menampilkan batch prioritas, tetapi petugas tetap wajib cocokkan batch fisik, ED, dan jumlah.",
      "Semua selisih fisik, DO, atau jumlah diterima wajib ditutup sebagai discrepancy dengan berita acara digital sebelum stok dinyatakan masuk."
    ]
  },
  {
    id: "guide-2",
    title: "Alur 5 Detik",
    subtitle: "Flow lapangan yang disederhanakan untuk HP",
    content: [
      "Buka menu Scan Obat. Kamera otomatis aktif dan membaca QR batch atau QR distribusi.",
      "Periksa data auto-fill: nama obat, unit, klaster, batch, ED, dan saldo tersedia.",
      "Masukkan jumlah, lalu tekan submit. Timestamp, user, mode online/offline, dan audit trail tercatat otomatis."
    ]
  },
  {
    id: "guide-3",
    title: "Mode Offline",
    subtitle: "Tetap kerja walau jaringan putus",
    content: [
      "Jika internet terputus, banner offline muncul. Sistem tetap menyimpan transaksi ke IndexedDB dan memberi nomor referensi lokal.",
      "Saat koneksi kembali stabil, antrean sinkron berjalan otomatis. Supervisor cukup memeriksa apakah status berubah menjadi synced.",
      "Sebelum tutup shift, buka panel sinkronisasi. Jangan tinggalkan antrean pending tanpa alasan yang terdokumentasi."
    ]
  },
  {
    id: "guide-4",
    title: "Respon Alert",
    subtitle: "Kapan petugas harus bertindak cepat",
    content: [
      "Alert stok kritis berarti reorder point sudah terlewati. Buat usulan distribusi atau permintaan buffer di hari yang sama.",
      "Alert obat hampir ED harus diikuti redistribusi FEFO, review kebutuhan unit, dan monitoring harian sampai batch aman.",
      "Alert aktivitas mencurigakan harus diverifikasi dengan audit trail, stok fisik, dan atasan langsung."
    ]
  },
  {
    id: "guide-5",
    title: "Dasar Pembuatan Aplikasi Berbasis Web Ini",
    subtitle: "Mengapa sistem dibuat sebagai web app dan PWA",
    content: [
      "KAKOR SENTINEL SUPPLY dibangun sebagai aplikasi web agar dapat dibuka dari laptop, tablet, dan HP tanpa instalasi yang rumit. Model ini memudahkan Puskesmas karena pembaruan sistem cukup dilakukan di server, lalu pengguna cukup membuka alamat aplikasi yang sama.",
      "Aplikasi juga disiapkan sebagai Progressive Web App atau PWA. Artinya tampilan bisa dipasang di home screen HP, kamera dapat dipakai untuk scan, dan saat jaringan lemah transaksi tetap bisa diantrikan lebih dulu lalu disinkronkan saat online kembali.",
      "Fondasi teknisnya terdiri dari Next.js untuk antarmuka dan route aplikasi, Tailwind CSS untuk desain, Firebase Authentication untuk login role-based, Firestore untuk penyimpanan data, IndexedDB untuk mode offline, serta generator QR dan export PDF/Excel untuk operasional lapangan."
    ]
  },
  {
    id: "guide-6",
    title: "Arsitektur Sistem dan Alur Data",
    subtitle: "Bagaimana data bergerak dari scan sampai laporan",
    content: [
      "Data utama sistem terdiri dari katalog FORNAS, batch stok, penerimaan, distribusi, pengambilan obat, stock opname, alert, dan audit trail. Setiap transaksi selalu membawa identitas petugas, timestamp, role, dan konteks klaster ILP.",
      "Saat petugas melakukan aksi, aplikasi lebih dulu memeriksa data yang wajib ada, misalnya batch, klaster, jumlah, atau approval. Jika perangkat online, data dikirim ke backend. Jika offline, data masuk antrean lokal dan akan didorong ke backend setelah koneksi kembali normal.",
      "Setelah transaksi masuk, sistem memperbarui stok batch, menghitung ulang alert, memperkuat audit trail, dan menyiapkan data untuk dashboard, pemantauan FEFO, serta laporan otomatis seperti LPLPO, distribusi, pemakaian, dan stok akhir."
    ]
  },
  {
    id: "guide-7",
    title: "Menu Overview",
    subtitle: "Fungsi halaman utama yang pertama dilihat petugas",
    content: [
      "Menu Overview adalah ringkasan komando utama. Di sini petugas melihat indikator penggunaan, alert prioritas, ringkasan cluster, role matrix, dan panduan cepat tanpa perlu membuka terlalu banyak halaman.",
      "Gunakan halaman ini untuk mulai kerja harian: cek apakah ada stok kritis, batch hampir ED, antrean distribusi, atau gangguan sinkronisasi. Bila ada alert merah atau kuning, tindak lanjuti dulu sebelum memulai transaksi baru.",
      "Overview bukan tempat input detail. Fungsinya adalah orientasi situasi, navigasi cepat ke modul operasional, dan memastikan petugas memulai kerja dengan konteks yang tepat."
    ]
  },
  {
    id: "guide-8",
    title: "Menu Dashboard",
    subtitle: "Analitik, heatmap, audit, dan sinyal anomali",
    content: [
      "Dashboard menampilkan analitik lebih dalam dibanding Overview. Di sini petugas atau apoteker melihat pola penggunaan obat, distribusi antar unit, stok dengan risiko rendah/tinggi, audit trail, dan indikasi kejadian tidak wajar.",
      "Gunakan Dashboard untuk evaluasi mingguan atau harian, terutama saat ingin menilai lonjakan pemakaian per klaster, pola distribusi ke jaringan, atau apakah ada batch yang sering muncul dalam investigasi.",
      "Dashboard bersifat analitik dan pengawasan. Ia membantu pengambilan keputusan, tetapi perubahan data tetap dilakukan dari modul transaksi seperti Penerimaan, Distribusi, Scan, dan Stok."
    ]
  },
  {
    id: "guide-9",
    title: "Menu Scan",
    subtitle: "Transaksi cepat berbasis kamera, QR, dan barcode",
    content: [
      "Menu Scan dipakai saat petugas ingin mencatat pengambilan atau pemakaian obat secara cepat. Kamera aktif otomatis dan mencoba membaca QR internal sistem maupun barcode yang didukung browser perangkat.",
      "Bila kode yang discan adalah QR batch internal, sistem dapat langsung mengenali batch dan menghubungkannya dengan obat yang ada di stok. Bila barcode pabrikan mengikuti format GS1, sistem dapat membaca batch dan ED selama data itu memang tersimpan di barcode.",
      "Jika barcode belum cukup lengkap, petugas tetap dapat memilih obat dari dropdown FORNAS dan mengisi detail secara manual. Prinsipnya: scan diprioritaskan, tetapi input manual tetap tersedia agar pekerjaan lapangan tidak terhenti."
    ]
  },
  {
    id: "guide-10",
    title: "Menu Penerimaan",
    subtitle: "Mencatat obat masuk dari Dinkes atau sumber resmi lainnya",
    content: [
      "Di modul ini petugas mengisi nomor DO atau faktur, memilih obat FORNAS, memasukkan batch, ED, jumlah dokumen, jumlah fisik, dan lokasi penyimpanan. Sistem lalu membandingkan jumlah fisik dan dokumen untuk menentukan apakah status MATCH atau DISCREPANCY.",
      "Sekarang halaman ini juga menyediakan dua jalur kerja: scan barcode atau QR terlebih dahulu, atau input manual penuh. Jika hasil scan dapat dikenali, beberapa field seperti obat, batch, dan ED akan terisi otomatis. Jika tidak, petugas tinggal melengkapi sisanya secara manual.",
      "Setelah penerimaan tersimpan dan diverifikasi, sistem akan membuat QR batch, menambah stok ke gudang, dan mencatat audit trail. Jika ada selisih, batch dapat ditahan dalam status discrepancy sampai review selesai."
    ]
  },
  {
    id: "guide-11",
    title: "Menu Distribusi",
    subtitle: "Mengelola permintaan, approval, kirim, dan penerimaan jaringan",
    content: [
      "Modul Distribusi dipakai untuk membuat permintaan obat dari Pustu, Poskesdes, atau unit lain. Data yang diisi meliputi unit peminta, klaster ILP, obat, jumlah permintaan, rencana approval, dan ETA.",
      "Setelah permintaan dibuat, approval dilakukan sesuai role. Saat distribusi disetujui, sistem menyiapkan QR distribusi dan alokasi batch FEFO agar obat yang keluar bisa ditelusuri kembali saat diterima di lokasi tujuan.",
      "Gunakan halaman detail distribusi untuk melanjutkan workflow approval, dispatch, penerimaan, atau mencatat selisih. Setiap perubahan status tetap tersimpan di jejak audit dan memengaruhi saldo stok secara terkontrol."
    ]
  },
  {
    id: "guide-12",
    title: "Menu Stok",
    subtitle: "Pemantauan batch, FEFO, lokasi rak, dan stock opname",
    content: [
      "Menu Stok menampilkan batch obat yang tersimpan, lokasi rak, saldo, reserved quantity, dan tanggal kedaluwarsa. Daftar ini penting untuk memastikan petugas selalu mengambil batch yang paling dulu expired sesuai prinsip FEFO.",
      "Di halaman ini petugas bisa melakukan stock opname dengan membandingkan saldo sistem dan saldo fisik. Bila terjadi selisih, sistem akan menandainya sebagai variance dan mendorong investigasi.",
      "Gunakan modul Stok secara rutin untuk memantau batch mendekati ED, mengecek apakah ada batch discrepancy yang masih tertahan, dan memastikan lokasi fisik obat sesuai dengan catatan sistem."
    ]
  },
  {
    id: "guide-13",
    title: "Menu Laporan",
    subtitle: "Membuat PDF dan Excel operasional tanpa rekap manual",
    content: [
      "Menu Laporan dipakai untuk menghasilkan laporan otomatis seperti LPLPO, distribusi, pemakaian, dan stok akhir. Petugas tinggal memilih jenis laporan dan periode, lalu sistem menyusun dokumen dari data transaksi yang sudah masuk.",
      "Output dapat diunduh sebagai PDF atau Excel sesuai kebutuhan lapangan, administrasi, atau supervisi. Metadata seperti nama penyusun, penanggung jawab, dan periode dapat ikut dicantumkan agar dokumen siap diaudit.",
      "Karena laporan ditarik langsung dari transaksi, kualitas laporan sangat bergantung pada kedisiplinan scan, kelengkapan batch, dan penutupan discrepancy. Prinsipnya: data transaksi yang benar akan menghasilkan laporan yang benar."
    ]
  },
  {
    id: "guide-14",
    title: "Menu Panduan",
    subtitle: "Manual lapangan, SOP, dan materi cetak yang selalu tersedia",
    content: [
      "Halaman Panduan adalah manual operasional aplikasi ini. Ia memuat alur kerja, penjelasan fungsi menu, dasar arsitektur sistem, role matrix, regulasi acuan, dan SOP tindak lanjut bila muncul alert atau masalah operasional.",
      "Halaman ini memang dirancang agar bisa dibaca di web, dicetak ke PDF, dan dibagikan melalui WhatsApp atau email. Karena itu susunannya dibuat lebih formal, stabil, dan mudah dipahami lintas peran.",
      "Gunakan halaman ini sebagai referensi utama saat onboarding petugas baru, saat supervisi, atau saat perlu menjelaskan bagaimana sistem bekerja dari hulu ke hilir."
    ]
  },
  {
    id: "guide-15",
    title: "Menu Admin User dan Admin FORNAS",
    subtitle: "Menu khusus untuk administrasi sistem",
    content: [
      "Menu Admin User dipakai oleh Admin atau Apoteker untuk membuat akun baru, menentukan role, dan mengubah password petugas. Setiap akun harus diberi role yang tepat agar hak akses tidak melampaui kewenangannya.",
      "Menu Admin FORNAS dipakai untuk sinkronisasi atau pembaruan katalog obat. Ini penting karena dropdown obat tidak boleh diisi bebas, melainkan harus mengikuti master FORNAS yang berlaku.",
      "Menu admin bukan untuk transaksi harian. Fungsinya adalah menjaga kualitas data dasar, keamanan akses, dan kepatuhan sistem terhadap standar formularium."
    ]
  },
  {
    id: "guide-16",
    title: "Keamanan, Audit Trail, dan Anti Kehilangan",
    subtitle: "Mengapa setiap klik harus bisa dipertanggungjawabkan",
    content: [
      "Aplikasi ini dibangun dengan prinsip traceable, accountable, real-time, dan auditable. Itu berarti setiap transaksi harus bisa ditelusuri kembali ke siapa pelakunya, kapan dilakukan, obat apa yang bergerak, batch apa yang dipakai, dan ke unit mana obat tersebut mengalir.",
      "Audit trail tidak hanya berguna saat ada kehilangan. Ia juga penting untuk memvalidasi penggunaan tidak wajar, menyelesaikan selisih stok, membuktikan kepatuhan scan, dan menjaga integritas data saat membuat laporan resmi.",
      "Role-based access, wajib scan, discrepancy review, dan approval workflow adalah empat pilar utama anti-kehilangan dalam sistem ini. Bila salah satu dilewati, maka jejak pengendalian menjadi lemah."
    ]
  },
  {
    id: "guide-17",
    title: "Troubleshooting Lapangan",
    subtitle: "Apa yang harus dilakukan jika ada hambatan saat bertugas",
    content: [
      "Jika kamera tidak terbaca, pindah ke input manual atau gunakan scanner eksternal bila tersedia. Jangan memaksa transaksi tanpa jejak kode, terutama untuk alur yang mewajibkan scan.",
      "Jika aplikasi offline, lanjutkan transaksi seperti biasa selama antrean lokal aktif. Periksa banner offline, simpan referensi lokal bila perlu, lalu sinkronkan kembali saat jaringan stabil.",
      "Jika data obat tidak muncul otomatis dari barcode, periksa apakah barcode hanya berisi kode produk biasa. Dalam kondisi itu, pilih obat dari daftar FORNAS lalu isi batch, ED, dan jumlah manual. Jika masalah berulang, laporkan ke admin agar barcode tersebut dipetakan ke master internal."
    ]
  }
];

export const guideFoundationCards = [
  {
    title: "Pondasi aplikasi web + PWA",
    detail:
      "Aplikasi dibangun agar bisa dipakai dari browser biasa maupun dipasang ke home screen HP. Tujuannya adalah akses cepat, update terpusat, dan tetap ringan untuk lapangan."
  },
  {
    title: "Mesin data dan keamanan",
    detail:
      "Firebase Auth mengelola login role-based, Firestore menyimpan transaksi, dan session server menjaga halaman sensitif tetap aman. Semua transaksi terhubung ke audit trail."
  },
  {
    title: "Offline-first operasional",
    detail:
      "IndexedDB dan antrean sinkron membuat petugas tetap bisa bekerja saat jaringan putus. Data tidak hilang, hanya ditunda kirim sampai koneksi kembali normal."
  }
];

export const guideMenuMap = [
  { menu: "Overview", detail: "Ringkasan situasi, alert, indikator utama, dan pintu masuk cepat ke modul." },
  { menu: "Dashboard", detail: "Analitik, pola penggunaan, audit trail, dan indikasi anomali." },
  { menu: "Scan", detail: "Transaksi cepat berbasis kamera, QR, dan barcode dengan fallback manual." },
  { menu: "Penerimaan", detail: "Mencatat obat masuk, cocokkan dokumen vs fisik, lalu generate QR batch." },
  { menu: "Distribusi", detail: "Permintaan, approval, kirim, terima, dan penanganan selisih." },
  { menu: "Stok", detail: "Pemantauan batch, FEFO, lokasi rak, saldo, dan stock opname." },
  { menu: "Laporan", detail: "Membuat PDF/Excel otomatis dari transaksi yang sudah tercatat." },
  { menu: "Panduan", detail: "Manual operasional, arsitektur sistem, dan SOP petugas." },
  { menu: "Admin User", detail: "Kelola akun, role, dan reset password petugas." },
  { menu: "Admin FORNAS", detail: "Sinkronisasi dan pembaruan master katalog obat FORNAS." }
];

export const roleMatrix = [
  {
    role: "Admin (Apoteker)",
    can: "Approval distribusi, override discrepancy, finalisasi laporan, kelola user, audit trail penuh"
  },
  {
    role: "Petugas Farmasi",
    can: "Penerimaan, stock opname, generate QR batch, packing distribusi, input laporan operasional"
  },
  {
    role: "Petugas Jaringan",
    can: "Permintaan distribusi, scan penerimaan distribusi, konfirmasi selisih, lihat stok unit"
  },
  {
    role: "Petugas Unit",
    can: "Scan pengambilan obat, input penggunaan, lihat histori unit sendiri"
  }
];
