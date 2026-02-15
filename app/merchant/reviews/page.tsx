'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Flag, Loader2, MessageSquareReply, Search, ShieldAlert } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { fetchOwnedBusinesses, requireCurrentUserId } from '../_lib/queries'
import type { MerchantBusiness } from '../_lib/helpers'
import { ModuleTitle } from '../_components/module-title'

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

      await supabase.from('messages').insert({
        sender_id: currentUserId,
        recipient_id: null,
        subject: `Yorum Şikayet Bildirimi • ${selectedBusinessName}`,
        content,
        message_type: 'direct',
      })
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
    <div className="space-y-5">
      <div>
        <ModuleTitle title="Yorum ve Şikayet Merkezi" />
      </div>

      <section className="rounded-[28px] p-4 md:p-5 border border-white/70 bg-[linear-gradient(145deg,#ffffff_0%,#f3f7ff_100%)] shadow-[0_22px_30px_-24px_rgba(15,23,42,0.56)] space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          <div className="relative overflow-hidden rounded-2xl px-3 py-3 border border-white/70 bg-white">
            <span className="absolute -right-6 -top-5 w-20 h-20 rounded-full bg-blue-200/35 blur-xl" />
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-500">Toplam</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl px-3 py-3 border border-white/70 bg-white">
            <span className="absolute -right-6 -top-5 w-20 h-20 rounded-full bg-amber-200/35 blur-xl" />
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-500">Cevapsız</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">{stats.unanswered}</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl px-3 py-3 border border-white/70 bg-white">
            <span className="absolute -right-6 -top-5 w-20 h-20 rounded-full bg-rose-200/35 blur-xl" />
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-500">Bildirilen</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">{stats.reported}</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl px-3 py-3 border border-white/70 bg-white">
            <span className="absolute -right-6 -top-5 w-20 h-20 rounded-full bg-emerald-200/35 blur-xl" />
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-500">Ortalama</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">{stats.avg.toFixed(1)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr_1fr_auto] gap-2.5">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500">İşletme</span>
            <select
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
              value={selectedBusinessId}
              onChange={(event) => setSelectedBusinessId(event.target.value)}
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500">Filtre</span>
            <select
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
              value={filter}
              onChange={(event) => setFilter(event.target.value as ReviewFilter)}
            >
              <option value="all">Tümü</option>
              <option value="no_reply">Cevapsız</option>
              <option value="replied">Cevaplanan</option>
              <option value="reported">Bildirilen</option>
              <option value="low_rating">Düşük Puan (0-2)</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500">Sıralama</span>
            <select
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
              value={sort}
              onChange={(event) => setSort(event.target.value as ReviewSort)}
            >
              <option value="newest">Yeniden Eskiye</option>
              <option value="oldest">Eskiden Yeniye</option>
              <option value="highest">Puan: Yüksekten Düşüğe</option>
              <option value="lowest">Puan: Düşükten Yükseğe</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500">Ara</span>
            <div className="mt-1.5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                placeholder="Yorum, cevap veya isim..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-[28px] p-4 md:p-5 border border-white/70 bg-[linear-gradient(145deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_20px_28px_-22px_rgba(15,23,42,0.55)] space-y-3">
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : pageItems.length === 0 ? (
          <div className="text-sm text-slate-500">Bu filtrede yorum bulunamadı.</div>
        ) : (
          <div className="space-y-3">
            {pageItems.map((review) => (
              <article key={review.id} className="rounded-2xl p-4 border border-slate-200/70 bg-white/90 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-800">{maskName(review.profiles?.full_name)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {new Date(review.created_at).toLocaleDateString('tr-TR')}
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-amber-600">
                      {stars(review.rating)} ({review.rating || 0}/5)
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {review.is_reported ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-100">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Admine Bildirildi
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
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                        review.is_reported
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Flag className="w-3.5 h-3.5" />
                        Kötü Niyet Bildir
                      </span>
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-800">{review.comment || '-'}</p>

                {review.reply ? (
                  <div className="mt-3 rounded-xl p-3 bg-amber-50 border border-amber-100">
                    <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700">Sizin cevabınız</div>
                    <p className="mt-1 text-sm text-slate-700">{review.reply}</p>
                  </div>
                ) : null}

                <div className="mt-3 space-y-2">
                  <textarea
                    className="w-full min-h-20 rounded-xl p-3 text-sm bg-white text-slate-700 border border-slate-200"
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
                      className="px-3 py-2 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
                    >
                      Taslağı Sıfırla
                    </button>
                    <button
                      type="button"
                      onClick={() => saveReply(review.id)}
                      disabled={savingReplyId === review.id}
                      className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-1">
                        {savingReplyId === review.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <MessageSquareReply className="w-3.5 h-3.5" />
                        )}
                        Cevabı Kaydet
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500 font-semibold">
              Sayfa {safePage}/{totalPages} • Toplam {filtered.length} yorum
            </p>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 disabled:opacity-40"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 disabled:opacity-40"
              >
                İleri
              </button>
            </div>
          </div>
        )}
      </section>

      {reportTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl p-5 bg-white border border-white/70 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Yorumu Admine Bildir</h3>
                <p className="text-xs text-slate-500 mt-1">İnceleme için neden seçin ve isterseniz not ekleyin.</p>
              </div>
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200"
              >
                Kapat
              </button>
            </div>

            <div className="rounded-2xl p-3 bg-rose-50 border border-rose-100 text-sm text-slate-700">
              <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-xs uppercase tracking-wide">
                <AlertTriangle className="w-3.5 h-3.5" />
                Şikayet Edilen Yorum
              </span>
              <p className="mt-1.5">{reportTarget.comment || '-'}</p>
            </div>

            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500">Neden</span>
              <select
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value as (typeof REPORT_REASONS)[number])}
              >
                {REPORT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500">Ek Not (Opsiyonel)</span>
              <textarea
                className="mt-1.5 w-full min-h-24 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700"
                placeholder="Admin incelemesine yardımcı kısa not..."
                value={reportNote}
                onChange={(event) => setReportNote(event.target.value)}
              />
            </label>

            <button
              type="button"
              onClick={() => void submitReport()}
              disabled={reporting}
              className="w-full px-3 py-3 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-1.5">
                {reporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                Admin İncelemesine Gönder
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
