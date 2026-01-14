import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase.client";

// =====================
// Types
// =====================
export type ApplicationDoc = {
  id: string;
  status: "pending" | "approved" | "passive";
  business?: any;
  user?: any;
  createdAt?: any;
  photos?: any[];
};

// =====================
// Subscribe
// =====================
export function subscribeApplications(
  cb: (rows: ApplicationDoc[]) => void,
) {
  const q = query(
    collection(db, "applications"),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));
    cb(rows);
  });
}

// =====================
// Approve + Sync
// =====================
export async function approveApplicationAndSyncBusiness(
  applicationId: string,
  userUid?: string,
) {
  const appRef = doc(db, "applications", applicationId);
  const bizRef = doc(db, "businesses", applicationId);

  // application -> approved
  await updateDoc(appRef, {
    status: "approved",
    updatedAt: serverTimestamp(),
  });

  // application.business -> businesses (MANUEL alanlar, otomatik yok)
  const snap = await (await import("firebase/firestore")).getDoc(appRef);
  const app = snap.data() as any;

  const business: any = {
    id: applicationId,
    status: "approved",
    ownerUid: userUid || app?.user?.uid || "",
    ownerEmail: (app?.user?.email || "").toString().trim().toLowerCase(),

    name: app?.business?.name || "",
    addressText: app?.business?.addressText || "",
    lat: app?.business?.lat ?? null,
    lng: app?.business?.lng ?? null,

    // SADECE MANUEL
    roadName: (app?.business?.roadName || "").toString().trim(),
    roadNote: (
      app?.business?.roadNote ||
      app?.business?.description ||
      ""
    ).toString().trim(),
    roadCodes: Array.isArray(app?.business?.roadCodes)
      ? app.business.roadCodes.map(String).filter(Boolean)
      : [],

    geoPoint:
      app?.business?.geoPoint &&
      typeof app.business.geoPoint.lat === "number" &&
      typeof app.business.geoPoint.lng === "number"
        ? {
            lat: app.business.geoPoint.lat,
            lng: app.business.geoPoint.lng,
          }
        : null,

    bearing:
      typeof app?.business?.bearing === "number"
        ? app.business.bearing
        : null,

    description: app?.business?.description || "",

    selectedCategoryIds: app?.selectedCategoryIds || [],
    featureValues: app?.featureValues || {},
    photos: app?.photos || [],

    applicationId,
    createdAt: app?.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(bizRef, business, { merge: true });
}

// =====================
// Passive
// =====================
export async function passiveApplication(
  applicationId: string,
  userUid?: string,
) {
  await updateDoc(doc(db, "applications", applicationId), {
    status: "passive",
    updatedAt: serverTimestamp(),
  });
}
