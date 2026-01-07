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

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = React.useState(false);

  React.useEffect(() => {
    const s = readSession();
    if (!s || s.role !== "admin") {
      router.replace("/login");
      return;
    }
    setOk(true);
  }, [router]);

  if (!ok) return null;
  return <>{children}</>;
}
