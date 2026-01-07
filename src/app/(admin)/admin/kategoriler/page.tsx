"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import {
  CategoryDoc,
  createCategory,
  removeCategory,
  subscribeCategories,
  updateCategory,
} from "@/lib/admin/categories.repo";

type FormState = {
  nameTR: string;
  order: string;
  isActive: boolean;
};

function emptyForm(): FormState {
  return { nameTR: "", order: "0", isActive: true };
}

export default function KategorilerPage() {
  const [rows, setRows] = React.useState<CategoryDoc[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<FormState>(emptyForm());
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsub = subscribeCategories((r) => {
      setRows(r);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setErr(null);
    setOpen(true);
  }

  function openEdit(row: CategoryDoc) {
    setMode("edit");
    setEditingId(row.id);
    setForm({
      nameTR: row.nameTR ?? "",
      order: String(row.order ?? 0),
      isActive: !!row.isActive,
    });
    setErr(null);
    setOpen(true);
  }

  async function onSubmit() {
    const nameTR = (form.nameTR || "").trim();
    const orderNum = Number(form.order);
    if (!nameTR) return setErr("Kategori adı zorunlu.");
    if (!Number.isFinite(orderNum)) return setErr("Sıralama sayı olmalı.");

    setSaving(true);
    setErr(null);
    try {
      if (mode === "create") {
        await createCategory({ nameTR, order: orderNum, isActive: form.isActive });
      } else if (editingId) {
        await updateCategory(editingId, { nameTR, order: orderNum, isActive: form.isActive });
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

  async function onToggleActive(row: CategoryDoc, v: boolean) {
    try {
      await updateCategory(row.id, { isActive: v });
    } catch {}
  }

  async function onDelete(row: CategoryDoc) {
    const ok = window.confirm(`Silinsin mi: ${row.nameTR}?`);
    if (!ok) return;
    try {
      await removeCategory(row.id);
    } catch {}
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Kategoriler</CardTitle>
              <div className="mt-2 text-sm text-white/60">Firestore: categories</div>
            </div>
            <Button variant="primary" onClick={openCreate}>
              Yeni Ekle
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="grid grid-cols-[1.2fr_120px_120px_220px] gap-3 px-5 py-4 text-xs font-bold tracking-widest text-white/40">
              <div>AD</div>
              <div>SIRA</div>
              <div>DURUM</div>
              <div className="text-right">AKSİYON</div>
            </div>
            <div className="h-px bg-white/10" />

            {loading ? (
              <div className="px-5 py-6 text-white/60">Yükleniyor…</div>
            ) : rows.length === 0 ? (
              <div className="px-5 py-6 text-white/60">Henüz kategori yok.</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="grid grid-cols-[1.2fr_120px_120px_220px] items-center gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-white">{r.nameTR}</div>
                    <div className="mt-1 truncate text-xs text-white/45">{r.slug}</div>
                  </div>

                  <div className="text-sm font-bold text-white/80">{r.order}</div>

                  <div>
                    {r.isActive ? <Badge variant="active">AKTİF</Badge> : <Badge variant="inactive">PASİF</Badge>}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Switch checked={!!r.isActive} onCheckedChange={(v) => onToggleActive(r, v)} />
                    <Button onClick={() => openEdit(r)}>Düzenle</Button>
                    <Button variant="ghost" onClick={() => onDelete(r)} className="text-white/70 hover:text-white">
                      Sil
                    </Button>
                  </div>

                  <div className="col-span-4 h-px bg-white/10" />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Modal
        open={open}
        title={mode === "create" ? "Yeni Kategori" : "Kategori Düzenle"}
        onClose={() => (saving ? null : setOpen(false))}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Vazgeç
            </Button>
            <Button variant="primary" onClick={onSubmit} disabled={saving}>
              Kaydet
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Kategori Adı (TR)"
            placeholder="Örn: Benzinlik"
            value={form.nameTR}
            onChange={(e) => setForm((x) => ({ ...x, nameTR: e.target.value }))}
            error={err || undefined}
          />

          <Input
            label="Sıralama"
            placeholder="0"
            value={form.order}
            onChange={(e) => setForm((x) => ({ ...x, order: e.target.value }))}
          />

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <div className="text-sm font-extrabold text-white">Aktif mi?</div>
              <div className="mt-1 text-xs text-white/55">Pasif yaparsan kullanıcı tarafında görünmez.</div>
            </div>
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm((x) => ({ ...x, isActive: v }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
