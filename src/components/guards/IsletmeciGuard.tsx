"use client";
import * as React from "react";
import { useRouter } from "next/navigation";

type Session = { email: string; role: "user" | "pending" | "isletmeci" | "admin"; approved?: boolean };

function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem("molayeri_session_v1");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function IsletmeciGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = React.useState(false);

  React.useEffect(() => {
    const s = readSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    if (s.role === "admin") {
      setOk(true);
      return;
    }
    if (s.role === "isletmeci" && s.approved) {
      setOk(true);
      return;
    }
    if (s.role === "pending") {
      router.replace("/isletmeni-kaydet/step-5");
      return;
    }
    router.replace("/");
  }, [router]);

  if (!ok) return null;
  return <>{children}</>;
}
