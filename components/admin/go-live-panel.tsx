"use client";

import { useMemo, useState } from "react";
import type { GoLiveConfig, RuntimeMode } from "@/lib/types";

function formatDateTime(value?: string) {
  if (!value) {
    return "Belum pernah disimpan";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
}

export function GoLivePanel({
  initialConfig,
  runtimeMode,
  firebaseReady,
  bootstrapLocked
}: {
  initialConfig: GoLiveConfig | null;
  runtimeMode: RuntimeMode;
  firebaseReady: boolean;
  bootstrapLocked: boolean;
}) {
  const [form, setForm] = useState({
    facilityName: initialConfig?.facilityName ?? "",
    facilityCode: initialConfig?.facilityCode ?? "",
    districtCity: initialConfig?.districtCity ?? "",
    province: initialConfig?.province ?? "",
    address: initialConfig?.address ?? "",
    contactPhone: initialConfig?.contactPhone ?? "",
    contactEmail: initialConfig?.contactEmail ?? "",
    pharmacyLeadName: initialConfig?.pharmacyLeadName ?? "",
    pharmacyLeadLicense: initialConfig?.pharmacyLeadLicense ?? ""
  });
  const [message, setMessage] = useState(
    initialConfig
      ? `Konfigurasi terakhir diperbarui ${formatDateTime(initialConfig.updatedAt)} oleh ${initialConfig.updatedBy}.`
      : "Lengkapi identitas fasilitas resmi sebelum go-live penuh."
  );
  const [isSaving, setIsSaving] = useState(false);

  const readiness = useMemo(
    () => [
      {
        label: "Mode runtime",
        value: runtimeMode === "production" ? "Produksi ketat" : "Demo / staging",
        ok: runtimeMode === "production"
      },
      {
        label: "Backend Firebase",
        value: firebaseReady ? "Siap" : "Belum lengkap",
        ok: firebaseReady
      },
      {
        label: "Bootstrap admin",
        value: bootstrapLocked ? "Terkunci" : "Masih terbuka",
        ok: bootstrapLocked
      },
      {
        label: "Profil fasilitas",
        value: initialConfig ? "Sudah tersimpan" : "Belum tersimpan",
        ok: Boolean(initialConfig)
      }
    ],
    [bootstrapLocked, firebaseReady, initialConfig, runtimeMode]
  );

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setMessage("Menyimpan konfigurasi go-live...");

    try {
      const response = await fetch("/api/admin/go-live", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        config?: GoLiveConfig;
      };

      if (!response.ok || result.ok === false || !result.config) {
        throw new Error(result.error ?? "Konfigurasi go-live gagal disimpan.");
      }

      setMessage(
        `Konfigurasi resmi tersimpan ${formatDateTime(result.config.updatedAt)} oleh ${result.config.updatedBy}. Refresh halaman untuk melihat status terbaru.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Konfigurasi go-live gagal disimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="surface-card rounded-[30px] p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Go-live resmi</p>
          <h2 className="mt-2 font-heading text-3xl font-semibold text-white">Identitas fasilitas produksi</h2>
          <p className="mt-3 text-sm leading-7 text-mist/75">
            Simpan identitas Puskesmas resmi, kontak, dan penanggung jawab farmasi di sini. Data ini dipakai sebagai
            fondasi go-live dan harus menggantikan semua placeholder demo.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {readiness.map((item) => (
            <div key={item.label} className="surface-card rounded-[26px] p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">{item.label}</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-white">{item.value}</p>
              <p className={`mt-2 text-sm ${item.ok ? "text-aqua" : "text-amber-100"}`}>
                {item.ok ? "Siap" : "Perlu ditindaklanjuti"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="surface-card rounded-[30px] p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Nama fasilitas</span>
            <input
              value={form.facilityName}
              onChange={(event) => handleChange("facilityName", event.target.value)}
              className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Kode fasilitas</span>
            <input
              value={form.facilityCode}
              onChange={(event) => handleChange("facilityCode", event.target.value)}
              className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Kabupaten / Kota</span>
            <input
              value={form.districtCity}
              onChange={(event) => handleChange("districtCity", event.target.value)}
              className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Provinsi</span>
            <input
              value={form.province}
              onChange={(event) => handleChange("province", event.target.value)}
              className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm text-mist/75">Alamat lengkap</span>
            <textarea
              value={form.address}
              onChange={(event) => handleChange("address", event.target.value)}
              className="surface-input min-h-24 w-full rounded-2xl px-4 py-3 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Kontak telepon</span>
            <input
              value={form.contactPhone}
              onChange={(event) => handleChange("contactPhone", event.target.value)}
              className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Email fasilitas</span>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(event) => handleChange("contactEmail", event.target.value)}
              className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Penanggung jawab farmasi</span>
            <input
              value={form.pharmacyLeadName}
              onChange={(event) => handleChange("pharmacyLeadName", event.target.value)}
              className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Nomor SIPA / STRA / SIKA</span>
            <input
              value={form.pharmacyLeadLicense}
              onChange={(event) => handleChange("pharmacyLeadLicense", event.target.value)}
              className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className="action-brand rounded-full px-5 py-3 text-sm font-semibold shadow-neon disabled:opacity-60"
          >
            {isSaving ? "Menyimpan..." : "Simpan konfigurasi go-live"}
          </button>
        </div>

        <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm text-mist/75">
          {message}
        </div>
      </div>
    </div>
  );
}
