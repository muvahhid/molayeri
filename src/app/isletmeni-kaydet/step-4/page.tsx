"use client";
import { useWizardStepGuard } from "@/lib/wizard/stepGuard";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { storage } from "@/lib/firebase.client";
import {
  ref as sRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

type PhotoItem = {
  id: string;
  url: string;      // downloadURL (storage)
  isCover: boolean;
  sizeKB: number;
};

function uid() {
  const c = ((uid as any)._c = (((uid as any)._c || 0) + 1));
  return Date.now().toString(36) + "_" + Math.random().toString(36).slice(2) + "_" + c;
}

async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";
  img.loading = "eager";
  await new Promise((res, rej) => {
    img.onload = () => res(null);
    img.onerror = rej;
    img.src = url;
  });
  URL.revokeObjectURL(url);
  return img;
}

// 16:9 yatay crop + maxW + <=160KB
async function processPhoto(file: File): Promise<{ blob: Blob; sizeKB: number }> {
  const img = await fileToImage(file);

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  // crop to 16:9
  const targetRatio = 16 / 9;
  let cropW = srcW;
  let cropH = Math.round(srcW / targetRatio);
  if (cropH > srcH) {
    cropH = srcH;
    cropW = Math.round(srcH * targetRatio);
  }
  const sx = Math.round((srcW - cropW) / 2);
  const sy = Math.round((srcH - cropH) / 2);

  // resize
  const maxW = 1280;
  const outW = Math.min(maxW, cropW);
  const outH = Math.round(outW / targetRatio);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outW, outH);

  async function toBlob(q: number): Promise<Blob> {
    return await new Promise((res) => {
      canvas.toBlob((b) => res(b!), "image/jpeg", q);
    });
  }

  let q = 0.82;
  let blob = await toBlob(q);
  while (blob.size > 160 * 1024 && q > 0.35) {
    q -= 0.07;
    blob = await toBlob(q);
  }

  return { blob, sizeKB: Math.round(blob.size / 1024) };
}

function createNewUploadSession() {
  const k = "molayeri_upload_session";
  const sid = String(Date.now()) + "_" + Math.random().toString(36).slice(2);
  window.localStorage.setItem(k, sid);
  return sid;
}

function getUploadSession() {
  return window.localStorage.getItem("molayeri_upload_session") || "";
}

function writeWizardPhotos(items: PhotoItem[]) {
  try {
    const rawW = window.localStorage.getItem("molayeri_wizard_v1");
    const w = rawW ? JSON.parse(rawW) : {};
    const photoMeta = items.map((x) => ({ url: x.url, isCover: !!x.isCover }));
    w.photos = photoMeta;
    w.step4 = { ...(w.step4 || {}), photos: photoMeta };
    window.localStorage.setItem("molayeri_wizard_v1", JSON.stringify(w));
  } catch {}
}

export default function Step4FotograflarPage() {
  useWizardStepGuard(4);
  const router = useRouter();

  const [items, setItems] = React.useState<PhotoItem[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const sidRef = React.useRef<string>("");

  React.useEffect(() => {
    // login kontrolü
    try {
      const raw = window.localStorage.getItem("molayeri_session_v1");
      const ss = raw ? JSON.parse(raw) : null;
      const u = String(ss?.uid || "").trim();
      if (!u) {
        window.location.href = "/login";
        return;
      }
    } catch {
      window.location.href = "/login";
      return;
    }

    // upload session garanti (tek sefer, memory'ye sabitle)
    const sid = String(Date.now()) + "_" + Math.random().toString(36).slice(2);
    window.localStorage.setItem("molayeri_upload_session", sid);
    sidRef.current = sid;
  }, []);

  async function uploadOne(blob: Blob, index: number): Promise<string> {
    const sid = sidRef.current;
    const fileName = String(Date.now()) + "_" + index + ".jpg";
    const path = "wizard/photos/" + sid + "/" + fileName;
    const r = sRef(storage, path);
    await uploadBytes(r, blob, { contentType: "image/jpeg" });
    return await getDownloadURL(r);
  }

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;

    setErr(null);

    const current = items.length;
    const incoming = Array.from(files).slice(0, Math.max(0, 6 - current));
    if (incoming.length === 0) {
      setErr("En fazla 6 fotoğraf yükleyebilirsin.");
      return;
    }

    setUploading(true);

    const added: PhotoItem[] = [];
    try {
      for (let i = 0; i < incoming.length; i++) {
        const f = incoming[i];
        if (!f.type.startsWith("image/")) continue;

        const { blob, sizeKB } = await processPhoto(f);
        const url = await uploadOne(blob, current + i);

        added.push({
          id: uid(),
          url,
          isCover: false,
          sizeKB,
        });
      }

      setItems((prev) => {
        const merged = [...prev, ...added].slice(0, 6);
        if (!merged.some((x) => x.isCover) && merged.length > 0) {
          merged[0] = { ...merged[0], isCover: true };
        }
        writeWizardPhotos(merged);
        return merged;
      });
    } catch (e) {
      console.error(e);
      setErr("Fotoğraf yüklenemedi. Tekrar dene.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: string) {
    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      if (filtered.length > 0 && !filtered.some((p) => p.isCover)) {
        filtered[0] = { ...filtered[0], isCover: true };
      }
      writeWizardPhotos(filtered);
      return filtered;
    });

    // storage silmeyi dene (başarısızsa önemseme)
    const x = items.find((p) => p.id === id);
    if (x?.url) {
      try {
        await deleteObject(sRef(storage, x.url));
      } catch {}
    }
  }

  function setCover(id: string) {
    setItems((prev) => {
      const next = prev.map((p) => ({ ...p, isCover: p.id === id }));
      writeWizardPhotos(next);
      return next;
    });
  }

  function next() {
    if (items.length < 3) {
      setErr("En az 3 fotoğraf yüklemelisin.");
      return;
    }
    setErr(null);
    router.push("/isletmeni-kaydet/step-5");
  }

  return (
    <div className="px-6 pb-6">
      <div className="text-2xl font-black">Fotoğraflar</div>
      <div className="mt-2 text-sm text-white/60">
        En az 3, en çok 6 fotoğraf. (Otomatik yatay + 160KB)
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />

        <Button
          variant="primary"
          className="px-6 py-4 rounded-[22px]"
          onClick={() => inputRef.current?.click()}
          disabled={items.length >= 6 || uploading}
        >
          {uploading ? "Yükleniyor..." : "Fotoğraf Yükle"}
        </Button>

        <Button variant="secondary" className="px-6 py-4 rounded-[22px]" disabled>
          Video Yükle (Yakında)
        </Button>

        <div className="text-xs text-white/60">{items.length}/6</div>
      </div>

      {err ? <div className="mt-4 text-sm font-bold text-[#FF4D4F]">{err}</div> : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <div key={p.id} className="rounded-[22px] border border-white/10 bg-[#151A24] overflow-hidden">
            <div className="relative">
              <img src={p.url} alt="" className="h-44 w-full object-cover" />
              {p.isCover ? (
                <div className="absolute left-3 top-3">
                  <Badge variant="active">VİTRİN</Badge>
                </div>
              ) : null}
              <div className="absolute right-3 top-3">
                <Badge>{p.sizeKB}KB</Badge>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between gap-3">
              <Button variant="secondary" className="px-4 py-2 rounded-2xl" onClick={() => setCover(p.id)}>
                Vitrin Yap
              </Button>
              <Button variant="ghost" className="px-4 py-2 rounded-2xl" onClick={() => remove(p.id)}>
                Sil
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="secondary" onClick={() => router.back()} disabled={uploading}>
          Geri
        </Button>
        <Button variant="primary" onClick={next} className="px-8 py-4 rounded-[22px]" disabled={uploading}>
          İleri: Özet & Başvuru
        </Button>
      </div>
    </div>
  );
}
