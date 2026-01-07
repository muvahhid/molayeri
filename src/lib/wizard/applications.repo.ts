import { db } from "@/lib/firebase.client";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
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

  // selections
  selectedCategoryIds: string[];
  featureValues: Record<string, any>;

  // photos (download urls)
  photos: { url: string; isCover: boolean }[];

  // upload folder id (optional)
  uploadSessionId?: string | null;
};

export async function createPendingApplication(input: CreateApplicationInput) {
  const appRef = await addDoc(collection(db, "applications"), {
    status: "pending" as ApplicationStatus,

    user: {
      uid: input.uid,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
    },

    business: {
      name: input.businessName,
      addressText: input.addressText,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      description: input.description,
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
  await setDoc(
    userDoc,
    {
      uid: input.uid,
      email: (input.email || "").trim().toLowerCase(),
      phone: input.phone || "",
      nameTR: [input.firstName, input.lastName].filter(Boolean).join(" ").trim(),
      role: "pending",
      approved: false,
      applicationId: appRef.id,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { applicationId: appRef.id };
}

export async function setApplicationStatus(applicationId: string, status: ApplicationStatus) {
  await updateDoc(doc(db, "applications", applicationId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function setUserRoleByEmail(email: string, role: UserRole, approved?: boolean) {
  const id = (email || "").trim().toLowerCase();
  await updateDoc(doc(db, "users", id), {
    role,
    ...(typeof approved === "boolean" ? { approved } : {}),
    updatedAt: serverTimestamp(),
  });
}
