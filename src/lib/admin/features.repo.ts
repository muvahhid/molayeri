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

export type FeatureType = "bool" | "number" | "text" | "select" | "multiSelect";

export type FeatureOption = {
  labelTR: string;
  value: string;
  order: number;
};

export type FeatureInput = {
  min?: number;
  max?: number;
  step?: number;
  maxLen?: number;
  options?: FeatureOption[];
};

export type FeatureDoc = {
  id: string;
  nameTR: string;
  key: string;
  type: FeatureType;
  unit: string | null;
  isActive: boolean;
  order: number;
  descriptionTR: string | null;
  input: FeatureInput;
  createdAt?: any;
  updatedAt?: any;
};

function keyifyTR(input: string) {
  const s = (input || "").trim().toLowerCase();
  const map: Record<string, string> = { "ç":"c","ğ":"g","ı":"i","ö":"o","ş":"s","ü":"u","â":"a","î":"i","û":"u" };
  const out = s
    .split("")
    .map((ch) => (map[ch] ?? ch))
    .join("")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 80);
  return out || "ozellik";
}

export function featuresRef() {
  return collection(db, "features");
}

export function subscribeFeatures(cb: (rows: FeatureDoc[]) => void) {
  const q = query(featuresRef(), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => {
    const rows: FeatureDoc[] = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        nameTR: data.nameTR ?? "",
        key: data.key ?? "",
        type: (data.type ?? "text") as FeatureType,
        unit: data.unit ?? null,
        isActive: Boolean(data.isActive ?? true),
        order: Number(data.order ?? 0),
        descriptionTR: data.descriptionTR ?? null,
        input: (data.input ?? {}) as FeatureInput,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });
    cb(rows);
  });
}

export async function createFeature(input: {
  nameTR: string;
  type: FeatureType;
  unit: string | null;
  order: number;
  isActive: boolean;
  descriptionTR: string | null;
  input: FeatureInput;
}) {
  const nameTR = (input.nameTR || "").trim();
  const key = keyifyTR(nameTR);
  await addDoc(featuresRef(), {
    nameTR,
    key,
    type: input.type,
    unit: input.unit ?? null,
    isActive: !!input.isActive,
    order: Number.isFinite(input.order) ? input.order : 0,
    descriptionTR: input.descriptionTR ?? null,
    input: input.input ?? {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateFeature(
  id: string,
  patch: Partial<{
    nameTR: string;
    type: FeatureType;
    unit: string | null;
    order: number;
    isActive: boolean;
    descriptionTR: string | null;
    input: FeatureInput;
  }>
) {
  const ref = doc(db, "features", id);
  const data: any = { updatedAt: serverTimestamp() };

  if (patch.nameTR !== undefined) {
    const nameTR = (patch.nameTR || "").trim();
    data.nameTR = nameTR;
    data.key = keyifyTR(nameTR);
  }
  if (patch.type !== undefined) data.type = patch.type;
  if (patch.unit !== undefined) data.unit = patch.unit ?? null;
  if (patch.order !== undefined) data.order = Number.isFinite(patch.order) ? patch.order : 0;
  if (patch.isActive !== undefined) data.isActive = !!patch.isActive;
  if (patch.descriptionTR !== undefined) data.descriptionTR = patch.descriptionTR ?? null;
  if (patch.input !== undefined) data.input = patch.input ?? {};

  await updateDoc(ref, data);
}

export async function removeFeature(id: string) {
  await deleteDoc(doc(db, "features", id));
}
