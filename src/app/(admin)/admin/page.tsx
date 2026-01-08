"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase.client";
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { TopTabsCard } from "@/components/admin/TopTabsCard";


export default function AdminDashboardPage() {
  const [latestApps, setLatestApps] = useState<any[]>([]);
  const [latestUsers, setLatestUsers] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const PAGE_SIZE = 10;
  const MAX_PAGES = 10; // toplam 100
  const [appsPage, setAppsPage] = useState(0);
  const [usersPage, setUsersPage] = useState(0);

  const CAP = 100000;
  const [usersCount, setUsersCount] = useState(0);
  const [bizCount, setBizCount] = useState(0);


  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingLists(true);

        const appsQ = query(collection(db, "applications"), orderBy("createdAt", "desc"), limit(100));
        const usersQ = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(100));

        const usersCountQ = query(collection(db, "users"));
        const bizCountQ = query(collection(db, "applications"), where("status", "==", "approved"));

        const [appsSnap, usersSnap, usersCountSnap, bizCountSnap] = await Promise.all([
          getDocs(appsQ),
          getDocs(usersQ),
          getCountFromServer(usersCountQ),
          getCountFromServer(bizCountQ),
        ]);

        if (!alive) return;

        setLatestApps(appsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setAppsPage(0);
        setLatestUsers(usersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setUsersPage(0);

        setUsersCount(Math.min(CAP, usersCountSnap.data().count || 0));
        setBizCount(Math.min(CAP, bizCountSnap.data().count || 0));
      } finally {
        if (alive) setLoadingLists(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  function clamp01(x: number) {
    return Math.max(0, Math.min(1, x));
  }

  // Şık eğriler:
  // users: S-curve (logistic benzeri)  |  business: ease-out
  function curveUsers(t: number) {
    // 0..1 -> S eğrisi
    const k = 10;
    const x = (t - 0.5) * k;
    const y = 1 / (1 + Math.exp(-x));
    // normalize (yaklaşık)
    return clamp01((y - 0.0067) / (0.9933 - 0.0067));
  }

  function curveBiz(t: number) {
    // easeOutCubic
    return 1 - Math.pow(1 - t, 3);
  }

  function sparkPath(width: number, height: number, pct: number, mode: "users" | "biz") {
    const n = 28;
    const fn = mode === "users" ? curveUsers : curveBiz;
    const p = clamp01(pct);

    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = t * width;
      // eğri * p ile ölçek, üstten aşağı çiz
      const y = height - fn(t) * (height * p);
      pts.push([x, y]);
    }

    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    }
    return d;
  }

  function fmtK(v: number) {
    if (!v) return "0";
    if (v >= 1000) return `${Math.round(v / 1000)}k`;
    return String(v);
  }

  const usersPct = clamp01(usersCount / CAP);
  const bizPct = clamp01(bizCount / CAP);

  const appsTotalPages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(latestApps.length / PAGE_SIZE)));
  const usersTotalPages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(latestUsers.length / PAGE_SIZE)));

  const appsView = latestApps.slice(appsPage * PAGE_SIZE, (appsPage + 1) * PAGE_SIZE);
  const usersView = latestUsers.slice(usersPage * PAGE_SIZE, (usersPage + 1) * PAGE_SIZE);

  const fmt = useMemo(() => {
    return (v: any) => {
      // Firestore Timestamp -> Date
      try {
        if (!v) return "";
        if (typeof v === "string") return v;
        if (v?.toDate) return new Date(v.toDate()).toLocaleDateString("tr-TR");
        if (v?.seconds) return new Date(v.seconds * 1000).toLocaleDateString("tr-TR");
        return "";
      } catch {
        return "";
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Dashboard</CardTitle>
                          </div>
                      </div>
        </CardHeader>
        <CardContent>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {/* İşletmeler Grafiği */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold tracking-widest text-white/40">İŞLETMELER</div>
                  <div className="mt-2 text-4xl font-black text-white">{fmtK(bizCount)}</div>
                  <div className="mt-1 text-sm text-white/60">Aktif işletme sayısı (approved)</div>
                </div>
                <div className="text-xs text-white/60">{fmtK(bizCount)}/100k</div>
              </div>

              <div className="mt-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <svg width="100%" height="120" viewBox="0 0 600 120" preserveAspectRatio="none">
                  <path
                    d={sparkPath(600, 120, bizPct, "biz")}
                    fill="none"
                    stroke="rgba(217,164,0,0.95)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <path d="M 0 116 L 600 116" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />
                </svg>
              </div>

              <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-[#D9A400]" style={{ width: `${Math.max(2, Math.round(bizPct * 100))}%` }} />
              </div>
            </div>

            {/* Üyeler Grafiği */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold tracking-widest text-white/40">ÜYELER</div>
                  <div className="mt-2 text-4xl font-black text-white">{fmtK(usersCount)}</div>
                  <div className="mt-1 text-sm text-white/60">Toplam üye sayısı</div>
                </div>
                <div className="text-xs text-white/60">{fmtK(usersCount)}/100k</div>
              </div>

              <div className="mt-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <svg width="100%" height="120" viewBox="0 0 600 120" preserveAspectRatio="none">
                  <path
                    d={sparkPath(600, 120, usersPct, "users")}
                    fill="none"
                    stroke="rgba(217,164,0,0.95)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <path d="M 0 116 L 600 116" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />
                </svg>
              </div>

              <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-[#D9A400]" style={{ width: `${Math.max(2, Math.round(usersPct * 100))}%` }} />
              </div>
            </div>
          </div>
        
            <div className="mt-6">              <TopTabsCard latestApps={latestApps} latestUsers={latestUsers} loading={loadingLists} fmt={fmt} />            </div>

</CardContent>
      </Card>
    </div>
  );
}