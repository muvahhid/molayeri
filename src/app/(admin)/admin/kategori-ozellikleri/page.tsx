"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";

import { CategoryDoc, subscribeCategories } from "@/lib/admin/categories.repo";
import { FeatureDoc, subscribeFeatures } from "@/lib/admin/features.repo";
import {
  CategoryFeatureDoc,
  addFeatureToCategory,
  removeCategoryFeature,
  subscribeCategoryFeatures,
  updateCategoryFeature,
} from "@/lib/admin/categoryFeatures.repo";

function typeLabelTR(t: FeatureDoc["type"]) {
  if (t === "bool") return "EVET/HAYIR";
  if (t === "number") return "SAYI";
  if (t === "text") return "YAZI";
  if (t === "select") return "SEÇENEK";
  return "ÇOKLU";
}

export default function KategoriOzellikleriPage() {
  const [cats, setCats] = React.useState<CategoryDoc[]>([]);
  const [features, setFeatures] = React.useState<FeatureDoc[]>([]);
  const [links, setLinks] = React.useState<CategoryFeatureDoc[]>([]);

  const [selectedCatId, setSelectedCatId] = React.useState<string>("");
  const [catLoading, setCatLoading] = React.useState(true);
  const [featLoading, setFeatLoading] = React.useState(true);
  const [linkLoading, setLinkLoading] = React.useState(false);

  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    const u1 = subscribeCategories((r) => {
      setCats(r);
      setCatLoading(false);
      if (!selectedCatId && r[0]?.id) setSelectedCatId(r[0].id);
    });
    const u2 = subscribeFeatures((r) => {
      setFeatures(r);
      setFeatLoading(false);
    });
    return () => {
      u1();
      u2();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!selectedCatId) return;
    setLinkLoading(true);
    const u = subscribeCategoryFeatures(selectedCatId, (r) => {
      setLinks(r);
      setLinkLoading(false);
    });
    return () => u();
  }, [selectedCatId]);

  const featureById = React.useMemo(() => {
    const m = new Map<string, FeatureDoc>();
    for (const f of features) m.set(f.id, f);
    return m;
  }, [features]);

  const linkedFeatureIds = React.useMemo(() => new Set(links.map((x) => x.featureId)), [links]);

  const addResults = React.useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return [];
    return features
      .filter((f) => !linkedFeatureIds.has(f.id))
      .filter((f) => (f.nameTR || "").toLowerCase().includes(s))
      .slice(0, 8);
  }, [search, features, linkedFeatureIds]);

  async function onAddFeature(fid: string) {
    if (!selectedCatId) return;
    setSearch("");
    try {
      await addFeatureToCategory(selectedCatId, fid);
    } catch {}
  }

  async function onRemove(link: CategoryFeatureDoc) {
    const ok = window.confirm("Bağ kaldırılacak. Emin misin?");
    if (!ok) return;
    try {
      await removeCategoryFeature(link.id);
    } catch {}
  }

  async function onToggleRequired(link: CategoryFeatureDoc, v: boolean) {
    try { await updateCategoryFeature(link.id, { required: v }); } catch {}
  }

  async function onToggleActive(link: CategoryFeatureDoc, v: boolean) {
    try { await updateCategoryFeature(link.id, { isActive: v }); } catch {}
  }

  async function onChangeOrder(link: CategoryFeatureDoc, v: string) {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    try { await updateCategoryFeature(link.id, { order: n }); } catch {}
  }

  const selectedCat = cats.find((c) => c.id === selectedCatId);

  return (
    <div className="grid gap-6 md:grid-cols-[320px_1fr]">
      <aside className="rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="p-5">
          <div className="mb-3 text-xs font-bold tracking-widest text-white/40">KATEGORİLER</div>

          {catLoading ? (
            <div className="text-white/60">Yükleniyor…</div>
          ) : cats.length === 0 ? (
            <div className="text-white/60">Kategori yok.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {cats.map((c) => {
                const active = c.id === selectedCatId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCatId(c.id)}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition",
                      active
                        ? "border-[#D9A400]/35 bg-[#D9A400]/10"
                        : "border-white/10 bg-white/5 hover:bg-white/8"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className={cn("truncate text-sm font-extrabold", active ? "text-white" : "text-white/85")}>
                          {c.nameTR}
                        </div>
                        <div className="mt-1 truncate text-xs text-white/45">{c.slug}</div>
                      </div>
                      {c.isActive ? <Badge variant="active">AKTİF</Badge> : <Badge variant="inactive">PASİF</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <main className="min-w-0">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Kategori-Özellikleri</CardTitle>
                <div className="mt-2 text-sm text-white/60">
                  {selectedCat ? `Seçili: ${selectedCat.nameTR}` : "Kategori seç"}
                </div>
              </div>
</div>

            <div className="mt-5 relative">
              <Input
                label="Özellik ara ve ekle…"
                placeholder="Örn: Wi-Fi, Pompa, WC…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {addResults.length > 0 ? (
                <div className="absolute left-0 right-0 top-[92px] z-20 overflow-hidden rounded-2xl border border-white/10 bg-[#0A0F18]/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                  {addResults.map((f, idx) => (
                    <button
                      key={f.id}
                      onClick={() => onAddFeature(f.id)}
                      className={cn(
                        "w-full px-4 py-3 text-left hover:bg-white/5 transition flex items-center justify-between gap-3",
                        idx !== addResults.length - 1 ? "border-b border-white/10" : ""
                      )}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-white">{f.nameTR}</div>
                        <div className="mt-1 truncate text-xs text-white/50">{f.key}</div>
                      </div>
                      <Badge>{typeLabelTR(f.type)}</Badge>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="mt-6">
            <div className="space-y-3">
              {featLoading ? <div className="text-white/60">Özellikler yükleniyor…</div> : null}
              {linkLoading ? <div className="text-white/60">Bağlantılar yükleniyor…</div> : null}

              {selectedCatId && !linkLoading && links.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
                  Bu kategoriye bağlı özellik yok. Yukarıdan aratıp ekle.
                </div>
              ) : null}

              {links.map((link) => {
                const f = featureById.get(link.featureId);
                if (!f) return null;

                return (
                  <div
                    key={link.id}
                    className="rounded-[24px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.4)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-base font-extrabold text-white">{f.nameTR}</div>
                          <Badge>{typeLabelTR(f.type)}</Badge>
                          {link.isActive ? <Badge variant="active">AKTİF</Badge> : <Badge variant="inactive">PASİF</Badge>}
                        </div>
                        <div className="mt-2 truncate text-xs text-white/50">
                          {f.key}{f.unit ? ` • ${f.unit}` : ""} {link.required ? " • zorunlu" : ""}
                        </div>
                      </div>

                      <Button variant="ghost" onClick={() => onRemove(link)} className="text-white/70 hover:text-white">
                        Kaldır
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="text-sm font-extrabold text-white">Zorunlu</div>
                        <Switch checked={!!link.required} onCheckedChange={(v) => onToggleRequired(link, v)} />
                      </div>

                      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="text-sm font-extrabold text-white">Aktif mi?</div>
                        <Switch checked={!!link.isActive} onCheckedChange={(v) => onToggleActive(link, v)} />
                      </div>

                      <Input
                        label="Sıralama"
                        placeholder="0"
                        value={String(link.order ?? 0)}
                        onChange={(e) => onChangeOrder(link, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
