"use client";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { db } from "@/lib/firebase.client";
import {
  collection,
  onSnapshot,
  query,
  where,
  limit,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

type Session = { email: string; role: "user" | "pending" | "isletmeci" | "admin"; approved?: boolean };

type AppRow = {
  id: string;
  status: "pending" | "approved" | "passive";
  user?: { email?: string };
  business?: { name?: string; addressText?: string; description?: string };
  photos?: { url: string; isCover: boolean }[];
};

function readSessionUid(): string {
  try {
    const raw = window.localStorage.getItem("molayeri_session_v1");
    if (!raw) return "";
    const s = JSON.parse(raw) as any;
    return String(s?.uid || "").trim();
  } catch {
    return "";
  }
}

export default function IsletmemPage() {
  const [uid, setUid] = React.useState("");
  const [row, setRow] = React.useState<AppRow | null>(null);

  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");

  React.useEffect(() => {
    setUid(readSessionUid());
  }, []);

  React.useEffect(() => {
    if (!uid) return;

    const qy = query(
      collection(db, "applications"),
      where("status", "==", "approved"),
      where("user.uid", "==", uid),
      limit(1)
    );

    return onSnapshot(qy, (snap) => {
      const d = snap.docs[0];
      const next = d ? ({ id: d.id, ...(d.data() as any) }) : null;
      setRow(next);
      if (next && !editing) {
        setName(next.business?.name || "");
        setDesc(next.business?.description || "");
      }
    });
  }, [uid, editing]);

  const cover = row?.photos?.find((p) => p.isCover) || row?.photos?.[0];

  async function saveChanges() {
    if (!row || saving) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "applications", row.id), {
        "business.name": (name || "").trim(),
        "business.description": (desc || "").trim(),
        updatedAt: serverTimestamp(),
      });
      setEditing(false);
    } catch (e) {
      console.error(e);
      alert("Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function passiveMine() {
    if (!row || saving) return;
    if (!confirm("İşletmeni pasif etmek istiyor musun?")) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "applications", row.id), {
        status: "passive",
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert("İşlem başarısız.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-black">İşletmem</div>
          <div className="mt-1 text-sm text-white/60">Onaylı işletmen burada görünür.</div>
        </div>
        <div className="text-xs text-white/50">{uid ? "UID: " + uid.slice(0,8) + "…" : "UID yok"}</div>
      </div>

      {!uid ? (
        <Card className="p-6">
          <div className="text-white/70">Giriş yap.</div>
        </Card>
      ) : !row ? (
        <Card className="p-6">
          <div className="text-white/70">Onaylı işletme bulunamadı.</div>
          <div className="mt-2 text-xs text-white/45">Admin başvuruyu “Kabul Et” yapınca burada görünür.</div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <div className="text-lg font-black">{row.business?.name || "-"}</div>
              <Badge variant="active">ONAYLI</Badge>
            </div>

            <div className="mt-2 text-sm text-white/60">{row.business?.addressText || "-"}</div>

            {!editing ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                {row.business?.description || "—"}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-extrabold tracking-widest text-white/45">İŞLETME İSMİ</div>
                  <input
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#151A24] px-4 py-3 text-sm text-white outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="İşletme adı"
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-extrabold tracking-widest text-white/45">TANITIM</div>
                  <textarea
                    className="mt-2 h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-[#151A24] px-4 py-3 text-sm text-white outline-none"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Tanıtım"
                  />
                </div>
              </div>
            )}

            <div className="mt-5 flex items-center gap-2">
              {!editing ? (
                <>
                  <Button variant="primary" className="px-6 py-3 rounded-2xl" onClick={() => setEditing(true)}>
                    Güncelle
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-6 py-3 rounded-2xl text-white/70 hover:text-white"
                    onClick={passiveMine}
                    disabled={saving}
                  >
                    Pasif Et
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="primary" className="px-6 py-3 rounded-2xl" onClick={saveChanges} disabled={saving}>
                    {saving ? "..." : "Kaydet"}
                  </Button>
                  <Button
                    variant="secondary"
                    className="px-6 py-3 rounded-2xl"
                    onClick={() => {
                      setEditing(false);
                      setName(row.business?.name || "");
                      setDesc(row.business?.description || "");
                    }}
                    disabled={saving}
                  >
                    Vazgeç
                  </Button>
                </>
              )}
            </div>
          </Card>

          <Card className="p-4 overflow-hidden">
            <div className="text-sm font-extrabold">Vitrin</div>
            {cover ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#151A24]">
                <img src={cover.url} alt="" className="h-52 w-full object-cover" />
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                Fotoğraf yok.
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
