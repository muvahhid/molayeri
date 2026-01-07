"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { subscribeCategories, CategoryDoc } from "@/lib/admin/categories.repo";
import { subscribeFeatures, FeatureDoc } from "@/lib/admin/features.repo";
import { subscribeCategoryFeatures, CategoryFeatureDoc } from "@/lib/admin/categoryFeatures.repo";
import { useWizard } from "../wizard.provider";

function typeLabelTR(t: FeatureDoc["type"]) {
  if (t === "bool") return "EVET/HAYIR";
  if (t === "number") return "SAYI";
  if (t === "text") return "YAZI";
  if (t === "select") return "SEÇENEK";
  return "ÇOKLU";
}

export default function Step3KategoriOzellikPage() {
  const router = useRouter();
  const { state, toggleCategory, setActiveCategory, setFeatureValue } = useWizard();

  const [cats, setCats] = React.useState<CategoryDoc[]>([]);
  const [features, setFeatures] = React.useState<FeatureDoc[]>([]);
  const [links, setLinks] = React.useState<CategoryFeatureDoc[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const u1 = subscribeCategories((r) => setCats(r.filter((x) => x.isActive)));
    const u2 = subscribeFeatures((r) => setFeatures(r.filter((x) => x.isActive)));
    return () => { u1(); u2(); };
  }, []);

  React.useEffect(() => {
    if (!state.activeCategoryId) { setLinks([]); return; }
    const u = subscribeCategoryFeatures(state.activeCategoryId, (r) => {
      const sorted = [...r].sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
      setLinks(sorted.filter((x) => x.isActive));
    });
    return () => u();
  }, [state.activeCategoryId]);

  const featureById = React.useMemo(() => {
    const m = new Map<string, FeatureDoc>();
    for (const f of features) m.set(f.id, f);
    return m;
  }, [features]);

  const activeCat = cats.find((c) => c.id === state.activeCategoryId);

  function next() {
    if ((state.selectedCategoryIds || []).length === 0) {
      setErr("En az 1 kategori seç.");
      return;
    }
    setErr(null);
    router.push("/isletmeni-kaydet/step-4");
  }

  return (
    <div className="px-6 pb-6">
      <div className="text-2xl font-black">Kategori & Özellikler</div>
      <div className="mt-2 text-sm text-white/60">Birden fazla kategori seçebilirsin.</div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* KATEGORİLER */}
        <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-extrabold text-white">Kategoriler</div>

          <div className="mt-3 space-y-2">
            {cats.map((c) => {
              const checked = (state.selectedCategoryIds || []).includes(c.id);
              const active = state.activeCategoryId === c.id;

              return (
                <div
                  key={c.id}
                  className={
                    "rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 " +
                    (active ? "border-[#D9A400]/35 bg-[#D9A400]/10" : "border-white/10 bg-white/5")
                  }
                >
                  <button
                    type="button"
                    onClick={() => setActiveCategory(c.id)}
                    className="min-w-0 text-left"
                  >
                    <div className="truncate text-sm font-extrabold text-white">{c.nameTR}</div>
                  </button>

                  <Switch
                    checked={checked}
                    onCheckedChange={(v) => {
                      toggleCategory(c.id, v);
                      if (v) setActiveCategory(c.id);
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-xs text-white/55">
            Seçili: {(state.selectedCategoryIds || []).length}
          </div>
        </div>

        {/* ÖZELLİKLER */}
        <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-extrabold text-white">
              {activeCat ? activeCat.nameTR + " Özellikleri" : "Kategori seç"}
            </div>
          </div>

          {!state.activeCategoryId ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">
              Soldan bir kategori seç.
            </div>
          ) : links.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">
              Bu kategoriye bağlı özellik yok.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {links.map((link) => {
                const f = featureById.get(link.featureId);
                if (!f) return null;

                const stored = (state.featureValues || {})[f.id];

                return (
                  <div key={link.id} className="rounded-2xl border border-white/10 bg-[#151A24] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-extrabold text-white">{f.nameTR}</div>
                          <Badge>{typeLabelTR(f.type)}</Badge>
                          {link.required ? <Badge variant="active">ZORUNLU</Badge> : null}
                        </div>
                      </div>

                      {f.type === "bool" ? (
                        <Switch
                          checked={stored?.type === "bool" ? stored.value : false}
                          onCheckedChange={(v) => setFeatureValue(f.id, { type: "bool", value: v })}
                        />
                      ) : null}
                    </div>

                    {f.type === "number" ? (
                      <div className="mt-3">
                        <Input
                          label="Değer"
                          placeholder={f.unit ? f.unit : "Sayı"}
                          value={String(stored?.type === "number" ? (stored.value ?? "") : "")}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const n = raw === "" ? null : Number(raw);
                            setFeatureValue(f.id, { type: "number", value: Number.isFinite(n as any) ? (n as any) : null });
                          }}
                        />
                      </div>
                    ) : null}

                    {f.type === "text" ? (
                      <div className="mt-3">
                        <Input
                          label="Değer"
                          placeholder="Yazı"
                          value={stored?.type === "text" ? stored.value : ""}
                          onChange={(e) => setFeatureValue(f.id, { type: "text", value: e.target.value })}
                        />
                      </div>
                    ) : null}

                    {f.type === "select" ? (
                      <div className="mt-3">
                        <Select
                          label="Seç"
                          value={stored?.type === "select" ? stored.value : ""}
                          onChange={(e) => setFeatureValue(f.id, { type: "select", value: e.target.value })}
                        >
                          <option value="">Seçiniz</option>
                          {(f.input?.options || [])
                            .slice()
                            .sort((a:any,b:any)=> (a.order??0)-(b.order??0))
                            .map((o:any) => (
                              <option key={o.value} value={o.value}>
                                {o.labelTR}
                              </option>
                            ))}
                        </Select>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {err ? <div className="mt-4 text-sm font-bold text-[#FF4D4F]">{err}</div> : null}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="secondary" onClick={() => router.back()}>Geri</Button>
        <Button variant="primary" onClick={next} className="px-8 py-4 rounded-[22px]">
          İleri: Fotoğraflar
        </Button>
      </div>
    </div>
  );
}
