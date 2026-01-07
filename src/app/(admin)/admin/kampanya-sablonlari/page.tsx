"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listCampaignTemplates, seedCampaignTemplates, CampaignTemplate } from "@/lib/admin/campaignTemplates.repo";

const CATS = [
  { slug: "yakit", name: "Yakıt" },
  { slug: "yemek", name: "Yemek" },
  { slug: "sarj", name: "Şarj" },
  { slug: "market", name: "Market" },
  { slug: "otel", name: "Otel" },
  { slug: "servis-asist", name: "Servis/Asist" },
  { slug: "kafe", name: "Kafe" },
  { slug: "alisveris", name: "Alışveriş" },
];

export default function Page() {
  const [loading, setLoading] = React.useState(true);
  const [seeding, setSeeding] = React.useState(false);
  const [cat, setCat] = React.useState<string>("");
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<CampaignTemplate[]>([]);
  const [msg, setMsg] = React.useState<string>("");

  async function load() {
    setLoading(true);
    try {
      const data = await listCampaignTemplates(cat || undefined);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, [cat]);

  async function seed() {
    if (seeding) return;
    setSeeding(true);
    setMsg("");
    try {
      const r = await seedCampaignTemplates();
      setMsg(`OK: ${r.count} şablon yüklendi.`);
      await load();
    } catch (e) {
      console.error(e);
      setMsg("Hata: şablon yüklenemedi.");
    } finally {
      setSeeding(false);
    }
  }

  const filtered = rows.filter((x) => (x.labelTR || "").toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-black">Kampanya Şablonları</div>
          <div className="mt-1 text-sm text-white/60">Kategori başına hazır etiketler.</div>
        </div>
        <Button variant="primary" className="px-6 py-3 rounded-2xl" onClick={seed} disabled={seeding}>
          {seeding ? "Yükleniyor..." : "Şablonları Yükle"}
        </Button>
      </div>

      {msg ? <div className="text-sm text-white/75">{msg}</div> : null}

      <Card className="p-5 space-y-4">
        <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs font-extrabold tracking-widest text-white/45">KATEGORİ</div>
            <div className="mt-2 space-y-2">
              <button
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-extrabold ${cat==="" ? "border-[#D9A400]/40 bg-[#D9A400]/10" : "border-white/10 bg-[#151A24] hover:bg-white/10"}`}
                onClick={() => setCat("")}
              >
                Tümü
              </button>
              {CATS.map((c) => (
                <button
                  key={c.slug}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-extrabold ${cat===c.slug ? "border-[#D9A400]/40 bg-[#D9A400]/10" : "border-white/10 bg-[#151A24] hover:bg-white/10"}`}
                  onClick={() => setCat(c.slug)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-extrabold">Liste</div>
              <div className="text-xs text-white/50">{loading ? "Yükleniyor..." : `${filtered.length} kayıt`}</div>
            </div>

            <div className="mt-3">
              <Input label="Ara" placeholder="Örn: 500₺, %20, 2 al 1 öde..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <div className="mt-4 space-y-2">
              {filtered.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#151A24] px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold">{r.labelTR}</div>
                    <div className="mt-1 text-xs text-white/45">{r.categorySlug} • {r.order}</div>
                  </div>
                  <Badge variant={r.isActive ? "active" : "inactive"}>{r.isActive ? "AKTİF" : "PASİF"}</Badge>
                </div>
              ))}
              {!loading && filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">Kayıt yok.</div>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
