'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Flag, Loader2, MessageSquareReply, Search, ShieldAlert } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { fetchOwnedBusinesses, requireCurrentUserId } from '../_lib/queries'
import type { MerchantBusiness } from '../_lib/helpers'
import { PanelTitle } from '../_components/panel-title'

const PAGE_SIZE = 8

const REPORT_REASONS = [
  'Hakaret / Küfür',
  'Kişisel veri ifşası',
  'Spam / alakasız içerik',
  'Yanıltıcı / iftira',
  'Tehdit / suç unsuru',
] as const

type ReviewFilter = 'all' | 'no_reply' | 'reported' | 'low_rating' | 'replied'
type ReviewSort = 'newest' | 'oldest' | 'highest' | 'lowest'

type Review = {
  id: string
  business_id: string
  user_id: string | null
  rating: number | null
  comment: string | null
  reply: string | null
  is_reported: boolean | null
  created_at: string
  report_reason?: string | null
  report_note?: string | null
  reported_at?: string | null
  profiles?: {
    full_name: string | null
  } | null
}

function normalizeReviewRow(row: Record<string, unknown>): Review {
  const profileRaw = row.profiles
  const profileSource =
    Array.isArray(profileRaw) && profileRaw.length > 0
      ? profileRaw[0]
      : !Array.isArray(profileRaw)
        ? profileRaw
        : null

  return {
    id: (row.id || '').toString(),
    business_id: (row.business_id || '').toString(),
    user_id: row.user_id ? row.user_id.toString() : null,
    rating: typeof row.rating === 'number' ? row.rating : null,
    comment: typeof row.comment === 'string' ? row.comment : null,
    reply: typeof row.reply === 'string' ? row.reply : null,
    is_reported: typeof row.is_reported === 'boolean' ? row.is_reported : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : new Date(0).toISOString(),
    report_reason: typeof row.report_reason === 'string' ? row.report_reason : null,
    report_note: typeof row.report_note === 'string' ? row.report_note : null,
    reported_at: typeof row.reported_at === 'string' ? row.reported_at : null,
    profiles:
      profileSource && typeof profileSource === 'object'
        ? { full_name: ((profileSource as { full_name?: unknown }).full_name as string | null) || null }
        : null,
  }
}

function maskName(name: string | null | undefined): string {
  if (!name) return 'Misafir'

  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part.charAt(0)}***`)
    .join(' ')
}

function stars(rating: number | null): string {
  const safe = Math.max(0, Math.min(5, Math.round(rating || 0)))
  return `${'★'.repeat(safe)}${'☆'.repeat(5 - safe)}`
}

function toTs(value: string): number {
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
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

export default function MerchantReviewsPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [reviews, setReviews] = useState<Review[]>([])

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ReviewFilter>('all')
  const [sort, setSort] = useState<ReviewSort>('newest')
  const [page, setPage] = useState(1)

  const [replyDraftByReview, setReplyDraftByReview] = useState<Record<string, string>>({})
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null)

  const [reportTarget, setReportTarget] = useState<Review | null>(null)
  const [reportReason, setReportReason] = useState<(typeof REPORT_REASONS)[number]>(REPORT_REASONS[0])
  const [reportNote, setReportNote] = useState('')
  const [reporting, setReporting] = useState(false)

  const selectedBusinessName = useMemo(
    () => businesses.find((item) => item.id === selectedBusinessId)?.name || 'İşletme',
    [businesses, selectedBusinessId]
  )

  const loadBusinesses = async () => {
    setLoading(true)
    const userId = await requireCurrentUserId(supabase)
    setCurrentUserId(userId)

    if (!userId) {
      setBusinesses([])
      setSelectedBusinessId('')
      setLoading(false)
      return
    }

    const ownedBusinesses = await fetchOwnedBusinesses(supabase, userId)
    setBusinesses(ownedBusinesses)
    setSelectedBusinessId((current) => current || ownedBusinesses[0]?.id || '')
    setLoading(false)
  }

  const loadReviews = async () => {
    if (!selectedBusinessId) {
      setReviews([])
      return
    }

    setLoading(true)

    let data: Review[] = []

    const primary = await supabase
      .from('business_reviews')
      .select(
        'id,business_id,user_id,rating,comment,reply,is_reported,created_at,report_reason,report_note,reported_at,profiles(full_name)'
      )
      .eq('business_id', selectedBusinessId)
      .order('created_at', { ascending: false })

    if (!primary.error && primary.data) {
      data = (primary.data as Record<string, unknown>[]).map(normalizeReviewRow)
    } else {
      const fallback = await supabase
        .from('business_reviews')
        .select('id,business_id,user_id,rating,comment,reply,is_reported,created_at,profiles(full_name)')
        .eq('business_id', selectedBusinessId)
        .order('created_at', { ascending: false })

      data = ((fallback.data || []) as Record<string, unknown>[]).map(normalizeReviewRow)
    }

    setReviews(data)
    const nextDrafts: Record<string, string> = {}
    for (const review of data) {
      nextDrafts[review.id] = review.reply || ''
    }
    setReplyDraftByReview(nextDrafts)
    setLoading(false)
  }

  const saveReply = async (reviewId: string) => {
    const replyText = (replyDraftByReview[reviewId] || '').trim()
    setSavingReplyId(reviewId)
    await supabase.from('business_reviews').update({ reply: replyText }).eq('id', reviewId)

    setReviews((current) =>
      current.map((review) => (review.id === reviewId ? { ...review, reply: replyText } : review))
    )
    setSavingReplyId(null)
  }

  const submitReport = async () => {
    if (!reportTarget) return
    setReporting(true)

    const nowIso = new Date().toISOString()
    const reviewId = reportTarget.id

    let payloadApplied = false
    try {
      const richUpdate = await supabase
        .from('business_reviews')
        .update({
          is_reported: true,
          report_reason: reportReason,
          report_note: reportNote.trim() || null,
          reported_at: nowIso,
        })
        .eq('id', reviewId)

      if (!richUpdate.error) {
        payloadApplied = true
      }
    } catch {}

    if (!payloadApplied) {
      await supabase.from('business_reviews').update({ is_reported: true }).eq('id', reviewId)
    }

    if (currentUserId) {
      const content = [
        `İşletme: ${selectedBusinessName}`,
        `Yorum ID: ${reportTarget.id}`,
        `Sebep: ${reportReason}`,
        reportNote.trim() ? `Not: ${reportNote.trim()}` : '',
        `Puan: ${reportTarget.rating || 0}/5`,
        `Yorum: ${(reportTarget.comment || '-').slice(0, 600)}`,
      ]
        .filter(Boolean)
        .join('\n')

      const { data: adminRows } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(24)

      const adminIds = (adminRows || [])
        .map((row) => ((row as { id?: string | null }).id || '').trim())
        .filter((id): id is string => Boolean(id))

      if (adminIds.length > 0) {
        await supabase.from('messages').insert(
          adminIds.map((adminId) => ({
            sender_id: currentUserId,
            recipient_id: adminId,
            subject: `Yorum Şikayet Bildirimi • ${selectedBusinessName}`,
            content,
            message_type: 'admin_signal',
          }))
        )
      } else {
        await supabase.from('messages').insert({
          sender_id: currentUserId,
          recipient_id: null,
          subject: `Yorum Şikayet Bildirimi • ${selectedBusinessName}`,
          content,
          message_type: 'admin_signal',
        })
      }
    }

    setReviews((current) =>
      current.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              is_reported: true,
              report_reason: reportReason,
              report_note: reportNote.trim() || null,
              reported_at: nowIso,
            }
          : review
      )
    )
    setReporting(false)
    setReportTarget(null)
    setReportNote('')
  }

  useEffect(() => {
    void loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedBusinessId) return
    void loadReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId])

  const stats = useMemo(() => {
    const total = reviews.length
    const unanswered = reviews.filter((review) => !review.reply?.trim()).length
    const reported = reviews.filter((review) => review.is_reported).length
    const avg = total > 0 ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / total : 0
    return { total, unanswered, reported, avg }
  }, [reviews])

  const filtered = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replaceAll('ı', 'i')
      .replaceAll('ş', 's')
      .replaceAll('ğ', 'g')
      .replaceAll('ü', 'u')
      .replaceAll('ö', 'o')
      .replaceAll('ç', 'c')

    let next = [...reviews]
    if (normalizedQuery) {
      next = next.filter((review) => {
        const haystack = [review.comment || '', review.reply || '', review.profiles?.full_name || '']
          .join(' ')
          .toLocaleLowerCase('tr-TR')
          .replaceAll('ı', 'i')
          .replaceAll('ş', 's')
          .replaceAll('ğ', 'g')
          .replaceAll('ü', 'u')
          .replaceAll('ö', 'o')
          .replaceAll('ç', 'c')
        return haystack.includes(normalizedQuery)
      })
    }

    if (filter === 'no_reply') {
      next = next.filter((review) => !review.reply?.trim())
    } else if (filter === 'reported') {
      next = next.filter((review) => Boolean(review.is_reported))
    } else if (filter === 'low_rating') {
      next = next.filter((review) => (review.rating || 0) <= 2)
    } else if (filter === 'replied') {
      next = next.filter((review) => Boolean(review.reply?.trim()))
    }

    if (sort === 'newest') {
      next.sort((a, b) => toTs(b.created_at) - toTs(a.created_at))
    } else if (sort === 'oldest') {
      next.sort((a, b) => toTs(a.created_at) - toTs(b.created_at))
    } else if (sort === 'highest') {
      next.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    } else if (sort === 'lowest') {
      next.sort((a, b) => (a.rating || 0) - (b.rating || 0))
    }

    return next
  }, [reviews, query, filter, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [query, filter, sort, selectedBusinessId])

  return (
    <div className="space-y-6">
      <div className="border-b border-[#2d313a] pb-4">
        <PanelTitle title="Yorum ve Şikayet Merkezi" />
        <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b] mt-2">
          Müşteri değerlendirmelerini inceleyin, yanıtlayın veya şikayet bildirin.
        </p>
      </div>

      <HardwarePanel className="p-5 md:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Toplam</p>
            <p className="text-xl font-mono text-[#e2e8f0] mt-2">{stats.total}</p>
          </div>
          <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-amber-500/0 group-hover:bg-amber-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Cevapsız</p>
            <p className="text-xl font-mono text-amber-400 mt-2">{stats.unanswered}</p>
          </div>
          <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-rose-500/0 group-hover:bg-rose-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Bildirilen</p>
            <p className="text-xl font-mono text-rose-400 mt-2">{stats.reported}</p>
          </div>
          <div className="rounded border border-[#166534] bg-[#14532d]/20 p-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-emerald-500/0 group-hover:bg-emerald-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-emerald-500/70">Ortalama</p>
            <p className="text-xl font-mono text-emerald-400 mt-2">{stats.avg.toFixed(1)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr_1fr_auto] gap-4 pt-2">
          <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
            İşletme
            <select
              className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50 appearance-none"
              value={selectedBusinessId}
              onChange={(event) => setSelectedBusinessId(event.target.value)}
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
            Filtre
            <select
              className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50 appearance-none"
              value={filter}
              onChange={(event) => setFilter(event.target.value as ReviewFilter)}
            >
              <option value="all">TÜMÜ</option>
              <option value="no_reply">CEVAPSIZ</option>
              <option value="replied">CEVAPLANAN</option>
              <option value="reported">BİLDİRİLEN</option>
              <option value="low_rating">DÜŞÜK PUAN (0-2)</option>
            </select>
          </label>

          <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
            Sıralama
            <select
              className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50 appearance-none"
              value={sort}
              onChange={(event) => setSort(event.target.value as ReviewSort)}
            >
              <option value="newest">YENİDEN ESKİYE</option>
              <option value="oldest">ESKİDEN YENİYE</option>
              <option value="highest">PUAN: YÜKSEKTEN DÜŞÜĞE</option>
              <option value="lowest">PUAN: DÜŞÜKTEN YÜKSEĞE</option>
            </select>
          </label>

          <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
            Ara
            <div className="relative mt-2">
              <Search className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full pl-10 pr-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                placeholder="Yorum, cevap..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </label>
        </div>
      </HardwarePanel>

      <HardwarePanel className="p-5 md:p-6 space-y-4">
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#38bdf8]" />
          </div>
        ) : pageItems.length === 0 ? (
          <div className="rounded border border-dashed border-[#2d313a] bg-[#0a0c10] p-6 text-[10px] font-mono uppercase tracking-widest text-[#64748b] text-center">
            BU FİLTREDE YORUM BULUNAMADI.
          </div>
        ) : (
          <div className="space-y-4">
            {pageItems.map((review) => (
              <article key={review.id} className="rounded border border-[#2d313a] bg-[#0a0c10] p-5 hover:border-[#475569] transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#1e232b] pb-3">
                  <div>
                    <div className="text-[13px] font-medium text-[#e2e8f0] uppercase tracking-wide">{maskName(review.profiles?.full_name)}</div>
                    <div className="text-[10px] font-mono text-[#64748b] mt-1 tracking-widest">
                      {new Date(review.created_at).toLocaleDateString('tr-TR')}
                    </div>
                    <div className="mt-1.5 text-[11px] font-mono text-amber-400 tracking-widest">
                      {stars(review.rating)} ({review.rating || 0}/5)
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {review.is_reported ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-mono uppercase tracking-widest border border-rose-900/50 bg-rose-950/20 text-rose-400">
                        <ShieldAlert className="w-3 h-3" />
                        ADMİNE BİLDİRİLDİ
                      </span>
                    ) : null}
                    <button
                      type="button"
                      disabled={Boolean(review.is_reported)}
                      onClick={() => {
                        setReportTarget(review)
                        setReportReason(REPORT_REASONS[0])
                        setReportNote('')
                      }}
                      className={`px-3 py-1.5 rounded text-[9px] font-mono uppercase tracking-widest border transition-colors ${
                        review.is_reported
                          ? 'border-[#2d313a] bg-[#16181d] text-[#475569] cursor-not-allowed'
                          : 'border-rose-900/50 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Flag className="w-3 h-3" />
                        KÖTÜ NİYET BİLDİR
                      </span>
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-[13px] leading-relaxed text-[#cbd5e1] font-sans">{review.comment || '-'}</p>

                {review.reply ? (
                  <div className="mt-4 rounded border border-[#1e232b] bg-[#101419] p-4">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-[#64748b] mb-1.5">SİZİN CEVABINIZ</div>
                    <p className="text-[12px] leading-relaxed text-[#94a3b8] font-sans">{review.reply}</p>
                  </div>
                ) : null}

                <div className="mt-5 space-y-3">
                  <textarea
                    className="w-full min-h-[80px] rounded bg-[#16181d] p-4 text-sm font-mono text-[#e2e8f0] border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569] resize-none custom-scrollbar"
                    placeholder="Yoruma cevap yazın..."
                    value={replyDraftByReview[review.id] || ''}
                    onChange={(event) =>
                      setReplyDraftByReview((current) => ({
                        ...current,
                        [review.id]: event.target.value,
                      }))
                    }
                  />

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setReplyDraftByReview((current) => ({
                          ...current,
                          [review.id]: review.reply || '',
                        }))
                      }
                      className="px-4 py-2 rounded text-[9px] font-mono uppercase tracking-widest border border-[#2d313a] bg-transparent text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
                    >
                      TASLAĞI SIFIRLA
                    </button>
                    <button
                      type="button"
                      onClick={() => saveReply(review.id)}
                      disabled={savingReplyId === review.id}
                      className="px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      {savingReplyId === review.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <MessageSquareReply className="w-3.5 h-3.5" />
                      )}
                      CEVABI KAYDET
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="pt-4 border-t border-[#1e232b] flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
              SAYFA {safePage}/{totalPages} • {filtered.length} YORUM
            </p>
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded border border-[#2d313a] bg-[#0a0c10] text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                GERİ
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded border border-[#2d313a] bg-[#0a0c10] text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                İLERİ
              </button>
            </div>
          </div>
        )}
      </HardwarePanel>

      {reportTarget && (
        <div className="fixed inset-0 z-50 bg-[#050608]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <HardwarePanel className="w-full max-w-xl p-0 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-[#2d313a] bg-[#0f1115] flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[15px] font-medium text-[#e2e8f0] uppercase tracking-wide">Yorumu Admine Bildir</h3>
                <p className="mt-1 text-[10px] font-mono text-[#64748b] uppercase tracking-widest">İnceleme için neden seçin ve isterseniz not ekleyin.</p>
              </div>
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="px-4 py-2 rounded text-[10px] font-mono tracking-widest uppercase border border-[#2d313a] text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
              >
                KAPAT
              </button>
            </div>

            <div className="p-6 bg-[#0c0e12] space-y-5">
              <div className="rounded border border-[#1e232b] bg-[#101419] p-4">
                <span className="inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-[#64748b] mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Şikayet Edilen Yorum
                </span>
                <p className="text-[12px] font-sans text-[#cbd5e1] leading-relaxed">{reportTarget.comment || '-'}</p>
              </div>

              <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Neden
                <select
                  className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value as (typeof REPORT_REASONS)[number])}
                >
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Ek Not (Opsiyonel)
                <textarea
                  className="mt-2 w-full min-h-[100px] px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569] resize-none custom-scrollbar"
                  placeholder="Admin incelemesine yardımcı kısa not..."
                  value={reportNote}
                  onChange={(event) => setReportNote(event.target.value)}
                />
              </label>

              <button
                type="button"
                onClick={() => void submitReport()}
                disabled={reporting}
                className="w-full px-4 py-3 rounded text-[11px] font-mono uppercase tracking-widest border border-rose-900/50 bg-rose-950/30 text-rose-400 hover:bg-rose-900/40 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {reporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                ADMİN İNCELEMESİNE GÖNDER
              </button>
            </div>
          </HardwarePanel>
        </div>
      )}
    </div>
  )
}