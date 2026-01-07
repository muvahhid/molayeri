"use client";
import * as React from "react";

type W = any;

function readSessionUid(): string {
  try {
    const raw = window.localStorage.getItem("molayeri_session_v1");
    if (!raw) return "";
    const s = JSON.parse(raw) as any;
    return String(s?.uid || "").trim();
  } catch {
    return "";
  }
}

function readWizard(): W {
  try {
    const raw = window.localStorage.getItem("molayeri_wizard_v1");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hasStep2(w: W) {
  const b = w?.business || w?.step2?.business || w?.data?.business;
  const name = String(b?.name || "").trim();
  const addr = String(b?.addressText || "").trim();
  const lat = b?.lat;
  const lng = b?.lng;
  return !!(name && addr && typeof lat === "number" && typeof lng === "number");
}

function hasStep3(w: W) {
  const cats = w?.selectedCategoryIds || w?.step3?.selectedCategoryIds || w?.data?.selectedCategoryIds;
  return Array.isArray(cats) && cats.length > 0;
}

function hasStep4(w: W) {
  const photos = w?.photos || w?.step4?.photos || w?.data?.photos;
  return Array.isArray(photos) && photos.length >= 3;
}

export function useWizardStepGuard(step: 2|3|4|5) {
  React.useEffect(() => {
    const uid = readSessionUid();
    if (!uid) {
      window.location.href = "/login";
      return;
    }

    const w = readWizard();
    if (step >= 3 && !hasStep2(w)) {
      window.location.href = "/isletmeni-kaydet/step-2";
      return;
    }
    if (step >= 4 && !hasStep3(w)) {
      window.location.href = "/isletmeni-kaydet/step-3";
      return;
    }
    if (step >= 5 && !hasStep4(w)) {
      window.location.href = "/isletmeni-kaydet/step-4";
      return;
    }
  }, [step]);
}
