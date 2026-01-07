import { db } from "@/lib/firebase.client";
import {
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  collection,
  where,
  updateDoc,
} from "firebase/firestore";

export type CategoryFeatureDoc = {
  id: string;
  categoryId: string;
  featureId: string;
  required: boolean;
  order: number;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
};

export function categoryFeaturesRef() {
  return collection(db, "category_features");
}

export function subscribeCategoryFeatures(categoryId: string, cb: (rows: CategoryFeatureDoc[]) => void) {
  const q = query(
    categoryFeaturesRef(),
    where("categoryId", "==", categoryId)
  );
return onSnapshot(q, (snap) => {
    const rows: CategoryFeatureDoc[] = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        categoryId: data.categoryId ?? "",
        featureId: data.featureId ?? "",
        required: Boolean(data.required ?? false),
        order: Number(data.order ?? 0),
        isActive: Boolean(data.isActive ?? true),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });
    cb(rows);
  });
}

function linkId(categoryId: string, featureId: string) {
  return `${categoryId}__${featureId}`;
}

export async function addFeatureToCategory(categoryId: string, featureId: string) {
  const id = linkId(categoryId, featureId);
  const ref = doc(db, "category_features", id);
  await setDoc(
    ref,
    {
      categoryId,
      featureId,
      required: false,
      order: 0,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateCategoryFeature(
  id: string,
  patch: Partial<{ required: boolean; order: number; isActive: boolean }>
) {
  const ref = doc(db, "category_features", id);
  const data: any = { updatedAt: serverTimestamp() };
  if (patch.required !== undefined) data.required = !!patch.required;
  if (patch.isActive !== undefined) data.isActive = !!patch.isActive;
  if (patch.order !== undefined) data.order = Number.isFinite(patch.order) ? patch.order : 0;
  await updateDoc(ref, data);
}

export async function removeCategoryFeature(id: string) {
  await deleteDoc(doc(db, "category_features", id));
}
