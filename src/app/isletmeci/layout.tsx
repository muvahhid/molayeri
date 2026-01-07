import type { Metadata } from "next";
import { IsletmeciGuard } from "@/components/guards/IsletmeciGuard";
import { LogoutButton } from "@/components/session/LogoutButton";

export const metadata: Metadata = {
  title: "MolaYeri · İşletmeci",
};

export default function IsletmeciLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-white">
      <div className="mx-auto max-w-[1200px] px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="leading-tight">
            <div className="text-2xl font-black">Molayeri</div>
            <div className="mt-1 text-sm font-extrabold text-white/80">İşletme Paneli</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <a
              href="/admin/basvurular"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/85 hover:bg-white/10"
            >
              Admine Yaz
            </a>
            <LogoutButton compact />
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-extrabold tracking-widest text-white/45">MENÜ</div>
            <div className="mt-3 space-y-2">
              <a href="/isletmeci/isletmem" className="block rounded-2xl border border-white/10 bg-[#151A24] px-5 py-4 text-sm font-extrabold text-white hover:bg-white/10">İşletmelerim</a>
              <a href="/isletmeci/kampanyalarim" className="block rounded-2xl border border-white/10 bg-[#151A24] px-5 py-4 text-sm font-extrabold text-white hover:bg-white/10">
                Kampanyalarım
              </a>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
            <IsletmeciGuard>{children}</IsletmeciGuard>
          </div>
        </div>
      </div>
    </div>
  );
}
