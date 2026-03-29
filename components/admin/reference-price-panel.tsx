"use client";

import { useMemo, useState } from "react";
import type { FornasDrug } from "@/lib/types";
import {
  filterReferencePriceCatalog,
  hasReferencePrice,
  normalizeReferencePriceScheme
} from "@/lib/reference-price-utils";

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return "Belum tersedia";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value?: string) {
  if (!value) {
    return "Belum diisi";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium"
  }).format(parsed);
}

export function ReferencePricePanel({ catalog }: { catalog: FornasDrug[] }) {
  const [query, setQuery] = useState("");
  const [scheme, setScheme] = useState<"all" | "JKN" | "Reguler">("all");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");

  const filtered = useMemo(() => {
    return filterReferencePriceCatalog(catalog, {
      query,
      scheme,
      updatedFrom,
      updatedTo
    });
  }, [catalog, query, scheme, updatedFrom, updatedTo]);

  const withPriceCount = filtered.filter((item) => hasReferencePrice(item)).length;

  const exportQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("query", query.trim());
    }
    if (scheme !== "all") {
      params.set("scheme", scheme);
    }
    if (updatedFrom) {
      params.set("updatedFrom", updatedFrom);
    }
    if (updatedTo) {
      params.set("updatedTo", updatedTo);
    }

    return params.toString();
  }, [query, scheme, updatedFrom, updatedTo]);

  const handleExport = (format: "pdf" | "excel") => {
    const params = new URLSearchParams(exportQueryString);
    params.set("format", format);
    window.open(`/api/admin/reference-prices/export?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="surface-card rounded-[30px] p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Audit harga</p>
          <h2 className="mt-2 font-heading text-3xl font-semibold text-white">Daftar harga referensi obat</h2>
          <p className="mt-3 text-sm leading-7 text-mist/75">
            Gunakan halaman ini untuk memeriksa obat mana yang sudah punya harga referensi, skema pembiayaan, sumber
            harga, dan tanggal update terbaru.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="surface-card rounded-[30px] p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Item tampil</p>
            <p className="mt-2 font-heading text-3xl font-semibold text-white">{filtered.length}</p>
            <p className="mt-2 text-sm text-mist/70">Setelah filter obat, skema, dan tanggal update.</p>
          </div>
          <div className="surface-card rounded-[30px] p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-aqua/75">Sudah ada harga</p>
            <p className="mt-2 font-heading text-3xl font-semibold text-white">{withPriceCount}</p>
            <p className="mt-2 text-sm text-mist/70">Item yang sudah terpasang harga referensi aktif.</p>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-[30px] p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Cari obat</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nama obat, bentuk, kekuatan, atau ID"
              className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Skema</span>
            <select
              value={scheme}
              onChange={(event) => setScheme(event.target.value as "all" | "JKN" | "Reguler")}
              className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
            >
              <option value="all">Semua skema</option>
              <option value="JKN">JKN</option>
              <option value="Reguler">Reguler</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Update dari</span>
            <input
              type="date"
              value={updatedFrom}
              onChange={(event) => setUpdatedFrom(event.target.value)}
              className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-mist/75">Update sampai</span>
            <input
              type="date"
              value={updatedTo}
              onChange={(event) => setUpdatedTo(event.target.value)}
              className="surface-input w-full rounded-2xl px-4 py-3 outline-none"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleExport("pdf")}
            className="action-brand rounded-full px-5 py-3 text-sm font-semibold shadow-neon"
          >
            Export PDF Audit
          </button>
          <button
            type="button"
            onClick={() => handleExport("excel")}
            className="action-ghost rounded-full px-5 py-3 text-sm font-medium text-white"
          >
            Export Excel Audit
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="surface-card rounded-[28px] p-5 text-sm text-mist/75">
            Belum ada item yang cocok dengan filter. Coba longgarkan pencarian atau pastikan master harga sudah diimport.
          </div>
        ) : (
          filtered.map((item) => {
            const schemeLabel = normalizeReferencePriceScheme(item);
            const hasPrice = hasReferencePrice(item);

            return (
              <article key={item.id} className="surface-card rounded-[28px] p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold text-white">
                        {item.genericName} • {item.dosageForm} {item.strength}
                      </p>
                      <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs text-aqua">
                        {schemeLabel}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${
                          hasPrice
                            ? "border-teal/20 bg-teal/10 text-aqua"
                            : "border-amber-300/20 bg-amber-400/10 text-amber-100"
                        }`}
                      >
                        {hasPrice ? "Harga terpasang" : "Harga belum diisi"}
                      </span>
                    </div>
                    <p className="text-sm text-mist/70">{item.therapeuticClass}</p>
                    <p className="text-xs uppercase tracking-[0.25em] text-mist/45">ID {item.id}</p>
                  </div>

                  <div className="min-w-[220px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-aqua/75">Harga referensi</p>
                    <p className="mt-2 font-heading text-2xl font-semibold text-white">
                      {formatCurrency(item.referencePrice)}
                    </p>
                    <p className="mt-2 text-sm text-mist/70">Update {formatDate(item.referencePriceUpdatedAt)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-aqua/75">Level & restriksi</p>
                    <p className="mt-2 text-sm text-white">{item.facilityLevel}</p>
                    <p className="mt-2 text-sm text-mist/70">{item.restriction}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-aqua/75">Sumber harga</p>
                    <p className="mt-2 text-sm leading-7 text-mist/75">
                      {item.referencePriceSource ||
                        "Belum ada sumber harga tercatat. Upload master harga resmi agar audit lebih mudah."}
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
