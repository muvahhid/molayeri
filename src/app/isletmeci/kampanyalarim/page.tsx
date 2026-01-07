"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { db } from "@/lib/firebase.client";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  limit,
} from "firebase/firestore";

/**
 * Kampanya modeli (Firestore: campaigns)
 * - uid: kullanıcı uid
 * - businessAppId: applications doc id (işletme kaydı)
 * - categoryId?: string (varsa)
 * - categorySlug?: string (varsa)
 * - text: string (etiket metni, app'de gösterilecek)
 * - value?: number | null  (opsiyonel)
 * - unit?: string | null   (opsiyonel)
 * - color: one of COLORS key
 * - isActive: boolean (app’de max 2)
 * - createdAt/updatedAt
 */

type SessionShape = { uid?: string; email?: string; name?: string };

type AppRow = {
  id: string;
  status: "pending" | "approved" | "passive";
  user?: { uid?: string; email?: string; name?: string };
  business?: { name?: string };
  categoryIds?: string[];
  categorySlugs?: string[];
  categories?: string[]; // legacy
};

type CategoryRow = { id: string; nameTR?: string; slug?: string; order?: number; isActive?: boolean };

type CampaignRow = {
  id: string;
  uid: string;
  businessAppId: string;
  categoryId?: string;
  categorySlug?: string;
  text: string;
  value?: number | null;
  unit?: string | null;
  color: ColorKey;
  isActive: boolean;
};

type ColorKey = "sari" | "mavi" | "yesil" | "kirmizi" | "mor" | "pembe" | "turkuaz" | "turuncu" | "gri" | "beyaz";

const COLORS: { key: ColorKey; label: string; bg: string; border: string; text: string }[] = [
  { key: "sari", label: "Sarı", bg: "bg-[#F5D27A]", border: "border-[#E0B84A]", text: "text-[#111]" },
  { key: "mavi", label: "Mavi", bg: "bg-[#BFD7FF]", border: "border-[#86B2FF]", text: "text-[#0B1220]" },
  { key: "yesil", label: "Yeşil", bg: "bg-[#CDEFD0]", border: "border-[#87D58D]", text: "text-[#0B1220]" },
  { key: "kirmizi", label: "Kırmızı", bg: "bg-[#F6C0C0]", border: "border-[#E98E8E]", text: "text-[#1B0B0B]" },
  { key: "mor", label: "Mor", bg: "bg-[#D8CCFF]", border: "border-[#B6A3FF]", text: "text-[#120B20]" },
  { key: "pembe", label: "Pembe", bg: "bg-[#F7CBE6]", border: "border-[#EFA3D3]", text: "text-[#200B17]" },
  { key: "turkuaz", label: "Turkuaz", bg: "bg-[#C7F1F0]", border: "border-[#86D9D6]", text: "text-[#0B1A1A]" },
  { key: "turuncu", label: "Turuncu", bg: "bg-[#F6D2B7]", border: "border-[#E9B186]", text: "text-[#20140B]" },
  { key: "gri", label: "Gri", bg: "bg-[#E2E6EE]", border: "border-[#C9D0DD]", text: "text-[#0B1220]" },
  { key: "beyaz", label: "Beyaz", bg: "bg-white", border: "border-[#E5E7EB]", text: "text-[#0B1220]" },
];

function readSession(): SessionShape {
  try {
    const raw = window.localStorage.getItem("molayeri_session_v1");
    if (!raw) return {};
    const s = JSON.parse(raw);
    return {
      uid: s?.uid ? String(s.uid) : undefined,
      email: s?.email ? String(s.email) : undefined,
      name: s?.name ? String(s.name) : undefined,
    };
  } catch {
    return {};
  }
}

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function ProgressRing({ value, max }: { value: number; max: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const dash = c * pct;
  const gap = c - dash;

  return (
    <div className="flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 26 26" className="shrink-0">
        <circle cx="13" cy="13" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
        <circle
          cx="13"
          cy="13"
          r={r}
          fill="none"
          stroke="#D9A400"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform="rotate(-90 13 13)"
        />
      </svg>
      <div className="text-xs text-white/60">
        {value}/{max}
      </div>
    </div>
  );
}

/** Şablonlar: net, kısa, ölçülü. (app etiketi için 28-32 char hedef) */
function getTemplates(categorySlug: string) {
  const c = (categorySlug || "").toLowerCase();

  const T: Record<string, string[]> = {
    yakit: [
      "Yakıt %3 indirim",
      "Yakıt %5 indirim",
      "Yakıt %7 indirim",
      "Benzin 1 TL/L indirim",
      "Motorin 1 TL/L indirim",
      "LPG 0.5 TL/L indirim",
      "Benzin 2 TL/L indirim",
      "Motorin 2 TL/L indirim",
      "LPG 1 TL/L indirim",
      "Market 200 TL üzeri %5",
      "Market 300 TL üzeri %7",
      "Kahve + yakıtta %5",
      "Oto yıkama %20",
      "Lastik hava ücretsiz",
      "Cam suyu ücretsiz",
      "Tuvalet ücretsiz",
      "7/24 açık",
      "Fiş ile %5 market",
      "İkinci ürüne %50 (market)",
      "Puan: 1 TL = 1 puan",
    ],
    yemek: [
      "2 al 1 öde (menü)",
      "%10 indirim (menü)",
      "%15 indirim (menü)",
      "Çorba ücretsiz (menü)",
      "İçecek ücretsiz (menü)",
      "Tatlı %50 indirim",
      "Kahvaltı %10 indirim",
      "Aile menüsü %15 indirim",
      "Çocuk menüsü %20 indirim",
      "2. çay ücretsiz",
      "Sınırsız çay (kişi başı)",
      "Ücretsiz su",
      "Ücretsiz ekmek",
      "Paket servis %10",
      "Online sipariş %10",
      "Öğle menüsü %10",
      "Akşam menüsü %10",
      "3 kişiye 4. %50",
      "4 kişiye tatlı hediye",
      "Kampanya: 19:00 sonrası %10",
    ],
    sarj: [
      "Şarj %10 indirim",
      "Şarj %15 indirim",
      "İlk 10 dk ücretsiz",
      "İlk 15 dk ücretsiz",
      "Gece tarifesi %20",
      "Kahve hediye (şarj)",
      "Market %10 (şarj fişi)",
      "2. şarj %10",
      "Aylık paket %10",
      "Üyeye %15",
      "Hızlı şarj %10",
      "AC şarj %10",
      "DC şarj %10",
      "Bekleme ücreti yok",
      "Rezervasyon ücretsiz",
      "Fiş ile %5 indirim",
      "İlk kullanım %20",
      "Hafta içi %10",
      "Hafta sonu %10",
      "Sadakat: 5. şarj %50",
    ],
    market: [
      "%10 indirim",
      "%15 indirim",
      "2 al 1 öde",
      "3 al 2 öde",
      "2. ürüne %50",
      "200 TL üzeri %5",
      "300 TL üzeri %7",
      "500 TL üzeri %10",
      "Kahve %20",
      "Sandviç %20",
      "Su 10'lu %10",
      "Atıştırmalık %15",
      "Çikolata %15",
      "Deterjan %10",
      "Bebek ürünleri %10",
      "Meyve-sebze %10",
      "Saat 21 sonrası %10",
      "Hafta içi %10",
      "Hafta sonu %10",
      "Sadakat: 10. alışveriş %20",
    ],
    otel: [
      "Konaklama %10 indirim",
      "Konaklama %15 indirim",
      "2 geceye 3. %50",
      "3 geceye 4. %50",
      "Ücretsiz kahvaltı",
      "Ücretsiz otopark",
      "Geç çıkış ücretsiz",
      "Erken giriş ücretsiz",
      "Çocuk ücretsiz",
      "Aile indirimi %10",
      "Hafta içi %15",
      "Hafta sonu %10",
      "Sezon dışı %20",
      "1 gece + yemek %10",
      "SPA %20 indirim",
      "Havuz ücretsiz",
      "Mini bar %10",
      "Oda yükseltme %20",
      "Ücretsiz iptal",
      "Sadakat: 5. konaklama %30",
    ],
    "servis-asist": [
      "İşçilik %10 indirim",
      "İşçilik %15 indirim",
      "Yağ değişimi %10",
      "Lastik değişimi %10",
      "Rot-balans %10",
      "Arıza tespit ücretsiz",
      "Kontrol ücretsiz",
      "Akü %10 indirim",
      "Silecek %20 indirim",
      "Cam suyu ücretsiz",
      "Oto yıkama %20",
      "Kupon: 2. işlem %10",
      "Hızlı servis %10",
      "Randevu önceliği",
      "Yol yardım %10",
      "Çekici %10",
      "Kış bakımı %10",
      "Yaz bakımı %10",
      "Filtre seti %10",
      "Sadakat: 5. servis %20",
    ],
    kafe: [
      "2 al 1 öde (kahve)",
      "%10 indirim",
      "%15 indirim",
      "2. kahve %50",
      "Tatlı %20",
      "Kurabiye hediye",
      "Çay 2. ücretsiz",
      "Filtre kahve %20",
      "Latte %10",
      "Soğuk kahve %10",
      "Sandviç %20",
      "Pasta %20",
      "Saat 18 sonrası %10",
      "Öğrenci %10",
      "Aile %10",
      "Take-away %10",
      "Online sipariş %10",
      "Sadakat: 5. kahve ücretsiz",
      "Sadakat: 10. kahve %50",
      "Kampanya: 3 ürün %15",
    ],
    alisveris: [
      "%10 indirim",
      "%15 indirim",
      "2 al 1 öde",
      "3 al 2 öde",
      "2. ürüne %50",
      "500 TL üzeri %5",
      "1000 TL üzeri %10",
      "1500 TL üzeri %15",
      "Ücretsiz kargo",
      "Kargo %50",
      "Kupon 50 TL",
      "Kupon 100 TL",
      "Aile indirimi %10",
      "Öğrenci %10",
      "Hafta içi %10",
      "Hafta sonu %10",
      "Seçili ürün %20",
      "Outlet %30",
      "Sadakat: 5. alışveriş %10",
      "Sadakat: 10. alışveriş %20",
    ],
  };

  return T[c] || [];
}

function normalizeText(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}

export default function KampanyalarimPage() {
  const [uid, setUid] = React.useState<string>("");

  const [businesses, setBusinesses] = React.useState<AppRow[]>([]);
  const [categories, setCategories] = React.useState<CategoryRow[]>([]);
  const [campaigns, setCampaigns] = React.useState<CampaignRow[]>([]);

  const [selectedBusinessId, setSelectedBusinessId] = React.useState<string>("");
  const [selectedCategoryKey, setSelectedCategoryKey] = React.useState<string>(""); // id or slug

  const selectedBusiness = React.useMemo(
    () => businesses.find((b) => b.id === selectedBusinessId) || null,
    [businesses, selectedBusinessId]
  );

  // işletmeye göre izinli kategori filtre
  const visibleCategories = React.useMemo(() => {
    const all = categories || [];
    const ids = Array.isArray(selectedBusiness?.categoryIds) ? selectedBusiness?.categoryIds || [] : [];
    const slugs =
      Array.isArray(selectedBusiness?.categorySlugs) ? selectedBusiness?.categorySlugs || [] :
      Array.isArray(selectedBusiness?.categories) ? selectedBusiness?.categories || [] : [];

    if (!ids.length && !slugs.length) return all;

    const slugSet = new Set(slugs.map((x) => String(x).toLowerCase()));
    const idSet = new Set(ids.map((x) => String(x)));

    return all.filter((c) => {
      const idOk = c?.id && idSet.has(String(c.id));
      const slugOk = c?.slug && slugSet.has(String(c.slug).toLowerCase());
      return idOk || slugOk;
    });
  }, [categories, selectedBusiness]);

  // kampanya filtre (seçili işletme)
  const myCampaigns = React.useMemo(() => {
    return (campaigns || []).filter((x) => x.businessAppId === selectedBusinessId);
  }, [campaigns, selectedBusinessId]);

  const activeCount = React.useMemo(() => myCampaigns.filter((x) => !!x.isActive).length, [myCampaigns]);

  // UI: şablon arama + yeni kampanya form
  const [tplQuery, setTplQuery] = React.useState("");
  const [text, setText] = React.useState("");
  const [valueStr, setValueStr] = React.useState(""); // boş başlar
  const [unit, setUnit] = React.useState<string>(""); // opsiyonel
  const [color, setColor] = React.useState<ColorKey>("sari");
  const [saving, setSaving] = React.useState(false);

  // session
  React.useEffect(() => {
    const s = readSession();
    setUid(s.uid || "");
  }, []);

  // businesses (approved)
  React.useEffect(() => {
    if (!uid) return;

    const qy = query(
      collection(db, "applications"),
      where("status", "==", "approved"),
      where("user.uid", "==", uid),
      orderBy("updatedAt", "desc"),
      limit(25)
    );

    return onSnapshot(qy, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AppRow[];
      setBusinesses(rows);

      // ilk gelişte default seç
      if (!selectedBusinessId && rows.length) {
        setSelectedBusinessId(rows[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // categories
  React.useEffect(() => {
    const qy = query(collection(db, "categories"), orderBy("order", "asc"), orderBy("nameTR", "asc"));
    return onSnapshot(qy, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as CategoryRow[];
      setCategories(rows);
    });
  }, []);

  // campaigns (user)
  React.useEffect(() => {
    if (!uid) return;
    const qy = query(collection(db, "campaigns"), where("uid", "==", uid), orderBy("createdAt", "desc"), limit(200));
    return onSnapshot(qy, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as CampaignRow[];
      setCampaigns(rows);
    });
  }, [uid]);

  // visibleCategories oluşunca: default category seç
  React.useEffect(() => {
    if (!selectedBusinessId) return;
    if (selectedCategoryKey) return;
    if (!visibleCategories.length) return;

    // ilk kategori id seç
    const first = visibleCategories[0];
    if (first?.id) setSelectedCategoryKey(first.id);
  }, [selectedBusinessId, selectedCategoryKey, visibleCategories]);

  // seçili kategori row
  const selectedCategory = React.useMemo(() => {
    if (!selectedCategoryKey) return null;
    return visibleCategories.find((c) => c.id === selectedCategoryKey || c.slug === selectedCategoryKey) || null;
  }, [visibleCategories, selectedCategoryKey]);

  const selectedCategorySlug = (selectedCategory?.slug || "").toLowerCase();

  // templates
  const templates = React.useMemo(() => {
    const list = getTemplates(selectedCategorySlug);
    const q = tplQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((x) => x.toLowerCase().includes(q));
  }, [selectedCategorySlug, tplQuery]);

  function applyTemplate(t: string) {
    setText(t);
    setValueStr(""); // template sadece metin; kullanıcı isterse değer ekler
    setUnit("");
  }

  async function saveCampaign() {
    if (!uid || !selectedBusinessId) return;
    if (saving) return;

    const t = normalizeText(text);
    if (!t) {
      alert("Kampanya metni yaz.");
      return;
    }

    // limit 100 (işletme başına)
    if (myCampaigns.length >= 100) {
      alert("Maksimum 100 kampanya.");
      return;
    }

    // value/unit opsiyonel
    const hasValue = valueStr.trim() !== "";
    const parsed = hasValue ? Number(valueStr) : null;
    if (hasValue && (Number.isNaN(parsed) || !Number.isFinite(parsed))) {
      alert("Değer geçersiz.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "campaigns"), {
        uid,
        businessAppId: selectedBusinessId,
        categoryId: selectedCategory?.id || "",
        categorySlug: selectedCategory?.slug || "",
        text: t,
        value: hasValue ? parsed : null,
        unit: unit ? unit : null,
        color,
        isActive: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setText("");
      setValueStr("");
      setUnit("");
      setColor("sari");
    } catch (e) {
      console.error(e);
      alert("Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: CampaignRow, next: boolean) {
    // max 2 active
    if (next && activeCount >= 2 && !row.isActive) {
      alert("App’de en fazla 2 kampanya aktif olabilir.");
      return;
    }

    try {
      await updateDoc(doc(db, "campaigns", row.id), {
        isActive: next,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert("Güncelleme başarısız.");
    }
  }

  async function remove(row: CampaignRow) {
    if (!confirm("Kampanya silinsin mi?")) return;
    try {
      await deleteDoc(doc(db, "campaigns", row.id));
    } catch (e) {
      console.error(e);
      alert("Silme başarısız.");
    }
  }

  const previewColor = COLORS.find((c) => c.key === color) || COLORS[0];

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-black">Kampanyalarım</div>
          <div className="mt-1 text-sm text-white/60">Şablondan seç veya kendin yaz. App’de sadece seçtiklerin görünür.</div>
        </div>
        <ProgressRing value={myCampaigns.length} max={100} />
      </div>

      {/* white premium content area */}
      <div className="rounded-[26px] bg-white p-6 text-[#0B1220] shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* LEFT */}
          <div className="space-y-5">
            {/* selectors - geniş, ferah */}
            <div className="rounded-[18px] border border-black/10 bg-[#F7F8FA] p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <div>
                  <div className="text-xs font-extrabold tracking-widest text-black/55">İŞLETME</div>
                  <select
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none"
                    value={selectedBusinessId}
                    onChange={(e) => {
                      setSelectedBusinessId(e.target.value);
                      setSelectedCategoryKey(""); // işletme değişince kategori reset
                      setTplQuery("");
                      setText("");
                      setValueStr("");
                      setUnit("");
                    }}
                  >
                    {!businesses.length ? <option value="">İşletme yok</option> : null}
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {(b.business?.name || "İşletme").toString().slice(0, 32)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs font-extrabold tracking-widest text-black/55">KATEGORİ</div>
                  <select
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none"
                    value={selectedCategoryKey}
                    onChange={(e) => {
                      setSelectedCategoryKey(e.target.value);
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

            {/* templates list - scroll geri geldi */}
            <div className="rounded-[18px] border border-black/10 bg-white p-5">
              <div className="text-xs font-extrabold tracking-widest text-black/55">ŞABLONLAR</div>
              <div className="mt-3 max-h-[240px] overflow-auto rounded-2xl border border-black/10 bg-[#FBFBFC] p-2">
                {!selectedCategorySlug ? (
                  <div className="p-4 text-sm text-black/55">Önce kategori seç.</div>
                ) : templates.length ? (
                  <div className="space-y-1">
                    {templates.map((t) => (
                      <button
                        key={t}
                        onClick={() => applyTemplate(t)}
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-black/85 hover:bg-black/[0.04]"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-sm text-black/55">Şablon yok.</div>
                )}
              </div>
              <div className="mt-3 text-xs text-black/45">
                İpucu: Şablona tıkla, metin aşağıya dolsun. İstersen değer ekle.
              </div>
            </div>

            {/* new campaign - SIKIŞIK DEĞİL: metin bloğu + değer/birim bloğu + renk bloğu ayrı */}
            <div className="rounded-[18px] border border-black/10 bg-[#F7F8FA] p-5">
              <div className="text-base font-extrabold">Yeni Kampanya</div>

              {/* METİN */}
              <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
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

              {/* DEĞER & BİRİM (OPSİYONEL) */}
              <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-extrabold tracking-widest text-black/55">DEĞER (OPSİYONEL)</div>
                  <div className="text-xs text-black/45">Boş bırakabilirsin (sadece metin).</div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-[220px_180px]">
                  <input
                    inputMode="numeric"
                    value={valueStr}
                    onChange={(e) => setValueStr(e.target.value.replace(/[^d.]/g, ""))}
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

              {/* RENK */}
              <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold tracking-widest text-black/55">RENK</div>
                  <div
                    className={cls(
                      "rounded-full border px-3 py-1 text-xs font-extrabold",
                      previewColor.bg,
                      previewColor.border,
                      previewColor.text
                    )}
                    title="Önizleme"
                  >
                    ÖNİZLEME
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setColor(c.key)}
                      className={cls(
                        "rounded-full border px-4 py-2 text-sm font-extrabold",
                        c.bg,
                        c.border,
                        c.text,
                        color === c.key && "ring-2 ring-black/20"
                      )}
                      title={c.label}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ACTIONS */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-xs text-black/45">
                  Maks. 100 kampanya. App’de sadece <b>aktif</b> seçtiklerin görünür (en fazla 2).
                </div>
                <Button variant="primary" className="px-8 py-4 rounded-[22px]" onClick={saveCampaign} disabled={saving || !uid || !selectedBusinessId}>
                  {saving ? "..." : "Kaydet"}
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="rounded-[18px] border border-black/10 bg-[#F7F8FA] p-5">
            <div className="flex items-center justify-between">
              <div className="text-base font-extrabold">Kayıtlı Kampanyalar</div>
              <div className="text-xs text-black/45">
                {myCampaigns.length}/100
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-black/10 bg-white p-3">
              {!selectedBusinessId ? (
                <div className="p-4 text-sm text-black/55">Önce işletme seç.</div>
              ) : !myCampaigns.length ? (
                <div className="p-4 text-sm text-black/55">Kampanya yok.</div>
              ) : (
                <div className="space-y-2">
                  {myCampaigns.map((r) => {
                    const cc = COLORS.find((x) => x.key === r.color) || COLORS[0];
                    return (
                      <div key={r.id} className="rounded-2xl border border-black/10 bg-[#FBFBFC] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-black/85 truncate">{r.text}</div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className={cls("rounded-full border px-2 py-1 text-[11px] font-extrabold", cc.bg, cc.border, cc.text)}>
                                {cc.label}
                              </span>
                              {typeof r.value === "number" && r.unit ? (
                                <span className="text-[11px] font-extrabold text-black/55">
                                  {r.value} {r.unit}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <label className="flex items-center gap-2 text-xs font-bold text-black/60">
                              <input
                                type="checkbox"
                                checked={!!r.isActive}
                                onChange={(e) => toggleActive(r, e.target.checked)}
                              />
                              Aktif
                            </label>

                            <button
                              onClick={() => remove(r)}
                              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-extrabold text-black/60 hover:bg-black/[0.04]"
                            >
                              Sil
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-3 text-xs text-black/55">
              Not: App’de “en fazla 2 kampanya” gösterilir. Burada <b>aktif</b> yaptığın kampanyalar görünür.
            </div>

            <div className="mt-2 text-xs text-black/45">
              Aktif sayısı: <b>{activeCount}/2</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
