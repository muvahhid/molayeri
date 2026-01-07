"use client";
import { useWizardStepGuard } from "@/lib/wizard/stepGuard";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWizard } from "../wizard.provider";

type PlaceItem = { description: string; place_id: string };

function normalizeTitle(s: string) {
  return s.replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase());
}

export default function Step2IsletmeBilgileriPage() {
  
  useWizardStepGuard(2);
const router = useRouter();
  const { state, setBusiness } = useWizard();

  const [q, setQ] = React.useState(state.business.addressText || "");
  const [results, setResults] = React.useState<PlaceItem[]>([]);
  const [token, setToken] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    // new=1 => yepyeni işletme kaydı (öncekiler dolu gelmesin)
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("new") === "1") {
        // wizard provider localStorage anahtarını senin projendeki ile aynı tuttuk
        // (molayeri_wizard_v1 varsa temizle)
        window.localStorage.removeItem("molayeri_wizard_v1");
      }
    } catch {}
try {
      const raw = window.localStorage.getItem("molayeri_session_v1");
      const ss = raw ? JSON.parse(raw) : null;
      const uid = String(ss?.uid || "").trim();
      if (!uid) {
        window.location.href = "/login";
        return;
      }
    } catch {
      window.location.href = "/login";
      return;
    }
setToken(Math.random().toString(36).slice(2));
  }, []);

  async function searchPlaces(v: string) {
    if (v.length < 6) { setResults([]); return; }
    try {
      const r = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(v)}&token=${token}`);
      const j = await r.json();
      setResults((j.predictions || []).slice(0, 6));
    } catch {
      setResults([]);
    }
  }

  async function selectPlace(item: PlaceItem) {
    try {
      const r = await fetch(`/api/places/details?place_id=${encodeURIComponent(item.place_id)}&token=${token}`);
      const j = await r.json();
      const g = j.result?.geometry?.location;
      const formatted = j.result?.formatted_address || item.description;
      setBusiness({
        addressText: formatted,
        lat: typeof g?.lat === "number" ? g.lat : null,
        lng: typeof g?.lng === "number" ? g.lng : null,
      });
      setQ(formatted);
      setResults([]);
    } catch {}
  }

  function next() {
    if (!state.business.name.trim()) return setErr("İşletme adı zorunlu.");
    if (!state.business.addressText || state.business.lat === null || state.business.lng === null) return setErr("Adres listeden seçilmeli.");
    setErr(null);
    router.push("/isletmeni-kaydet/step-3");
  }

  return (
    <div className="px-6 pb-6">
      <div className="text-2xl font-black">İşletme Bilgileri</div>
      <div className="mt-2 text-sm text-white/60">İşletmeni tanımla.</div>

      <div className="mt-6 space-y-4">
        <Input
          label="İşletme Adı"
          placeholder="ÖRN: MOLAYERİ AKARYAKIT"
          value={state.business.name}
          maxLength={30}
          onChange={(e) => setBusiness({ name: e.target.value.toUpperCase().replace(/\s+/g, " ").trimStart() })}
          hint="En fazla 30 karakter."
        />

        <div className="relative">
          <Input
            label="Adres"
            placeholder="İşletme adınızı yazarak arayın ve listeden seçin."
            value={q}
            onChange={async (e) => {
              const v = e.target.value;
              setQ(v);
              if (v.length < 6) { setResults([]); return; }
              await searchPlaces(v);
            }}
          />

          {results.length > 0 && (
            <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#151A24] shadow-[0_18px_55px_rgba(0,0,0,0.45)]">
              {results.map((r) => (
                <button
                  key={r.place_id}
                  type="button"
                  onMouseDown={() => selectPlace(r)}
                  className="block w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5"
                >
                  {r.description}
                </button>
              ))}
            </div>
          )}
        </div>

        {state.business.addressText ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
            Seçilen adres: {state.business.addressText}
          </div>
        ) : null}

        <label className="block">
          <div className="mb-2 text-sm font-semibold text-white">Tanıtım Yazısı</div>
          <textarea
            className="w-full h-32 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:border-[#D9A400]/40 focus:ring-2 focus:ring-[#D9A400]/15 resize-none"
            placeholder="Kısa işletme tanıtımı"
            maxLength={200}
            value={state.business.description}
            onChange={(e) => setBusiness({ description: normalizeTitle(e.target.value) })}
          />
          <div className="mt-2 text-xs text-white/60">En fazla 200 karakter.</div>
        </label>
      </div>

      {err ? <div className="mt-4 text-sm font-bold text-[#FF4D4F]">{err}</div> : null}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="secondary" onClick={() => router.back()}>Geri</Button>
        <Button variant="primary" onClick={next} className="px-8 py-4 rounded-[22px]">İleri: Kategori & Özellikler</Button>
      </div>
    </div>
  );
}
