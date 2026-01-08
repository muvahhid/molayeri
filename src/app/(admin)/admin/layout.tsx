import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";

import { LogoutButton } from "@/components/session/LogoutButton";
import { AdminGuard } from "@/components/guards/AdminGuard";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/kategoriler", label: "Kategoriler" },
  { href: "/admin/ozellikler", label: "Özellikler" },
  { href: "/admin/kategori-ozellikleri", label: "Kategori-Özellikleri" },
  { href: "/admin/basvurular", label: "Başvurular" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_500px_at_50%_-20%,rgba(217,164,0,0.12),transparent),radial-gradient(900px_500px_at_0%_100%,rgba(255,255,255,0.06),transparent),linear-gradient(180deg,#060A12,#070B14)] text-white">
      <div className="mx-auto max-w-[1440px] px-5 py-6">
        <header className="mb-6 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3 rounded-2xl border border-[#D9A400]/20 bg-white/5 px-4 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <Image
              src="/icons/admin.png"
              alt="Admin"
              width={34}
              height={34}
              className="rounded-xl ring-1 ring-white/10"
            />
            <div>
              <div className="text-xl font-black tracking-tight text-[#D9A400]">Molayeri Yönetici Paneli</div>
              <div className="text-xs font-bold text-white/70">Premium panel</div>
            </div>
          </div>

          {/* Sağ üst */}
          <div className="flex items-center gap-3">
            <LogoutButton compact />
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <aside className="rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <div className="p-5">
              <div className="mb-3 text-xs font-bold tracking-widest text-white/40">MENÜ</div>

              <nav className="flex flex-col gap-2">
                {nav.map((x) => (
                  <Link
                    key={x.href}
                    href={x.href}
                    className={cn(
                      "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85",
                      "hover:bg-white/10 hover:text-white transition"
                    )}
                  >
                    {x.label}
                  </Link>
                ))}
              </nav>

              <a
                href="/isletmeci/isletmem"
                className="mt-4 block rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-extrabold text-white hover:bg-white/10"
              >
                İşletmeci Paneli
              </a>
            </div>
          </aside>

          <main className="min-w-0">
            <AdminGuard>{children}</AdminGuard>
          </main>
        </div>
      </div>
    </div>
  );
}
