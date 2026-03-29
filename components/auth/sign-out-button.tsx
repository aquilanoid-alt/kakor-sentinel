"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <button
      onClick={() => void handleLogout()}
      className="rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-4 py-2 text-sm text-white transition hover:border-cyan/30 hover:text-aqua"
    >
      Keluar
    </button>
  );
}
