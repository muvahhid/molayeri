"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export function Modal(props: {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const { open, title, children, footer, onClose, className } = props;
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            "w-full max-w-[560px] rounded-[28px] border border-white/10 bg-white/[0.07] shadow-[0_30px_90px_rgba(0,0,0,0.65)] backdrop-blur-xl",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {title ? (
            <div className="px-6 pt-6">
              <div className="text-lg font-extrabold text-white">{title}</div>
              <div className="mt-3 h-px w-full bg-white/10" />
            </div>
          ) : null}

          <div className="px-6 py-5">{children}</div>

          {footer ? (
            <div className="px-6 pb-6">
              <div className="mb-4 h-px w-full bg-white/10" />
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
