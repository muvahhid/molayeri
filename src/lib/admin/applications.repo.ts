import { db } from "@/lib/firebase.client";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export type ApplicationStatus = "pending" | "approved" | "passive";

export type ApplicationDoc = {
  id: string;
  status: ApplicationStatus;

  user: {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };

  business: {
    name: string;
    addressText: string;
    lat: number | null;
    lng: number | null;
    description: string;
  };

  selectedCategoryIds: string[];
  featureValues: Record<string, any>;
  photos: { url: string; isCover: boolean }[];

  createdAt?: any;
  updatedAt?: any;
};

export function subscribeApplications(cb: (rows: ApplicationDoc[]) => void) {
  const q = query(collection(db, "applications"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const rows: ApplicationDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    cb(rows);
  });
}

async function setUserRole(uid: string, role: "user" | "pending" | "isletmeci" | "admin", approved?: boolean) {
  await updateDoc(doc(db, "users", uid), {
    role,
    ...(typeof approved === "boolean" ? { approved } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function approveApplication(appId: string, uid: string) {
  await updateDoc(doc(db, "applications", appId), {
    status: "approved",
    updatedAt: serverTimestamp(),
  });
  await setUserRole(uid, "isletmeci", true);
}

export async function passiveApplication(appId: string, uid: string) {
  await updateDoc(doc(db, "applications", appId), {
    status: "passive",
    updatedAt: serverTimestamp(),
  });
  await setUserRole(uid, "pending", false);
}
