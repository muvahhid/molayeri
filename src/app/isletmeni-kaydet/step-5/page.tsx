"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useWizard } from "../wizard.provider";

import { createPendingApplication } from "@/lib/wizard/applications.repo";

import { storage } from "@/lib/firebase.client";
import { ref as sRef, listAll, getDownloadURL } from "firebase/storage";

import { subscribeCategories, CategoryDoc } from "@/lib/admin/categories.repo";
import { subscribeFeatures, FeatureDoc } from "@/lib/admin/features.repo";
import { auth } from "@/lib/firebase.client";

type PhotoView = { url: string; isCover: boolean };

function valueTR(v: any) {
  if (!v || !v.type) return "";
  if (v.type === "bool") return v.value ? "Evet" : "Hayır";
  if (v.type === "number") return v.value === null || v.value === "" ? "" : String(v.value);
  if (v.type === "text") return (v.value || "").trim();
  if (v.type === "select") return (v.value || "").trim();
  if (v.type === "multiSelect") return Array.isArray(v.value) ? v.value.join(", ") : "";
  return "";
}

export default function Step5OzetBasvuruPage() {
  const router = useRouter();
  const { state } = useWizard();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [cats, setCats] = React.useState<CategoryDoc[]>([]);
  const [features, setFeatures] = React.useState<FeatureDoc[]>([]);
  const [photos, setPhotos] = React.useState<PhotoView[]>([]);
  const [loadingPhotos, setLoadingPhotos] = React.useState(false);

  async function submitApplication() {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert("Lütfen giriş yap.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const uploadSessionId = typeof window !== "undefined" ? window.localStorage.getItem("molayeri_upload_session") : null;
      const payload = {
        uid,
        firstName: state.user.firstName,
        lastName: state.user.lastName,
        email: state.user.email,
        phone: state.user.phone,
        businessName: state.business.name,
        addressText: state.business.addressText,
        lat: state.business.lat ?? null,
        lng: state.business.lng ?? null,
        description: state.business.description,
        selectedCategoryIds: state.selectedCategoryIds || [],
        featureValues: state.featureValues || {},
        photos: (photos || []).map((p) => ({ url: p.url, isCover: !!p.isCover })).slice(0, 6),
        uploadSessionId,
      };

      await createPendingApplication(payload);
      setOpen(true);
    } catch (e) {
      console.error(e);
      alert("Başvuru kaydı başarısız.");
    } finally {
      setSubmitting(false);
    }
  }

  React.useEffect(() => {
    const u1 = subscribeCategories((r) => setCats(r));
    const u2 = subscribeFeatures((r) => setFeatures(r));
    return () => { u1(); u2(); };
  }, []);

  React.useEffect(() => {
    const sid = typeof window !== "undefined" ? window.localStorage.getItem("molayeri_upload_session") : null;
    if (!sid) return;

    let alive = true;
    setLoadingPhotos(true);

    (async () => {
      try {
        const folder = sRef(storage, `wizard/photos/${sid}`);
        const res = await listAll(folder);
        const urls = await Promise.all(res.items.map((it) => getDownloadURL(it)));
        if (!alive) return;
        const list = urls.slice(0, 6).map((u, i) => ({ url: u, isCover: i === 0 }));
        setPhotos(list);
      } catch {
        if (alive) setPhotos([]);
      } finally {
        if (alive) setLoadingPhotos(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  const rules = [
    "Bilgiler doğru ve güncel.",
    "Fotoğraflar işletmeye aittir.",
    "Onay sonrası işletmeci paneli açılır.",
  ];

  const selectedCats = React.useMemo(() => {
    const set = new Set(state.selectedCategoryIds || []);
    return cats.filter((c) => set.has(c.id));
  }, [cats, state.selectedCategoryIds]);

  const featureById = React.useMemo(() => {
    const m = new Map<string, FeatureDoc>();
    for (const f of features) m.set(f.id, f);
    return m;
  }, [features]);

  const filledFeatureIds = React.useMemo(() => {
    const fv = state.featureValues || {};
    const ids = Object.keys(fv);
    return ids.filter((id) => {
      const v = fv[id];
      const txt = valueTR(v);
      // bool her zaman göster; diğerleri boşsa gösterme
      if (v?.type === "bool") return true;
      return txt.length > 0;
    });
  }, [state.featureValues]);

  const cover = photos.find((x) => x.isCover) || photos[0];

  return (
    <div className="px-6 pb-6">
      <div className="text-2xl font-black">Özet & Başvuru</div>
      <div className="mt-2 text-sm text-white/60">Göndermeden önce kontrol et.</div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[22px] border border-white/10 bg-[#151A24] p-5">
          <div className="text-sm font-extrabold text-white">Üyelik</div>
          <div className="mt-3 space-y-2 text-sm text-white/70">
            <div><span className="text-white/45">İsim:</span> {state.user.firstName} {state.user.lastName}</div>
            <div><span className="text-white/45">Email:</span> {state.user.email}</div>
            <div><span className="text-white/45">Telefon:</span> {state.user.phone}</div>
            <div className="flex items-center gap-2">
              <span className="text-white/45">Email Doğrulama:</span>
              {state.user.emailVerified ? <Badge variant="active">OK</Badge> : <Badge>YOK</Badge>}
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-[#151A24] p-5">
          <div className="text-sm font-extrabold text-white">İşletme</div>
          <div className="mt-3 space-y-2 text-sm text-white/70">
            <div><span className="text-white/45">İsim:</span> {state.business.name || "-"}</div>
            <div><span className="text-white/45">Adres:</span> {state.business.addressText || "-"}</div>
            <div><span className="text-white/45">Tanıtım:</span> {state.business.description || "-"}</div>
          </div>
        </div>
      </div>

      {/* KATEGORİLER */}
      <div className="mt-4 rounded-[22px] border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold text-white">Seçilen Kategoriler</div>
          <div className="text-xs text-white/60">{selectedCats.length}</div>
        </div>

        {selectedCats.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#151A24] p-4 text-sm text-white/70">
            Kategori seçilmedi.
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedCats.map((c) => (
              <Badge key={c.id} variant="active">{c.nameTR}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* ÖZELLİKLER (sadece isim) */}
      <div className="mt-4 rounded-[22px] border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold text-white">Seçilen Özellikler</div>
          <div className="text-xs text-white/60">{filledFeatureIds.length}</div>
        </div>

        {filledFeatureIds.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#151A24] p-4 text-sm text-white/70">
            Özellik seçilmedi.
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {filledFeatureIds.map((id) => {
              const f = featureById.get(id);
              return (
                <Badge key={id} variant="active">
                  {f?.nameTR || "Özellik"}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* FOTO + KURALLAR AYNI BLOK */}
      <div className="mt-4 rounded-[22px] border border-white/10 bg-white/5 p-5">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Fotoğraflar */}
          <div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-white">Fotoğraflar</div>
              <div className="text-xs text-white/60">{loadingPhotos ? "Yükleniyor…" : `${photos.length}/6`}</div>
            </div>

            {cover ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#151A24]">
                <div className="relative">
                  <img src={cover.url} alt="" className="h-44 w-full object-cover" />
                  <div className="absolute left-3 top-3">
                    <Badge variant="active">VİTRİN</Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#151A24] p-4 text-sm text-white/70">
                Fotoğraf yok.
              </div>
            )}

            {photos.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {photos.slice(0, 6).map((p, i) => (
                  <div key={i} className="overflow-hidden rounded-xl border border-white/10 bg-[#151A24]">
                    <img src={p.url} alt="" className="h-14 w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Kurallar */}
          <div className="rounded-2xl border border-white/10 bg-[#151A24] p-4">
            <div className="text-sm font-extrabold text-white">Kurallar</div>
            <div className="mt-3 space-y-2 text-sm text-white/70">
              {rules.map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-[#D9A400]/20 text-[#D9A400] flex items-center justify-center text-xs font-black">
                    ✓
                  </div>
                  <div>{t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="secondary" onClick={() => router.back()}>Geri</Button>
        <Button variant="primary" className="px-8 py-4 rounded-[22px]" onClick={submitApplication}>
          Başvuruyu Yap
        </Button>
      </div>

      <Modal
        open={open}
        title="Başvurun Kaydedildi"
        onClose={() => setOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="primary" disabled={submitting} onClick={() => { setOpen(false); router.push("/login"); }}>
              Tamam
            </Button>
          </div>
        }
      >
        <div className="text-sm text-white/70">
          Başvurunuz kaydedildi. Onay e-postası sonrası giriş yapabilirsiniz.
        </div>
      </Modal>
    </div>
  );
}
