"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import {
  FeatureDoc,
  FeatureType,
  FeatureOption,
  createFeature,
  removeFeature,
  subscribeFeatures,
  updateFeature,
} from "@/lib/admin/features.repo";

type FormState = {
  nameTR: string;
  typeTR: "Evet/Hayır" | "Sayı" | "Yazı" | "Seçenek" | "Çoklu Seçenek";
  unit: string;
  order: string;
  isActive: boolean;
  descriptionTR: string;

  min: string;
  max: string;
  step: string;
  maxLen: string;

  optLabel: string;
  optValue: string;
  optOrder: string;
  options: FeatureOption[];
};

function emptyForm(): FormState {
  return {
    nameTR: "",
    typeTR: "Yazı",
    unit: "",
    order: "0",
    isActive: true,
    descriptionTR: "",

    min: "",
    max: "",
    step: "1",
    maxLen: "200",

    optLabel: "",
    optValue: "",
    optOrder: "0",
    options: [],
  };
}

function mapTRToType(t: FormState["typeTR"]): FeatureType {
  if (t === "Evet/Hayır") return "bool";
  if (t === "Sayı") return "number";
  if (t === "Yazı") return "text";
  if (t === "Seçenek") return "select";
  return "multiSelect";
}

function typeLabelTR(t: FeatureType) {
  if (t === "bool") return "Evet/Hayır";
  if (t === "number") return "Sayı";
  if (t === "text") return "Yazı";
  if (t === "select") return "Seçenek";
  return "Çoklu Seçenek";
}

export default function OzelliklerPage() {
  const [rows, setRows] = React.useState<FeatureDoc[]>([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<FormState>(emptyForm());
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsub = subscribeFeatures((r) => {
      setRows(r);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => (r.nameTR || "").toLowerCase().includes(s));
  }, [rows, q]);

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setErr(null);
    setOpen(true);
  }

  function openEdit(row: FeatureDoc) {
    setMode("edit");
    setEditingId(row.id);
    const t = row.type;
    const input = row.input || {};
    setForm({
      nameTR: row.nameTR ?? "",
      typeTR: typeLabelTR(t),
      unit: row.unit ?? "",
      order: String(row.order ?? 0),
      isActive: !!row.isActive,
      descriptionTR: row.descriptionTR ?? "",

      min: input.min === undefined ? "" : String(input.min),
      max: input.max === undefined ? "" : String(input.max),
      step: input.step === undefined ? "1" : String(input.step),
      maxLen: input.maxLen === undefined ? "200" : String(input.maxLen),

      optLabel: "",
      optValue: "",
      optOrder: "0",
      options: (input.options ?? []).slice().sort((a,b) => (a.order ?? 0) - (b.order ?? 0)),
    });
    setErr(null);
    setOpen(true);
  }

  function buildInputForSave(): any {
    const t = mapTRToType(form.typeTR);
    if (t === "number") {
      const min = form.min.trim() === "" ? undefined : Number(form.min);
      const max = form.max.trim() === "" ? undefined : Number(form.max);
      const step = form.step.trim() === "" ? undefined : Number(form.step);
      return {
        ...(Number.isFinite(min) ? { min } : {}),
        ...(Number.isFinite(max) ? { max } : {}),
        ...(Number.isFinite(step) ? { step } : {}),
      };
    }
    if (t === "text") {
      const maxLen = form.maxLen.trim() === "" ? undefined : Number(form.maxLen);
      return { ...(Number.isFinite(maxLen) ? { maxLen } : {}) };
    }
    if (t === "select" || t === "multiSelect") {
      const options = (form.options || []).slice().sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
      return { options };
    }
    return {};
  }

  async function onSubmit() {
    const nameTR = (form.nameTR || "").trim();
    const orderNum = Number(form.order);
    if (!nameTR) return setErr("Özellik adı zorunlu.");
    if (!Number.isFinite(orderNum)) return setErr("Sıralama sayı olmalı.");

    const type = mapTRToType(form.typeTR);
    if ((type === "select" || type === "multiSelect") && (form.options?.length ?? 0) === 0) {
      return setErr("Seçenek tipinde en az 1 seçenek ekle.");
    }

    setSaving(true);
    setErr(null);
    try {
      const payload = {
        nameTR,
        type,
        unit: form.unit.trim() ? form.unit.trim() : null,
        order: orderNum,
        isActive: form.isActive,
        descriptionTR: form.descriptionTR.trim() ? form.descriptionTR.trim() : null,
        input: buildInputForSave(),
      };

      if (mode === "create") {
        await createFeature(payload);
      } else if (editingId) {
        await updateFeature(editingId, payload);
      }

      setOpen(false);
      setForm(emptyForm());
      setEditingId(null);
    } catch (e: any) {
      setErr(e?.message || "Hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleActive(row: FeatureDoc, v: boolean) {
    try { await updateFeature(row.id, { isActive: v }); } catch {}
  }

  async function onDelete(row: FeatureDoc) {
    const ok = window.confirm(`Silinsin mi: ${row.nameTR}?`);
    if (!ok) return;
    try { await removeFeature(row.id); } catch {}
  }

  function addOption() {
    const labelTR = form.optLabel.trim();
    const value = (form.optValue.trim() || labelTR).toLowerCase().replace(/\s+/g, "_").slice(0, 60);
    const order = Number(form.optOrder);
    if (!labelTR) return;

    const next = (form.options || []).concat([{ labelTR, value, order: Number.isFinite(order) ? order : 0 }]);
    setForm((x) => ({ ...x, options: next, optLabel: "", optValue: "", optOrder: "0" }));
  }

  function removeOption(i: number) {
    const next = (form.options || []).slice();
    next.splice(i, 1);
    setForm((x) => ({ ...x, options: next }));
  }

  const type = mapTRToType(form.typeTR);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Özellikler</CardTitle>
              <div className="mt-2 text-sm text-white/60">Firestore: features</div>
            </div>
            <Button variant="primary" onClick={openCreate}>Yeni Ekle</Button>
          </div>

          <div className="mt-4">
            <Input
              label="Ara"
              placeholder="Özellik ara…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="grid grid-cols-[1.2fr_160px_120px_120px_240px] gap-3 px-5 py-4 text-xs font-bold tracking-widest text-white/40">
              <div>AD</div>
              <div>TİP</div>
              <div>AKTİF</div>
              <div>SIRA</div>
              <div className="text-right">AKSİYON</div>
            </div>
            <div className="h-px bg-white/10" />

            {loading ? (
              <div className="px-5 py-6 text-white/60">Yükleniyor…</div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-6 text-white/60">Kayıt yok.</div>
            ) : (
              filtered.map((r) => (
                <div key={r.id} className="grid grid-cols-[1.2fr_160px_120px_120px_240px] items-center gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-white">{r.nameTR}</div>
                    <div className="mt-1 truncate text-xs text-white/45">{r.key}{r.unit ? ` • ${r.unit}` : ""}</div>
                  </div>

                  <div><Badge>{typeLabelTR(r.type)}</Badge></div>

                  <div><Switch checked={!!r.isActive} onCheckedChange={(v) => onToggleActive(r, v)} /></div>

                  <div className="text-sm font-bold text-white/80">{r.order}</div>

                  <div className="flex items-center justify-end gap-2">
                    <Button onClick={() => openEdit(r)}>Düzenle</Button>
                    <Button variant="ghost" onClick={() => onDelete(r)} className="text-white/70 hover:text-white">Sil</Button>
                  </div>

                  <div className="col-span-5 h-px bg-white/10" />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Modal
        open={open}
        title={mode === "create" ? "Yeni Özellik" : "Özellik Düzenle"}
        onClose={() => (saving ? null : setOpen(false))}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Vazgeç</Button>
            <Button variant="primary" onClick={onSubmit} disabled={saving}>Kaydet</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Özellik Adı (TR)"
            placeholder="Örn: Pompa Sayısı"
            value={form.nameTR}
            onChange={(e) => setForm((x) => ({ ...x, nameTR: e.target.value }))}
            error={err || undefined}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <div className="mb-2 text-sm font-semibold text-white">Tip</div>
              <select
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#D9A400]/40 focus:ring-2 focus:ring-[#D9A400]/15"
                value={form.typeTR}
                onChange={(e) => setForm((x) => ({ ...x, typeTR: e.target.value as any, options: [] }))}
              >
                <option value="Evet/Hayır">Evet/Hayır</option>
                <option value="Sayı">Sayı</option>
                <option value="Yazı">Yazı</option>
                <option value="Seçenek">Seçenek</option>
                <option value="Çoklu Seçenek">Çoklu Seçenek</option>
              </select>
            </label>

            <Input
              label="Birim (opsiyonel)"
              placeholder="Örn: adet, km, dk"
              value={form.unit}
              onChange={(e) => setForm((x) => ({ ...x, unit: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Sıralama"
              placeholder="0"
              value={form.order}
              onChange={(e) => setForm((x) => ({ ...x, order: e.target.value }))}
            />
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-sm font-extrabold text-white">Aktif mi?</div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((x) => ({ ...x, isActive: v }))} />
            </div>
          </div>

          <Input
            label="Açıklama (opsiyonel)"
            placeholder="Admin notu"
            value={form.descriptionTR}
            onChange={(e) => setForm((x) => ({ ...x, descriptionTR: e.target.value }))}
          />

          {type === "number" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Min" placeholder="boş" value={form.min} onChange={(e) => setForm((x) => ({ ...x, min: e.target.value }))} />
              <Input label="Max" placeholder="boş" value={form.max} onChange={(e) => setForm((x) => ({ ...x, max: e.target.value }))} />
              <Input label="Adım" placeholder="1" value={form.step} onChange={(e) => setForm((x) => ({ ...x, step: e.target.value }))} />
            </div>
          ) : null}

          {type === "text" ? (
            <Input label="Maks. karakter" placeholder="200" value={form.maxLen} onChange={(e) => setForm((x) => ({ ...x, maxLen: e.target.value }))} />
          ) : null}

          {(type === "select" || type === "multiSelect") ? (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-extrabold text-white">Seçenekler</div>

              <div className="grid gap-3 md:grid-cols-3">
                <Input label="Etiket" placeholder="Örn: Var" value={form.optLabel} onChange={(e) => setForm((x) => ({ ...x, optLabel: e.target.value }))} />
                <Input label="Değer (opsiyonel)" placeholder="var" value={form.optValue} onChange={(e) => setForm((x) => ({ ...x, optValue: e.target.value }))} />
                <Input label="Sıra" placeholder="0" value={form.optOrder} onChange={(e) => setForm((x) => ({ ...x, optOrder: e.target.value }))} />
              </div>

              <div className="flex justify-end">
                <Button onClick={addOption}>Seçenek Ekle</Button>
              </div>

              <div className="mt-2 space-y-2">
                {(form.options || []).slice().sort((a,b) => (a.order ?? 0) - (b.order ?? 0)).map((o, i) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-white">{o.labelTR}</div>
                      <div className="mt-1 truncate text-xs text-white/50">{o.value} • sıra {o.order}</div>
                    </div>
                    <Button variant="ghost" onClick={() => removeOption(i)} className="text-white/70 hover:text-white">
                      Kaldır
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
