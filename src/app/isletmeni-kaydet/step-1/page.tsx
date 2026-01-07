"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWizard } from "../wizard.provider";
import { registerEmailPassword, setSession } from "@/lib/auth/users.auth";

export default function Step1KayitPage() {
  const router = useRouter();
  const { state, setUser } = useWizard();

  const [firstName, setFirstName] = React.useState(state.user.firstName || "");
  const [lastName, setLastName] = React.useState(state.user.lastName || "");
  const [email, setEmail] = React.useState(state.user.email || "");
  const [phone, setPhone] = React.useState(state.user.phone || "");
  const [pass, setPass] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function next() {
    const e = email.trim().toLowerCase();
    if (!firstName.trim() || !lastName.trim() || !e || !phone.trim() || pass.length < 6) {
      setErr("Tüm alanlar + şifre (min 6).");
      return;
    }
    setErr(null);
    setLoading(true);

    try {
      const nameTR = (firstName + " " + lastName).trim();
      const s = await registerEmailPassword({ email: e, password: pass, nameTR, phone });

      setSession(s);
      setUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: e,
        phone: phone.trim(),
        emailVerified: false,
      });

      router.push("/isletmeni-kaydet/step-2");
    } catch (e) {
      console.error(e);
      setErr("Kayıt hatası.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-6 pb-6">
      <div className="text-2xl font-black">Üyelik</div>
      <div className="mt-2 text-sm text-white/60">Hesap oluştur.</div>

      <Card className="mt-5 p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="İsim" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input label="Soyisim" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Şifre" type="password" placeholder="min 6" value={pass} onChange={(e) => setPass(e.target.value)} />

        {err ? <div className="text-sm font-bold text-[#FF4D4F]">{err}</div> : null}

        <div className="flex items-center justify-between pt-2">
          <Button variant="secondary" onClick={() => router.push("/login")}>Geri</Button>
          <Button variant="primary" className="px-8 py-4 rounded-[22px]" onClick={next} disabled={loading}>
            {loading ? "..." : "İleri: İşletme Bilgileri"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
