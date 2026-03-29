"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { flushPendingMutations, registerServiceWorker } from "@/lib/offline";

export function SyncProvider({ children }: { children: ReactNode }) {
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    let timer: number | undefined;

    const boot = async () => {
      try {
        await registerServiceWorker();
      } catch {
        setBanner("Service worker belum aktif. Mode offline tetap tersedia terbatas.");
      }
    };

    const sync = async () => {
      if (!navigator.onLine) {
        setBanner("Mode offline aktif. Semua transaksi disimpan lokal dan akan sinkron otomatis.");
        return;
      }

      try {
        const result = await flushPendingMutations();
        setBanner(
          result.processed > 0
            ? `${result.processed} transaksi offline berhasil disinkronkan.`
            : "Semua data sudah sinkron."
        );
      } catch {
        setBanner("Sinkronisasi gagal. Data lokal tetap aman dan akan dicoba ulang.");
      }

      timer = window.setTimeout(() => setBanner(null), 5000);
    };

    void boot();
    void sync();

    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <>
      {banner ? (
        <div className="sticky top-0 z-50 border-b border-cyan/20 bg-cyan/10 px-4 py-3 text-center text-sm text-mist backdrop-blur">
          {banner}
        </div>
      ) : null}
      {children}
    </>
  );
}
