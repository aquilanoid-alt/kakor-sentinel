"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { OfflineStatus } from "@/components/offline-status";
import { BrandMark } from "@/components/brand-mark";
import { BrandCopy } from "@/components/brand-copy";
import { NavGlyph } from "@/components/nav-glyph";
import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/scan", label: "Scan", icon: "scan" },
  { href: "/receive", label: "Penerimaan", icon: "receive" },
  { href: "/distribution", label: "Distribusi", icon: "distribution" },
  { href: "/stock", label: "Stok", icon: "stock" },
  { href: "/reports", label: "Laporan", icon: "reports" },
  { href: "/panduan", label: "Panduan", icon: "guide" }
];

export function AppShell({
  title,
  subtitle,
  user,
  children
}: {
  title: string;
  subtitle: string;
  user?: SessionUser | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const showContextHeader = title.trim().toUpperCase() !== "KAKOR SENTINEL SUPPLY";
  const activeUser = user ?? {
    uid: "",
    email: "",
    name: "",
    role: "Petugas Farmasi" as SessionUser["role"],
    facilityId: "",
    facilityName: ""
  };
const role = activeUser?.role || "Guest";
console.log("ACTIVE USER:", activeUser);
console.log("ROLE TERBACA:", role);

const navigationItems =
  role === "Admin (Apoteker)"
    ? [
        { href: "/", label: "Overview", icon: "overview" },
        { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
        { href: "/scan", label: "Scan", icon: "scan" },
        { href: "/receive", label: "Penerimaan", icon: "receive" },
        { href: "/distribution", label: "Distribusi", icon: "distribution" },
        { href: "/stock", label: "Stok", icon: "stock" },
        { href: "/reports", label: "Laporan", icon: "reports" },

        { href: "/admin/users", label: "Admin User", icon: "users" },
        { href: "/admin/fornas", label: "Admin FORNAS", icon: "library" },
        { href: "/admin/reference-prices", label: "Harga Referensi", icon: "pricing" },
        { href: "/admin/go-live", label: "Go-Live", icon: "overview" }
      ]

  : role === "Petugas Farmasi"
    ? [
        { href: "/", label: "Overview", icon: "overview" },
        { href: "/scan", label: "Scan", icon: "scan" },
        { href: "/receive", label: "Penerimaan", icon: "receive" },
        { href: "/distribution", label: "Distribusi", icon: "distribution" },
        { href: "/stock", label: "Stok", icon: "stock" },
        { href: "/reports", label: "Laporan", icon: "reports" }
      ]

  : role === "Petugas Jaringan"
    ? [
        { href: "/", label: "Overview", icon: "overview" },
        { href: "/distribution", label: "Distribusi", icon: "distribution" },
        { href: "/reports", label: "Laporan", icon: "reports" }
      ]

  : role === "Petugas Unit"
    ? [
        { href: "/", label: "Overview", icon: "overview" },
        { href: "/scan", label: "Scan", icon: "scan" }
      ]

  : [
        { href: "/", label: "Overview", icon: "overview" }
    ];
  return (
    <div className="min-h-screen bg-mesh">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <header className="panel-sheen surface-hero glass-grid rounded-[38px] p-5 backdrop-blur">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.42em] text-aqua/80">
                Sentinel Grid
                <span className="size-1 rounded-full bg-aqua" />
                Traceable
                <span className="size-1 rounded-full bg-aqua" />
                Class A
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <BrandMark compact />
                <div>
                  <BrandCopy
                    titleClassName="text-[clamp(1.35rem,2.2vw,1.95rem)] tracking-[0.14em]"
                    subtitleClassName="text-sm italic text-mist/72"
                    taglineClassName="text-sm font-semibold tracking-[0.08em] text-white"
                  />
                  {showContextHeader ? (
                    <>
                      <h1 className="mt-4 font-heading text-3xl font-semibold tracking-[0.06em] text-white sm:text-4xl">
                        {title}
                      </h1>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/70">{subtitle}</p>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="surface-card space-y-3 rounded-[30px] p-5 text-sm text-mist/80">
              <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-aqua/70">Operator node</p>
                {activeUser.name ? <p className="mt-2 font-heading text-lg font-semibold text-white">{activeUser.name}</p> : null}
                {user ? <p className="mt-1">{activeUser.role}</p> : null}
                {activeUser.facilityName ? <p className="mt-1">{activeUser.facilityName}</p> : null}
              </div>
              <ThemeToggle />
              <OfflineStatus />
              {user ? <SignOutButton /> : null}
            </div>
          </div>

          <nav className="mt-6 flex gap-3 overflow-x-auto pb-1">
            {navigationItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex min-w-fit items-center gap-3 rounded-[22px] border px-4 py-3 text-sm transition",
                    active
                      ? "border-cyan/40 bg-[linear-gradient(135deg,rgba(95,227,204,0.16),rgba(131,167,255,0.16))] text-white shadow-neon"
                      : "border-white/10 bg-white/5 text-mist/60 hover:border-cyan/20 hover:bg-white/8 hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-2xl border",
                      active
                        ? "border-white/15 bg-white/10 text-aqua"
                        : "border-white/10 bg-black/20 text-mist/70 group-hover:text-aqua"
                    )}
                  >
                    <NavGlyph name={item.icon as Parameters<typeof NavGlyph>[0]["name"]} />
                  </span>
                  <span>
                    <span className="block font-medium">{item.label}</span>
                    <span className="block text-[10px] uppercase tracking-[0.32em] text-mist/45">
                      {item.icon}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mt-8 space-y-6">{children}</main>
      </div>
    </div>
  );
}
