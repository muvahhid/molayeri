"use client";

import * as React from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase.client";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<"loading" | "ok" | "no">("loading");

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (!u?.uid) {
          setState("no");
          window.location.href = "/login";
          return;
        }

        const snap = await getDoc(doc(db, "users", u.uid));
        const role = snap.exists() ? String((snap.data() as any)?.role || "") : "";
        if (role !== "admin") {
          setState("no");
          window.location.href = "/login";
          return;
        }

        setState("ok");
      } catch {
        setState("no");
        window.location.href = "/login";
      }
    });

    return () => unsub();
  }, []);

  if (state !== "ok") {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-white/60">
        Admin doğrulanıyor…
      </div>
    );
  }

  return <>{children}</>;
}
