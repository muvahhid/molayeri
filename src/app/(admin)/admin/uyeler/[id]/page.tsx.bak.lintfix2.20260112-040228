"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase.client";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AnyRec = Record<string, any>;

function safeDate(v: any) {
  try {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (v?.toDate) return new Date(v.toDate()).toLocaleString("tr-TR");
    if (v?.seconds) return new Date(v.seconds * 1000).toLocaleString("tr-TR");
    return "";
  } catch {
    return "";
  }
}

function displayName(u: AnyRec) {
  return (
    u?.nameTR ||
    u?.displayName ||
    u?.name ||
    [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() ||
    "Üye"
  );
}

function statusBadges(u: AnyRec) {
  const role = (u?.role || "user") as string;
  const approved = !!u?.approved;
  const active = typeof u?.active === "boolean" ? u.active : true;

  return { role, approved, active };
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = useMemo(() => {
    const p: any = params || {};
    return (p?.id || p?.uid || "").toString();
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<AnyRec | null>(null);

  const [histPage, setHistPage] = useState(0);
  const HIST_PAGE_SIZE = 10;
  const HIST_MAX_PAGES = 100;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        if (!id) return;
        const snap = await getDoc(doc(db, "users", id));
        if (!alive) return;
        setUser(snap.exists() ? ({ id: snap.id, ...(snap.data() as AnyRec) } as AnyRec) : null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const { role, approved, active } = useMemo(() => statusBadges(user || {}), [user]);

  const rows = useMemo(() => {
    return Array.from({ length: HIST_PAGE_SIZE }).map((_, i) => ({
      key: `${histPage}-${i}`,
      title: "Henüz kayıt yok",
      sub: "QR / Kampanya kullanımı burada listelenecek",
    }));
  }, [histPage]);

  async function setActive(nextActive: boolean) {
    if (!user?.id) return;
    if ((user?.role || "user") === "admin") return;

    const ok = window.confirm(nextActive ? "Üyeyi tekrar aktif etmek istiyor musun?" : "Üyeyi pasif etmek istiyor musun?");
    if (!ok) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        active: nextActive,
        updatedAt: serverTimestamp(),
      });
      setUser((prev) => (prev ? { ...prev, active: nextActive } : prev));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Üye Detayı</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-sm text-white/60">Yükleniyor...</div>
          ) : !user ? (
            <div className="text-sm text-white/60">
              Üye bulunamadı. <button className="underline" onClick={() => router.push("/admin/uyeler")}>Listeye dön</button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="text-2xl font-black tracking-tight text-white">{displayName(user)}</div>
                    <div className="mt-2 text-sm text-white/60">
                      {(user?.email || "—") + " • " + (user?.phone || "—")}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 ring-1 ring-white/10">
                        role: {role}
                      </span>

                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold ring-1",
                          active
                            ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/20"
                            : "bg-white/10 text-white/60 ring-white/15",
                        ].join(" ")}
                      >
                        {active ? "Aktif" : "Pasif"}
                      </span>

                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold ring-1",
                          approved
                            ? "bg-[#D9A400]/15 text-[#FFD45A] ring-[#D9A400]/25"
                            : "bg-amber-500/15 text-amber-200 ring-amber-500/20",
                        ].join(" ")}
                      >
                        {approved ? "Onaylı" : "Beklemede"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      className="min-w-[160px]"
                      disabled={saving || (user?.role || "user") === "admin"}
                      onClick={() => setActive(false)}
                    >
                      Pasif Et
                    </Button>

                    <Button
                      variant="ghost"
                      className="min-w-[160px]"
                      disabled={saving || (user?.role || "user") === "admin"}
                      onClick={() => setActive(true)}
                    >
                      Aktif Et
                    </Button>

                    <Button variant="ghost" className="min-w-[160px]" onClick={() => router.push("/admin/uyeler")}>
                      Listeye Dön
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs font-bold tracking-widest text-white/40">KİMLİK</div>
                  <div className="mt-3 space-y-2 text-sm text-white/80">
                    <div>
                      <span className="text-white/50">docId:</span>{" "}
                      <span className="font-semibold">{user?.id}</span>
                    </div>
                    <div>
                      <span className="text-white/50">uid:</span>{" "}
                      <span className="font-semibold">{user?.uid || "—"}</span>
                    </div>
                    <div>
                      <span className="text-white/50">applicationId:</span>{" "}
                      <span className="font-semibold">{user?.applicationId || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs font-bold tracking-widest text-white/40">TARİHLER</div>
                  <div className="mt-3 space-y-2 text-sm text-white/80">
                    <div>
                      <span className="text-white/50">createdAt:</span>{" "}
                      <span className="font-semibold">{safeDate(user?.createdAt) || "—"}</span>
                    </div>
                    <div>
                      <span className="text-white/50">updatedAt:</span>{" "}
                      <span className="font-semibold">{safeDate(user?.updatedAt) || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-extrabold text-white">Kampanya &amp; QR Kullanım Geçmişi</div>
                  <div className="text-xs text-white/50">yakında</div>
                </div>

                <div className="mt-4 space-y-2 max-h-[340px] overflow-auto pr-1">
                  {rows.map((r) => (
                    <div
                      key={r.key}
                      className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white/80">{r.title}</div>
                        <div className="mt-1 text-xs text-white/50">{r.sub}</div>
                      </div>
                      <div className="shrink-0 text-white/35">—</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    className="h-10 w-20 rounded-2xl bg-[#D9A400] text-sm font-black text-black/90 disabled:opacity-40"
                    disabled={histPage <= 0}
                    onClick={() => setHistPage((p) => Math.max(0, p - 1))}
                  >
                    ‹
                  </button>

                  <div className="text-xs font-semibold text-white/60">
                    Sayfa {histPage + 1}/{HIST_MAX_PAGES}
                  </div>

                  <button
                    className="h-10 w-20 rounded-2xl bg-[#D9A400] text-sm font-black text-black/90 disabled:opacity-40"
                    disabled={histPage >= HIST_MAX_PAGES - 1}
                    onClick={() => setHistPage((p) => Math.min(HIST_MAX_PAGES - 1, p + 1))}
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="mt-10" />

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="text-xs font-bold tracking-widest text-white/40">HAM VERİ</div>
                <pre className="mt-4 max-h-[420px] overflow-auto rounded-2xl bg-black/30 p-4 text-xs text-white/70 ring-1 ring-white/10">
{JSON.stringify(user, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
