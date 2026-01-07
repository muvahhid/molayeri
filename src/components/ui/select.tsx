"use client";
import * as React from "react";
import { cn } from "@/lib/cn";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  const { className, label, hint, error, children, ...rest } = props;
  return (
    <label className="block">
      {label ? <div className="mb-2 text-sm font-semibold text-white">{label}</div> : null}
      <select
        className={cn(
          "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none",
          "focus:border-[#D9A400]/40 focus:ring-2 focus:ring-[#D9A400]/15",
          error ? "border-[#FF4D4F]/50 focus:border-[#FF4D4F]/60 focus:ring-[#FF4D4F]/15" : "",
          className
        )}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <div className="mt-2 text-xs font-medium text-[#FF4D4F]">{error}</div>
      ) : hint ? (
        <div className="mt-2 text-xs text-white/60">{hint}</div>
      ) : null}
    </label>
  );
}
