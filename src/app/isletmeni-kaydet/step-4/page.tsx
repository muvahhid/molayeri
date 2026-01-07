"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PhotoItem = {
  id: string;
  file: Blob;
  url: string;      // preview
  isCover: boolean;
  sizeKB: number;
};

function uid() {
  return Math.random().toString(36).slice(2);
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

  // kaliteyi düşürerek 160KB altına in
  let q = 0.82;
  let blob = await toBlob(q);
  while (blob.size > 160 * 1024 && q > 0.35) {
    q -= 0.07;
    blob = await toBlob(q);
  }

  return { blob, sizeKB: Math.round(blob.size / 1024) };
}

export default function Step4FotograflarPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<PhotoItem[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    return () => {
      // cleanup blob urls
      items.forEach((x) => URL.revokeObjectURL(x.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;

    setErr(null);

    const current = items.length;
    const incoming = Array.from(files).slice(0, Math.max(0, 6 - current));
    if (incoming.length === 0) {
      setErr("En fazla 6 fotoğraf yükleyebilirsin.");
      return;
    }

    const next: PhotoItem[] = [];
    for (const f of incoming) {
      if (!f.type.startsWith("image/")) continue;

      const { blob, sizeKB } = await processPhoto(f);
      const url = URL.createObjectURL(blob);

      next.push({
        id: uid(),
        file: blob,
        url,
        isCover: false,
        sizeKB,
      });
    }

    setItems((prev) => {
      const merged = [...prev, ...next].slice(0, 6);
      // ilk foto vitrin
      if (!merged.some((x) => x.isCover) && merged.length > 0) {
        merged[0] = { ...merged[0], isCover: true };
      }
      return merged;
    });

    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(id: string) {
    setItems((prev) => {
      const x = prev.find((p) => p.id === id);
      if (x) URL.revokeObjectURL(x.url);

      const filtered = prev.filter((p) => p.id !== id);
      if (filtered.length > 0 && !filtered.some((p) => p.isCover)) {
        filtered[0] = { ...filtered[0], isCover: true };
      }
      return filtered;
    });
  }

  function setCover(id: string) {
    setItems((prev) => prev.map((p) => ({ ...p, isCover: p.id === id })));
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
          disabled={items.length >= 6}
        >
          Fotoğraf Yükle
        </Button>

        <Button variant="secondary" className="px-6 py-4 rounded-[22px]" disabled>
          Video Yükle (Yakında)
        </Button>

        <div className="text-xs text-white/60">
          {items.length}/6
        </div>
      </div>

      {err ? <div className="mt-4 text-sm font-bold text-[#FF4D4F]">{err}</div> : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <div key={p.id} className="rounded-[22px] border border-white/10 bg-[#151A24] overflow-hidden">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
        <Button variant="secondary" onClick={() => router.back()}>
          Geri
        </Button>
        <Button variant="primary" onClick={next} className="px-8 py-4 rounded-[22px]">
          İleri: Özet & Başvuru
        </Button>
      </div>
    </div>
  );
}
