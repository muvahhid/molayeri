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
        <div className="flex items-center justify-between">
          <div className="text-xl font-black">İşletmeci Paneli</div>
          <div className="text-xs text-white/50">MolaYeri</div>
          <div className="ml-auto"><LogoutButton compact /></div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-extrabold tracking-widest text-white/45">MENÜ</div>
            <div className="mt-3 space-y-2">
              <a href="/isletmeci/isletmem" className="block rounded-2xl border border-white/10 bg-[#151A24] px-5 py-4 text-sm font-extrabold text-white hover:bg-white/10">
                İşletmem
              </a>
            </div>

            <div className="mt-4 text-xs text-white/50">
              (Auth sonra eklenecek)
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
