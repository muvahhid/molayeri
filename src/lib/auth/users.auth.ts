import { auth, db } from "@/lib/firebase.client";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

export type UserRole = "user" | "pending" | "isletmeci" | "admin";

export type Session = {
  uid: string;
  email: string;
  role: UserRole;
  approved: boolean;
};

export function setSession(s: Session) {
  try { window.localStorage.setItem("molayeri_session_v1", JSON.stringify(s)); } catch {}
}

export function clearSession() {
  try { window.localStorage.removeItem("molayeri_session_v1"); } catch {}
}

export async function ensureUserDoc(uid: string, email: string, extra?: { nameTR?: string; phone?: string }) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as any;

  const base = {
    uid,
    email: (email || "").trim().toLowerCase(),
    role: "user" as UserRole,
    approved: false,
    nameTR: extra?.nameTR || "",
    phone: extra?.phone || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, base, { merge: true });
  return base;
}

export async function readUserDoc(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as any) : null;
}

export async function registerEmailPassword(input: { email: string; password: string; nameTR?: string; phone?: string }) {
  const email = (input.email || "").trim().toLowerCase();
  const cred = await createUserWithEmailAndPassword(auth, email, input.password);
  const uid = cred.user.uid;
  const docData = await ensureUserDoc(uid, email, { nameTR: input.nameTR, phone: input.phone });
  const role = (docData.role || "user") as UserRole;
  const approved = !!docData.approved;
  return { uid, email, role, approved };
}

export async function loginEmailPassword(emailRaw: string, password: string) {
  const email = (emailRaw || "").trim().toLowerCase();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  const docData = (await readUserDoc(uid)) || (await ensureUserDoc(uid, email));
  const role = (docData.role || "user") as UserRole;
  const approved = !!docData.approved;

  return { uid, email, role, approved };
}

export async function logout() {
  await signOut(auth);
  clearSession();
}
