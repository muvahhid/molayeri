"use client";

import * as React from "react";
import { db } from "@/lib/firebase.client";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

function cls(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function readSession() {
  try {
    const raw = window.localStorage.getItem("molayeri_session_v1");
    if (!raw) return { uid: "", name: "" };
    const s = JSON.parse(raw) as any;
    const uid = String(s?.uid || "").trim();
    const name = String(s?.name || s?.fullName || s?.email || "").trim();
    return { uid, name };
  } catch {
    return { uid: "", name: "" };
  }
}

const COLORS = [
  { key: "yellow", name: "Sarı", bg: "bg-[#FFF3C9]", border: "border-[#F2D27A]", text: "text-[#6A4D00]" },
  { key: "blue", name: "Mavi", bg: "bg-[#E8F0FF]", border: "border-[#BBD1FF]", text: "text-[#193A8A]" },
  { key: "green", name: "Yeşil", bg: "bg-[#E9FFF2]", border: "border-[#B7F0CC]", text: "text-[#0B5B2A]" },
  { key: "red", name: "Kırmızı", bg: "bg-[#FFE8EA]", border: "border-[#FFB8C0]", text: "text-[#7A0D1B]" },
  { key: "purple", name: "Mor", bg: "bg-[#F2ECFF]", border: "border-[#D3C4FF]", text: "text-[#3E1E8A]" },
  { key: "orange", name: "Turuncu", bg: "bg-[#FFEDE2]", border: "border-[#FFC7A6]", text: "text-[#7A2A00]" },
  { key: "teal", name: "Turkuaz", bg: "bg-[#E6FFFD]", border: "border-[#AEEBE6]", text: "text-[#0A4A46]" },
  { key: "gray", name: "Gri", bg: "bg-[#F1F3F5]", border: "border-[#D8DEE4]", text: "text-[#22303C]" },
  { key: "pink", name: "Pembe", bg: "bg-[#FFE8F3]", border: "border-[#FFB8DD]", text: "text-[#7A0D46]" },
  { key: "lime", name: "Lime", bg: "bg-[#F3FFD8]", border: "border-[#D7F29A]", text: "text-[#3C5B00]" },
] as const;

function ProgressRing({ value, max }: { value: number; max: number }) {
  const v = Math.max(0, Math.min(value, max));
  const pct = max === 0 ? 0 : v / max;
  const r = 16;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const gap = c - dash;

  return (
    <div className="flex items-center gap-2">
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="#D9A400"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform="rotate(-90 20 20)"
        />
      </svg>
      <div className="text-xs font-extrabold text-white/70">
        {v}/{max}
      </div>
    </div>
  );
}

type Cat = { id: string; nameTR?: string; slug?: string; order?: number; isActive?: boolean };
type Biz = {
  id: string; // application id
  business?: { name?: string };
  categoryIds?: string[];
  categorySlugs?: string[];
  categories?: string[];
};

type Camp = {
  id: string;
  user: { uid: string };
  businessId: string;
  categoryId?: string;
  categorySlug?: string;
  text: string;
  value?: number | null;
  unit?: string | null;
  colorKey: string;
  isActive: boolean;
  createdAt?: any;
};

const DEFAULT_TEMPLATES: Record<string, string[]> = {
  benzinlik: [
    "Yakıt %3 indirim",
    "Yakıt %5 indirim",
    "Otogaz %5 indirim",
    "2 al 1 öde (oto yıkama)",
    "Kahve ücretsiz",
    "Çay ücretsiz",
    "Lastik hava ücretsiz",
    "Cam suyu ücretsiz",
    "Market %10 indirim",
    "Gece indirimi %3",
  ],
  yemek: [
    "2 al 1 öde",
    "Menü %10 indirim",
    "Çorba ücretsiz",
    "Çay ücretsiz",
    "Kahve %20 indirim",
    "Tatlı ücretsiz",
    "Aile menüsü %10",
    "Öğrenci indirimi %10",
    "Paket servis %10",
    "İkinci ürün %50",
  ],
  otel: [
    "1 gece %10 indirim",
    "2 gece %15 indirim",
    "Kahvaltı ücretsiz",
    "Erken rezervasyon %10",
    "Geç çıkış ücretsiz",
    "Çocuk ücretsiz",
    "Oda yükseltme ücretsiz",
    "Hafta içi %10",
    "Hafta sonu %5",
    "SPA %20 indirim",
  ],
  eczane: [
    "%5 indirim",
    "%10 indirim",
    "Vitamin %15 indirim",
    "Cilt bakım %15 indirim",
    "Bebek ürün %10",
    "Öğrenci %5",
    "Kampanya paketi %10",
    "İkinci ürün %30",
    "Ölçüm ücretsiz",
    "Maske %20 indirim",
  ],
  avm: [
    "%10 indirim",
    "2 al 1 öde",
    "Kahve %20 indirim",
    "Park ücretsiz",
    "Sinema %10 indirim",
    "Çocuk etkinliği ücretsiz",
    "Fastfood %10",
    "Giyim %15",
    "Elektronik %5",
    "Hafta sonu kampanya",
  ],
  diger: [
    "%10 indirim",
    "2 al 1 öde",
    "İkinci ürün %50",
    "Ücretsiz ikram",
    "İlk alışveriş %10",
    "Sadakat indirimi %5",
    "Hafta içi %10",
    "Hafta sonu %5",
    "Öğrenci %10",
    "Aile indirimi %10",
  ],
};

export default function KampanyalarimPage() {
  const [{ uid }, setSess] = React.useState({ uid: "" });

  const [categories, setCategories] = React.useState<Cat[]>([]);
  const [businesses, setBusinesses] = React.useState<Biz[]>([]);

  const [selectedBusinessId, setSelectedBusinessId] = React.useState("");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState("");

  const [tplQuery, setTplQuery] = React.useState("");
  const [text, setText] = React.useState("");
  const [valueStr, setValueStr] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [colorKey, setColorKey] = React.useState<(typeof COLORS)[number]["key"]>("yellow");

  const [rows, setRows] = React.useState<Camp[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setSess(readSession()), []);

  // categories
  React.useEffect(() => {
    const qy = query(collection(db, "categories"), orderBy("order", "asc"));
    return onSnapshot(qy, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];
      setCategories(list.filter((x) => x));
    });
  }, []);

  // businesses = approved applications for user
  React.useEffect(() => {
    if (!uid) return;
    const qy = query(collection(db, "applications"), where("status", "==", "approved"), where("user.uid", "==", uid));
    return onSnapshot(qy, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];
      const cleaned = list.map((a) => ({
        id: a.id,
        business: a.business || {},
        categoryIds: Array.isArray(a.categoryIds) ? a.categoryIds : Array.isArray(a.business?.categoryIds) ? a.business.categoryIds : [],
        categorySlugs: Array.isArray(a.categorySlugs) ? a.categorySlugs : Array.isArray(a.business?.categorySlugs) ? a.business.categorySlugs : [],
        categories: Array.isArray(a.categories) ? a.categories : Array.isArray(a.business?.categories) ? a.business.categories : [],
      })) as Biz[];

      setBusinesses(cleaned);

      // default select first business
      if (!selectedBusinessId && cleaned[0]?.id) setSelectedBusinessId(cleaned[0].id);
    });
  }, [uid, selectedBusinessId]);

  const selectedBusiness = React.useMemo(
    () => (businesses || []).find((b) => b.id === selectedBusinessId) || null,
    [businesses, selectedBusinessId]
  );

  // only business categories
  const visibleCategories = React.useMemo(() => {
    const ids = (selectedBusiness?.categoryIds || []).map(String);
    const slugs = [
      ...(selectedBusiness?.categorySlugs || []).map(String),
      ...(selectedBusiness?.categories || []).map(String),
    ];

    if (!ids.length && !slugs.length) return categories || [];

    return (categories || []).filter((c) => {
      const idOk = ids.includes(String(c.id));
      const slugOk = slugs.includes(String(c.slug || ""));
      return idOk || slugOk;
    });
  }, [categories, selectedBusiness]);

  // default select first visible category
  React.useEffect(() => {
    if (!selectedBusinessId) return;
    if (selectedCategoryId) return;
    const first = (visibleCategories || [])[0];
    if (first?.id) setSelectedCategoryId(String(first.id));
  }, [selectedBusinessId, selectedCategoryId, visibleCategories.length]);

  const selectedCategory = React.useMemo(
    () => (categories || []).find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );
  const selectedCategorySlug = (selectedCategory?.slug || "").toString();

  // campaigns for selected business
  React.useEffect(() => {
    if (!uid || !selectedBusinessId) return;
    const qy = query(
      collection(db, "campaigns"),
      where("user.uid", "==", uid),
      where("businessId", "==", selectedBusinessId),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(
      qy,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];
        setRows(list);
      },
      (e) => {
        console.error(e);
        setRows([]);
      }
    );
  }, [uid, selectedBusinessId]);

  const myCampaigns = React.useMemo(() => rows || [], [rows]);
  const activeCount = React.useMemo(() => myCampaigns.filter((x) => x.isActive).length, [myCampaigns]);

  const templates = React.useMemo(() => {
    const arr = DEFAULT_TEMPLATES[selectedCategorySlug] || DEFAULT_TEMPLATES["diger"] || [];
    const q = (tplQuery || "").trim().toLowerCase();
    if (!q) return arr;
    return arr.filter((t) => t.toLowerCase().includes(q));
  }, [tplQuery, selectedCategorySlug]);

  async function addCampaign() {
    if (!uid || !selectedBusinessId || !selectedCategoryId) return;
    const t = (text || "").trim();
    if (!t) return alert("Kampanya metni yaz.");

    if (myCampaigns.length >= 100) return alert("Kampanya sınırı doldu (100).");

    const num = (valueStr || "").trim() ? Number(valueStr) : null;
    const unitOut = (unit || "").trim() || null;

    setSaving(true);
    try {
      await addDoc(collection(db, "campaigns"), {
        user: { uid },
        businessId: selectedBusinessId,
        categoryId: selectedCategoryId,
        categorySlug: selectedCategorySlug || null,
        text: t,
        value: Number.isFinite(num as any) ? num : null,
        unit: unitOut,
        colorKey,
        isActive: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setText("");
      setValueStr("");
      setUnit("");
    } catch (e) {
      console.error(e);
      alert("Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: Camp, next: boolean) {
    if (saving) return;
    if (next && activeCount >= 3) return alert("En fazla 3 kampanya aktif edebilirsin.");
    setSaving(true);
    try {
      await updateDoc(doc(db, "campaigns", row.id), { isActive: next, updatedAt: serverTimestamp() });
    } catch (e) {
      console.error(e);
      alert("İşlem başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(row: Camp) {
    if (saving) return;
    if (!confirm("Silinsin mi?")) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "campaigns", row.id));
    } catch (e) {
      console.error(e);
      alert("Silme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  const previewColor = COLORS.find((c) => c.key === colorKey) || COLORS[0];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-black">Kampanyalarım</div>
          <div className="mt-1 text-sm text-white/60">Şablondan seç veya kendin yaz. App’de sadece seçtiklerin görünür.</div>
        </div>
        <ProgressRing value={myCampaigns.length} max={100} />
      </div>

      <div className="rounded-[26px] bg-white p-6 text-[#0B1220] shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          {/* LEFT */}
          <div className="space-y-5">
            <div className="rounded-[18px] border border-black/10 bg-[#F7F8FA] p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <div>
                  <div className="text-xs font-extrabold tracking-widest text-black/55">İŞLETME</div>
                  <select
                    className="mt-2 w-full h-12 rounded-2xl border border-black/10 bg-white px-5 text-[15px] font-extrabold outline-none shadow-sm focus:ring-2 focus:ring-black/10"
                    value={selectedBusinessId}
                    onChange={(e) => {
                      setSelectedBusinessId(e.target.value);
                      setSelectedCategoryId("");
                      setTplQuery("");
                      setText("");
                      setValueStr("");
                      setUnit("");
                    }}
                  >
                    {!businesses.length ? <option value="">İşletme yok</option> : null}
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {(b.business?.name || "İşletme").toString().slice(0, 42)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs font-extrabold tracking-widest text-black/55">KATEGORİ</div>
                  <select
                    className="mt-2 w-full h-12 rounded-2xl border border-black/10 bg-white px-5 text-[15px] font-extrabold outline-none shadow-sm focus:ring-2 focus:ring-black/10"
                    value={selectedCategoryId}
                    onChange={(e) => {
                      setSelectedCategoryId(e.target.value);
                      setTplQuery("");
                      setText("");
                      setValueStr("");
                      setUnit("");
                    }}
                  >
                    {!visibleCategories.length ? <option value="">Kategori yok</option> : null}
                    {visibleCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameTR || c.slug || "Kategori"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <input
                  value={tplQuery}
                  onChange={(e) => setTplQuery(e.target.value)}
                  placeholder="Şablon ara…"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none"
                />
              </div>
            </div>

            <div className="rounded-[18px] border border-black/10 bg-white p-5">
              <div className="text-xs font-extrabold tracking-widest text-black/55">ŞABLONLAR</div>
              <div className="mt-3 max-h-[240px] overflow-auto rounded-2xl border border-black/10 bg-[#FBFBFC] p-2">
                {!selectedCategoryId ? (
                  <div className="p-4 text-sm text-black/55">Önce kategori seç.</div>
                ) : templates.length ? (
                  templates.map((t) => (
                    <button
                      key={t}
                      className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold hover:bg-black/5"
                      onClick={() => setText(t)}
                      type="button"
                    >
                      {t}
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-sm text-black/55">Sonuç yok.</div>
                )}
              </div>
            </div>

            <div className="rounded-[18px] border border-black/10 bg-white p-5">
              <div className="text-xs font-extrabold tracking-widest text-black/55">YENİ KAMPANYA</div>

              <div className="mt-3 rounded-2xl border border-black/10 bg-[#F7F8FA] p-4">
                <div className="text-xs font-extrabold tracking-widest text-black/55">KAMPANYA METNİ</div>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Örn: Yakıt %5 indirim, 2 al 1 öde, Çorba ücretsiz…"
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-base font-semibold outline-none"
                  maxLength={42}
                />
                <div className="mt-2 text-xs text-black/45">Kısa ve net tut (app etiketi). Maks 42 karakter.</div>
              </div>

              <div className="mt-4 rounded-2xl border border-black/10 bg-[#F7F8FA] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-extrabold tracking-widest text-black/55">DEĞER (OPSİYONEL)</div>
                  <div className="text-xs text-black/45">Boş bırakabilirsin.</div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-[220px_180px]">
                  <input
                    inputMode="numeric"
                    value={valueStr}
                    onChange={(e) => setValueStr(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="Değer"
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none"
                  />

                  <select
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="%">%</option>
                    <option value="TL">TL</option>
                    <option value="TL/L">TL/L</option>
                    <option value="adet">adet</option>
                  </select>
                </div>

                <div className="mt-2 text-xs text-black/45">Örn: “5” + “%” veya “2” + “TL/L”.</div>
              </div>

              <div className="mt-4 rounded-2xl border border-black/10 bg-[#F7F8FA] p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold tracking-widest text-black/55">RENK</div>
                  <div className={cls("rounded-full border px-3 py-1 text-xs font-extrabold", previewColor.bg, previewColor.border, previewColor.text)}>
                    {COLORS.find((c) => c.key === colorKey)?.name || "Renk"}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setColorKey(c.key)}
                      className={cls(
                        "h-9 rounded-full border px-4 text-xs font-extrabold",
                        c.bg,
                        c.border,
                        c.text,
                        colorKey === c.key ? "ring-2 ring-black/15" : "opacity-90 hover:opacity-100"
                      )}
                      title={c.name}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-xs text-black/55">
                  Aktif seçtiklerin app’de görünür. (Maks 3)
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={addCampaign}
                  className="rounded-2xl bg-[#D9A400] px-6 py-3 text-sm font-extrabold text-black shadow-sm hover:brightness-105 disabled:opacity-60"
                >
                  {saving ? "..." : "Kaydet"}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="w-full rounded-[18px] border border-black/10 bg-[#F7F8FA] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-black">Kayıtlı Kampanyalar</div>
                <div className="mt-1 text-xs text-black/55">
                  İşletmene uygulanır. En fazla 3 tanesini aktif edebilirsin.
                </div>
              </div>
              <div className="text-xs font-extrabold text-black/60">{activeCount}/3 aktif</div>
            </div>

            <div className="mt-4 max-h-[520px] overflow-auto rounded-2xl border border-black/10 bg-white p-3">
              {!myCampaigns.length ? (
                <div className="p-4 text-sm text-black/60">Henüz kampanya yok.</div>
              ) : (
                myCampaigns.map((r) => {
                  const col = COLORS.find((c) => c.key === (r.colorKey as any)) || COLORS[0];
                  return (
                    <div key={r.id} className="mb-3 rounded-2xl border border-black/10 bg-[#FBFBFC] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={cls("rounded-full border px-3 py-1 text-xs font-extrabold", col.bg, col.border, col.text)}>
                              {col.name}
                            </div>
                            {r.isActive ? (
                              <div className="rounded-full bg-[#E9FFF2] px-3 py-1 text-xs font-extrabold text-[#0B5B2A] border border-[#B7F0CC]">
                                AKTİF
                              </div>
                            ) : (
                              <div className="rounded-full bg-[#F1F3F5] px-3 py-1 text-xs font-extrabold text-black/55 border border-black/10">
                                PASİF
                              </div>
                            )}
                          </div>

                          <div className="mt-2 text-sm font-extrabold text-black/85 break-words">
                            {r.text}
                          </div>

                          {r.value != null && r.unit ? (
                            <div className="mt-1 text-xs text-black/60">
                              Değer: <span className="font-extrabold">{String(r.value)}</span> {r.unit}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            className={cls(
                              "rounded-xl px-3 py-2 text-xs font-extrabold border",
                              r.isActive ? "bg-[#151A24] text-white border-black/10" : "bg-white text-black border-black/10"
                            )}
                            onClick={() => toggleActive(r, !r.isActive)}
                            disabled={saving}
                            title="Aktif/Pasif"
                          >
                            {r.isActive ? "Pasif Yap" : "Aktif Et"}
                          </button>

                          <button
                            type="button"
                            className="rounded-xl px-3 py-2 text-xs font-extrabold border border-black/10 bg-white text-black/70 hover:text-black"
                            onClick={() => removeRow(r)}
                            disabled={saving}
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4 text-xs text-black/55">
              Not: App’de sadece <b>aktif</b> kampanyalar gösterilir (maks 3).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
