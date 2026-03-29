import type { RegulationReference } from "@/lib/types";

export const regulationReferences: RegulationReference[] = [
  {
    title: "Standar Pelayanan Kefarmasian di Puskesmas",
    code: "Permenkes No. 74 Tahun 2016",
    publishDate: "2016-12-23",
    effectiveDate: "2017-02-02",
    status: "Berlaku",
    description:
      "Menetapkan standar penyelenggaraan pelayanan kefarmasian di Puskesmas sebagai baseline operasional sistem.",
    sourceUrl: "https://peraturan.bpk.go.id/Home/Details/114629/permenkes-no-74-tahun-2016"
  },
  {
    title: "Perubahan atas Permenkes 74 Tahun 2016",
    code: "Permenkes No. 26 Tahun 2020",
    publishDate: "2020-10-06",
    effectiveDate: "2020-10-16",
    status: "Berlaku",
    description:
      "Memperbarui ketentuan standar pelayanan kefarmasian di Puskesmas dan menjadi acuan operasional terkini bersama Permenkes 74/2016.",
    sourceUrl: "https://peraturan.bpk.go.id/Details/163004/permenkes-no-26-tahun-2020"
  },
  {
    title: "Formularium Nasional",
    code: "KMK HK.01.07/MENKES/1199/2025",
    publishDate: "2025-12-31",
    effectiveDate: "2026-04-01",
    status: "Berlaku mulai 1 April 2026",
    description:
      "Baseline formularium untuk dropdown obat, validasi non-FORNAS, dan pembatasan level fasilitas.",
    sourceUrl:
      "https://farmalkes.kemkes.go.id/unduh/keputusan-menteri-kesehatan-republik-indonesia-nomor-hk-01-07-menkes-1199-2025-tentang-formularium-nasional/"
  }
];
