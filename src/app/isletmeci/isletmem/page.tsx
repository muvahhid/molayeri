"use client";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { db, storage } from "@/lib/firebase.client";
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
import { ref as sref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

type Photo = { url: string; isCover: boolean; path?: string };

type AppRow = {
  id: string;
  status: "pending" | "approved" | "passive";
  user?: { uid?: string; email?: string };
  business?: { name?: string; addressText?: string; description?: string };
  photos?: Photo[];
};

function readSessionUser() {
  try {
    const raw = window.localStorage.getItem("molayeri_session_v1");
    if (!raw) return { uid: "", label: "" };
    const x = JSON.parse(raw) as any;
    const uid = String(x?.uid || "").trim();
    const label = String(x?.name || x?.fullName || x?.email || "").trim();
    return { uid, label };
  } catch {
    return { uid: "", label: "" };
  }
}

function readSessionUid(): string {
  return readSessionUser().uid;
}

async function fileToCoverJpeg160kb(file: File) {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = URL.createObjectURL(file);
  });

  const targetW = 1280;
  const targetH = 720;

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  const targetRatio = targetW / targetH;
  const srcRatio = srcW / srcH;

  let cropW = srcW;
  let cropH = srcH;
  if (srcRatio > targetRatio) {
    cropW = Math.floor(srcH * targetRatio);
    cropH = srcH;
  } else {
    cropH = Math.floor(srcW / targetRatio);
    cropW = srcW;
  }
  const cropX = Math.floor((srcW - cropW) / 2);
  const cropY = Math.floor((srcH - cropH) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

  let q = 0.82;
  let blob: Blob | null = null;
  for (let i = 0; i < 10; i++) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", q));
    if (!blob) break;
    if (blob.size <= 160 * 1024) break;
    q -= 0.08;
    if (q < 0.2) break;
  }
  if (!blob) throw new Error("blob");

  const buf = await blob.arrayBuffer();
  URL.revokeObjectURL(img.src);
  return { bytes: new Uint8Array(buf), contentType: "image/jpeg" as const };
}

export default function IsletmemPage() {
  const [uid, setUid] = React.useState("");
  const [userLabel, setUserLabel] = React.useState("");
  const [row, setRow] = React.useState<AppRow | null>(null);

  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");

  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    const u = readSessionUser();
    setUid(u.uid);
    setUserLabel(u.label);
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

  const photos = (row?.photos || []) as Photo[];
  const cover = photos.find((p) => p.isCover) || photos[0];

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

  async function setCoverPhoto(url: string) {
    if (!row || saving) return;
    const next = photos.map((p) => ({ ...p, isCover: p.url === url }));
    setSaving(true);
    try {
      await updateDoc(doc(db, "applications", row.id), {
        photos: next,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert("İşlem başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function removePhoto(p: Photo) {
    if (!row || saving) return;
    if (!confirm("Fotoğraf silinsin mi?")) return;

    const next = photos.filter((x) => x.url !== p.url);
    if (p.isCover && next.length) next[0] = { ...next[0], isCover: true };

    setSaving(true);
    try {
      await updateDoc(doc(db, "applications", row.id), {
        photos: next,
        updatedAt: serverTimestamp(),
      });

      if (p.path) {
        try {
          await deleteObject(sref(storage, p.path));
        } catch {}
      }
    } catch (e) {
      console.error(e);
      alert("Silme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function onPickFiles(files: FileList | null) {
    if (!row || !uid) return;
    if (!files || !files.length) return;

    const existing = photos.length;
    const room = Math.max(0, 6 - existing);
    const picked = Array.from(files).slice(0, room);
    if (!picked.length) return alert("Maksimum 6 fotoğraf.");

    setUploading(true);
    try {
      const newOnes: Photo[] = [];
      for (const f of picked) {
        const { bytes, contentType } = await fileToCoverJpeg160kb(f);
        const key = Date.now() + "_" + Math.random().toString(16).slice(2) + ".jpg";
        const path = `businessPhotos/${uid}/${row.id}/${key}`;
        const r = sref(storage, path);
        await uploadBytes(r, bytes, { contentType });
        const url = await getDownloadURL(r);
        newOnes.push({ url, isCover: false, path });
      }

      let next = [...photos, ...newOnes];
      if (!next.some((p) => p.isCover) && next.length) next[0] = { ...next[0], isCover: true };

      await updateDoc(doc(db, "applications", row.id), {
        photos: next,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert("Yükleme başarısız. Storage ayarlarını kontrol et.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        
        <div>
          <div className="text-2xl font-black">İşletmelerim</div>
          <div className="mt-1 text-sm text-white/60">Onaylı işletmelerin burada görünür.</div>
        </div>
        
      
        <div className="ml-auto">
          <a href="/isletmeni-kaydet/step-2?new=1">
            <Button variant="primary" className="px-6 py-3 rounded-2xl">Yeni İşletme Ekle</Button>
          </a>
        </div>
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
        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
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

          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold">Fotoğraflar</div>
                <div className="mt-1 text-xs text-white/50">3–6 fotoğraf. Vitrin seçebilirsin.</div>
              </div>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => onPickFiles(e.target.files)}
                  disabled={uploading || saving || photos.length >= 6}
                />
                <span>
                  <Button variant="primary" className="px-4 py-3 rounded-2xl" disabled={uploading || saving || photos.length >= 6}>
                    {uploading ? "Yükleniyor..." : "Foto Ekle"}
                  </Button>
                </span>
              </label>
            </div>

            {cover ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#151A24]">
                <img src={cover.url} alt="" className="h-48 w-full object-cover" />
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                Fotoğraf yok.
              </div>
            )}

            {!!photos.length ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {photos.map((p) => (
                  <div key={p.url} className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#151A24]">
                    <img src={p.url} alt="" className="h-24 w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
                    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between gap-1">
                      <button
                        className="rounded-xl bg-black/60 px-2 py-1 text-[11px] font-bold text-white/90"
                        onClick={() => setCoverPhoto(p.url)}
                        disabled={saving}
                      >
                        {p.isCover ? "Vitrin" : "Vitrin Yap"}
                      </button>
                      <button
                        className="rounded-xl bg-black/60 px-2 py-1 text-[11px] font-bold text-white/90"
                        onClick={() => removePhoto(p)}
                        disabled={saving}
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-extrabold">Video</div>
              <div className="mt-1 text-xs text-white/55">Yakında</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
