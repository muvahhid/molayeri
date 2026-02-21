'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CircleDollarSign,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Loader2,
  MessageCircleMore,
  MessagesSquare,
  RefreshCw,
  Route,
  ShieldAlert,
  Sparkles,
  Store,
  UserCheck2,
  Users,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'

type DashboardKpis = {
  totalUsers: number
  merchantUsers: number
  bannedUsers: number
  activeBusinesses: number
  pendingBusinesses: number
  rejectedBusinesses: number
  messagesToday: number
  unreadMessages: number
  reportedReviews: number
  lowRating30d: number
  pendingConvoyOffers: number
}

type TrendPoint = {
  key: string
  label: string
  users: number
  businesses: number
}

type PendingBusinessRow = {
  id: string
  name: string | null
  type: string | null
  created_at: string
}

type RawReviewRow = {
  id: string
  business_id: string
  rating: number | null
  created_at: string
  report_reason?: string | null
}

type ReviewQueueItem = {
  id: string
  businessId: string
  businessName: string
  rating: number | null
  reason: string
  createdAt: string
}

type FeedLevel = 'high' | 'medium' | 'low'
type FeedKind = 'business' | 'message' | 'review' | 'user'

type FeedItem = {
  id: string
  kind: FeedKind
  level: FeedLevel
  title: string
  subtitle: string
  createdAt: string
  href: string
}

type AlertItem = {
  id: string
  severity: FeedLevel
  title: string
  detail: string
  href: string
}

type CategorySlice = {
  label: string
  count: number
  ratio: number
}

type CountResponse = {
  count: number | null
  error: { message?: string } | null
}

type StatCardItem = {
  title: string
  value: number
  subtitle: string
  icon: ComponentType<{ size?: number }>
  href: string
  tone: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'slate'
}

const DEFAULT_KPIS: DashboardKpis = {
  totalUsers: 0,
  merchantUsers: 0,
  bannedUsers: 0,
  activeBusinesses: 0,
  pendingBusinesses: 0,
  rejectedBusinesses: 0,
  messagesToday: 0,
  unreadMessages: 0,
  reportedReviews: 0,
  lowRating30d: 0,
  pendingConvoyOffers: 0,
}

const TONE_CLASS: Record<StatCardItem['tone'], string> = {
  blue: 'from-blue-500 to-blue-600 shadow-[0_12px_18px_-14px_rgba(37,99,235,0.8)]',
  emerald: 'from-emerald-500 to-emerald-600 shadow-[0_12px_18px_-14px_rgba(5,150,105,0.78)]',
  amber: 'from-amber-500 to-orange-500 shadow-[0_12px_18px_-14px_rgba(249,115,22,0.72)]',
  violet: 'from-violet-500 to-indigo-600 shadow-[0_12px_18px_-14px_rgba(109,40,217,0.72)]',
  rose: 'from-rose-500 to-rose-600 shadow-[0_12px_18px_-14px_rgba(225,29,72,0.72)]',
  slate: 'from-slate-500 to-slate-600 shadow-[0_12px_18px_-14px_rgba(51,65,85,0.72)]',
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function dateKey(raw: Date | string): string {
  const dt = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(dt.getTime())) return ''
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

function dayStart(raw: Date): Date {
  return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate())
}

function shiftDays(raw: Date, days: number): Date {
  const next = new Date(raw)
  next.setDate(next.getDate() + days)
  return next
}

function toTs(raw: string): number {
  const ts = new Date(raw).getTime()
  return Number.isFinite(ts) ? ts : 0
}

function compact(value: number): string {
  return new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function relativeTime(raw: string): string {
  const ts = toTs(raw)
  if (!ts) return 'Bilinmiyor'
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 60) return 'Az önce'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} dk önce`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} sa önce`
  return `${Math.floor(diffSec / 86400)} gün önce`
}

function businessTypeLabel(raw: string | null): string {
  const value = (raw || '').trim().toLowerCase()
  if (value === 'yakit') return 'Yakıt'
  if (value === 'sarj') return 'Şarj'
  if (value === 'yemek') return 'Yemek'
  if (value === 'market') return 'Market'
  if (value === 'kafe') return 'Kafe'
  if (value === 'otel') return 'Otel'
  if (value === 'servis') return 'Servis'
  return value || 'Diğer'
}

function roleLabel(raw: string | null): string {
  const value = (raw || '').trim().toLowerCase()
  if (value === 'admin') return 'Admin'
  if (value === 'isletmeci') return 'İşletmeci'
  if (value === 'pending_business') return 'İşletmeci Adayı'
  return 'Kullanıcı'
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function buildTrendWindow(days: number): TrendPoint[] {
  const today = dayStart(new Date())
  const start = shiftDays(today, -(days - 1))
  const list: TrendPoint[] = []
  for (let i = 0; i < days; i += 1) {
    const current = shiftDays(start, i)
    list.push({
      key: dateKey(current),
      label: current.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
      users: 0,
      businesses: 0,
    })
  }
  return list
}

function severityClass(level: FeedLevel): string {
  if (level === 'high') return 'text-rose-700 bg-rose-100 border-rose-200'
  if (level === 'medium') return 'text-amber-700 bg-amber-100 border-amber-200'
  return 'text-emerald-700 bg-emerald-100 border-emerald-200'
}

function cardToneClass(level: FeedLevel): string {
  if (level === 'high') return 'border-rose-200 bg-rose-50'
  if (level === 'medium') return 'border-amber-200 bg-amber-50'
  return 'border-emerald-200 bg-emerald-50'
}

async function safeCount(query: PromiseLike<CountResponse>): Promise<number> {
  try {
    const { count, error } = await query
    if (error) return 0
    return count || 0
  } catch {
    return 0
  }
}

function StatCard({ item }: { item: StatCardItem }) {
  const Icon = item.icon
  return (
    <Link href={item.href} className="group block">
      <article className="rounded-[22px] border border-white/75 bg-white p-4 shadow-[0_16px_24px_-22px_rgba(15,23,42,0.72)] transition-all group-hover:-translate-y-0.5 group-hover:shadow-[0_22px_30px_-22px_rgba(15,23,42,0.65)]">
        <div className="flex items-start justify-between gap-3">
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white ${TONE_CLASS[item.tone]}`}>
            <Icon size={17} />
          </span>
          <ArrowRight size={15} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600" />
        </div>
        <p className="mt-3 text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">{item.title}</p>
        <p className="mt-1 text-[28px] leading-none font-bold text-slate-800">{compact(item.value)}</p>
        <p className="mt-2 text-[11px] font-medium text-slate-500">{item.subtitle}</p>
      </article>
    </Link>
  )
}

function TrendLegend() {
  return (
    <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
        Kullanıcı
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        İşletme
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  const [kpis, setKpis] = useState<DashboardKpis>(DEFAULT_KPIS)
  const [trend, setTrend] = useState<TrendPoint[]>(buildTrendWindow(14))
  const [pendingQueue, setPendingQueue] = useState<PendingBusinessRow[]>([])
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [categoryMix, setCategoryMix] = useState<CategorySlice[]>([])
  const [feed, setFeed] = useState<FeedItem[]>([])

  const loadDashboard = async (silent = false) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setErrorText('')

    const now = new Date()
    const todayStart = dayStart(now).toISOString()
    const trendStart = shiftDays(dayStart(now), -13).toISOString()
    const thirtyDaysStart = shiftDays(dayStart(now), -29).toISOString()

    try {
      const { data: authData } = await supabase.auth.getUser()
      const currentUserId = authData.user?.id || null

      const unreadMessages = currentUserId
        ? await safeCount(
            supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('recipient_id', currentUserId)
              .eq('is_read', false)
          )
        : 0

      const [
        totalUsers,
        merchants,
        pendingMerchants,
        bannedUsers,
        activeBusinesses,
        pendingBusinesses,
        rejectedBusinesses,
        messagesToday,
        reportedReviews,
        lowRating30d,
        pendingConvoyOffers,
      ] = await Promise.all([
        safeCount(supabase.from('profiles').select('*', { count: 'exact', head: true })),
        safeCount(supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'isletmeci')),
        safeCount(supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'pending_business')),
        safeCount(supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'banned')),
        safeCount(supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'active')),
        safeCount(supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'pending')),
        safeCount(supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'rejected')),
        safeCount(supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', todayStart)),
        safeCount(supabase.from('business_reviews').select('id', { count: 'exact', head: true }).eq('is_reported', true)),
        safeCount(
          supabase
            .from('business_reviews')
            .select('id', { count: 'exact', head: true })
            .lte('rating', 2)
            .gte('created_at', thirtyDaysStart)
        ),
        safeCount(supabase.from('convoy_offers').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
      ])

      setKpis({
        totalUsers,
        merchantUsers: merchants + pendingMerchants,
        bannedUsers,
        activeBusinesses,
        pendingBusinesses,
        rejectedBusinesses,
        messagesToday,
        unreadMessages,
        reportedReviews,
        lowRating30d,
        pendingConvoyOffers,
      })

      const [profileTrendRes, businessTrendRes, pendingQueueRes, latestMessagesRes, latestProfilesRes, businessPoolRes] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id,created_at')
            .gte('created_at', trendStart)
            .order('created_at', { ascending: true })
            .limit(6000),
          supabase
            .from('businesses')
            .select('id,name,type,status,created_at')
            .gte('created_at', trendStart)
            .order('created_at', { ascending: true })
            .limit(6000),
          supabase
            .from('businesses')
            .select('id,name,type,created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(8),
          supabase.from('messages').select('id,subject,message_type,created_at,is_read').order('created_at', { ascending: false }).limit(10),
          supabase.from('profiles').select('id,full_name,email,role,status,created_at').order('created_at', { ascending: false }).limit(10),
          supabase.from('businesses').select('id,name,type,status,created_at').order('created_at', { ascending: false }).limit(900),
        ])

      let reportedRows: RawReviewRow[] = []
      const reportedPrimary = await supabase
        .from('business_reviews')
        .select('id,business_id,rating,created_at,report_reason')
        .eq('is_reported', true)
        .order('created_at', { ascending: false })
        .limit(8)

      if (!reportedPrimary.error && reportedPrimary.data) {
        reportedRows = reportedPrimary.data as RawReviewRow[]
      } else {
        const reportedFallback = await supabase
          .from('business_reviews')
          .select('id,business_id,rating,created_at')
          .eq('is_reported', true)
          .order('created_at', { ascending: false })
          .limit(8)
        reportedRows = (reportedFallback.data || []) as RawReviewRow[]
      }

      const trendTemplate = buildTrendWindow(14)
      const trendMap = new Map<string, TrendPoint>()
      for (const point of trendTemplate) {
        trendMap.set(point.key, { ...point })
      }

      const profileTrendRows = (profileTrendRes.data || []) as { created_at: string }[]
      for (const row of profileTrendRows) {
        const key = dateKey(row.created_at)
        const target = trendMap.get(key)
        if (target) target.users += 1
      }

      const businessTrendRows = (businessTrendRes.data || []) as { created_at: string }[]
      for (const row of businessTrendRows) {
        const key = dateKey(row.created_at)
        const target = trendMap.get(key)
        if (target) target.businesses += 1
      }

      const trendRows = Array.from(trendMap.values())
      setTrend(trendRows)

      const pendingRows = (pendingQueueRes.data || []) as PendingBusinessRow[]
      setPendingQueue(pendingRows)

      const reviewBusinessIds = Array.from(new Set(reportedRows.map((row) => row.business_id).filter(Boolean)))
      const businessNameMap = new Map<string, string>()
      if (reviewBusinessIds.length > 0) {
        const namesRes = await supabase.from('businesses').select('id,name').in('id', reviewBusinessIds)
        const namesRows = (namesRes.data || []) as { id: string; name: string | null }[]
        for (const row of namesRows) {
          businessNameMap.set(row.id, row.name || 'İşletme')
        }
      }

      const normalizedReviewQueue: ReviewQueueItem[] = reportedRows.map((row) => ({
        id: row.id,
        businessId: row.business_id,
        businessName: businessNameMap.get(row.business_id) || 'İşletme',
        rating: row.rating,
        reason: (row.report_reason || '').trim() || 'Neden belirtilmedi',
        createdAt: row.created_at,
      }))
      setReviewQueue(normalizedReviewQueue)

      const businessPoolRows = (businessPoolRes.data || []) as { type: string | null }[]
      const mixCounter = new Map<string, number>()
      for (const row of businessPoolRows) {
        const key = businessTypeLabel(row.type)
        mixCounter.set(key, (mixCounter.get(key) || 0) + 1)
      }

      const mixList = Array.from(mixCounter.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
      const totalMix = mixList.reduce((acc, item) => acc + item.count, 0)
      setCategoryMix(
        mixList.map((item) => ({
          label: item.label,
          count: item.count,
          ratio: totalMix > 0 ? item.count / totalMix : 0,
        }))
      )

      const messageRows = (latestMessagesRes.data || []) as {
        id: string
        subject: string | null
        message_type: string | null
        created_at: string
        is_read: boolean | null
      }[]

      const profileRows = (latestProfilesRes.data || []) as {
        id: string
        full_name: string | null
        email: string | null
        role: string | null
        status: string | null
        created_at: string
      }[]

      const businessRows = ((businessPoolRes.data || []) as {
        id: string
        name: string | null
        type: string | null
        status: string | null
        created_at: string
      }[]).slice(0, 10)

      const feedItems: FeedItem[] = []

      for (const row of pendingRows) {
        feedItems.push({
          id: `pending-${row.id}`,
          kind: 'business',
          level: 'high',
          title: `${row.name || 'İşletme'} onay bekliyor`,
          subtitle: `${businessTypeLabel(row.type)} • ${relativeTime(row.created_at)}`,
          createdAt: row.created_at,
          href: '/admin/approvals',
        })
      }

      for (const row of normalizedReviewQueue) {
        feedItems.push({
          id: `review-${row.id}`,
          kind: 'review',
          level: 'high',
          title: `${row.businessName} için raporlu yorum`,
          subtitle: `${row.reason} • ${relativeTime(row.createdAt)}`,
          createdAt: row.createdAt,
          href: '/admin/reviews',
        })
      }

      for (const row of messageRows) {
        const messageType = (row.message_type || '').toString().toLowerCase() === 'direct' ? 'Özel mesaj' : 'Sistem mesajı'
        feedItems.push({
          id: `message-${row.id}`,
          kind: 'message',
          level: row.is_read === false ? 'medium' : 'low',
          title: row.subject?.trim() || 'Başlıksız mesaj',
          subtitle: `${messageType} • ${relativeTime(row.created_at)}`,
          createdAt: row.created_at,
          href: '/admin/messages',
        })
      }

      for (const row of profileRows) {
        feedItems.push({
          id: `profile-${row.id}`,
          kind: 'user',
          level: row.role === 'pending_business' ? 'medium' : 'low',
          title: `${row.full_name || row.email || 'Yeni kullanıcı'} kaydı`,
          subtitle: `${roleLabel(row.role)} • ${relativeTime(row.created_at)}`,
          createdAt: row.created_at,
          href: '/admin/users',
        })
      }

      for (const row of businessRows) {
        if ((row.status || '').toLowerCase() === 'pending') continue
        feedItems.push({
          id: `business-${row.id}`,
          kind: 'business',
          level: 'low',
          title: `${row.name || 'İşletme'} oluşturuldu`,
          subtitle: `${businessTypeLabel(row.type)} • ${relativeTime(row.created_at)}`,
          createdAt: row.created_at,
          href: '/admin/businesses',
        })
      }

      feedItems.sort((a, b) => toTs(b.createdAt) - toTs(a.createdAt))
      setFeed(feedItems.slice(0, 12))

      const nextAlerts: AlertItem[] = []
      if (pendingBusinesses > 0) {
        nextAlerts.push({
          id: 'pending-businesses',
          severity: pendingBusinesses >= 10 ? 'high' : 'medium',
          title: `${pendingBusinesses} işletme başvurusu bekliyor`,
          detail: 'Onay sırası uzadıkça işletmeci onboarding deneyimi düşüyor.',
          href: '/admin/approvals',
        })
      }
      if (reportedReviews > 0) {
        nextAlerts.push({
          id: 'reported-reviews',
          severity: reportedReviews >= 8 ? 'high' : 'medium',
          title: `${reportedReviews} raporlu yorum incelenmeyi bekliyor`,
          detail: 'Şikayet kuyruğunu hızlı kapatmak marka güveni için kritik.',
          href: '/admin/reviews',
        })
      }
      if (unreadMessages > 0) {
        nextAlerts.push({
          id: 'unread-messages',
          severity: unreadMessages >= 40 ? 'high' : 'medium',
          title: `${unreadMessages} okunmamış mesaj var`,
          detail: 'Yönetim mesaj merkezi gecikmeye girmiş olabilir.',
          href: '/admin/messages',
        })
      }
      if (bannedUsers > 0) {
        nextAlerts.push({
          id: 'banned-users',
          severity: bannedUsers >= 25 ? 'medium' : 'low',
          title: `${bannedUsers} yasaklı hesap kayıtlı`,
          detail: 'Suistimal analizini periyodik kontrol etmek önerilir.',
          href: '/admin/users',
        })
      }
      if (nextAlerts.length === 0) {
        nextAlerts.push({
          id: 'healthy',
          severity: 'low',
          title: 'Kritik kuyruk görünmüyor',
          detail: 'Onay, mesaj ve şikayet akışları stabil çalışıyor.',
          href: '/admin/dashboard',
        })
      }
      setAlerts(nextAlerts)

      setLastSyncedAt(new Date().toISOString())
    } catch (error) {
      console.error('Admin dashboard yüklenemedi', error)
      setErrorText('Dashboard verileri alınamadı. Lütfen tekrar deneyin.')
    } finally {
      if (silent) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    void loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pendingPressure = kpis.pendingBusinesses / Math.max(1, kpis.pendingBusinesses + kpis.activeBusinesses)
  const reviewPressure = kpis.reportedReviews / Math.max(1, kpis.activeBusinesses)
  const inboxPressure = kpis.unreadMessages / Math.max(1, kpis.messagesToday || 1)
  const safetyPressure = kpis.bannedUsers / Math.max(1, kpis.totalUsers)
  const maxTrend = Math.max(1, ...trend.map((point) => Math.max(point.users, point.businesses)))

  const statCards: StatCardItem[] = [
    {
      title: 'Toplam Kullanıcı',
      value: kpis.totalUsers,
      subtitle: `${compact(kpis.merchantUsers)} işletmeci + aday`,
      icon: Users,
      href: '/admin/users',
      tone: 'blue',
    },
    {
      title: 'Aktif İşletme',
      value: kpis.activeBusinesses,
      subtitle: `${compact(kpis.pendingBusinesses)} onay bekleyen`,
      icon: Store,
      href: '/admin/businesses',
      tone: 'emerald',
    },
    {
      title: 'Onay Kuyruğu',
      value: kpis.pendingBusinesses,
      subtitle: `${compact(kpis.rejectedBusinesses)} reddedilen kayıt`,
      icon: ClipboardCheck,
      href: '/admin/approvals',
      tone: 'amber',
    },
    {
      title: 'Mesaj Trafiği',
      value: kpis.messagesToday,
      subtitle: `${compact(kpis.unreadMessages)} okunmamış mesaj`,
      icon: MessagesSquare,
      href: '/admin/messages',
      tone: 'violet',
    },
    {
      title: 'Raporlu Yorum',
      value: kpis.reportedReviews,
      subtitle: `Son 30 gün düşük puan: ${compact(kpis.lowRating30d)}`,
      icon: ShieldAlert,
      href: '/admin/reviews',
      tone: 'rose',
    },
    {
      title: 'Bekleyen Konvoy Teklifi',
      value: kpis.pendingConvoyOffers,
      subtitle: 'Konvoy operasyon hattı',
      icon: Route,
      href: '/admin/messages',
      tone: 'slate',
    },
  ]

  if (loading) {
    return (
      <div className="min-h-[420px] rounded-[28px] border border-white/70 bg-[linear-gradient(145deg,#ffffff_0%,#f2f7ff_100%)] shadow-[0_26px_30px_-24px_rgba(15,23,42,0.72)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[30px] border border-white/75 bg-[linear-gradient(145deg,#ffffff_0%,#eef4ff_58%,#eaf2ff_100%)] p-4 md:p-5 shadow-[0_26px_34px_-26px_rgba(15,23,42,0.72)]">
        <div className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full bg-blue-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-amber-300/25 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/85 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shadow-[0_12px_18px_-16px_rgba(15,23,42,0.7)]">
              <Sparkles size={13} className="text-amber-500" />
              Kontrol Merkezi
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                <CheckCircle2 size={13} />
                Sistem Stabil
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1">
                <Clock3 size={13} className="text-blue-500" />
                {lastSyncedAt ? `Son senkron: ${relativeTime(lastSyncedAt)}` : 'Senkron bekleniyor'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-[0_12px_20px_-16px_rgba(15,23,42,0.62)]">
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-slate-500">Onay</p>
                <p className="text-lg leading-none mt-1 font-bold text-slate-800">{kpis.pendingBusinesses}</p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-[0_12px_20px_-16px_rgba(15,23,42,0.62)]">
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-slate-500">Rapor</p>
                <p className="text-lg leading-none mt-1 font-bold text-slate-800">{kpis.reportedReviews}</p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-[0_12px_20px_-16px_rgba(15,23,42,0.62)]">
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-slate-500">Mesaj</p>
                <p className="text-lg leading-none mt-1 font-bold text-slate-800">{kpis.unreadMessages}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/85 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-[0_14px_22px_-18px_rgba(15,23,42,0.6)] disabled:opacity-60"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Yenile
            </button>
          </div>
        </div>

        {errorText ? (
          <div className="relative mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{errorText}</div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {statCards.map((item) => (
          <StatCard key={item.title} item={item} />
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)] gap-4">
        <article className="rounded-[26px] border border-white/75 bg-[linear-gradient(145deg,#ffffff_0%,#f4f8ff_100%)] p-4 md:p-5 shadow-[0_24px_30px_-24px_rgba(15,23,42,0.62)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">14 Günlük Eğilim</p>
              <h3 className="mt-1 text-xl font-bold text-slate-800">Kullanıcı ve İşletme Büyümesi</h3>
            </div>
            <TrendLegend />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-3">
            <div className="h-44 grid grid-cols-14 gap-1.5 items-end">
              {trend.map((point) => {
                const userHeight = Math.max(4, Math.round((point.users / maxTrend) * 88))
                const businessHeight = Math.max(4, Math.round((point.businesses / maxTrend) * 88))
                return (
                  <div key={point.key} className="flex flex-col items-center justify-end gap-1">
                    <div className="flex items-end gap-1 h-24">
                      <span className="w-2 rounded-sm bg-blue-500/90" style={{ height: `${userHeight}px` }} />
                      <span className="w-2 rounded-sm bg-emerald-500/90" style={{ height: `${businessHeight}px` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">{point.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </article>

        <article className="rounded-[26px] border border-white/75 bg-[linear-gradient(145deg,#ffffff_0%,#f4f8ff_100%)] p-4 md:p-5 shadow-[0_24px_30px_-24px_rgba(15,23,42,0.62)] space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">Operasyon Sağlığı</p>
            <h3 className="mt-1 text-xl font-bold text-slate-800">Basınç ve Risk Göstergeleri</h3>
          </div>

          {[
            { label: 'Onay Kuyruğu Basıncı', ratio: pendingPressure, help: `${kpis.pendingBusinesses} bekleyen kayıt` },
            { label: 'Yorum Moderasyon Basıncı', ratio: reviewPressure, help: `${kpis.reportedReviews} raporlu yorum` },
            { label: 'Mesaj Cevaplama Basıncı', ratio: inboxPressure, help: `${kpis.unreadMessages} okunmamış mesaj` },
            { label: 'Güvenlik Riski (Banned)', ratio: safetyPressure, help: `${kpis.bannedUsers} yasaklı hesap` },
          ].map((row) => {
            const safeRatio = Math.min(1, Math.max(0, row.ratio))
            const barClass =
              safeRatio >= 0.7
                ? 'from-rose-500 to-rose-600'
                : safeRatio >= 0.4
                  ? 'from-amber-500 to-orange-500'
                  : 'from-emerald-500 to-emerald-600'
            return (
              <div key={row.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-slate-700">{row.label}</p>
                  <span className="text-[11px] font-bold text-slate-600">{percent(safeRatio)}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r ${barClass}`} style={{ width: `${Math.max(4, safeRatio * 100)}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">{row.help}</p>
              </div>
            )
          })}
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <article className="rounded-[26px] border border-white/75 bg-[linear-gradient(145deg,#ffffff_0%,#f4f8ff_100%)] p-4 md:p-5 shadow-[0_24px_30px_-24px_rgba(15,23,42,0.62)]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">Onay Kuyruğu</p>
              <h3 className="mt-1 text-xl font-bold text-slate-800">Bekleyen İşletmeler</h3>
            </div>
            <Link
              href="/admin/approvals"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
            >
              Tümünü Aç
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="mt-3 space-y-2">
            {pendingQueue.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">
                Onay bekleyen işletme yok.
              </div>
            ) : (
              pendingQueue.map((row) => (
                <Link
                  key={row.id}
                  href="/admin/approvals"
                  className="block rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-amber-300 hover:bg-amber-50/45 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800 truncate">{row.name || 'İşletme'}</p>
                    <span className="text-[11px] font-semibold text-amber-700">{relativeTime(row.created_at)}</span>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">{businessTypeLabel(row.type)}</p>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="rounded-[26px] border border-white/75 bg-[linear-gradient(145deg,#ffffff_0%,#f4f8ff_100%)] p-4 md:p-5 shadow-[0_24px_30px_-24px_rgba(15,23,42,0.62)]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">Moderasyon</p>
              <h3 className="mt-1 text-xl font-bold text-slate-800">Raporlu Yorum Akışı</h3>
            </div>
            <Link
              href="/admin/reviews"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
            >
              Moderasyona Git
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="mt-3 space-y-2">
            {reviewQueue.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">
                Açık raporlu yorum kuyruğu bulunmuyor.
              </div>
            ) : (
              reviewQueue.map((row) => (
                <Link
                  key={row.id}
                  href="/admin/reviews"
                  className="block rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-rose-300 hover:bg-rose-50/45 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800 truncate">{row.businessName}</p>
                    <span className="text-[11px] font-semibold text-rose-700">{relativeTime(row.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">
                    Puan: {row.rating ?? '-'} • {row.reason}
                  </p>
                </Link>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] gap-4">
        <article className="rounded-[26px] border border-white/75 bg-[linear-gradient(145deg,#ffffff_0%,#f4f8ff_100%)] p-4 md:p-5 shadow-[0_24px_30px_-24px_rgba(15,23,42,0.62)]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">Kritik Uyarılar</p>
              <h3 className="mt-1 text-xl font-bold text-slate-800">Önceliklendirilmiş İş Listesi</h3>
            </div>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>

          <div className="mt-3 space-y-2">
            {alerts.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`block rounded-xl border px-3 py-2.5 transition-colors ${cardToneClass(item.severity)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800">{item.title}</p>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${severityClass(item.severity)}`}>
                    {item.severity === 'high' ? 'KRİTİK' : item.severity === 'medium' ? 'ORTA' : 'STABİL'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">{item.detail}</p>
              </Link>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Kategori Yoğunluğu</p>
            <div className="mt-2 space-y-2">
              {categoryMix.length === 0 ? (
                <p className="text-sm font-semibold text-slate-500">Kategori dağılımı için yeterli veri yok.</p>
              ) : (
                categoryMix.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-slate-700">{item.label}</p>
                      <p className="text-[11px] font-bold text-slate-600">
                        {item.count} • {percent(item.ratio)}
                      </p>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                        style={{ width: `${Math.max(6, item.ratio * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </article>

        <article className="rounded-[26px] border border-white/75 bg-[linear-gradient(145deg,#ffffff_0%,#f4f8ff_100%)] p-4 md:p-5 shadow-[0_24px_30px_-24px_rgba(15,23,42,0.62)]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">Operasyon Feed</p>
              <h3 className="mt-1 text-xl font-bold text-slate-800">Son Yönetim Olayları</h3>
            </div>
            <BellRing size={18} className="text-blue-500" />
          </div>

          <div className="mt-3 space-y-2 max-h-[440px] overflow-y-auto pr-1">
            {feed.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-500">
                Son olay verisi bulunamadı.
              </div>
            ) : (
              feed.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-blue-300 hover:bg-blue-50/45 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${severityClass(item.level)}`}>
                      {item.level === 'high' ? 'YÜKSEK' : item.level === 'medium' ? 'ORTA' : 'DÜŞÜK'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600">{item.subtitle}</p>
                </Link>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { href: '/admin/approvals', title: 'Onay Merkezi', text: 'Bekleyen işletmeleri öncelik sırasıyla yönet.', icon: ClipboardCheck },
          { href: '/admin/messages', title: 'Mesaj Merkezi', text: 'Sistem mesajlarını filtreleyip hızlı yanıt ver.', icon: MessageCircleMore },
          { href: '/admin/kasa', title: 'Kasa Analitiği', text: 'İşletme ve kategori bazında işlem hacmini izle.', icon: CircleDollarSign },
          { href: '/admin/reviews', title: 'Yorum Moderasyonu', text: 'Raporları kapat, gerekirse yorumu kaldır.', icon: ShieldAlert },
          { href: '/admin/users', title: 'Kullanıcı Güvenliği', text: 'Rol, durum ve suistimal kayıtlarını güncelle.', icon: UserCheck2 },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[22px] border border-white/80 bg-[linear-gradient(145deg,#ffffff_0%,#f4f7ff_100%)] px-4 py-3 shadow-[0_16px_24px_-24px_rgba(15,23,42,0.72)] hover:-translate-y-0.5 transition-all"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef4ff] text-blue-600 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.16),inset_-4px_-4px_12px_rgba(255,255,255,0.9)]">
                <Icon size={16} />
              </div>
              <h4 className="mt-2 text-[15px] font-bold text-slate-800">{item.title}</h4>
              <p className="mt-1 text-[12px] font-medium text-slate-500">{item.text}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700">
                Modüle git
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
