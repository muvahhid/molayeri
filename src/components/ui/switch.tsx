"use client";
import * as React from "react";
import { cn } from "@/lib/cn";

export function Switch(props: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { checked, onCheckedChange, disabled, className } = props;
  return (
    <button
      type="button"
      disabled={disabled}
      aria-checked={checked}
      role="switch"
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-9 w-16 rounded-full border transition",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        checked ? "bg-[#D9A400]/25 border-[#D9A400]/30" : "bg-white/5 border-white/10",
        className
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 -translate-y-1/2 h-7 w-7 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.45)] transition",
          checked ? "left-8 bg-[#D9A400]" : "left-1 bg-white/70"
        )}
      />
    </button>
  );
}
