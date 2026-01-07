"use client";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";

import {
  subscribeApplications,
  approveApplication,
  passiveApplication,
  ApplicationDoc,
} from "@/lib/admin/applications.repo";

function statusBadge(s: ApplicationDoc["status"]) {
  if (s === "approved") return <Badge variant="active">ONAYLI</Badge>;
  if (s === "passive") return <Badge>PASİF</Badge>;
  return <Badge>PENDING</Badge>;
}

export default function BasvurularPage() {
  const [rows, setRows] = React.useState<ApplicationDoc[]>([]);
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ApplicationDoc | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => subscribeApplications(setRows), []);

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => {
      const a = (r.user?.email || "").toLowerCase();
      const b = (r.business?.name || "").toLowerCase();
      const c = ((r.user?.firstName || "") + " " + (r.user?.lastName || "")).toLowerCase();
      return a.includes(t) || b.includes(t) || c.includes(t);
    });
  }, [rows, q]);

  async function onApprove(r: ApplicationDoc) {
    if (busy) return;
    setBusy(r.id);
    try {
      await approveApplication(r.id, r.user.uid);
    } finally {
      setBusy(null);
    }
  }

  async function onPassive(r: ApplicationDoc) {
    if (busy) return;
    setBusy(r.id);
    try {
      await passiveApplication(r.id, r.user.uid);
    } finally {
      setBusy(null);
    }
  }

  function onInspect(r: ApplicationDoc) {
    setSelected(r);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-black">Başvurular</div>
          <div className="mt-1 text-sm text-white/60">Firestore: applications</div>
        </div>
        <div className="w-[360px]">
          <Input label="Ara" placeholder="İşletme / email / ad..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1.2fr_0.7fr_1fr] gap-0 border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-extrabold tracking-widest text-white/45">
          <div>İŞLETME</div>
          <div>BAŞVURAN</div>
          <div>DURUM</div>
          <div className="text-right">AKSİYON</div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-white/60">Kayıt yok.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {filtered.map((r) => (
              <div key={r.id} className="px-5 py-4 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-extrabold text-white">{r.business?.name || "-"}</div>
                  <div className="mt-1 truncate text-xs text-white/50">{r.business?.addressText || "-"}</div>
                </div>

                <div className="min-w-0 w-[32%]">
                  <div className="truncate text-sm font-bold text-white">{(r.user?.firstName || "")} {(r.user?.lastName || "")}</div>
                  <div className="mt-1 truncate text-xs text-white/50">{r.user?.email || "-"}</div>
                </div>

                <div className="w-[14%]">{statusBadge(r.status)}</div>

                <div className="ml-auto flex items-center justify-end gap-2">
                  <Button variant="secondary" className="px-4 py-2 rounded-2xl" onClick={() => onInspect(r)}>
                    İncele
                  </Button>
                  <Button
                    variant="primary"
                    className="px-4 py-2 rounded-2xl"
                    disabled={busy === r.id || r.status === "approved"}
                    onClick={() => onApprove(r)}
                  >
                    Kabul Et
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-4 py-2 rounded-2xl text-white/70 hover:text-white"
                    disabled={busy === r.id || r.status === "passive"}
                    onClick={() => onPassive(r)}
                  >
                    Pasif Et
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={open}
        title="Başvuru Özeti"
        onClose={() => setOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Kapat</Button>
          </div>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-extrabold text-white">İşletme</div>
              <div className="mt-2 text-sm text-white/70">
                <div><span className="text-white/45">İsim:</span> {selected.business?.name || "-"}</div>
                <div className="mt-1"><span className="text-white/45">Adres:</span> {selected.business?.addressText || "-"}</div>
                <div className="mt-1"><span className="text-white/45">Tanıtım:</span> {selected.business?.description || "-"}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-extrabold text-white">Başvuran</div>
              <div className="mt-2 text-sm text-white/70">
                <div><span className="text-white/45">Ad:</span> {selected.user?.firstName} {selected.user?.lastName}</div>
                <div className="mt-1"><span className="text-white/45">Email:</span> {selected.user?.email}</div>
                <div className="mt-1"><span className="text-white/45">Telefon:</span> {selected.user?.phone}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-white">Fotoğraflar</div>
                <div className="text-xs text-white/60">{(selected.photos || []).length}/6</div>
              </div>
              {(selected.photos || []).length === 0 ? (
                <div className="mt-3 text-sm text-white/60">Fotoğraf yok.</div>
              ) : (
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {(selected.photos || []).slice(0,6).map((p, i) => (
                    <div key={i} className="overflow-hidden rounded-xl border border-white/10 bg-[#151A24]">
                      <img src={p.url} alt="" className="h-14 w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
