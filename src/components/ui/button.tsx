"use client";
import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const { className, variant = "secondary", ...rest } = props;
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed";
  const styles: Record<Variant, string> = {
    primary:
      "bg-[#D9A400] text-[#0A0F18] hover:brightness-110 shadow-[0_12px_30px_rgba(217,164,0,0.18)]",
    secondary:
      "bg-white/5 text-white hover:bg-white/8 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.25)]",
    ghost: "bg-transparent text-white/80 hover:text-white hover:bg-white/5",
  };
  return <button className={cn(base, styles[variant], className)} {...rest} />;
}
