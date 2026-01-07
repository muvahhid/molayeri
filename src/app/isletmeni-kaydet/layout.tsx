"use client";
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { WizardProvider } from "./wizard.provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const steps = [
  { key: "step-1", title: "Üyelik", nextLabel: "İleri: İşletme Bilgileri" },
  { key: "step-2", title: "İşletme Bilgileri", nextLabel: "İleri: Kategori & Özellikler" },
  { key: "step-3", title: "Kategori & Özellikler", nextLabel: "İleri: Fotoğraflar" },
  { key: "step-4", title: "Fotoğraflar", nextLabel: "İleri: Özet & Başvuru" },
  { key: "step-5", title: "Özet & Başvuru", nextLabel: "Gönder" },
];

function idxFromPath(p: string) {
  const m = p.match(/\/isletmeni-kaydet\/(step-\d+)/);
  if (!m) return 0;
  const key = m[1];
  const i = steps.findIndex((s) => s.key === key);
  return i >= 0 ? i : 0;
}

function WizardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const i = idxFromPath(pathname || "");
  const step = steps[i];

  const percent = Math.round(((i + 1) / steps.length) * 100);

  function goPrev() {
    if (i <= 0) return;
    router.push(`/isletmeni-kaydet/${steps[i - 1].key}`);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_500px_at_50%_-20%,rgba(217,164,0,0.18),transparent),linear-gradient(180deg,#FFFFFF,#F3F5FA)] text-[#0A0F18]">
      <div className="mx-auto max-w-[980px] px-5 py-10">
        <div className="mb-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-3xl font-black tracking-tight">İşletmeni Kaydet</div>
              <div className="mt-2 text-sm text-black/60">Adım {i + 1} / {steps.length} • {step.title}</div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-[0_16px_50px_rgba(0,0,0,0.10)]">
              <div className="text-xs font-bold tracking-widest text-black/40">İLERLEME</div>
              <div className="mt-1 text-sm font-extrabold">{percent}%</div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4 shadow-[0_16px_50px_rgba(0,0,0,0.10)]">
            <div className="h-2 w-full rounded-full bg-black/10">
              <div className="h-2 rounded-full bg-[#D9A400]" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {steps.map((s, k) => {
                const active = k === i;
                const done = k < i;
                return (
                  <div key={s.key} className={cn("rounded-xl px-3 py-2 text-center text-xs font-bold border",
                    active ? "border-[#D9A400]/40 bg-[#D9A400]/15" :
                    done ? "border-black/10 bg-black/5" :
                    "border-black/10 bg-white"
                  )}>
                    <div className={cn(active ? "text-[#8A6A00]" : "text-black/60")}>{s.title}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-[#151A24] text-white shadow-[0_30px_90px_rgba(0,0,0,0.22)]">
          <div className="px-6 pt-6 pb-2">{children}</div>

          <div className="px-6 pb-6 pt-4">
            <div className="flex items-center justify-between gap-3">
              <Button variant="secondary" onClick={goPrev} disabled={i === 0}>
                Geri
              </Button>
              <div className="text-xs text-white/60">İleri butonu sayfa içinde</div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-black/50">
          Bu akış tamamlanırsa başvurun alınır. Tamamlamazsan normal kullanıcı olarak kalırsın.
        </div>
      </div>
    </div>
  );
}

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WizardProvider>
      <WizardShell>{children}</WizardShell>
    </WizardProvider>
  );
}
