"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase.client";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AnyRec = Record<string, any>;

function safeDate(v: any) {
  try {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (v?.toDate) return new Date(v.toDate()).toLocaleString("tr-TR");
    if (v?.seconds) return new Date(v.seconds * 1000).toLocaleString("tr-TR");
    return "";
  } catch {
    return "";
  }
}

export default function AdminBusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params as any)?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [biz, setBiz] = useState<AnyRec | null>(null);

  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [featureMap, setFeatureMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        if (!id) return;
        const snap = await getDoc(doc(db, "businesses", id));
        if (!alive) return;
        setBiz(snap.exists() ? ({ id: snap.id, ...(snap.data() as AnyRec) }) : null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!biz) return;

        const catIds: string[] = Array.isArray(biz?.selectedCategoryIds)
          ? (biz.selectedCategoryIds.filter((x: any) => typeof x === "string" && x) as string[])
          : [];

        const fv: AnyRec = (biz?.featureValues && typeof biz.featureValues === "object") ? biz.featureValues : {};
        const featIds: string[] = Object.keys(fv || {}).filter((k) => !!k);

        // Firestore "in" sorgusu 10 ile sınırlı → şimdilik ilk 10 yeterli (UI özet)
        if (catIds.length) {
          const catSnap = await getDocs(
            query(collection(db, "categories"), where("__name__", "in", catIds.slice(0, 10)))
          );
          if (!alive) return;
          const mp: Record<string, string> = {};
          catSnap.docs.forEach((d) => {
            const data: any = d.data();
            mp[d.id] = data?.nameTR || data?.name || d.id;
          });
          setCategoryMap(mp);
        } else {
          if (alive) setCategoryMap({});
        }

        if (featIds.length) {
          const featSnap = await getDocs(
            query(collection(db, "features"), where("__name__", "in", featIds.slice(0, 10)))
          );
          if (!alive) return;
          const mp: Record<string, string> = {};
          featSnap.docs.forEach((d) => {
            const data: any = d.data();
            mp[d.id] = data?.nameTR || data?.name || d.id;
          });
          setFeatureMap(mp);
        } else {
          if (alive) setFeatureMap({});
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
  }, [biz]);

  async function setStatus(status: "approved" | "passive") {
    if (!biz?.id) return;
    const ok = window.confirm(
      status === "approved" ? "İşletmeyi tekrar aktif etmek istiyor musun?" : "İşletmeyi pasif etmek istiyor musun?"
    );
    if (!ok) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "businesses", biz.id), {
        status,
        updatedAt: serverTimestamp(),
      });
      setBiz((prev) => (prev ? { ...prev, status } : prev));
    } finally {
      setSaving(false);
    }
  }

  const statusBadge = useMemo(() => {
    if (!biz) return null;
    if (biz.status === "approved") return <Badge variant="active">ONAYLI</Badge>;
    if (biz.status === "passive") return <Badge>PASİF</Badge>;
    return <Badge>PENDING</Badge>;
  }, [biz]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>İşletme Detayı</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-sm text-white/60">Yükleniyor...</div>
          ) : !biz ? (
            <div className="text-sm text-white/60">
              İşletme bulunamadı.{" "}
              <button className="underline" onClick={() => router.push("/admin/isletmeler")}>
                Listeye dön
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ÜST ÖZET */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="text-2xl font-black tracking-tight text-white">
                      {biz.name || "İşletme"}
                    </div>
                    <div className="mt-2 text-sm text-white/60">
                      {biz.addressText || "—"}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {statusBadge}
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 ring-1 ring-white/10">
                        owner: {biz.ownerEmail || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      className="min-w-[160px]"
                      disabled={saving || biz.status === "approved"}
                      onClick={() => setStatus("approved")}
                    >
                      Aktif Et
                    </Button>

                    <Button
                      variant="ghost"
                      className="min-w-[160px]"
                      disabled={saving || biz.status === "passive"}
                      onClick={() => setStatus("passive")}
                    >
                      Pasif Et
                    </Button>

                    <Button variant="ghost" className="min-w-[160px]" onClick={() => router.push("/admin/isletmeler")}>
                      Listeye Dön
                    </Button>
                  </div>
                </div>
              </div>

              {/* KİMLİK & TARİHLER */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs font-bold tracking-widest text-white/40">KİMLİK</div>
                  <div className="mt-3 space-y-2 text-sm text-white/80">
                    <div><span className="text-white/50">docId:</span> <span className="font-semibold">{biz.id}</span></div>
                    <div><span className="text-white/50">applicationId:</span> <span className="font-semibold">{biz.applicationId || "—"}</span></div>
                    <div><span className="text-white/50">ownerUid:</span> <span className="font-semibold">{biz.ownerUid || "—"}</span></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs font-bold tracking-widest text-white/40">TARİHLER</div>
                  <div className="mt-3 space-y-2 text-sm text-white/80">
                    <div><span className="text-white/50">createdAt:</span> <span className="font-semibold">{safeDate(biz.createdAt) || "—"}</span></div>
                    <div><span className="text-white/50">updatedAt:</span> <span className="font-semibold">{safeDate(biz.updatedAt) || "—"}</span></div>
                  </div>
                </div>
              </div>

              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-white">İşletme Özeti</div>
                    <div className="text-xs text-white/50">kategoriler • özellikler</div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-bold tracking-widest text-white/40">KATEGORİLER</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(Array.isArray(biz?.selectedCategoryIds) ? biz.selectedCategoryIds : []).length === 0 ? (
                        <div className="text-sm text-white/60">—</div>
                      ) : (
                        (biz.selectedCategoryIds as any[]).slice(0, 10).map((cid) => (
                          <span
                            key={String(cid)}
                            className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/75 ring-1 ring-white/10"
                          >
                            {categoryMap[String(cid)] || String(cid)}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

               <div className="mt-5">
                 <div className="flex items-center justify-between">
                   <div className="text-xs font-bold tracking-widest text-white/40">ÖZELLİKLER</div>
                   <div className="text-xs text-white/50">
                     {(() => {
                       const fv =
                         biz?.featureValues && typeof biz.featureValues === "object" ? biz.featureValues : {};
                       return `${Object.keys(fv || {}).length}`;
                     })()}
                   </div>
                 </div>

                 <div className="mt-3 max-h-[220px] overflow-auto pr-1">
                   {(() => {
                     const fv =
                       biz?.featureValues && typeof biz.featureValues === "object" ? biz.featureValues : {};
                     const entries = Object.entries(fv || {});
                     if (!entries.length) return <div className="text-sm text-white/60">—</div>;

                     const shown = entries.slice(0, 50);
                     const extra = Math.max(0, entries.length - shown.length);

                     const fmtVal = (v: any) => {
  if (v && typeof v === "object" && "value" in v) v = (v as any).value;

                       if (v === true) return "✓";
                       if (v === false) return "✕";
                       if (v === null || v === undefined || v === "") return "—";
                       if (typeof v === "number") return String(v);
                       if (typeof v === "string") return v.length > 18 ? v.slice(0, 18) + "…" : v;
                       try {
                         const s = JSON.stringify(v);
                         return s.length > 18 ? s.slice(0, 18) + "…" : s;
                       } catch {
                         return "…";
                       }
                     };

                     return (
                       <div className="flex flex-wrap gap-2">
                         {shown.map(([k, v]) => (
                           <span
                             key={k}
                             className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/10"
                             title={`${featureMap[k] || k}: ${String(v)}`}
                           >
                             <span className="max-w-[220px] truncate">{featureMap[k] || k}</span>
                             <span className="rounded-full bg-black/25 px-2 py-0.5 text-[11px] font-black text-white/70 ring-1 ring-white/10">
                               {fmtVal(v)}
                             </span>
                           </span>
                         ))}

                         {extra > 0 && (
                           <span className="inline-flex items-center rounded-full bg-[#D9A400]/10 px-3 py-1 text-xs font-extrabold text-[#D9A400] ring-1 ring-[#D9A400]/20">
                             +{extra}
                           </span>
                         )}
                       </div>
                     );
                   })()}
                 </div>
               </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-white">Fotoğraflar</div>
                    <div className="text-xs text-white/50">{Array.isArray(biz?.photos) ? Math.min(6, biz.photos.length) : 0}/6</div>
                  </div>

                  {(!Array.isArray(biz?.photos) || biz.photos.length === 0) ? (
                    <div className="mt-4 text-sm text-white/60">Fotoğraf yok.</div>
                  ) : (
                    <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
                      {(biz.photos as any[]).slice(0, 6).map((p, i) => (
                        <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-[#151A24]">
                          <img src={p?.url} alt="" className="h-16 w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-bold tracking-widest text-white/40">AÇIKLAMA</div>
                    <div className="mt-2 text-sm text-white/70">
                      {biz?.description || "—"}
                    </div>
                  </div>
                </div>
              </div>


              {/* KAMPANYA & QR (placeholder) */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-extrabold text-white">Kampanya & QR Kullanımı</div>
                  <div className="text-xs text-white/50">yakında</div>
                </div>

                <div className="mt-4 space-y-2 max-h-[320px] overflow-auto pr-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white/80">Henüz kayıt yok</div>
                        <div className="mt-1 text-xs text-white/50">QR / Kampanya kullanımı burada listelenecek</div>
                      </div>
                      <div className="shrink-0 text-white/35">—</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button className="h-10 w-20 rounded-2xl bg-[#D9A400] text-sm font-black text-black/90 opacity-40" disabled>‹</button>
                  <div className="text-xs font-semibold text-white/60">Sayfa 1/100</div>
                  <button className="h-10 w-20 rounded-2xl bg-[#D9A400] text-sm font-black text-black/90">›</button>
                </div>
              </div>

              {/* HAM VERİ */}
              <div className="mt-10" />
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="text-xs font-bold tracking-widest text-white/40">HAM VERİ</div>
                <pre className="mt-4 max-h-[420px] overflow-auto rounded-2xl bg-black/30 p-4 text-xs text-white/70 ring-1 ring-white/10">
{JSON.stringify(biz, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
