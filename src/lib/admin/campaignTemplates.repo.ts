"use client";

import { db } from "@/lib/firebase.client";
import { doc, serverTimestamp, setDoc, getDoc, collection, getDocs, query, where, orderBy } from "firebase/firestore";

export type CampaignTemplate = {
  id: string;
  categorySlug: string;
  labelTR: string;
  order: number;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
};

const DATA: Record<string, string[]> = {
  yakit: [
    "500₺+ %3 yakıt","1000₺+ %5 yakıt","1500₺+ %7 yakıt","LPG %2 indirim","LPG 500₺+ %3",
    "Market 200₺+ 20₺","Yıkama %25","Yakıt+Yıkama %20","2. yakıt %5","Kartla %3 yakıt",
    "Gece %3 yakıt","Hafta sonu %3","QR %3 yakıt","Filo %5 yakıt","İlk yakıt %5",
    "Sadakat %3","300₺+ 15₺","500₺+ kahve","Market %10","Uygulama %4",
  ],
  yemek: [
    "2 al 1 öde","%20 menü","150₺+ %10","200₺+ 30₺","Ana yemek %15",
    "Tatlı bedava","İçecek bedava","Öğle menü %15","Akşam menü %10","Aile menü %20",
    "Paket %10","Gel al %15","Çocuk menü %20","3 kişi %15","Öğrenci %20",
    "Kahve bedava","Tatlı %50","2 menü %25","Hafta sonu %10","İlk sipariş %20",
  ],
  sarj: [
    "kWh %10 indirim","kWh %20 indirim","30 dk %15","60 dk %20","100₺+ %10",
    "200₺+ %20","Gece %25","Hafta sonu %15","İlk şarj %20","Hızlı şarj %10",
    "AC şarj %20","DC şarj %15","Sadakat %20","Uygulama %15","Kartla %10",
    "2. şarj %20","kWh 5₺ ind.","kWh 10₺ ind.","Uzun yol %20","Gece 22-06 %25",
  ],
  market: [
    "2 al 1 öde","%10 sepet","200₺+ 20₺","300₺+ 40₺","İçecek %25",
    "Atıştırmalık %30","Su 3 al 2","Gece %15","Aile paketi %20","Yolcu paketi %25",
    "Kahve %20","Sandviç %30","Tatlı %25","Öğrenci %20","Sepet %15",
    "QR %10","Günün ürünü %40","Paket %20","Sadakat %15","Market kart %10",
  ],
  otel: [
    "%15 konaklama","%20 konaklama","2 gece 1","3 gece %25","Erken %20",
    "Son dakika %30","Hafta sonu %20","Aile paketi %25","Çocuk ücretsiz","Kahvaltı dahil",
    "Geç çıkış","Oda upgrade","İş seyahati %20","Uzun kal %30","Öğrenci %25",
    "SPA %30","Mobil %20","Online %15","Kurumsal %25","Otopark ücretsiz",
  ],
  "servis-asist": [
    "Çekici %20","Yol yardım %25","Akü %30","Lastik %25","Yağ değişim %20",
    "Bakım %30","Arıza tespit %20","Filo %30","Gece %25","Hafta sonu %20",
    "İlk servis %30","Sadakat %25","Uzun yol %30","Acil %20","Motor bakım %25",
    "Elektrik %20","Oto check-up %30","Çekici 50₺ ind.","Servis+yakıt %20","Kurumsal %30",
  ],
  kafe: [
    "Kahve 1+1","%20 filtre","2. kahve %50","Tatlı %30","Çay bedava",
    "100₺+ kahve","Sabah %20","Akşam %15","Öğrenci %25","3 kahve %20",
    "Latte %30","Espresso %20","Tatlı bedava","Kahve+Tatlı %25","Sadakat %20",
    "Termos %10","Günün kahvesi %30","Paket kahve %20","Wi-Fi + kahve","2 içecek %25",
  ],
  alisveris: [
    "%10 mağaza","%20 mağaza","200₺+ 20₺","300₺+ 40₺","2 al 1 öde",
    "3 al %30","Sezon sonu %40","Öğrenci %20","Hafta sonu %15","Sadakat %25",
    "Kartla %10","Online %15","Mobil %20","İlk alışveriş %25","Outlet %30",
    "Aile indirimi %20","Günün ürünü %40","Sepet %15","QR %10","Limitli stok %30",
  ],
};

export async function seedCampaignTemplates() {
  const all = Object.entries(DATA).flatMap(([categorySlug, labels]) =>
    labels.map((labelTR, i) => ({
      id: `${categorySlug}_${String(i + 1).padStart(2, "0")}`,
      categorySlug,
      labelTR,
      order: (i + 1) * 10,
      isActive: true,
    }))
  );

  for (const t of all) {
    const ref = doc(db, "campaign_templates", t.id);
    const snap = await getDoc(ref);
    const now = serverTimestamp();
    if (snap.exists()) {
      await setDoc(ref, { ...t, updatedAt: now }, { merge: true });
    } else {
      await setDoc(ref, { ...t, createdAt: now, updatedAt: now }, { merge: true });
    }
  }
  return { count: all.length };
}

export async function listCampaignTemplates(categorySlug?: string) {
  const base = collection(db, "campaign_templates");
  const qy = categorySlug
    ? query(base, where("categorySlug", "==", categorySlug), orderBy("order", "asc"))
    : query(base, orderBy("categorySlug", "asc"), orderBy("order", "asc"));

  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as CampaignTemplate[];
}
