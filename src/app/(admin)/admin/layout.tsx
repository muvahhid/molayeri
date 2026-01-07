import Link from "next/link";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/kategoriler", label: "Kategoriler" },
  { href: "/admin/ozellikler", label: "Özellikler" },
  { href: "/admin/kategori-ozellikleri", label: "Kategori-Özellikleri" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_500px_at_50%_-20%,rgba(217,164,0,0.12),transparent),radial-gradient(900px_500px_at_0%_100%,rgba(255,255,255,0.06),transparent),linear-gradient(180deg,#060A12,#070B14)] text-white">
      <div className="mx-auto max-w-[1440px] px-5 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]" />
            <div>
              <div className="text-lg font-black tracking-tight">Molayeri Admin</div>
              <div className="text-xs text-white/50">Premium panel</div>
            </div>
          </div>
          <div className="h-10 w-48 rounded-2xl border border-white/10 bg-white/5" />
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
                      "hover:bg-white/8 hover:text-white transition"
                    )}
                  >
                    {x.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-6 rounded-2xl border border-[#D9A400]/20 bg-[#D9A400]/10 p-4">
                <div className="text-sm font-extrabold text-[#D9A400]">Marka</div>
                <div className="mt-1 text-xs text-white/60">#D9A400 • Koyu premium</div>
              </div>
            </div>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
