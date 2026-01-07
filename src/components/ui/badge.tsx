import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "active" | "inactive" | "type";

export function Badge(props: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  const { className, variant = "type", ...rest } = props;
  const base = "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide border";
  const styles: Record<Variant, string> = {
    active: "bg-[#D9A400]/15 text-[#D9A400] border-[#D9A400]/25",
    inactive: "bg-white/5 text-white/60 border-white/10",
    type: "bg-white/5 text-white/80 border-white/10",
  };
  return <span className={cn(base, styles[variant], className)} {...rest} />;
}
