"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loginEmailPassword, setSession } from "@/lib/auth/users.auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function login() {
    const e = email.trim().toLowerCase();
    if (!e || !pass) return setErr("Email + şifre yaz.");
    setErr(null);
    setLoading(true);
    try {
      const s = await loginEmailPassword(e, pass);
      setSession(s);

      if (s.role === "admin") router.push("/admin");
      else if (s.role === "isletmeci" && s.approved) router.push("/isletmeci/isletmem");
      else if (s.role === "pending") router.push("/isletmeni-kaydet/step-5");
      else router.push("/");
    } catch (e) {
      console.error(e);
      setErr("Giriş hatası.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-[520px]">
        <div className="text-2xl font-black">Giriş</div>
        <div className="mt-2 text-sm text-white/60">Email + şifre</div>

        <Card className="mt-5 p-6">
          <Input label="Email" placeholder="ornek@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="mt-4" />
          <Input label="Şifre" placeholder="••••••••" value={pass} onChange={(e) => setPass(e.target.value)} type="password" />

          {err ? <div className="mt-3 text-sm font-bold text-[#FF4D4F]">{err}</div> : null}

          <div className="mt-5 flex items-center justify-between">
            <Button variant="secondary" onClick={() => router.push("/isletmeni-kaydet/step-1")}>
              İşletmeni Kaydet
            </Button>

            <Button variant="primary" className="px-8 py-4 rounded-[22px]" onClick={login} disabled={loading}>
              {loading ? "..." : "Giriş Yap"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
