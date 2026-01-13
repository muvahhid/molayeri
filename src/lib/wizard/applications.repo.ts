import { db } from "@/lib/firebase.client";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";

export type UserRole = "user" | "pending" | "isletmeci" | "admin";

export type ApplicationStatus = "pending" | "approved" | "passive";

export type CreateApplicationInput = {
  uid: string;
  // user
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // business
  businessName: string;
  addressText: string;
  lat: number | null;
  lng: number | null;
  description: string;
  bearing: number | null;
  roadName?: string;
  roadNote?: string;
  roadLat?: number | null;
  roadLng?: number | null;
  geoPoint?: { lat: number; lng: number } | null;
  roadPlaceId?: string | null;
  roadType?: string | null;

  roadCodes?: string[];
  // selections
  selectedCategoryIds: string[];
  featureValues: Record<string, any>;

  // photos (download urls)
  photos: { url: string; isCover: boolean }[];

  // upload folder id (optional)
  uploadSessionId?: string | null;
};

export async function createPendingApplication(input: CreateApplicationInput) {
  // boş user alanlarını applications'a yazma
  const userPayload: any = {
    uid: input.uid,
    firstName: (input.firstName || "").trim(),
    lastName: (input.lastName || "").trim(),
    email: (input.email || "").trim().toLowerCase(),
    phone: (input.phone || "").trim(),
  };
  // input boşsa users/{uid} içinden tamamla
  try {
    const snap = await getDoc(doc(db, "users", input.uid));
    if (snap.exists()) {
      const u: any = snap.data();

      // email
      if (!userPayload.email && u?.email)
        userPayload.email = String(u.email).trim().toLowerCase();

      // phone
      if (!userPayload.phone && u?.phone)
        userPayload.phone = String(u.phone).trim();

      // nameTR -> first/last
      if ((!userPayload.firstName || !userPayload.lastName) && u?.nameTR) {
        const full = String(u.nameTR).trim();
        if (full) {
          const parts = full.split(/\s+/).filter(Boolean);
          if (!userPayload.firstName && parts.length >= 1)
            userPayload.firstName = parts[0];
          if (!userPayload.lastName && parts.length >= 2)
            userPayload.lastName = parts.slice(1).join(" ");
        }
      }
    }
  } catch {}

  // hala boşsa yazma
  if (!userPayload.firstName) delete userPayload.firstName;
  if (!userPayload.lastName) delete userPayload.lastName;
  if (!userPayload.email) delete userPayload.email;
  if (!userPayload.phone) delete userPayload.phone;

  const appRef = await addDoc(collection(db, "applications"), {
    status: "pending" as ApplicationStatus,

    user: userPayload,

    business: {
      name: input.businessName,
      addressText: input.addressText,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      description: input.description,
      roadName: (input.roadName || "").trim(),
      roadNote: (input.roadNote || "").trim(),
      roadLat: input.roadLat ?? null,
      roadLng: input.roadLng ?? null,
      geoPoint: input.geoPoint ?? null,
      roadPlaceId: input.roadPlaceId ?? null,
      roadType: input.roadType ?? null,
      roadCodes: (input.roadCodes || []).filter(Boolean),
    },

    selectedCategoryIds: input.selectedCategoryIds || [],
    featureValues: input.featureValues || {},

    photos: (input.photos || []).slice(0, 6),
    uploadSessionId: input.uploadSessionId || null,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // users/{email} (geçici: auth yokken email doc id)
  const userDoc = doc(db, "users", input.uid);

  // boş gelen alanları user doc'a yazma (mevcut değerleri silmesin)
  const patch: any = {
    uid: input.uid,
    email: (input.email || "").trim().toLowerCase(),
    phone: input.phone || "",
    nameTR: [input.firstName, input.lastName].filter(Boolean).join(" ").trim(),
    role: "pending",
    approved: false,
    applicationId: appRef.id,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };
  if (!patch.email) delete patch.email;
  if (!patch.phone) delete patch.phone;
  if (!patch.nameTR) delete patch.nameTR;

  // mevcut role isletmeci/admin ise, pending'e düşürme
  try {
    const snap = await getDoc(userDoc);
    const current: any = snap.exists() ? snap.data() : null;
    const currentRole = current?.role;
    if (currentRole === "isletmeci" || currentRole === "admin") {
      delete patch.role;
      delete patch.approved;
    }
  } catch {}

  await setDoc(userDoc, patch, { merge: true });

  return { applicationId: appRef.id };
}

export async function setApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
) {
  await updateDoc(doc(db, "applications", applicationId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function setUserRoleByEmail(
  email: string,
  role: UserRole,
  approved?: boolean,
) {
  const id = (email || "").trim().toLowerCase();
  await updateDoc(doc(db, "users", id), {
    role,
    ...(typeof approved === "boolean" ? { approved } : {}),
    updatedAt: serverTimestamp(),
  });
}
