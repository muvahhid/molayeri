"use client";
import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LogoutButton({ compact }: { compact?: boolean }) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      className={
        compact
          ? "px-3 py-2 rounded-2xl text-white/70 hover:text-white flex items-center gap-2"
          : "px-6 py-3 rounded-2xl text-white/70 hover:text-white flex items-center gap-2"
      }
      onClick={() => {
        try {
          window.localStorage.removeItem("molayeri_session_v1");
        } catch {}
        router.push("/login");
      }}
      title="Çıkış"
    >
      <Image src="/icons/logout.png" alt="Çıkış" width={22} height={22} />
      <span className={compact ? "text-sm font-semibold" : "text-sm font-semibold"}>Çıkış</span>
    </Button>
  );
}
