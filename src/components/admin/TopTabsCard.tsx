"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";

type TabId = "pending" | "approved" | "passive" | "users" | "messages";

type TabBtnProps = {
  id: TabId;
  label: string;
  active: boolean;
  onSelect: (id: TabId) => void;
};

function TabBtn({ id, label, active, onSelect }: TabBtnProps) {
  return (
    <button
      className={[
        "rounded-2xl px-5 py-2.5 min-w-[140px] text-sm font-extrabold ring-1 transition",
        active
          ? "bg-[#D9A400] text-black ring-[#D9A400]/50"
          : "bg-[#D9A400]/15 text-[#D9A400] ring-[#D9A400]/25 hover:bg-[#D9A400]/25",
      ].join(" ")}
      onClick={() => onSelect(id)}
    >
      {label}
    </button>
  );
}

function StatusPill({ status }: { status: any }) {
  return (
    <span
      className={[
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
        status === "approved"
          ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/20"
          : status === "pending"
          ? "bg-amber-500/15 text-amber-200 ring-amber-500/20"
          : "bg-white/10 text-white/60 ring-white/15",
      ].join(" ")}
    >
      {status === "approved" ? "Aktif" : status === "pending" ? "Onay bekliyor" : "Pasif"}
    </span>
  );
}


export function TopTabsCard({
  latestApps,
  latestUsers,
  loading,
  fmt,
}: {
  latestApps: any[];
  latestUsers: any[];
  loading: boolean;
  fmt: (v: any) => string;
}) {
  const [tab, setTab] = useState<TabId>("pending");
  const [page, setPage] = useState(0);

  const PAGE_SIZE = 10; // max 10 satır
  const MAX_PAGES = 10; // 10 sayfa = 100

  const listByTab = useMemo(() => {
    if (tab === "pending") return latestApps.filter((a) => a?.status === "pending");
    if (tab === "approved") return latestApps.filter((a) => a?.status === "approved");
    if (tab === "passive") return latestApps.filter((a) => a?.status === "passive");
    if (tab === "users") return latestUsers;
    return []; // messages
  }, [tab, latestApps, latestUsers]);

  const totalPages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(listByTab.length / PAGE_SIZE)));
  const safePage = Math.min(page, totalPages - 1);

  const items = useMemo(() => {
    return listByTab.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  }, [listByTab, safePage]);

  // min 5, veri geldikçe 10'a kadar
  const rows = Math.min(10, Math.max(5, items.length || 5));
  const fillers = Math.max(0, rows - items.length);

  function onSelectTab(id: TabId) {
    setTab(id);
    setPage(0);
  }


  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <TabBtn id="pending" label="Beklemede" active={tab==="pending"} onSelect={onSelectTab} />
          <TabBtn id="approved" label="Onaylı" active={tab==="approved"} onSelect={onSelectTab} />
          <TabBtn id="passive" label="Red" active={tab==="passive"} onSelect={onSelectTab} />
          <TabBtn id="users" label="Son Üyeler" active={tab==="users"} onSelect={onSelectTab} />
          <TabBtn id="messages" label="Mesajlarım" active={tab==="messages"} onSelect={onSelectTab} />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-white/60">
            Sayfa {safePage + 1}/{totalPages}
          </div>
          <Badge className="rounded-full bg-white/10 text-white/70 ring-1 ring-white/10">
            {tab === "messages" ? "Yakında" : listByTab.length}
          </Badge>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="text-sm text-white/50">Yükleniyor...</div>
        ) : tab === "messages" ? (
          Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white/60">—</div>
                <div className="truncate text-xs text-white/40">Henüz mesaj yok</div>
              </div>
              <div className="shrink-0 text-xs text-white/30">—</div>
            </div>
          ))
        ) : tab === "users" ? (
          <>
            {items.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{u?.displayName || u?.name || "Üye"}</div>
                  <div className="truncate text-xs text-white/60">{u?.email || u?.phone || u.id}</div>
                </div>
                <div className="shrink-0 text-xs text-white/50">{fmt(u?.createdAt)}</div>
              </div>
            ))}
            {Array.from({ length: fillers }).map((_, i) => (
              <div key={i} className="h-[46px] rounded-xl bg-white/5 ring-1 ring-white/10" />
            ))}
          </>
        ) : (
          <>
            {items.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold text-white">
                      {a?.business?.name || a?.businessName || a?.name || "İşletme"}
                    </div>
                    <StatusPill status={a?.status} />
                  </div>
                  <div className="truncate text-xs text-white/60">
                    {a?.user?.email || a?.ownerEmail || a?.email || a?.user?.uid || a?.uid || a.id}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-white/50">{fmt(a?.createdAt)}</div>
              </div>
            ))}
            {Array.from({ length: fillers }).map((_, i) => (
              <div key={i} className="h-[46px] rounded-xl bg-white/5 ring-1 ring-white/10" />
            ))}
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10 disabled:opacity-40"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={safePage === 0}
        >
          ‹
        </button>

        <div className="text-xs text-white/60">min 5 • max 10 satır • 10 sayfa</div>

        <button
          className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10 disabled:opacity-40"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={safePage >= totalPages - 1}
        >
          ›
        </button>
      </div>
    </div>
  );
}
