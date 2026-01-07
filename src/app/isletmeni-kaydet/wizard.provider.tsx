"use client";
import * as React from "react";

export type WizardUser = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emailVerified: boolean;
};

export type BusinessDraft = {
  name: string;
  addressText: string;
  lat: number | null;
  lng: number | null;
  description: string;
};

export type FeatureValue =
  | { type: "bool"; value: boolean }
  | { type: "number"; value: number | null }
  | { type: "text"; value: string }
  | { type: "select"; value: string }
  | { type: "multiSelect"; value: string[] };

export type WizardState = {
  user: WizardUser;
  business: BusinessDraft;
  selectedCategoryIds: string[];
  activeCategoryId: string | null;
  featureValues: Record<string, FeatureValue>; // key: featureId
};

const DEFAULT_STATE: WizardState = {
  user: { firstName: "", lastName: "", email: "", phone: "", emailVerified: false },
  business: { name: "", addressText: "", lat: null, lng: null, description: "" },
  selectedCategoryIds: [],
  activeCategoryId: null,
  featureValues: {},
};

const KEY = "molayeri_wizard_v1";

function safeString(v: any) { return typeof v === "string" ? v : ""; }
function safeBool(v: any) { return !!v; }
function safeNum(v: any) { return typeof v === "number" && Number.isFinite(v) ? v : null; }
function safeStrArr(v: any) { return Array.isArray(v) ? v.map(String) : []; }

function loadState(): WizardState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const obj = JSON.parse(raw);

    const fv: Record<string, FeatureValue> = {};
    const rawFV = obj?.featureValues || {};
    for (const k of Object.keys(rawFV)) {
      const x = rawFV[k];
      const t = safeString(x?.type);
      if (t === "bool") fv[k] = { type: "bool", value: safeBool(x?.value) };
      else if (t === "number") fv[k] = { type: "number", value: typeof x?.value === "number" ? x.value : null };
      else if (t === "text") fv[k] = { type: "text", value: safeString(x?.value) };
      else if (t === "select") fv[k] = { type: "select", value: safeString(x?.value) };
      else if (t === "multiSelect") fv[k] = { type: "multiSelect", value: safeStrArr(x?.value) };
    }

    const selected = safeStrArr(obj?.selectedCategoryIds).filter(Boolean);
    const active = safeString(obj?.activeCategoryId);
    return {
      user: {
        firstName: safeString(obj?.user?.firstName),
        lastName: safeString(obj?.user?.lastName),
        email: safeString(obj?.user?.email),
        phone: safeString(obj?.user?.phone),
        emailVerified: safeBool(obj?.user?.emailVerified),
      },
      business: {
        name: safeString(obj?.business?.name),
        addressText: safeString(obj?.business?.addressText),
        lat: safeNum(obj?.business?.lat),
        lng: safeNum(obj?.business?.lng),
        description: safeString(obj?.business?.description),
      },
      selectedCategoryIds: selected,
      activeCategoryId: selected.includes(active) ? active : (selected[0] || null),
      featureValues: fv,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(s: WizardState) {
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

type Ctx = {
  state: WizardState;
  setUser: (patch: Partial<WizardUser>) => void;
  setBusiness: (patch: Partial<BusinessDraft>) => void;
  toggleCategory: (categoryId: string, on: boolean) => void;
  setActiveCategory: (categoryId: string) => void;
  setFeatureValue: (featureId: string, v: FeatureValue) => void;
  reset: () => void;
};

const WizardContext = React.createContext<Ctx | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<WizardState>(DEFAULT_STATE);

  React.useEffect(() => {
    const s = loadState();
    setState(s);
  }, []);

  React.useEffect(() => {
    saveState(state);
  }, [state]);

  const api: Ctx = React.useMemo(() => ({
    state,
    setUser: (patch) => setState((prev) => ({ ...prev, user: { ...prev.user, ...patch } })),
    setBusiness: (patch) => setState((prev) => ({ ...prev, business: { ...prev.business, ...patch } })),
    toggleCategory: (categoryId, on) => setState((prev) => {
      const set = new Set(prev.selectedCategoryIds);
      if (on) set.add(categoryId);
      else set.delete(categoryId);
      const nextSelected = Array.from(set);
      let nextActive = prev.activeCategoryId;
      if (on && !nextActive) nextActive = categoryId;
      if (!on && nextActive === categoryId) nextActive = nextSelected[0] || null;
      return { ...prev, selectedCategoryIds: nextSelected, activeCategoryId: nextActive };
    }),
    setActiveCategory: (categoryId) => setState((prev) => ({ ...prev, activeCategoryId: categoryId })),
    setFeatureValue: (featureId, v) => setState((prev) => ({ ...prev, featureValues: { ...prev.featureValues, [featureId]: v } })),
    reset: () => {
      setState(DEFAULT_STATE);
      try { window.localStorage.removeItem(KEY); } catch {}
    },
  }), [state]);

  return <WizardContext.Provider value={api}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const ctx = React.useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
}
