"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useWizard } from "../wizard.provider";

function DarkField(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={"bg-white/5 border-white/10 text-white placeholder:text-white/35 focus:border-[#D9A400]/40 focus:ring-[#D9A400]/15 " + (props.className || "")}
    />
  );
}

export default function Step1UyelikPage() {
  const router = useRouter();
  const { state, setUser } = useWizard();
  const [err, setErr] = React.useState<string | null>(null);

  function next() {
    const u = state.user;
    if (!u.firstName.trim()) return setErr("İsim zorunlu.");
    if (!u.lastName.trim()) return setErr("Soyisim zorunlu.");
    if (!u.email.trim()) return setErr("Email zorunlu.");
    if (!u.phone.trim()) return setErr("Telefon zorunlu.");
    if (!u.emailVerified) return setErr("Email doğrulaması gerekli.");
    setErr(null);
    router.push("/isletmeni-kaydet/step-2");
  }

  return (
    <div className="px-6 pb-6">
      <div className="text-2xl font-black">Üyelik</div>
      <div className="mt-2 text-sm text-white/60">İlk kez kayıt oluyorsun.</div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <DarkField
          label="İsim"
          placeholder="Örn: Muharrem"
          value={state.user.firstName}
          onChange={(e) => setUser({ firstName: e.target.value })}
        />
        <DarkField
          label="Soyisim"
          placeholder="Örn: Akkaya"
          value={state.user.lastName}
          onChange={(e) => setUser({ lastName: e.target.value })}
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <DarkField
          label="Email"
          placeholder="ornek@mail.com"
          value={state.user.email}
          onChange={(e) => setUser({ email: e.target.value })}
        />
        <DarkField
          label="Telefon"
          placeholder="05xx xxx xx xx"
          value={state.user.phone}
          onChange={(e) => setUser({ phone: e.target.value })}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-extrabold">Email doğrulama</div>
            <div className="mt-1 text-xs text-white/55">Şimdilik onay anahtarı. Sonra gerçek doğrulama.</div>
          </div>
          <Switch checked={state.user.emailVerified} onCheckedChange={(v) => setUser({ emailVerified: v })} />
        </div>
      </div>

      {err ? <div className="mt-4 text-sm font-bold text-[#FF4D4F]">{err}</div> : null}

      <div className="mt-6 flex items-center justify-end">
        <Button variant="primary" onClick={next} className="px-8 py-4 rounded-[22px]">
          İleri: İşletme Bilgileri
        </Button>
      </div>
    </div>
  );
}
