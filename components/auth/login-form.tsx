"use client";

import { useFormStatus } from "react-dom";
import { isFirebaseClientConfigured } from "@/lib/firebase/config";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="action-brand w-full rounded-[24px] px-4 py-3 font-semibold shadow-neon transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Memverifikasi akun..." : "Masuk ke sistem"}
    </button>
  );
}

export function LoginForm({
  initialEmail = "",
  initialMessage
}: {
  initialEmail?: string;
  initialMessage?: string;
}) {
  const message =
    initialMessage ??
    (isFirebaseClientConfigured()
      ? "Masuk menggunakan akun petugas yang sudah diberi role."
      : "Firebase client belum dikonfigurasi. Isi file .env terlebih dahulu.");

  return (
    <form action="/api/auth/login" method="post" className="space-y-4">
      <input type="hidden" name="returnTo" value="/" />
      <div>
        <label className="mb-2 block text-[11px] uppercase tracking-[0.32em] text-mist/65">Email petugas</label>
        <input
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={initialEmail}
          className="surface-input w-full rounded-[24px] px-4 py-3 outline-none transition focus:border-cyan/40 focus:bg-white/10"
          placeholder="email@instansi.id"
        />
      </div>

      <div>
        <label className="mb-2 block text-[11px] uppercase tracking-[0.32em] text-mist/65">Password</label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="surface-input w-full rounded-[24px] px-4 py-3 outline-none transition focus:border-cyan/40 focus:bg-white/10"
          placeholder="••••••••"
        />
      </div>

      <SubmitButton />

      <p className="surface-card rounded-[24px] px-4 py-3 text-sm text-mist/75">
        {message}
      </p>
    </form>
  );
}
