'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Compass,
  Loader2,
  MapPin,
  Radio,
  RefreshCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Tag,
  Users,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { ModuleTitle } from '../_components/module-title'
import { categorySlugFromName, type MerchantBusiness } from '../_lib/helpers'
import { fetchOwnedBusinesses, requireCurrentUserId } from '../_lib/queries'

type CouponCampaign = {
  id: string
  title: string | null
  code?: string | null
  discount_type: string | null
  discount_value: number | null
  monetary_value: number | null
  valid_until: string | null
}

type RadarResultTone = 'success' | 'warn' | 'error'

type CategoryMeta = {
  label: string
  emoji: string
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  yakit: { label: 'Yakıt', emoji: '⛽️' },
  sarj: { label: 'Şarj', emoji: '⚡️' },
  yemek: { label: 'Yemek', emoji: '🍔' },
  market: { label: 'Market', emoji: '🛒' },
  kafe: { label: 'Kafe', emoji: '☕️' },
  otel: { label: 'Konaklama', emoji: '🛏️' },
  servis: { label: 'Servis', emoji: '🛠️' },
  other: { label: 'Diğer', emoji: '📍' },
}

const CATEGORY_ORDER = ['yakit', 'sarj', 'yemek', 'market', 'kafe', 'otel', 'servis', 'other']
const QUICK_RANGES = [3, 5, 10, 20, 30, 50]
const QUICK_TEMPLATES = [
  'Bugüne özel fırsatlar aktif, sizi bekliyoruz.',
  'Hızlı servis ve avantajlı fiyatlar için hemen uğrayın.',
  'Yakınınızdaki işletmemizde kampanya başladı, kaçırmayın.',
]
const QUICK_EMOJIS = ['🔥', '☕️', '🍔', '⛽️', '📢', '⚡️', '🎁', '👋']
const MESSAGE_LIMIT = 120
const SETTINGS_STORAGE_KEY = 'merchant_settings_v1'

function normalizeBusinessType(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

function couponSummary(coupon: CouponCampaign): string {
  if (coupon.discount_type === 'percentage') {
    return `%${Math.trunc(coupon.discount_value || 0)} indirim`
  }
  if (coupon.discount_type === 'free') {
    return `${Math.trunc(coupon.monetary_value || 0)}₺ hediye`
  }
  if (coupon.discount_type === 'item') {
    return 'Ürün kuponu'
  }
  return 'Kupon'
}

function normalizeError(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as {
      message?: string
      details?: string
      hint?: string
      code?: string
    }
    return [e.message, e.details, e.hint, e.code].filter(Boolean).join(' | ')
  }
  return String(error || '')
}

function toResultObject(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>
  }
  return {
    status: 'ok',
    sent_count: 0,
  }
}

function shouldTryLegacyFallbackFromDetail(detail: string): boolean {
  const normalized = detail.toLowerCase()
  return normalized.includes('send_business_campaign_signal_v2')
}

function shouldRetryV2WithoutCoupon(detail: string): boolean {
  const normalized = detail.toLowerCase()
  return (
    normalized.includes('record "v_coupon" is not assigned yet') ||
    (normalized.includes('v_coupon') && normalized.includes('not assigned yet'))
  )
}

function sortCategorySlugs(slugs: string[]): string[] {
  return [...slugs]
    .filter((slug) => Boolean(CATEGORY_META[slug]))
    .sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b))
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function resolveRadarRuntimeDefaults(raw: unknown): {
  rangeKm?: number
  message?: string
  defaultBusinessId?: string
} {
  const root = asObject(raw)
  const radar = asObject(root.radar)
  const operations = asObject(root.operations)

  const rangeRaw = Number(radar.defaultRangeKm)
  const messageRaw = typeof radar.defaultMessage === 'string' ? radar.defaultMessage.trim() : ''
  const defaultBusinessRaw =
    typeof operations.defaultBusinessId === 'string' ? operations.defaultBusinessId.trim() : ''

  return {
    rangeKm: Number.isFinite(rangeRaw) ? Math.max(1, Math.min(50, rangeRaw)) : undefined,
    message: messageRaw ? messageRaw.slice(0, MESSAGE_LIMIT) : undefined,
    defaultBusinessId: defaultBusinessRaw || undefined,
  }
}

type MolaTargetSummaryRow = {
  user_id: string
  stop_key: string
}

function normalizeMolaTargetSummaryRows(rows: unknown[]): MolaTargetSummaryRow[] {
  return rows
    .map((raw) => asObject(raw))
    .map((row) => ({
      user_id: typeof row.user_id === 'string' ? row.user_id : '',
      stop_key: typeof row.stop_key === 'string' ? row.stop_key : '',
    }))
    .filter((row) => row.user_id.length > 0 && row.stop_key.length > 0)
}

export default function MerchantRadarPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [loading, setLoading] = useState(true)
  const [composerLoading, setComposerLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')

  const [rangeKm, setRangeKm] = useState(10)
  const [message, setMessage] = useState('')
  const [businessCategories, setBusinessCategories] = useState<string[]>(['other'])
  const [targetCategories, setTargetCategories] = useState<string[]>(['other'])
  const [coupons, setCoupons] = useState<CouponCampaign[]>([])
  const [selectedCouponId, setSelectedCouponId] = useState('')

  const [resultText, setResultText] = useState('')
  const [resultTone, setResultTone] = useState<RadarResultTone>('success')
  const [molaSummaryLoading, setMolaSummaryLoading] = useState(false)
  const [molaTargetCount, setMolaTargetCount] = useState(0)
  const [molaActiveOfferCount, setMolaActiveOfferCount] = useState(0)

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId) || null
  const selectedCoupon = coupons.find((coupon) => coupon.id === selectedCouponId) || null

  const isBusinessLocationReady =
    Number.isFinite(Number(selectedBusiness?.lat)) && Number.isFinite(Number(selectedBusiness?.lng))

  const loadBusinesses = async () => {
    setLoading(true)

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    const userId = user?.id || (await requireCurrentUserId(supabase))

    if (!userId) {
      setBusinesses([])
      setSelectedBusinessId('')
      setLoading(false)
      return
    }

    const metadataDefaults = resolveRadarRuntimeDefaults(asObject(user?.user_metadata).merchant_settings)
    let localDefaults: ReturnType<typeof resolveRadarRuntimeDefaults> | null = null
    if (typeof window !== 'undefined') {
      try {
        const localRaw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
        if (localRaw) {
          localDefaults = resolveRadarRuntimeDefaults(JSON.parse(localRaw))
        }
      } catch {
        localDefaults = null
      }
    }

    const effectiveDefaults = {
      rangeKm: metadataDefaults.rangeKm ?? localDefaults?.rangeKm,
      message: metadataDefaults.message ?? localDefaults?.message,
      defaultBusinessId: metadataDefaults.defaultBusinessId ?? localDefaults?.defaultBusinessId,
    }

    if (effectiveDefaults.rangeKm != null) {
      setRangeKm(effectiveDefaults.rangeKm)
    }
    if (effectiveDefaults.message) {
      setMessage((current) => (current.trim().length > 0 ? current : effectiveDefaults.message || ''))
    }

    const ownedBusinesses = await fetchOwnedBusinesses(supabase, userId)
    setBusinesses(ownedBusinesses)
    setSelectedBusinessId((current) => {
      if (current && ownedBusinesses.some((item) => item.id === current)) {
        return current
      }
      if (effectiveDefaults.defaultBusinessId && ownedBusinesses.some((item) => item.id === effectiveDefaults.defaultBusinessId)) {
        return effectiveDefaults.defaultBusinessId
      }
      return ownedBusinesses[0]?.id || ''
    })
    setLoading(false)
  }

  const prepareComposerData = async (business: MerchantBusiness) => {
    if (!business?.id) {
      setBusinessCategories(['other'])
      setTargetCategories(['other'])
      setCoupons([])
      setSelectedCouponId('')
      return
    }

    setComposerLoading(true)
    const categorySet = new Set<string>()

    try {
      const { data: categoryLinks } = await supabase
        .from('business_categories')
        .select('category_id')
        .eq('business_id', business.id)

      const ids = (categoryLinks || [])
        .map((row) => (row as { category_id?: string | null }).category_id)
        .filter((id): id is string => Boolean(id))

      if (ids.length > 0) {
        const { data: categoryRows } = await supabase.from('categories').select('name').in('id', ids)

        for (const row of categoryRows || []) {
          const name = (row as { name?: string | null }).name || ''
          if (!name) continue
          categorySet.add(categorySlugFromName(name))
        }
      }

      const normalizedType = normalizeBusinessType(business.type)
      if (normalizedType && CATEGORY_META[normalizedType]) {
        categorySet.add(normalizedType)
      }

      if (categorySet.size === 0) {
        categorySet.add('other')
      }

      const { data: couponRows } = await supabase
        .from('coupon_campaigns')
        .select('id, title, code, discount_type, discount_value, monetary_value, valid_until, is_active')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      const now = new Date()
      const validCoupons = ((couponRows || []) as (CouponCampaign & { is_active?: boolean })[]).filter((coupon) => {
        if (!coupon.valid_until) return true
        const expiry = new Date(coupon.valid_until)
        return Number.isNaN(expiry.getTime()) || expiry > now
      })

      const orderedCategories = sortCategorySlugs(Array.from(categorySet))
      const fallbackCategories = orderedCategories.length > 0 ? orderedCategories : ['other']

      setBusinessCategories(fallbackCategories)
      setTargetCategories(fallbackCategories)
      setCoupons(validCoupons)
      setSelectedCouponId('')
    } catch {
      const fallbackType = normalizeBusinessType(business.type)
      const fallback = CATEGORY_META[fallbackType] ? fallbackType : 'other'

      setBusinessCategories([fallback])
      setTargetCategories([fallback])
      setCoupons([])
      setSelectedCouponId('')
    } finally {
      setComposerLoading(false)
    }
  }

  const loadMolaSummary = async (businessId: string) => {
    if (!businessId) {
      setMolaTargetCount(0)
      setMolaActiveOfferCount(0)
      return
    }

    setMolaSummaryLoading(true)
    try {
      let targetRows: MolaTargetSummaryRow[] = []

      try {
        const { data, error } = await supabase.rpc('get_mola_targets_for_business_v2', {
          p_business_id: businessId,
        })
        if (error) throw error
        targetRows = normalizeMolaTargetSummaryRows((data || []) as unknown[])
      } catch {
        try {
          const { data, error } = await supabase.rpc('get_mola_targets_for_business', {
            p_business_id: businessId,
          })
          if (error) throw error
          targetRows = normalizeMolaTargetSummaryRows((data || []) as unknown[])
        } catch {
          const { data } = await supabase
            .from('user_mola_stops')
            .select('user_id, stop_key')
            .eq('business_id', businessId)
            .eq('status', 'active')
          targetRows = normalizeMolaTargetSummaryRows((data || []) as unknown[])
        }
      }

      const { data: activeOffers } = await supabase
        .from('mola_business_offers')
        .select('user_id, stop_key')
        .eq('business_id', businessId)
        .in('status', ['sent', 'active'])

      const activeKeys = new Set(
        ((activeOffers || []) as unknown[])
          .map((raw) => asObject(raw))
          .map((row) => `${typeof row.user_id === 'string' ? row.user_id : ''}|${typeof row.stop_key === 'string' ? row.stop_key : ''}`)
          .filter((key) => key !== '|')
      )

      setMolaTargetCount(targetRows.length)
      setMolaActiveOfferCount(activeKeys.size)
    } catch {
      setMolaTargetCount(0)
      setMolaActiveOfferCount(0)
    } finally {
      setMolaSummaryLoading(false)
    }
  }

  const sendRadarSignal = async ({
    messageText,
    range,
    categories,
    couponCampaignId,
  }: {
    messageText: string
    range: number
    categories: string[]
    couponCampaignId?: string
  }): Promise<Record<string, unknown>> => {
    if (!selectedBusinessId) return { status: 'business_missing' }

    const callV2 = async (couponId: string | null): Promise<Record<string, unknown>> => {
      const { data, error } = await supabase.rpc('send_business_campaign_signal_v2', {
        p_business_id: selectedBusinessId,
        p_range_km: range,
        p_message: messageText,
        p_target_categories: categories,
        p_coupon_campaign_id: couponId,
      })
      if (error) throw error
      return toResultObject(data)
    }

    const callLegacy = async (): Promise<Record<string, unknown>> => {
      try {
        const legacy = await supabase.rpc('send_business_campaign_signal', {
          p_business_id: selectedBusinessId,
          p_range_km: range,
          p_message: messageText,
        })

        if (legacy.error) throw legacy.error

        const mapped = toResultObject(legacy.data)
        mapped.fallback = 'legacy_rpc'
        return mapped
      } catch (legacyError: unknown) {
        return {
          status: 'error',
          detail: normalizeError(legacyError),
        }
      }
    }

    try {
      const mapped = await callV2(couponCampaignId || null)
      const mappedStatus = String(mapped.status || '').toLowerCase()
      const mappedDetail = String(mapped.detail || '')

      if (mappedStatus === 'error') {
        if (shouldRetryV2WithoutCoupon(mappedDetail) && couponCampaignId) {
          try {
            const retried = await callV2(null)
            retried.fallback = 'v2_without_coupon'
            retried.v2_detail = mappedDetail
            return retried
          } catch (retryError: unknown) {
            return {
              status: 'error',
              detail: normalizeError(retryError),
            }
          }
        }

        if (shouldTryLegacyFallbackFromDetail(mappedDetail)) {
          const legacyResult = await callLegacy()
          legacyResult.v2_detail = mappedDetail
          return legacyResult
        }
      }

      return mapped
    } catch (error: unknown) {
      const detail = normalizeError(error)

      if (shouldRetryV2WithoutCoupon(detail) && couponCampaignId) {
        try {
          const retried = await callV2(null)
          retried.fallback = 'v2_without_coupon'
          retried.v2_detail = detail
          return retried
        } catch (retryError: unknown) {
          return {
            status: 'error',
            detail: normalizeError(retryError),
          }
        }
      }

      if (shouldTryLegacyFallbackFromDetail(detail)) {
        const legacyResult = await callLegacy()
        legacyResult.v2_detail = detail
        return legacyResult
      }

      return {
        status: 'error',
        detail: normalizeError(error),
      }
    }
  }

  const handleSend = async () => {
    if (!selectedBusinessId) return

    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      window.alert('Lütfen bir kampanya mesajı yazın.')
      return
    }

    if (targetCategories.length === 0) {
      window.alert('En az bir hedef kategori seçmelisin.')
      return
    }

    setSending(true)
    setResultText('')

    const result = await sendRadarSignal({
      messageText: trimmedMessage,
      range: rangeKm,
      categories: targetCategories,
      couponCampaignId: selectedCouponId || undefined,
    })

    const status = String(result.status || '').toLowerCase()

    if (status === 'ok') {
      const sentCount = Number(result.sent_count || 0)
      const usedLegacy = String(result.fallback || '') === 'legacy_rpc'
      const usedV2WithoutCoupon = String(result.fallback || '') === 'v2_without_coupon'
      const hadCouponSelection = Boolean(selectedCouponId)

      if (sentCount > 0) {
        if (usedV2WithoutCoupon && hadCouponSelection) {
          setResultTone('warn')
          setResultText(`${sentCount} kullanıcıya mesaj gitti; kupon geçici olarak bağlanmadan gönderildi.`)
        } else if (usedLegacy && hadCouponSelection) {
          setResultTone('warn')
          setResultText(`${sentCount} kullanıcıya mesaj gitti; kupon bağlanmadı (DB v2 eksik).`)
        } else {
          setResultTone('success')
          setResultText(`${sentCount} kullanıcıya kampanya sinyali gönderildi.`)
        }
      } else {
        setResultTone('warn')
        setResultText('Uygun kullanıcı bulunamadı. Kullanıcı uygulamada aktif değilse, kategori/bildirim tercihi uyuşmuyorsa veya konumu güncel değilse gönderim yapılmaz.')
      }

      setSending(false)
      return
    }

    let errorText = 'Kampanya gönderimi başarısız.'

    if (status === 'forbidden') {
      errorText = 'Bu işletme için gönderim yetkiniz yok.'
    } else if (status === 'business_not_found') {
      errorText = 'İşletme bulunamadı.'
    } else if (status === 'business_location_missing') {
      errorText = 'İşletme konumu eksik. Şube konumu kaydedilmeden mesafe bazlı gönderim yapılamaz.'
    } else if (status === 'auth') {
      errorText = 'Oturum hatası. Tekrar giriş yapın.'
    } else if (status === 'empty') {
      errorText = 'Mesaj metni boş olamaz.'
    } else if (status === 'coupon_not_found') {
      errorText = 'Seçtiğin kupon geçersiz veya pasif.'
    } else if (status === 'coupon_expired') {
      errorText = 'Seçtiğin kuponun süresi dolmuş.'
    } else if (status === 'error') {
      const detail = String(result.detail || '')
      if (detail.includes('send_business_campaign_signal_v2')) {
        errorText = 'DB fonksiyonu eksik. SQL dosyasını çalıştırın.'
      } else if (detail) {
        errorText = `Kampanya gönderimi başarısız: ${detail}`
      }
    }

    setResultTone('error')
    setResultText(errorText)
    setSending(false)
  }

  useEffect(() => {
    void loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedBusiness) {
      setMolaTargetCount(0)
      setMolaActiveOfferCount(0)
      return
    }
    void Promise.all([prepareComposerData(selectedBusiness), loadMolaSummary(selectedBusiness.id)])
    setResultText('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusiness])

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] p-4 md:p-5 bg-[linear-gradient(145deg,#ffffff_0%,#f2f7ff_100%)] border border-white/70 shadow-[0_22px_30px_-24px_rgba(15,23,42,0.65)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <ModuleTitle title="Müşteri Radarı" />
            <p className="mt-1 text-xs text-slate-500">📡 Konuma dayalı radar gönderimi ve kampanya hedefleme</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.2),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
            {isBusinessLocationReady ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
            <span className="text-xs font-semibold">
              {isBusinessLocationReady ? 'Konum hedefleme hazır' : 'İşletme konumu kontrol edilmeli'}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 xl:grid-cols-4 gap-2">
          <div className="rounded-xl p-2.5 bg-white border border-slate-100 shadow-[0_10px_14px_-16px_rgba(15,23,42,0.7)]">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">İşletme</p>
            <p className="mt-0.5 text-base font-bold text-slate-800">{selectedBusiness ? selectedBusiness.name : '-'}</p>
          </div>
          <div className="rounded-xl p-2.5 bg-white border border-slate-100 shadow-[0_10px_14px_-16px_rgba(15,23,42,0.7)]">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Hedef Mesafe</p>
            <p className="mt-0.5 text-base font-bold text-slate-800">{rangeKm} km</p>
          </div>
          <div className="rounded-xl p-2.5 bg-white border border-slate-100 shadow-[0_10px_14px_-16px_rgba(15,23,42,0.7)]">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Kategori</p>
            <p className="mt-0.5 text-base font-bold text-slate-800">{targetCategories.length} seçili</p>
          </div>
          <div className="rounded-xl p-2.5 bg-white border border-slate-100 shadow-[0_10px_14px_-16px_rgba(15,23,42,0.7)]">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Kupon</p>
            <p className="mt-0.5 text-base font-bold text-slate-800">{selectedCoupon ? couponSummary(selectedCoupon) : 'Yok'}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] p-4 md:p-5 bg-[linear-gradient(145deg,#ffffff_0%,#f3f7ff_100%)] border border-white/70 shadow-[0_22px_30px_-24px_rgba(15,23,42,0.65)]">
        {loading ? (
          <div className="h-56 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          </div>
        ) : !selectedBusiness ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">
            Radar gönderimi için en az bir işletme gerekli.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.22fr)_minmax(360px,0.78fr)] gap-3">
            <section className="rounded-[24px] p-4 md:p-5 bg-white border border-white/80 shadow-[0_16px_24px_-20px_rgba(15,23,42,0.6)] space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.2),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
                  <Radio className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold">Radar Kompozitörü</span>
                </div>
                {composerLoading ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : null}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  İşletme
                  <select
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700"
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

                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  Kupon
                  <select
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700"
                    value={selectedCouponId}
                    onChange={(event) => setSelectedCouponId(event.target.value)}
                  >
                    <option value="">Kupon gönderme</option>
                    {coupons.map((coupon) => (
                      <option key={coupon.id} value={coupon.id}>
                        {(coupon.title || 'Kupon')} • {couponSummary(coupon)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/85 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Hedef Mesafe</p>
                  <span className="text-xs font-bold text-blue-700">{rangeKm} km</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={rangeKm}
                  onChange={(event) => setRangeKm(Number(event.target.value))}
                  className="mt-2 w-full accent-blue-600"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_RANGES.map((km) => (
                    <button
                      key={km}
                      type="button"
                      onClick={() => setRangeKm(km)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        km === rangeKm
                          ? 'bg-blue-600 text-white border-blue-600 shadow-[0_10px_16px_-14px_rgba(37,99,235,0.9)]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {km} km
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Hedef Kategoriler</p>
                  <span className="text-[11px] font-semibold text-slate-500">En az 1 kategori</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {businessCategories.map((slug) => {
                    const selected = targetCategories.includes(slug)
                    const category = CATEGORY_META[slug] || CATEGORY_META.other
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => {
                          setTargetCategories((current) => {
                            const active = current.includes(slug)
                            if (active) {
                              if (current.length === 1) return current
                              return current.filter((item) => item !== slug)
                            }
                            return businessCategories.filter((item) => item === slug || current.includes(item))
                          })
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold border transition-colors ${
                          selected
                            ? 'bg-blue-100 text-blue-700 border-blue-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <span>{category.emoji}</span>
                        <span>{category.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Kampanya Mesajı</p>
                  <span className={`text-xs font-bold ${message.trim().length > MESSAGE_LIMIT - 20 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {message.trim().length}/{MESSAGE_LIMIT}
                  </span>
                </div>
                <textarea
                  value={message}
                  maxLength={MESSAGE_LIMIT}
                  onChange={(event) => setMessage(event.target.value.slice(0, MESSAGE_LIMIT))}
                  className="mt-1.5 min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-semibold text-slate-700"
                  placeholder="Örn: Bugüne özel fırsatlar aktif, sizi bekliyoruz."
                />

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setMessage((current) => `${current}${emoji}`.slice(0, MESSAGE_LIMIT))}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-base hover:border-blue-300"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-1.5">
                  {QUICK_TEMPLATES.map((template, index) => (
                    <button
                      key={template}
                      type="button"
                      onClick={() => setMessage(template)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-[11px] font-semibold text-slate-600 hover:border-blue-300"
                    >
                      <span className="block text-[10px] uppercase tracking-[0.12em] text-slate-400">Şablon {index + 1}</span>
                      <span className="line-clamp-2">{template}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMessage('')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300"
                  >
                    Metni Temizle
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] p-4 md:p-5 bg-[linear-gradient(155deg,#ffffff_0%,#f6f9ff_100%)] border border-white/80 shadow-[0_16px_24px_-20px_rgba(15,23,42,0.6)] space-y-3">
              <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.2),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold">Canlı Önizleme</span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_24px_-22px_rgba(15,23,42,0.72)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{selectedBusiness?.name || 'İşletme'}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                        <MapPin className="w-3.5 h-3.5" />
                        {rangeKm} km
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700">
                        📡 {targetCategories.length} kategori
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#6ea8fe_0%,#2f6adf_100%)] text-white shadow-[0_12px_18px_-12px_rgba(37,99,235,0.85)]">
                    <Radio className="w-5 h-5" />
                  </span>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Mesaj İçeriği</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{message.trim() || 'Mesaj metni burada görünecek.'}</p>
                </div>

                {selectedCoupon ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                    <Tag className="w-3.5 h-3.5" />
                    Kupon: {(selectedCoupon.title || 'Kupon').slice(0, 26)} • {couponSummary(selectedCoupon)}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {targetCategories.map((slug) => {
                    const category = CATEGORY_META[slug] || CATEGORY_META.other
                    return (
                      <span
                        key={slug}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        <span>{category.emoji}</span>
                        <span>{category.label}</span>
                      </span>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Konum ve Gönderim Mantığı</p>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  Hedefleme işletmenin kayıtlı konumuna göre yapılır. Gönderimde v2 fonksiyonu kullanılır; sistemde yoksa legacy fallback otomatik devreye girer.
                </p>
                {isBusinessLocationReady ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    İşletme konumu hazır
                  </p>
                ) : (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Konum eksik görünse de gönderim akışı çalışır; eşleşme azalabilir
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleSend}
                disabled={sending || composerLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Müşteri Radarını Başlat
              </button>

              {resultText ? (
                <div
                  className={`rounded-xl border p-3 text-sm font-semibold ${
                    resultTone === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : resultTone === 'warn'
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  <span className="inline-flex items-start gap-2">
                    {resultTone === 'error' ? <ShieldAlert className="mt-0.5 w-4 h-4" /> : <Radio className="mt-0.5 w-4 h-4" />}
                    {resultText}
                  </span>
                </div>
              ) : null}
            </section>
          </div>

            <div className="mt-3 rounded-[24px] p-4 md:p-5 bg-[linear-gradient(155deg,#ffffff_0%,#f6f9ff_100%)] border border-white/80 shadow-[0_16px_24px_-20px_rgba(15,23,42,0.6)]">
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div>
                <p className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.2),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
                  <Compass className="h-4 w-4 text-violet-600" />
                  <span className="text-xs font-semibold">Modül 2 • Mola Hedefleri</span>
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  App akışıyla uyumlu Mola hedef yönetimi: kullanıcı listesi, kupon bağlı teklif gönderimi, aktif teklifi iptal.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedBusinessId) return
                    void loadMolaSummary(selectedBusinessId)
                  }}
                  disabled={molaSummaryLoading || !selectedBusinessId}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-300 disabled:opacity-55"
                >
                  {molaSummaryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                  Yenile
                </button>

                <Link
                  href="/merchant/mola-targets"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700"
                >
                  Mola Hedefleri Sayfası
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Mola Hedef</p>
                <p className="mt-1 text-lg font-extrabold text-slate-800">{molaTargetCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Aktif Mola Teklifi</p>
                <p className="mt-1 text-lg font-extrabold text-slate-800">{molaActiveOfferCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Durum</p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-slate-800">
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  {molaSummaryLoading ? 'Yükleniyor' : 'Hazır'}
                </p>
              </div>
            </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
