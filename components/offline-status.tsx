"use client";

import { useEffect, useState } from "react";
import { listPendingMutations } from "@/lib/offline";

export function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const syncState = async () => {
      setOnline(window.navigator.onLine);
      try {
        const mutations = await listPendingMutations();
        setQueueCount(mutations.length);
      } catch {
        setQueueCount(0);
      }
    };

    void syncState();
    window.addEventListener("online", syncState);
    window.addEventListener("offline", syncState);

    return () => {
      window.removeEventListener("online", syncState);
      window.removeEventListener("offline", syncState);
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.25em] text-mist/70">
      <span
        className={`rounded-full px-3 py-1 ${
          online ? "bg-teal/20 text-aqua" : "bg-amber-400/20 text-amber-200"
        }`}
      >
        {online ? "Online" : "Offline"}
      </span>
      <span className="rounded-full border border-white/10 px-3 py-1 text-mist/70">
        Queue {queueCount}
      </span>
    </div>
  );
}
