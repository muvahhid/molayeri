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
} from "firebase/firestore";

export type CategoryDoc = {
  id: string;
  nameTR: string;
  slug: string;
  order: number;
  isActive: boolean;
  iconKey?: string | null;
  createdAt?: any;
  updatedAt?: any;
};

function slugifyTR(input: string) {
  const s = (input || "").trim().toLowerCase();
  const map: Record<string, string> = {
    "ç":"c","ğ":"g","ı":"i","ö":"o","ş":"s","ü":"u",
    "â":"a","î":"i","û":"u",
  };
  return s
    .split("")
    .map((ch) => (map[ch] ? map[ch] : ch))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function categoriesRef() {
  return collection(db, "categories");
}

export function subscribeCategories(cb: (rows: CategoryDoc[]) => void) {
  const q = query(categoriesRef(), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => {
    const rows: CategoryDoc[] = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        nameTR: data.nameTR ?? "",
        slug: data.slug ?? "",
        order: Number(data.order ?? 0),
        isActive: Boolean(data.isActive ?? true),
        iconKey: data.iconKey ?? null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });
    cb(rows);
  });
}

export async function createCategory(input: { nameTR: string; order: number; isActive: boolean }) {
  const nameTR = (input.nameTR || "").trim();
  const slug = slugifyTR(nameTR);
  await addDoc(categoriesRef(), {
    nameTR,
    slug,
    order: Number.isFinite(input.order) ? input.order : 0,
    isActive: !!input.isActive,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCategory(id: string, patch: Partial<{ nameTR: string; order: number; isActive: boolean }>) {
  const ref = doc(db, "categories", id);
  const data: any = { updatedAt: serverTimestamp() };

  if (patch.nameTR !== undefined) {
    const nameTR = (patch.nameTR || "").trim();
    data.nameTR = nameTR;
    data.slug = slugifyTR(nameTR);
  }
  if (patch.order !== undefined) data.order = Number.isFinite(patch.order) ? patch.order : 0;
  if (patch.isActive !== undefined) data.isActive = !!patch.isActive;

  await updateDoc(ref, data);
}

export async function removeCategory(id: string) {
  await deleteDoc(doc(db, "categories", id));
}
