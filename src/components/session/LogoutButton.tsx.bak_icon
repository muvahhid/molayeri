"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LogoutButton({ compact }: { compact?: boolean }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      className={compact ? "px-4 py-2 rounded-2xl text-white/70 hover:text-white" : "px-6 py-3 rounded-2xl text-white/70 hover:text-white"}
      onClick={() => {
        try { window.localStorage.removeItem("molayeri_session_v1"); } catch {}
        router.push("/login");
      }}
    >
      Çıkış
    </Button>
  );
}
