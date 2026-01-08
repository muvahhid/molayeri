"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase.client";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Biz = {
  id: string;
  status: "approved" | "pending" | "passive";
  name: string;
  ownerEmail?: string;
  ownerUid?: string;
  updatedAt?: any;
};

const PAGE_SIZE = 50;

export default function AdminBusinessesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Biz[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "approved" | "passive">("all");
  const lastDoc = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const firstDoc = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  async function load(reset = false, direction: "next" | "prev" | "init" = "init") {
    setLoading(true);
    try {
      let qs = query(
        collection(db, "businesses"),
        orderBy("updatedAt", "desc"),
        limit(PAGE_SIZE)
      );

      if (status !== "all") {
        qs = query(
          collection(db, "businesses"),
          where("status", "==", status),
          orderBy("updatedAt", "desc"),
          limit(PAGE_SIZE)
        );
      }

      if (!reset && direction === "next" && lastDoc.current) {
        qs = query(qs, startAfter(lastDoc.current));
      }

      const snap = await getDocs(qs);
      const list: Biz[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      if (snap.docs.length) {
        firstDoc.current = snap.docs[0];
        lastDoc.current = snap.docs[snap.docs.length - 1];
      }

      setRows(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true, "init");
  }, [status]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => (r.name || "").toLowerCase().includes(t));
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-black">İşletmeler</div>
          <div className="mt-1 text-sm text-white/60">Firestore: businesses</div>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="h-10 rounded-2xl bg-white/5 px-4 text-sm text-white ring-1 ring-white/10"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="all">Tümü</option>
            <option value="approved">Onaylı</option>
            <option value="passive">Pasif</option>
          </select>
          <div className="w-[320px]">
            <Input label="Ara" placeholder="İşletme adı..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.8fr] gap-0 border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-extrabold tracking-widest text-white/45">
          <div>İŞLETME</div>
          <div>SAHİP</div>
          <div>DURUM</div>
          <div className="text-right">AKSİYON</div>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-white/60">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-white/60">Kayıt yok.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {filtered.map((r) => (
              <div key={r.id} role="button" tabIndex={0} onClick={() => router.push(`/admin/isletmeler/${r.id}`)} onKeyDown={(e) => { if (e.key === "Enter") router.push(`/admin/isletmeler/${r.id}`); }} className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.04]">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-extrabold text-white">{r.name || "-"}</div>
                  <div className="mt-1 truncate text-xs text-white/50">{r.id}</div>
                </div>

                <div className="min-w-0 w-[28%]">
                  <div className="truncate text-sm font-bold text-white">{r.ownerEmail || "-"}</div>
                  <div className="mt-1 truncate text-xs text-white/50">{r.ownerUid || "-"}</div>
                </div>

                <div className="w-[16%]">
                  {r.status === "approved" ? (
                    <Badge variant="active">ONAYLI</Badge>
                  ) : r.status === "passive" ? (
                    <Badge>PASİF</Badge>
                  ) : (
                    <Badge>PENDING</Badge>
                  )}
                </div>

                <div className="ml-auto flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    className="px-4 py-2 rounded-2xl"
                    onClick={() => router.push(`/admin/isletmeler/${r.id}`)}
                  >
                    Detay
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => load(false, "prev")}>
          ‹ Önceki
        </Button>
        <Button variant="ghost" onClick={() => load(false, "next")}>
          Sonraki ›
        </Button>
      </div>
    </div>
  );
}
