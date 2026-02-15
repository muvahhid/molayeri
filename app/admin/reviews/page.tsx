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

const cardClass =
  'rounded-2xl border border-white/80 bg-white/95 shadow-[0_16px_24px_-20px_rgba(15,23,42,0.6)] backdrop-blur'

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
      headers: { 'Content-Type': 'application/json' },
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
    <div className="space-y-4">
      <section className={`${cardClass} p-4 md:p-5`}>
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Yorum Şikayet Merkezi</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadReportedReviews(true)}
            disabled={refreshing}
            className="h-11 px-4 rounded-xl border border-slate-200/80 bg-white text-sm font-semibold text-slate-700 inline-flex items-center gap-2 disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Yenile
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <article className="rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">Toplam Bildirim</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{stats.total}</p>
          </article>
          <article className="rounded-xl border border-rose-200/80 bg-rose-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-rose-700">Kritik İçerik</p>
            <p className="mt-1 text-xl font-bold text-rose-900">{stats.critical}</p>
          </article>
          <article className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-amber-700">Düşük Puan</p>
            <p className="mt-1 text-xl font-bold text-amber-900">{stats.low}</p>
          </article>
          <article className="rounded-xl border border-blue-200/80 bg-blue-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-blue-700">Cevapsız</p>
            <p className="mt-1 text-xl font-bold text-blue-900">{stats.noReply}</p>
          </article>
        </div>
      </section>

      <section className={`${cardClass} p-3 md:p-4`}>
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-2.5">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Ara</span>
            <div className="mt-1.5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full pl-9 pr-3 h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-white outline-none"
                placeholder="İşletme, kullanıcı, yorum, sebep..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Filtre</span>
            <div className="mt-1.5 relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                className="w-full pl-9 pr-3 h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-white outline-none appearance-none"
                value={filter}
                onChange={(event) => setFilter(event.target.value as ReviewFilter)}
              >
                <option value="all">Tümü</option>
                <option value="critical">Kritik içerik</option>
                <option value="low_rating">Düşük puan (0-2)</option>
                <option value="no_reply">Cevapsız yorum</option>
                <option value="replied">Cevaplanan yorum</option>
              </select>
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Sıralama</span>
            <select
              className="mt-1.5 w-full px-3 h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-white outline-none"
              value={sort}
              onChange={(event) => setSort(event.target.value as ReviewSort)}
            >
              <option value="reported_newest">Bildirim tarihi (yeni)</option>
              <option value="newest">Yorum tarihi (yeni)</option>
              <option value="oldest">Yorum tarihi (eski)</option>
              <option value="rating_low">Puan düşükten yükseğe</option>
              <option value="rating_high">Puan yüksekten düşüğe</option>
            </select>
          </label>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-4">
        <aside className={`${cardClass} p-3 min-h-[560px] max-h-[calc(100vh-310px)] flex flex-col`}>
          <div className="px-2 pb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Şikayet Kuyruğu</p>
            <span className="text-xs font-semibold text-slate-500">{filtered.length}</span>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : pageRows.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <ShieldCheck className="w-10 h-10 text-emerald-600" />
              <p className="mt-2 text-sm font-semibold text-slate-500">Bildirilen yorum bulunamadı.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {pageRows.map((review) => {
                const active = currentSelected?.id === review.id
                const noReply = !review.reply?.trim()
                return (
                  <button
                    key={review.id}
                    type="button"
                    onClick={() => setSelectedReviewId(review.id)}
                    className={`w-full text-left rounded-xl border p-3 ${
                      active
                        ? 'border-blue-300 bg-blue-50 shadow-[0_12px_18px_-14px_rgba(59,130,246,0.55)]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-800 truncate">{review.business_name}</p>
                    <p className="mt-1 text-xs text-slate-500 truncate">{review.reviewer_name}</p>
                    <p className="mt-1 text-[12px] font-semibold text-amber-600">
                      {starText(review.rating)} ({review.rating || 0}/5)
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                        <Clock3 className="w-3 h-3" />
                        {formatDate(review.reported_at || review.created_at)}
                      </span>
                      {noReply ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                          Cevapsız
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                          Cevaplı
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {!loading && filtered.length > 0 ? (
            <div className="pt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500 font-semibold">
                Sayfa {safePage}/{totalPages}
              </p>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={safePage === 1}
                  className="px-3 h-8 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 disabled:opacity-40"
                >
                  Geri
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={safePage === totalPages}
                  className="px-3 h-8 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 disabled:opacity-40"
                >
                  İleri
                </button>
              </div>
            </div>
          ) : null}
        </aside>

        <article className={`${cardClass} p-4 md:p-5 min-h-[560px] max-h-[calc(100vh-310px)] overflow-y-auto`}>
          {!currentSelected ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center px-6">
              <ShieldX className="w-10 h-10 text-slate-400" />
              <p className="mt-2 text-sm font-semibold text-slate-500">Soldan bir kayıt seçin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">Yorum Şikayeti</p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-900">{currentSelected.business_name}</h3>
                    <p className="mt-1 text-sm text-slate-600 inline-flex items-center gap-1.5">
                      <User2 className="w-4 h-4" />
                      {currentSelected.reviewer_name}
                      {currentSelected.reviewer_email ? ` • ${currentSelected.reviewer_email}` : ''}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 min-w-[260px]">
                    <button
                      type="button"
                      onClick={() => void handleCloseReport(currentSelected)}
                      disabled={Boolean(actioningKey)}
                      className="h-11 rounded-xl bg-emerald-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {actioningKey === `${currentSelected.id}:close` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      Raporu Kapat
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemoveReview(currentSelected)}
                      disabled={Boolean(actioningKey)}
                      className="h-11 rounded-xl bg-rose-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-rose-700 disabled:opacity-60"
                    >
                      {actioningKey === `${currentSelected.id}:remove` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Yorumu Kaldır
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">Puan</p>
                  <p className="mt-1 text-sm font-bold text-amber-600 inline-flex items-center gap-1">
                    <Star className="w-3.5 h-3.5" />
                    {starText(currentSelected.rating)} ({currentSelected.rating || 0}/5)
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">Yorum Tarihi</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(currentSelected.created_at)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">Bildirim Tarihi</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(currentSelected.reported_at)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">Cevap Durumu</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {currentSelected.reply?.trim() ? 'İşletmeci cevaplamış' : 'Cevap yok'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500 inline-flex items-center gap-1.5">
                  <MessageSquareQuote className="w-3.5 h-3.5" />
                  Kullanıcı Yorumu
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-800">{currentSelected.comment || '-'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-amber-700 inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Bildirim Sebebi
                  </p>
                  <p className="mt-2 text-sm text-slate-800">{currentSelected.report_reason || 'Belirtilmedi'}</p>
                  {currentSelected.report_note ? (
                    <p className="mt-2 text-xs text-slate-600">Not: {currentSelected.report_note}</p>
                  ) : null}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500 inline-flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5" />
                    İşletmeci Cevabı
                  </p>
                  <p className="mt-2 text-sm text-slate-800">
                    {currentSelected.reply?.trim() ? currentSelected.reply : 'Henüz cevap yok.'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500 inline-flex items-center gap-1.5">
                  <Clock3 className="w-3.5 h-3.5" />
                  Moderasyon Geçmişi
                </p>
                {currentHistory.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Bu kayıt için geçmiş bulunamadı.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {currentHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 grid grid-cols-1 md:grid-cols-[1.2fr_1fr_auto] gap-2 md:items-center"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{entry.action}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {entry.actor_name} • {entry.actor_role}
                          </p>
                        </div>
                        <div className="text-xs text-slate-500">
                          <p className="font-semibold text-slate-600">Ne zaman</p>
                          <p>{formatDate(entry.happened_at)}</p>
                        </div>
                        <span
                          className={`inline-flex h-7 px-2.5 rounded-md text-[10px] font-semibold items-center justify-center ${
                            normalizeText(entry.action).includes('kaldir')
                              ? 'bg-rose-50 border border-rose-200 text-rose-700'
                              : normalizeText(entry.action).includes('kapat')
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                : 'bg-blue-50 border border-blue-200 text-blue-700'
                          }`}
                        >
                          {entry.action}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-800">
                <span className="font-semibold inline-flex items-center gap-1">
                  <ShieldX className="w-3.5 h-3.5" />
                  Moderasyon garantisi:
                </span>{' '}
                “Yorumu Kaldır” ve “Raporu Kapat” işlemleri artık veritabanı doğrulaması ile çalışır. Kalıcı yazım
                başarısızsa liste güncellenmez ve hata gösterilir.
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
