import { db } from "@/lib/firebase.client";
import { collection, doc, getDocs, limit, orderBy, query, updateDoc, where } from "firebase/firestore";

export async function listLatestUsers(limitCount = 50) {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function searchUsers(term: string, limitCount = 50) {
  const t = (term || "").trim().toLowerCase();
  if (!t) return listLatestUsers(limitCount);

  // Firestore'da "contains" yok; en risksiz: email exact arama
  const q = query(collection(db, "users"), where("email", "==", t), limit(limitCount));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return rows.length ? rows : listLatestUsers(limitCount);
}

export async function setUserActive(uidOrId: string, active: boolean) {
  const ref = doc(db, "users", uidOrId);
  await updateDoc(ref, {
    active,
    updatedAt: new Date(),
  } as any);
}
