'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Ban,
  CarFront,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Shield,
  Users,
  Waypoints,
} from 'lucide-react'

type Kpis = {
  totalPosts: number
  activePosts: number
  pendingRequests: number
  activeMatches: number
  completedMatches24h: number
  activeChannels: number
  messages24h: number
}

type PostItem = {
  id: string
  owner_id: string
  owner_name: string | null
  post_type: string | null
  title: string | null
  origin_text: string | null
  destination_text: string | null
  is_active: boolean | null
  created_at: string
  updated_at: string
}

type RequestItem = {
  id: string
  post_id: string
  post_owner_id: string
  requester_id: string
  requester_name: string | null
  owner_name: string | null
  status: string | null
  pickup_text: string | null
  dropoff_text: string | null
  created_at: string
  updated_at: string
}

type MatchItem = {
  id: string
  request_id: string
  post_id: string
  driver_id: string
  rider_id: string
  driver_name: string | null
  rider_name: string | null
  status: string | null
  created_at: string
  updated_at: string
}

type ChannelItem = {
  id: string
  created_by: string
  creator_name: string | null
  name: string | null
  topic: string | null
  is_active: boolean | null
  created_at: string
  updated_at: string
}

type ChannelMessageItem = {
  id: number
  channel_id: string
  sender_id: string
  sender_name: string | null
  message: string | null
  created_at: string
}

type AdminAction =
  | 'deactivate_post'
  | 'activate_post'
  | 'cancel_request'
  | 'reject_request'
  | 'cancel_match'
  | 'complete_match'
  | 'deactivate_channel'
  | 'activate_channel'
  | 'delete_channel_message'

type ActionPayload = {
  action: AdminAction
  postId?: string
  requestId?: string
  matchId?: string
  channelId?: string
  messageId?: number
  reason?: string
}

type ApiState = {
  kpis: Kpis
  posts: PostItem[]
  requests: RequestItem[]
  matches: MatchItem[]
  channels: ChannelItem[]
  messages: ChannelMessageItem[]
  fetchedAt: string | null
}

const DEFAULT_STATE: ApiState = {
  kpis: {
    totalPosts: 0,
    activePosts: 0,
    pendingRequests: 0,
    activeMatches: 0,
    completedMatches24h: 0,
    activeChannels: 0,
    messages24h: 0,
  },
  posts: [],
  requests: [],
  matches: [],
  channels: [],
  messages: [],
  fetchedAt: null,
}

function toTs(raw: string): number {
  const ts = new Date(raw).getTime()
  return Number.isFinite(ts) ? ts : 0
}

function shortId(value: string): string {
  if (!value) return '-'
  if (value.length <= 10) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function timeAgo(raw: string): string {
  const ts = toTs(raw)
  if (!ts) return 'Bilinmiyor'
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 60) return 'Az önce'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} dk önce`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} sa önce`
  return `${Math.floor(diffSec / 86400)} gün önce`
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
}

function postTypeLabel(value: string | null): string {
  const n = normalizeText(value || '')
  if (n === 'driver_offer') return 'Sürücü İlanı'
  if (n === 'rider_request') return 'Yolcu İsteği'
  return 'İlan'
}

function requestStatusLabel(value: string | null): string {
  const n = normalizeText(value || '')
  if (n === 'pending') return 'Bekliyor'
  if (n === 'accepted') return 'Kabul'
  if (n === 'rejected') return 'Red'
  if (n === 'cancelled') return 'İptal'
  if (n === 'completed') return 'Tamamlandı'
  return value || '-'
}

function matchStatusLabel(value: string | null): string {
  const n = normalizeText(value || '')
  if (n === 'active') return 'Aktif'
  if (n === 'completed') return 'Tamamlandı'
  if (n === 'cancelled') return 'İptal'
  return value || '-'
}

function toneForRequest(value: string | null): string {
  const n = normalizeText(value || '')
  if (n === 'pending') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (n === 'accepted') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (n === 'completed') return 'bg-blue-100 text-blue-700 border-blue-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function toneForMatch(value: string | null): string {
  const n = normalizeText(value || '')
  if (n === 'active') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (n === 'completed') return 'bg-blue-100 text-blue-700 border-blue-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function StatCard({
  title,
  value,
  note,
  icon,
  tone,
}: {
  title: string
  value: number
  note: string
  icon: React.ReactNode
  tone: 'blue' | 'green' | 'amber' | 'violet' | 'rose'
}) {
  const toneMap: Record<typeof tone, string> = {
    blue: 'from-blue-500 to-blue-600 shadow-[0_14px_22px_-15px_rgba(37,99,235,0.7)]',
    green: 'from-emerald-500 to-emerald-600 shadow-[0_14px_22px_-15px_rgba(5,150,105,0.7)]',
    amber: 'from-amber-500 to-orange-500 shadow-[0_14px_22px_-15px_rgba(249,115,22,0.72)]',
    violet: 'from-violet-500 to-indigo-600 shadow-[0_14px_22px_-15px_rgba(109,40,217,0.72)]',
    rose: 'from-rose-500 to-rose-600 shadow-[0_14px_22px_-15px_rgba(225,29,72,0.72)]',
  }

  return (
    <article className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_18px_28px_-24px_rgba(15,23,42,0.8)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">{title}</p>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white ${toneMap[tone]}`}>{icon}</span>
      </div>
      <p className="mt-2 text-3xl leading-none font-bold text-slate-800">{new Intl.NumberFormat('tr-TR').format(value)}</p>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </article>
  )
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.75)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">{title}</p>
          <p className="text-sm font-semibold text-slate-700 mt-1">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="mt-3 space-y-2.5">{children}</div>
    </section>
  )
}

export default function AdminMolaStopPage() {
  const [state, setState] = useState<ApiState>(DEFAULT_STATE)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  const loadData = async (soft = false) => {
    if (soft) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const response = await fetch('/api/admin/molastop', { method: 'GET', cache: 'no-store' })
      const payload = (await response.json()) as {
        error?: string
        fetchedAt?: string
        kpis?: Kpis
        feeds?: {
          posts?: PostItem[]
          requests?: RequestItem[]
          matches?: MatchItem[]
          channels?: ChannelItem[]
          messages?: ChannelMessageItem[]
        }
      }

      if (!response.ok) {
        throw new Error(payload.error || 'MolaStop verileri alınamadı.')
      }

      setState({
        kpis: payload.kpis || DEFAULT_STATE.kpis,
        posts: payload.feeds?.posts || [],
        requests: payload.feeds?.requests || [],
        matches: payload.feeds?.matches || [],
        channels: payload.feeds?.channels || [],
        messages: payload.feeds?.messages || [],
        fetchedAt: payload.fetchedAt || new Date().toISOString(),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata.'
      setError(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadData(false)
  }, [])

  const fetchedAtText = useMemo(() => {
    if (!state.fetchedAt) return 'Henüz yüklenmedi'
    return new Date(state.fetchedAt).toLocaleString('tr-TR')
  }, [state.fetchedAt])

  const runAction = async (payload: ActionPayload, key: string, confirmText?: string) => {
    if (confirmText && typeof window !== 'undefined') {
      const ok = window.confirm(confirmText)
      if (!ok) return
    }

    setPendingActions((current) => ({ ...current, [key]: true }))

    try {
      const response = await fetch('/api/admin/molastop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(result.error || 'Müdahale işlemi tamamlanamadı.')
      }
      await loadData(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Müdahale başarısız.'
      setError(message)
    } finally {
      setPendingActions((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/80 bg-white/95 p-10 text-center shadow-[0_18px_30px_-24px_rgba(15,23,42,0.75)]">
        <Loader2 size={28} className="animate-spin text-slate-500 mx-auto" />
        <p className="mt-3 text-sm text-slate-500">MolaStop admin verileri yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[26px] border border-white/80 bg-[linear-gradient(160deg,#ffffff_0%,#f6f9ff_100%)] p-4 md:p-5 shadow-[0_24px_40px_-28px_rgba(15,23,42,0.76)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-slate-500">Admin • MolaStop</p>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">MolaStop Komuta Merkezi</h1>
            <p className="text-sm text-slate-500 mt-1">İstatistik, canlı hareket ve anlık müdahale akışı tek ekranda.</p>
          </div>

          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 shadow-[0_12px_18px_-16px_rgba(15,23,42,0.6)] disabled:opacity-60"
          >
            {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Yenile
          </button>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</div>
        ) : null}

        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Clock3 size={14} />
          Son güncelleme: {fetchedAtText}
        </p>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Aktif İlan"
          value={state.kpis.activePosts}
          note={`Toplam ${state.kpis.totalPosts} ilan`}
          icon={<CarFront size={16} />}
          tone="blue"
        />
        <StatCard
          title="Bekleyen İstek"
          value={state.kpis.pendingRequests}
          note="Sürücü/yolcu cevap bekliyor"
          icon={<Users size={16} />}
          tone="amber"
        />
        <StatCard
          title="Aktif Eşleşme"
          value={state.kpis.activeMatches}
          note={`24 saatte ${state.kpis.completedMatches24h} tamamlanan`}
          icon={<Waypoints size={16} />}
          tone="green"
        />
        <StatCard
          title="Kanal Trafiği"
          value={state.kpis.messages24h}
          note={`${state.kpis.activeChannels} aktif kanal`}
          icon={<MessageSquare size={16} />}
          tone="violet"
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard title="İlan Hareketleri" subtitle="Canlı ilanlar ve durum müdahalesi">
          {state.posts.length === 0 ? (
            <p className="text-sm text-slate-500">İlan kaydı bulunamadı.</p>
          ) : (
            state.posts.map((item) => {
              const key = `post:${item.id}`
              const busy = Boolean(pendingActions[key])
              const isActive = item.is_active === true

              return (
                <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/90 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.title || 'Adsız ilan'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{postTypeLabel(item.post_type)} • {item.owner_name || shortId(item.owner_id)}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-600">{item.origin_text || '-'} → {item.destination_text || '-'}</p>
                  <p className="mt-1 text-[11px] text-slate-500">Güncelleme: {timeAgo(item.updated_at)}</p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            { action: 'deactivate_post', postId: item.id },
                            key,
                            'Bu ilan pasife alınacak. Devam etmek istiyor musun?'
                          )
                        }
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <PauseCircle size={13} />}
                        Pasife Al
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            { action: 'activate_post', postId: item.id },
                            key,
                            'Bu ilan tekrar aktifleştirilecek. Devam?'
                          )
                        }
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <PlayCircle size={13} />}
                        Aktif Et
                      </button>
                    )}
                  </div>
                </article>
              )
            })
          )}
        </SectionCard>

        <SectionCard title="İstek Hareketleri" subtitle="Bekleyen kabul/red akışı ve acil müdahale">
          {state.requests.length === 0 ? (
            <p className="text-sm text-slate-500">İstek kaydı bulunamadı.</p>
          ) : (
            state.requests.map((item) => {
              const key = `request:${item.id}`
              const busy = Boolean(pendingActions[key])
              const normalized = normalizeText(item.status || '')
              const actionable = normalized === 'pending' || normalized === 'accepted'

              return (
                <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/90 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.requester_name || shortId(item.requester_id)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">İlan sahibi: {item.owner_name || shortId(item.post_owner_id)}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneForRequest(item.status)}`}>
                      {requestStatusLabel(item.status)}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-600">{item.pickup_text || '-'} → {item.dropoff_text || '-'}</p>
                  <p className="mt-1 text-[11px] text-slate-500">Güncelleme: {timeAgo(item.updated_at)}</p>

                  {actionable ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            { action: 'cancel_request', requestId: item.id },
                            key,
                            'Bu istek admin tarafından iptal edilecek. Onaylıyor musun?'
                          )
                        }
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                        İptal Et
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            { action: 'reject_request', requestId: item.id },
                            key,
                            'Bu istek reddedilecek. Devam?'
                          )
                        }
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
                        Reddet
                      </button>
                    </div>
                  ) : null}
                </article>
              )
            })
          )}
        </SectionCard>

        <SectionCard title="Eşleşme Hareketleri" subtitle="Aktif eşleşmeleri sonlandır / tamamla">
          {state.matches.length === 0 ? (
            <p className="text-sm text-slate-500">Eşleşme kaydı bulunamadı.</p>
          ) : (
            state.matches.map((item) => {
              const key = `match:${item.id}`
              const busy = Boolean(pendingActions[key])
              const normalized = normalizeText(item.status || '')
              const canAct = normalized === 'active'

              return (
                <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/90 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.driver_name || shortId(item.driver_id)} ↔ {item.rider_name || shortId(item.rider_id)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Eşleşme: {shortId(item.id)}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneForMatch(item.status)}`}>
                      {matchStatusLabel(item.status)}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-500">Güncelleme: {timeAgo(item.updated_at)}</p>

                  {canAct ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            { action: 'cancel_match', matchId: item.id },
                            key,
                            'Bu aktif eşleşme iptal edilecek. Devam?'
                          )
                        }
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <PauseCircle size={13} />}
                        Sonlandır
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            { action: 'complete_match', matchId: item.id },
                            key,
                            'Bu eşleşme tamamlandı olarak işaretlenecek. Devam?'
                          )
                        }
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        Tamamla
                      </button>
                    </div>
                  ) : null}
                </article>
              )
            })
          )}
        </SectionCard>

        <SectionCard title="Kanal + Mesaj Müdahalesi" subtitle="Kanal dondurma/açma ve mesaj silme">
          <div className="space-y-2">
            {state.channels.length === 0 ? (
              <p className="text-sm text-slate-500">Kanal kaydı bulunamadı.</p>
            ) : (
              state.channels.slice(0, 8).map((item) => {
                const key = `channel:${item.id}`
                const busy = Boolean(pendingActions[key])
                const isActive = item.is_active === true

                return (
                  <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/90 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.name || shortId(item.id)}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Kurucu: {item.creator_name || shortId(item.created_by)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            { action: isActive ? 'deactivate_channel' : 'activate_channel', channelId: item.id },
                            key,
                            isActive ? 'Kanal dondurulacak. Devam?' : 'Kanal tekrar açılacak. Devam?'
                          )
                        }
                        disabled={busy}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${
                          isActive
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : isActive ? <PauseCircle size={13} /> : <PlayCircle size={13} />}
                        {isActive ? 'Dondur' : 'Aç'}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{item.topic || 'Konu girilmemiş'}</p>
                  </article>
                )
              })
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
            {state.messages.length === 0 ? (
              <p className="text-sm text-slate-500">Kanal mesajı bulunamadı.</p>
            ) : (
              state.messages.slice(0, 8).map((item) => {
                const key = `message:${item.id}`
                const busy = Boolean(pendingActions[key])

                return (
                  <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{item.sender_name || shortId(item.sender_id)} • {timeAgo(item.created_at)}</p>
                        <p className="mt-1 text-xs text-slate-600 line-clamp-2">{item.message || '-'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            { action: 'delete_channel_message', messageId: item.id },
                            key,
                            'Bu kanal mesajı silinecek. Devam?'
                          )
                        }
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                        Sil
                      </button>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </SectionCard>
      </section>

      <section className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_16px_26px_-22px_rgba(15,23,42,0.7)]">
        <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">Hızlı Özet</p>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
            <p className="font-semibold">Operasyon</p>
            <p className="mt-1 text-xs text-slate-600">Bekleyen istek + aktif eşleşme toplamı: {state.kpis.pendingRequests + state.kpis.activeMatches}</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
            <p className="font-semibold">İçerik</p>
            <p className="mt-1 text-xs text-slate-600">Son 24 saatte kanal mesajı: {state.kpis.messages24h}</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
            <p className="font-semibold">Güvenlik</p>
            <p className="mt-1 text-xs text-slate-600">Bu panelde tüm admin müdahaleleri kullanıcıya admin_signal olarak bildirilir.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
