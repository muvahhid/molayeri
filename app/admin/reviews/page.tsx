'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Clock3,
  Filter,
  Loader2,
  MessageSquareQuote,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldX,
  Star,
  Store,
  Trash2,
  User2,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { ModuleTitle } from '../../merchant/_components/module-title'
import { adminJsonHeaders } from '../_lib/csrf'

const PAGE_SIZE = 12
type ReviewFilter = 'all' | 'critical' | 'low_rating' | 'no_reply' | 'replied'
type ReviewSort = 'reported_newest' | 'newest' | 'oldest' | 'rating_low' | 'rating_high'

type GenericRow = Record<string, unknown>

type RawReview = {
  id: string
  business_id: string
  user_id: string | null
  rating: number | null
  comment: string | null
  reply: string | null
  is_reported: boolean | null
  created_at: string
  report_reason: string | null
  report_note: string | null
  reported_at: string | null
  report_status: string | null
  reviewed_at: string | null
}

type BusinessRow = {
  id: string
  name: string | null
  owner_id: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  role?: string | null
}

type AdminReview = RawReview & {
  business_name: string
  business_owner_id: string | null
  reviewer_name: string
  reviewer_email: string | null
  reviewed_by: string | null
}

type ModerationMode = 'close' | 'remove'

type ModerationHistoryEntry = {
  id: string
  review_id: string
  action: string
  actor_name: string
  actor_role: string
  happened_at: string
}

// Ortak Donanım Kartı Kapsayıcısı
const HardwarePanel = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative bg-[#16181d] border border-[#2d313a] rounded-md shadow-lg ${className}`}>
    <div className="absolute top-2 left-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute bottom-2 left-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    {children}
  </div>
)

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

function toTs(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '-'
  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleString('tr-TR')
}

function starText(rating: number | null): string {
  const safe = Math.max(0, Math.min(5, Math.round(rating || 0)))
  return `${'★'.repeat(safe)}${'☆'.repeat(5 - safe)}`
}

function parseReviewIdFromText(text: string): string | null {
  const match = text.match(/yorum id:\s*([a-z0-9-]{10,})/i)
  if (!match || !match[1]) return null
  return match[1].trim()
}

function actionLabelFromMessage(subject: string, content: string): string {
  const text = normalizeText(`${subject} ${content}`)
  if (text.includes('sikayet bildirimi')) return 'Şikayet Oluşturuldu'
  if (text.includes('inceleme tamamlandi') || text.includes('rapor kapatildi')) return 'Rapor Kapatıldı'
  if (text.includes('moderasyonu uygulandi') || text.includes('yorum metni kaldirildi')) return 'Yorum Kaldırıldı'
  return 'Moderasyon Güncellemesi'
}

function roleLabel(role: string | null | undefined): string {
  if (!role) return 'Sistem'
  const v = normalizeText(role)
  if (v === 'admin') return 'Admin'
  if (v === 'isletmeci') return 'İşletmeci'
  if (v === 'pending_business') return 'Aday İşletmeci'
  return 'Kullanıcı'
}

function mapRawReview(row: GenericRow): RawReview {
  const ratingValue = row.rating
  const ratingNumber = typeof ratingValue === 'number' && Number.isFinite(ratingValue) ? ratingValue : null

  return {
    id: String(row.id || ''),
    business_id: String(row.business_id || ''),
    user_id: typeof row.user_id === 'string' ? row.user_id : null,
    rating: ratingNumber,
    comment: typeof row.comment === 'string' ? row.comment : null,
    reply: typeof row.reply === 'string' ? row.reply : null,
    is_reported: typeof row.is_reported === 'boolean' ? row.is_reported : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    report_reason: typeof row.report_reason === 'string' ? row.report_reason : null,
    report_note: typeof row.report_note === 'string' ? row.report_note : null,
    reported_at: typeof row.reported_at === 'string' ? row.reported_at : null,
    report_status: typeof row.report_status === 'string' ? row.report_status : null,
    reviewed_at: typeof row.reviewed_at === 'string' ? row.reviewed_at : null,
  }
}

function matchesFilter(review: AdminReview, filter: ReviewFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'critical') {
    const reason = normalizeText(review.report_reason || '')
    return (
      reason.includes('hakaret') ||
      reason.includes('kufur') ||
      reason.includes('nefret') ||
      reason.includes('iftira') ||
      reason.includes('tehdit')
    )
  }
  if (filter === 'low_rating') return (review.rating || 0) <= 2
  if (filter === 'no_reply') return !review.reply?.trim()
  if (filter === 'replied') return Boolean(review.reply?.trim())
  return true
}

function sortReviews(input: AdminReview[], sort: ReviewSort): AdminReview[] {
  const next = [...input]
  if (sort === 'reported_newest') {
    next.sort((a, b) => {
      const diff = toTs(b.reported_at) - toTs(a.reported_at)
      if (diff !== 0) return diff
      return toTs(b.created_at) - toTs(a.created_at)
    })
    return next
  }
  if (sort === 'newest') {
    next.sort((a, b) => toTs(b.created_at) - toTs(a.created_at))
    return next
  }
  if (sort === 'oldest') {
    next.sort((a, b) => toTs(a.created_at) - toTs(b.created_at))
    return next
  }
  if (sort === 'rating_low') {
    next.sort((a, b) => (a.rating || 0) - (b.rating || 0))
    return next
  }
  next.sort((a, b) => (b.rating || 0) - (a.rating || 0))
  return next
}

export default function AdminReviewsPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ReviewFilter>('all')
  const [sort, setSort] = useState<ReviewSort>('reported_newest')
  const [page, setPage] = useState(1)
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [actioningKey, setActioningKey] = useState<string | null>(null)
  const [historyByReview, setHistoryByReview] = useState<Record<string, ModerationHistoryEntry[]>>({})

  const loadReportedReviews = async (soft = false) => {
    if (soft) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    let rows: RawReview[] = []

    const primary = await supabase
      .from('business_reviews')
      .select(
        'id,business_id,user_id,rating,comment,reply,is_reported,created_at,report_reason,report_note,reported_at,report_status,reviewed_at'
      )
      .eq('is_reported', true)
      .order('reported_at', { ascending: false })

    if (!primary.error && primary.data) {
      rows = (primary.data as GenericRow[]).map(mapRawReview)
    } else {
      const fallback = await supabase
        .from('business_reviews')
        .select('id,business_id,user_id,rating,comment,reply,is_reported,created_at')
        .eq('is_reported', true)
        .order('created_at', { ascending: false })

      rows = ((fallback.data || []) as GenericRow[]).map(mapRawReview)
    }

    if (rows.length === 0) {
      setReviews([])
      setHistoryByReview({})
      setSelectedReviewId(null)
      setLoading(false)
      setRefreshing(false)
      return
    }

    const businessIds = Array.from(new Set(rows.map((row) => row.business_id).filter(Boolean)))
    const reviewerIds = Array.from(
      new Set(rows.map((row) => row.user_id || '').map((id) => id.trim()).filter((id) => id.length > 0))
    )
    const reviewIds = Array.from(new Set(rows.map((row) => row.id).filter(Boolean)))

    const reviewedByMap = new Map<string, string>()
    if (reviewIds.length > 0) {
      const reviewedByRes = await supabase
        .from('business_reviews')
        .select('id,reviewed_by')
        .in('id', reviewIds)

      if (!reviewedByRes.error) {
        for (const row of (reviewedByRes.data || []) as Array<{ id?: string | null; reviewed_by?: string | null }>) {
          const id = (row.id || '').trim()
          const reviewedBy = (row.reviewed_by || '').trim()
          if (id) {
            reviewedByMap.set(id, reviewedBy || '')
          }
        }
      }
    }

    const [businessRes, profileRes] = await Promise.all([
      businessIds.length > 0
        ? supabase.from('businesses').select('id,name,owner_id').in('id', businessIds)
        : Promise.resolve({ data: [] as unknown[] }),
      reviewerIds.length > 0
        ? supabase.from('profiles').select('id,full_name,email,role').in('id', reviewerIds)
        : Promise.resolve({ data: [] as unknown[] }),
    ])

    const businessMap = new Map<string, BusinessRow>()
    for (const row of (businessRes.data || []) as BusinessRow[]) {
      businessMap.set(row.id, row)
    }

    const profileMap = new Map<string, ProfileRow>()
    for (const row of (profileRes.data || []) as ProfileRow[]) {
      profileMap.set(row.id, row)
    }

    const enriched = rows.map((row) => {
      const business = businessMap.get(row.business_id)
      const reviewer = row.user_id ? profileMap.get(row.user_id) : null
      return {
        ...row,
        business_name: business?.name || 'İşletme',
        business_owner_id: business?.owner_id || null,
        reviewer_name: reviewer?.full_name || 'Misafir',
        reviewer_email: reviewer?.email || null,
        reviewed_by: reviewedByMap.get(row.id) || null,
      } satisfies AdminReview
    })

    const historyCandidatesRes = await supabase
      .from('messages')
      .select('id,sender_id,subject,content,created_at,message_type')
      .eq('message_type', 'admin_signal')
      .order('created_at', { ascending: false })
      .limit(1200)

    const historyCandidates = (historyCandidatesRes.data || []) as Array<{
      id?: string | null
      sender_id?: string | null
      subject?: string | null
      content?: string | null
      created_at?: string | null
    }>

    const historySenderIds = Array.from(
      new Set(
        historyCandidates
          .map((item) => (item.sender_id || '').trim())
          .filter((id) => id.length > 0)
      )
    )

    const historySenderMap = new Map<string, ProfileRow>()
    if (historySenderIds.length > 0) {
      const senderRes = await supabase
        .from('profiles')
        .select('id,full_name,email,role')
        .in('id', historySenderIds)

      if (!senderRes.error) {
        for (const row of (senderRes.data || []) as ProfileRow[]) {
          historySenderMap.set(row.id, row)
        }
      }
    }

    const historyMap: Record<string, ModerationHistoryEntry[]> = {}
    for (const review of enriched) {
      historyMap[review.id] = []
      historyMap[review.id].push({
        id: `${review.id}-reported`,
        review_id: review.id,
        action: 'Şikayet Kaydı Açıldı',
        actor_name: 'İşletmeci',
        actor_role: 'İşletmeci',
        happened_at: review.reported_at || review.created_at,
      })

      if (review.reviewed_at) {
        const actor = review.reviewed_by ? historySenderMap.get(review.reviewed_by) : null
        const action =
          normalizeText(review.report_status || '') === 'removed' ? 'Yorum Kaldırıldı' : 'Rapor Kapatıldı'
        historyMap[review.id].push({
          id: `${review.id}-reviewed`,
          review_id: review.id,
          action,
          actor_name: actor?.full_name || actor?.email || 'Admin',
          actor_role: roleLabel(actor?.role || 'admin'),
          happened_at: review.reviewed_at,
        })
      }
    }

    const reviewIdSet = new Set(enriched.map((item) => item.id))
    for (const item of historyCandidates) {
      const id = (item.id || '').trim()
      if (!id) continue
      const subject = (item.subject || '').trim()
      const content = (item.content || '').trim()
      const reviewId = parseReviewIdFromText(`${subject}\n${content}`)
      if (!reviewId || !reviewIdSet.has(reviewId)) continue
      const senderId = (item.sender_id || '').trim()
      const sender = senderId ? historySenderMap.get(senderId) : null
      const action = actionLabelFromMessage(subject, content)
      const happenedAt = item.created_at || new Date().toISOString()

      const list = historyMap[reviewId] || []
      const duplicate = list.some(
        (entry) =>
          normalizeText(entry.action) === normalizeText(action) &&
          toTs(entry.happened_at) === toTs(happenedAt) &&
          normalizeText(entry.actor_name) === normalizeText(sender?.full_name || sender?.email || 'Sistem')
      )
      if (!duplicate) {
        list.push({
          id: `${reviewId}-${id}`,
          review_id: reviewId,
          action,
          actor_name: sender?.full_name || sender?.email || 'Sistem',
          actor_role: roleLabel(sender?.role),
          happened_at: happenedAt,
        })
      }
      historyMap[reviewId] = list
    }

    for (const key of Object.keys(historyMap)) {
      historyMap[key] = historyMap[key].sort((a, b) => toTs(b.happened_at) - toTs(a.happened_at))
    }

    setReviews(enriched)
    setHistoryByReview(historyMap)
    setSelectedReviewId((current) => {
      if (current && enriched.some((review) => review.id === current)) {
        return current
      }
      return enriched[0]?.id || null
    })

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    void loadReportedReviews(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim())

    const searched = reviews.filter((review) => {
      if (!normalizedQuery) return true
      const haystack = normalizeText(
        [
          review.business_name,
          review.reviewer_name,
          review.reviewer_email || '',
          review.comment || '',
          review.report_reason || '',
          review.report_note || '',
        ].join(' ')
      )
      return haystack.includes(normalizedQuery)
    })

    return sortReviews(searched.filter((review) => matchesFilter(review, filter)), sort)
  }, [reviews, query, filter, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [query, filter, sort])

  const currentSelected = useMemo(() => {
    return filtered.find((review) => review.id === selectedReviewId) || pageRows[0] || null
  }, [filtered, selectedReviewId, pageRows])

  const currentHistory = useMemo(() => {
    if (!currentSelected) return [] as ModerationHistoryEntry[]
    return historyByReview[currentSelected.id] || []
  }, [currentSelected, historyByReview])

  useEffect(() => {
    if (!currentSelected) {
      setSelectedReviewId(null)
      return
    }
    if (!selectedReviewId || !filtered.some((review) => review.id === selectedReviewId)) {
      setSelectedReviewId(currentSelected.id)
    }
  }, [currentSelected, selectedReviewId, filtered])

  const stats = useMemo(() => {
    const total = reviews.length
    const critical = reviews.filter((review) => matchesFilter(review, 'critical')).length
    const low = reviews.filter((review) => (review.rating || 0) <= 2).length
    const noReply = reviews.filter((review) => !review.reply?.trim()).length
    return { total, critical, low, noReply }
  }, [reviews])

  const applyModeration = async (reviewId: string, mode: ModerationMode): Promise<void> => {
    const response = await fetch('/api/admin/reviews/moderate', {
      method: 'POST',
      headers: adminJsonHeaders(),
      body: JSON.stringify({ reviewId, mode }),
    })

    let payload: { error?: string } | null = null
    try {
      payload = (await response.json()) as { error?: string }
    } catch {
      payload = null
    }

    if (!response.ok) {
      throw new Error(payload?.error || 'Moderasyon işlemi tamamlanamadı.')
    }
  }

  const handleCloseReport = async (review: AdminReview) => {
    const key = `${review.id}:close`
    if (actioningKey) return
    setActioningKey(key)

    try {
      await applyModeration(review.id, 'close')
      setReviews((current) => current.filter((item) => item.id !== review.id))
      if (selectedReviewId === review.id) {
        setSelectedReviewId(null)
      }
      await loadReportedReviews(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Rapor kapatılamadı.'
      window.alert(message)
    } finally {
      setActioningKey(null)
    }
  }

  const handleRemoveReview = async (review: AdminReview) => {
    if (actioningKey) return
    const ok = window.confirm('Yorum metni yönetim tarafından kaldırılsın mı?')
    if (!ok) return

    const key = `${review.id}:remove`
    setActioningKey(key)

    try {
      await applyModeration(review.id, 'remove')
      setReviews((current) => current.filter((item) => item.id !== review.id))
      if (selectedReviewId === review.id) {
        setSelectedReviewId(null)
      }
      await loadReportedReviews(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Yorum kaldırılamadı.'
      window.alert(message)
    } finally {
      setActioningKey(null)
    }
  }

  return (
    <div className="space-y-6 text-[#e2e8f0]">
      <HardwarePanel className="p-5 md:p-6 border-b border-[#2d313a]">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <ModuleTitle title="Yorum Şikayet Merkezi" />
          </div>
          <button
            type="button"
            onClick={() => void loadReportedReviews(true)}
            disabled={refreshing}
            className="h-11 px-4 rounded bg-[#16181d] border border-[#2d313a] text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2 hover:bg-[#1a1d24] disabled:opacity-60 transition-colors"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin text-[#38bdf8]" /> : <RefreshCw className="w-4 h-4 text-[#64748b]" />}
            Yenile
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Toplam Bildirim</p>
            <p className="mt-1 text-xl font-mono text-[#e2e8f0]">{stats.total}</p>
          </div>
          <div className="rounded border border-rose-900/50 bg-rose-950/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-rose-500/0 group-hover:bg-rose-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-rose-500/70">Kritik İçerik</p>
            <p className="mt-1 text-xl font-mono text-rose-400">{stats.critical}</p>
          </div>
          <div className="rounded border border-amber-900/50 bg-amber-950/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-amber-500/0 group-hover:bg-amber-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-amber-500/70">Düşük Puan</p>
            <p className="mt-1 text-xl font-mono text-amber-400">{stats.low}</p>
          </div>
          <div className="rounded border border-[#226785] bg-[#153445]/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-[#38bdf8]">Cevapsız</p>
            <p className="mt-1 text-xl font-mono text-[#38bdf8]">{stats.noReply}</p>
          </div>
        </div>
      </HardwarePanel>

      <HardwarePanel className="p-4 md:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-4">
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">Ara</span>
            <div className="mt-2 relative">
              <Search className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full pl-9 pr-3 h-11 rounded bg-[#0a0c10] border border-[#2d313a] text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                placeholder="İşletme, kullanıcı, yorum, sebep..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">Filtre</span>
            <div className="mt-2 relative">
              <Filter className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                className="w-full pl-9 pr-3 h-11 rounded bg-[#0a0c10] border border-[#2d313a] text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
                value={filter}
                onChange={(event) => setFilter(event.target.value as ReviewFilter)}
              >
                <option value="all">TÜMÜ</option>
                <option value="critical">KRİTİK İÇERİK</option>
                <option value="low_rating">DÜŞÜK PUAN (0-2)</option>
                <option value="no_reply">CEVAPSIZ YORUM</option>
                <option value="replied">CEVAPLANAN YORUM</option>
              </select>
            </div>
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">Sıralama</span>
            <select
              className="mt-2 w-full px-4 h-11 rounded bg-[#0a0c10] border border-[#2d313a] text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
              value={sort}
              onChange={(event) => setSort(event.target.value as ReviewSort)}
            >
              <option value="reported_newest">BİLDİRİM TARİHİ (YENİ)</option>
              <option value="newest">YORUM TARİHİ (YENİ)</option>
              <option value="oldest">YORUM TARİHİ (ESKİ)</option>
              <option value="rating_low">PUAN (DÜŞÜKTEN YÜKSEĞE)</option>
              <option value="rating_high">PUAN (YÜKSEKTEN DÜŞÜĞE)</option>
            </select>
          </label>
        </div>
      </HardwarePanel>

      <section className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-5">
        <HardwarePanel className="p-0 flex flex-col min-h-[560px] max-h-[calc(100vh-310px)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2d313a] bg-[#0f1115] flex items-center justify-between">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#e2e8f0]">Şikayet Kuyruğu</p>
            <span className="px-2.5 py-1 rounded bg-[#101419] border border-[#1e232b] text-[9px] font-mono text-[#64748b]">{filtered.length} ADET</span>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#38bdf8]" />
            </div>
          ) : pageRows.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mb-3 opacity-70" />
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">BİLDİRİLEN YORUM BULUNAMADI.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#0a0c10] custom-scrollbar">
              {pageRows.map((review) => {
                const active = currentSelected?.id === review.id
                const noReply = !review.reply?.trim()
                return (
                  <button
                    key={review.id}
                    type="button"
                    onClick={() => setSelectedReviewId(review.id)}
                    className={`w-full text-left rounded border p-4 transition-all ${
                      active
                        ? 'border-[#226785] bg-[#153445] shadow-[inset_4px_0_0_#38bdf8]'
                        : 'border-[#2d313a] bg-[#16181d] hover:border-[#475569]'
                    }`}
                  >
                    <p className={`text-[12px] font-medium uppercase tracking-wide truncate ${active ? 'text-[#38bdf8]' : 'text-[#e2e8f0]'}`}>{review.business_name}</p>
                    <p className="mt-1 text-[10px] font-mono text-[#64748b] truncate">{review.reviewer_name}</p>
                    <p className="mt-2 text-[11px] font-mono text-amber-400 tracking-widest">
                      {starText(review.rating)} ({review.rating || 0}/5)
                    </p>
                    <div className="mt-3 pt-2 border-t border-[#1e232b] flex items-center justify-between">
                      <span className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest inline-flex items-center gap-1.5">
                        <Clock3 className="w-3 h-3" />
                        {formatDate(review.reported_at || review.created_at)}
                      </span>
                      {noReply ? (
                        <span className="text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border border-rose-900/50 bg-rose-950/20 text-rose-400">
                          CEVAPSIZ
                        </span>
                      ) : (
                        <span className="text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border border-emerald-900/50 bg-emerald-950/20 text-emerald-400">
                          CEVAPLI
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {!loading && filtered.length > 0 ? (
            <div className="border-t border-[#2d313a] bg-[#101419] px-4 py-3 flex items-center justify-between gap-2">
              <p className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest">
                SAYFA {safePage}/{totalPages}
              </p>
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={safePage === 1}
                  className="px-3 h-8 rounded border border-[#2d313a] bg-[#16181d] text-[9px] font-mono uppercase tracking-widest text-[#94a3b8] hover:bg-[#1a1d24] disabled:opacity-30 transition-colors"
                >
                  GERİ
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={safePage === totalPages}
                  className="px-3 h-8 rounded border border-[#2d313a] bg-[#16181d] text-[9px] font-mono uppercase tracking-widest text-[#94a3b8] hover:bg-[#1a1d24] disabled:opacity-30 transition-colors"
                >
                  İLERİ
                </button>
              </div>
            </div>
          ) : null}
        </HardwarePanel>

        <HardwarePanel className="p-0 min-h-[560px] max-h-[calc(100vh-310px)] overflow-hidden flex flex-col">
          {!currentSelected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <ShieldX className="w-10 h-10 text-[#475569] mb-3 opacity-50" />
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">SOLDAN BİR KAYIT SEÇİN.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 bg-[#0c0e12] custom-scrollbar">
              
              <div className="rounded border border-[#2d313a] bg-[#101419] p-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] mb-1.5">Yorum Şikayeti</p>
                    <h3 className="text-[18px] font-medium text-[#e2e8f0] uppercase tracking-wide">{currentSelected.business_name}</h3>
                    <p className="mt-1.5 text-[10px] font-mono text-[#94a3b8] inline-flex items-center gap-1.5 uppercase tracking-widest">
                      <User2 className="w-3.5 h-3.5" />
                      {currentSelected.reviewer_name}
                      {currentSelected.reviewer_email ? ` • ${currentSelected.reviewer_email}` : ''}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 min-w-[280px]">
                    <button
                      type="button"
                      onClick={() => void handleCloseReport(currentSelected)}
                      disabled={Boolean(actioningKey)}
                      className="h-11 rounded border border-emerald-900/50 bg-[linear-gradient(180deg,#065f46_0%,#14532d_100%)] text-[#34d399] text-[10px] font-mono uppercase tracking-widest inline-flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    >
                      {actioningKey === `${currentSelected.id}:close` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      RAPORU KAPAT
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemoveReview(currentSelected)}
                      disabled={Boolean(actioningKey)}
                      className="h-11 rounded border border-rose-900/50 bg-[linear-gradient(180deg,#9f1239_0%,#881337_100%)] text-[#fb7185] text-[10px] font-mono uppercase tracking-widest inline-flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    >
                      {actioningKey === `${currentSelected.id}:remove` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      YORUMU KALDIR
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3">
                  <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Puan</p>
                  <p className="mt-1.5 text-[11px] font-mono text-amber-400 inline-flex items-center gap-1.5 tracking-widest">
                    <Star className="w-3.5 h-3.5" />
                    {starText(currentSelected.rating)} ({currentSelected.rating || 0}/5)
                  </p>
                </div>
                <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3">
                  <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Yorum Tarihi</p>
                  <p className="mt-1.5 text-[11px] font-mono text-[#e2e8f0] tracking-widest">{formatDate(currentSelected.created_at)}</p>
                </div>
                <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3">
                  <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Bildirim Tarihi</p>
                  <p className="mt-1.5 text-[11px] font-mono text-[#e2e8f0] tracking-widest">{formatDate(currentSelected.reported_at)}</p>
                </div>
                <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3">
                  <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Cevap Durumu</p>
                  <p className="mt-1.5 text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0]">
                    {currentSelected.reply?.trim() ? 'İŞLETMECİ CEVAPLAMIŞ' : 'CEVAP YOK'}
                  </p>
                </div>
              </div>

              <div className="rounded border border-[#2d313a] bg-[#101419] p-5">
                <p className="text-[10px] uppercase tracking-widest font-mono text-[#64748b] inline-flex items-center gap-2 mb-3 border-b border-[#1e232b] pb-2 w-full">
                  <MessageSquareQuote className="w-3.5 h-3.5" />
                  Kullanıcı Yorumu
                </p>
                <p className="text-[13px] leading-relaxed text-[#cbd5e1] font-sans whitespace-pre-wrap">{currentSelected.comment || '-'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded border border-amber-900/50 bg-amber-950/10 p-4">
                  <p className="text-[10px] uppercase tracking-widest font-mono text-amber-500/80 inline-flex items-center gap-2 mb-3 border-b border-amber-900/30 pb-2 w-full">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Bildirim Sebebi
                  </p>
                  <p className="text-[12px] font-mono text-[#e2e8f0]">{currentSelected.report_reason || 'BELİRTİLMEDİ'}</p>
                  {currentSelected.report_note ? (
                    <p className="mt-3 text-[10px] font-mono text-[#94a3b8] uppercase tracking-widest">NOT: {currentSelected.report_note}</p>
                  ) : null}
                </div>
                <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4">
                  <p className="text-[10px] uppercase tracking-widest font-mono text-[#64748b] inline-flex items-center gap-2 mb-3 border-b border-[#1e232b] pb-2 w-full">
                    <Store className="w-3.5 h-3.5" />
                    İşletmeci Cevabı
                  </p>
                  <p className="text-[12px] font-sans text-[#cbd5e1] leading-relaxed">
                    {currentSelected.reply?.trim() ? currentSelected.reply : 'HENÜZ CEVAP YOK.'}
                  </p>
                </div>
              </div>

              <div className="rounded border border-[#2d313a] bg-[#101419] p-5">
                <p className="text-[10px] uppercase tracking-widest font-mono text-[#e2e8f0] inline-flex items-center gap-2 border-b border-[#1e232b] pb-3 mb-4 w-full">
                  <Clock3 className="w-3.5 h-3.5 text-[#38bdf8]" />
                  Moderasyon Geçmişi
                </p>
                {currentHistory.length === 0 ? (
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">BU KAYIT İÇİN GEÇMİŞ BULUNAMADI.</p>
                ) : (
                  <div className="space-y-3">
                    {currentHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3 grid grid-cols-1 md:grid-cols-[1.2fr_1fr_auto] gap-3 md:items-center"
                      >
                        <div>
                          <p className="text-[11px] font-mono text-[#e2e8f0] uppercase tracking-widest">{entry.action}</p>
                          <p className="text-[9px] font-mono text-[#64748b] mt-1.5 uppercase tracking-widest">
                            {entry.actor_name} • {entry.actor_role}
                          </p>
                        </div>
                        <div className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest">
                          <p className="text-[#94a3b8] mb-1">NE ZAMAN</p>
                          <p>{formatDate(entry.happened_at)}</p>
                        </div>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded text-[9px] font-mono uppercase tracking-widest border ${
                            normalizeText(entry.action).includes('kaldir')
                              ? 'bg-rose-950/20 border-rose-900/50 text-rose-400'
                              : normalizeText(entry.action).includes('kapat')
                                ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400'
                                : 'bg-[#153445]/30 border-[#226785] text-[#38bdf8]'
                          }`}
                        >
                          {entry.action}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded border border-[#226785] bg-[#153445]/20 p-4 text-[10px] font-mono uppercase tracking-widest text-[#38bdf8] leading-relaxed">
                <span className="font-bold inline-flex items-center gap-1.5 border-b border-[#226785]/50 pb-1 mb-2 block w-fit">
                  <ShieldX className="w-3.5 h-3.5" />
                  MODERASYON GARANTİSİ:
                </span>
                <br />
                “Yorumu Kaldır” ve “Raporu Kapat” işlemleri artık veritabanı doğrulaması ile çalışır. Kalıcı yazım başarısızsa liste güncellenmez ve hata gösterilir.
              </div>
            </div>
          )}
        </HardwarePanel>
      </section>
    </div>
  )
}