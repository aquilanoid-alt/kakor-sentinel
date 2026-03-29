"use client";

import type { MutationType, PendingMutation } from "@/lib/types";

const DB_NAME = "kakor-sentinel-supply";
const DB_VERSION = 1;
const STORE_NAME = "pending_mutations";
const LOCALHOST_RESET_KEY = "kss-localhost-reset";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueMutation(mutation: PendingMutation) {
  const db = await openDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(mutation);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function submitOrQueueMutation<TPayload extends Record<string, unknown>>(
  type: MutationType,
  endpoint: string,
  payload: TPayload
) {
  if (navigator.onLine) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || result.ok === false) {
        throw new Error(result.error ?? "Transaksi online gagal.");
      }

      return {
        queued: false,
        result
      };
    } catch {
      // Fallback ke antrean offline di bawah.
    }
  }

  const id = `LOCAL-${Date.now()}`;
  await queueMutation({
    id,
    type,
    payload,
    createdAt: new Date().toISOString()
  });

  return {
    queued: true,
    reference: id
  };
}

export async function listPendingMutations() {
  const db = await openDb();

  return new Promise<PendingMutation[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as PendingMutation[]);
    request.onerror = () => reject(request.error);
  });
}

export async function clearPendingMutation(id: string) {
  const db = await openDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function flushPendingMutations() {
  if (!navigator.onLine) {
    return { ok: false, processed: 0 };
  }

  const mutations = await listPendingMutations();
  let processed = 0;

  for (const mutation of mutations) {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(mutation)
    });

    if (!response.ok) {
      break;
    }

    await clearPendingMutation(mutation.id);
    processed += 1;
  }

  return { ok: true, processed };
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  if (isLocalhost) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    let deletedCache = false;
    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      const deleted = await Promise.all(
        cacheKeys
          .filter((key) => key.startsWith("kakor-sentinel-supply"))
          .map((key) => caches.delete(key))
      );
      deletedCache = deleted.some(Boolean);
    }

    const cleanedSomething = registrations.length > 0 || deletedCache;
    if (cleanedSomething) {
      const alreadyReloaded = window.sessionStorage.getItem(LOCALHOST_RESET_KEY) === "done";
      if (!alreadyReloaded) {
        window.sessionStorage.setItem(LOCALHOST_RESET_KEY, "done");
        window.location.reload();
        return false;
      }
    } else {
      window.sessionStorage.removeItem(LOCALHOST_RESET_KEY);
    }

    return false;
  }

  await navigator.serviceWorker.register("/sw.js");
  return true;
}
