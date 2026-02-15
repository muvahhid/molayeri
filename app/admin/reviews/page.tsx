'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, RefreshCcw, Search, ShieldCheck, ShieldX, Trash2 } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'

const PAGE_SIZE = 10

type ReviewFilter = 'all' | 'no_reply' | 'replied' | 'low_rating'
type ReviewSort = 'newest' | 'oldest' | 'highest' | 'lowest'

type RawReview = {
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
}

type BusinessRow = {
  id: string
  name: string | null
  owner_id: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
}

type AdminReview = RawReview & {
  business_name: string
  business_owner_id: string | null
  reviewer_name: string
}

function toTs(value: string): number {
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function starText(rating: number | null): string {
  const safe = Math.max(0, Math.min(5, Math.round(rating || 0)))
  return `${'★'.repeat(safe)}${'☆'.repeat(5 - safe)}`
}

export default function AdminReviewsPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [loading, setLoading] = useState(true)
  const [adminUserId, setAdminUserId] = useState<string | null>(null)
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ReviewFilter>('all')
  const [sort, setSort] = useState<ReviewSort>('newest')
  const [page, setPage] = useState(1)
  const [actioningKey, setActioningKey] = useState<string | null>(null)

  const loadReportedReviews = async () => {
    setLoading(true)
    const { data: authData } = await supabase.auth.getUser()
    setAdminUserId(authData.user?.id || null)

    let rows: RawReview[] = []

    const primary = await supabase
      .from('business_reviews')
      .select('id,business_id,user_id,rating,comment,reply,is_reported,created_at,report_reason,report_note,reported_at')
      .eq('is_reported', true)
      .order('created_at', { ascending: false })

    if (!primary.error && primary.data) {
      rows = primary.data as RawReview[]
    } else {
      const fallback = await supabase
        .from('business_reviews')
        .select('id,business_id,user_id,rating,comment,reply,is_reported,created_at')
        .eq('is_reported', true)
        .order('created_at', { ascending: false })

      rows = (fallback.data || []) as RawReview[]
    }

    if (rows.length === 0) {
      setReviews([])
      setLoading(false)
      return
    }

    const businessIds = Array.from(new Set(rows.map((row) => row.business_id).filter(Boolean)))
    const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean))) as string[]

    const [businessRes, profileRes] = await Promise.all([
      businessIds.length > 0
        ? supabase.from('businesses').select('id,name,owner_id').in('id', businessIds)
        : Promise.resolve({ data: [] as unknown[] }),
      userIds.length > 0
        ? supabase.from('profiles').select('id,full_name').in('id', userIds)
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
      } satisfies AdminReview
    })

    setReviews(enriched)
    setLoading(false)
  }

  const closeReport = async (review: AdminReview) => {
    const key = `${review.id}:close`
    if (actioningKey) return
    setActioningKey(key)

    const nowIso = new Date().toISOString()
    let updated = false
    try {
      const richUpdate = await supabase
        .from('business_reviews')
        .update({
          is_reported: false,
          report_status: 'resolved',
          reviewed_at: nowIso,
        })
        .eq('id', review.id)

      if (!richUpdate.error) {
        updated = true
      }
    } catch {}

    if (!updated) {
      const fallbackUpdate = await supabase.from('business_reviews').update({ is_reported: false }).eq('id', review.id)
      if (fallbackUpdate.error) {
        window.alert(`Rapor kapatılamadı: ${fallbackUpdate.error.message}`)
        setActioningKey(null)
        return
      }
    }

    if (adminUserId && review.business_owner_id) {
      await supabase.from('messages').insert({
        sender_id: adminUserId,
        recipient_id: review.business_owner_id,
        subject: `Yorum inceleme tamamlandı • ${review.business_name}`,
        content: `Bildirilen yorum incelendi ve rapor kapatıldı.\nYorum ID: ${review.id}`,
        message_type: 'direct',
      })
    }

    setReviews((current) => current.filter((item) => item.id !== review.id))
    setActioningKey(null)
  }

  const removeReviewContent = async (review: AdminReview) => {
    const key = `${review.id}:remove`
    if (actioningKey) return
    const ok = window.confirm('Yorum metni yönetim tarafından kaldırılsın mı?')
    if (!ok) return

    setActioningKey(key)
    const nowIso = new Date().toISOString()
    const replacement = 'Yorum yönetim tarafından kaldırıldı.'
    let updated = false

    try {
      const richUpdate = await supabase
        .from('business_reviews')
        .update({
          comment: replacement,
          is_reported: false,
          report_status: 'removed',
          reviewed_at: nowIso,
        })
        .eq('id', review.id)

      if (!richUpdate.error) {
        updated = true
      }
    } catch {}

    if (!updated) {
      const fallbackUpdate = await supabase
        .from('business_reviews')
        .update({
          comment: replacement,
          is_reported: false,
        })
        .eq('id', review.id)
      if (fallbackUpdate.error) {
        window.alert(`Yorum kaldırılamadı: ${fallbackUpdate.error.message}`)
        setActioningKey(null)
        return
      }
    }

    if (adminUserId && review.business_owner_id) {
      await supabase.from('messages').insert({
        sender_id: adminUserId,
        recipient_id: review.business_owner_id,
        subject: `Yorum moderasyonu uygulandı • ${review.business_name}`,
        content: `Bildirilen yorum metni kaldırıldı.\nYorum ID: ${review.id}`,
        message_type: 'direct',
      })
    }

    setReviews((current) => current.filter((item) => item.id !== review.id))
    setActioningKey(null)
  }

  useEffect(() => {
    void loadReportedReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        const text = [review.business_name, review.reviewer_name, review.comment || '', review.report_reason || '']
          .join(' ')
          .toLocaleLowerCase('tr-TR')
          .replaceAll('ı', 'i')
          .replaceAll('ş', 's')
          .replaceAll('ğ', 'g')
          .replaceAll('ü', 'u')
          .replaceAll('ö', 'o')
          .replaceAll('ç', 'c')
        return text.includes(normalizedQuery)
      })
    }

    if (filter === 'no_reply') {
      next = next.filter((review) => !review.reply?.trim())
    } else if (filter === 'replied') {
      next = next.filter((review) => Boolean(review.reply?.trim()))
    } else if (filter === 'low_rating') {
      next = next.filter((review) => (review.rating || 0) <= 2)
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

  const stats = useMemo(() => {
    const total = reviews.length
    const low = reviews.filter((review) => (review.rating || 0) <= 2).length
    const noReply = reviews.filter((review) => !review.reply?.trim()).length
    return { total, low, noReply }
  }, [reviews])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [query, filter, sort])

  return (
    <div className="space-y-5">
      <section className="rounded-3xl p-5 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Yorum Şikayet Merkezi</h2>
            <p className="text-sm text-slate-500 mt-1">
              İşletmeciler tarafından bildirilen kötü niyetli yorumları inceleyin ve aksiyon alın.
            </p>
          </div>
          <button
            type="button"
            onClick={loadReportedReviews}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
          >
            <RefreshCcw className="w-4 h-4" />
            Yenile
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <article className="rounded-2xl p-4 bg-white shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-400">Toplam Bildirim</p>
          <p className="text-2xl font-semibold text-slate-800 mt-1">{stats.total}</p>
        </article>
        <article className="rounded-2xl p-4 bg-white shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-400">Düşük Puan (0-2)</p>
          <p className="text-2xl font-semibold text-slate-800 mt-1">{stats.low}</p>
        </article>
        <article className="rounded-2xl p-4 bg-white shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-400">Cevapsız Yorum</p>
          <p className="text-2xl font-semibold text-slate-800 mt-1">{stats.noReply}</p>
        </article>
      </section>

      <section className="rounded-3xl p-4 md:p-5 bg-white shadow-sm space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr] gap-2.5">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Ara</span>
            <div className="mt-1.5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
                placeholder="İşletme, kullanıcı, yorum..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Filtre</span>
            <select
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
              value={filter}
              onChange={(event) => setFilter(event.target.value as ReviewFilter)}
            >
              <option value="all">Tümü</option>
              <option value="no_reply">Cevapsız</option>
              <option value="replied">Cevaplanan</option>
              <option value="low_rating">Düşük Puan (0-2)</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Sıralama</span>
            <select
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
              value={sort}
              onChange={(event) => setSort(event.target.value as ReviewSort)}
            >
              <option value="newest">Yeniden Eskiye</option>
              <option value="oldest">Eskiden Yeniye</option>
              <option value="highest">Puan: Yüksekten Düşüğe</option>
              <option value="lowest">Puan: Düşükten Yükseğe</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : pageRows.length === 0 ? (
          <div className="rounded-2xl p-4 border border-slate-200 bg-slate-50 text-sm text-slate-500">
            Bildirilen yorum bulunamadı.
          </div>
        ) : (
          <div className="space-y-3">
            {pageRows.map((review) => {
              const closing = actioningKey === `${review.id}:close`
              const removing = actioningKey === `${review.id}:remove`
              return (
                <article key={review.id} className="rounded-2xl p-4 border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{review.business_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Kullanıcı: {review.reviewer_name} • {new Date(review.created_at).toLocaleString('tr-TR')}
                      </p>
                      <p className="text-[13px] text-amber-600 mt-1 font-semibold">
                        {starText(review.rating)} ({review.rating || 0}/5)
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void closeReport(review)}
                        disabled={Boolean(actioningKey)}
                        className="px-3 py-2 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 disabled:opacity-50"
                      >
                        <span className="inline-flex items-center gap-1">
                          {closing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          Raporu Kapat
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeReviewContent(review)}
                        disabled={Boolean(actioningKey)}
                        className="px-3 py-2 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 disabled:opacity-50"
                      >
                        <span className="inline-flex items-center gap-1">
                          {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Yorumu Kaldır
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl p-3 bg-slate-50 border border-slate-100 text-sm text-slate-700">
                    {review.comment || '-'}
                  </div>

                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="rounded-xl p-2.5 border border-slate-100 bg-white text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Bildirim nedeni:</span>{' '}
                      {review.report_reason || 'Belirtilmedi'}
                    </div>
                    <div className="rounded-xl p-2.5 border border-slate-100 bg-white text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">İşletmeci cevabı:</span>{' '}
                      {review.reply?.trim() ? review.reply : 'Henüz cevaplanmamış'}
                    </div>
                  </div>

                  {review.report_note ? (
                    <div className="mt-2 rounded-xl p-2.5 border border-amber-100 bg-amber-50 text-xs text-slate-700">
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        İşletmeci notu
                      </span>
                      <p className="mt-1">{review.report_note}</p>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500 font-semibold">
              Sayfa {safePage}/{totalPages} • Toplam {filtered.length} bildirim
            </p>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 disabled:opacity-40"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 disabled:opacity-40"
              >
                İleri
              </button>
            </div>
          </div>
        )}

        {!loading && reviews.length > 0 ? (
          <div className="rounded-xl p-3 border border-blue-100 bg-blue-50/70 text-xs text-blue-800">
            <span className="inline-flex items-center gap-1 font-semibold">
              <ShieldX className="w-3.5 h-3.5" />
              Moderasyon Notu:
            </span>{' '}
            Rapor kapatıldığında kayıt aktif listeden düşer. “Yorumu kaldır” aksiyonu yorum metnini güvenli metinle değiştirir.
          </div>
        ) : null}
      </section>
    </div>
  )
}
