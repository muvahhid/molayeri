'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  RefreshCcw,
  Send,
  Ticket,
  UserRound,
  XCircle,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { PanelTitle } from '../_components/panel-title'
import { fetchOwnedBusinesses, requireCurrentUserId } from '../_lib/queries'
import type { MerchantBusiness } from '../_lib/helpers'

type CouponCampaign = {
  id: string
  title: string | null
  discount_type: string | null
  discount_value: number | null
  monetary_value: number | null
  valid_until: string | null
}

type TargetRow = {
  user_id: string
  full_name: string
  stop_key: string
  stop_name: string
  stop_address: string
  stop_added_at: string | null
  last_offer_at: string | null
  last_offer_title: string | null
  remaining_km: number | null
  location_updated_at: string | null
}

type ResultTone = 'success' | 'warn' | 'error'

type DbOfferRow = {
  user_id: string | null
  stop_key: string | null
  title: string | null
  sent_at: string | null
}

type OfferTemplateRow = {
  title: string | null
  offer_text: string | null
  coupon_campaign_id: string | null
  is_active: boolean | null
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toNullableText(value: unknown): string | null {
  const text = toText(value)
  return text.length > 0 ? text : null
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
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

function couponSummary(coupon: CouponCampaign): string {
  if (coupon.discount_type === 'percentage') {
    return `%${Math.trunc(coupon.discount_value || 0)} indirim`
  }
  if (coupon.discount_type === 'free') {
    return `${Math.trunc(coupon.monetary_value || 0)}₺ hediye`
  }
  if (coupon.discount_type === 'item') {
    return 'Ürün/Hizmet'
  }
  return 'Kupon'
}

function formatAgo(value: string | null): string {
  if (!value) return '-'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '-'
  const diffMs = Date.now() - dt.getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))
  if (diffMin < 1) return 'şimdi'
  if (diffMin < 60) return `${diffMin} dk önce`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} sa önce`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay} gün önce`
}

function formatDistance(km: number | null): string {
  if (km == null || !Number.isFinite(km)) return '-'
  return `${km.toFixed(1)} km`
}

function rowActionKey(row: Pick<TargetRow, 'user_id' | 'stop_key'>): string {
  return `${row.user_id}|${row.stop_key}`
}

function toTargetRow(raw: unknown): TargetRow {
  const row = asObject(raw)
  return {
    user_id: toText(row.user_id),
    full_name: toText(row.full_name) || 'Kullanıcı',
    stop_key: toText(row.stop_key),
    stop_name: toText(row.stop_name) || '-',
    stop_address: toText(row.stop_address),
    stop_added_at: toNullableText(row.stop_added_at),
    last_offer_at: toNullableText(row.last_offer_at),
    last_offer_title: toNullableText(row.last_offer_title),
    remaining_km: toNumber(row.remaining_km),
    location_updated_at: toNullableText(row.location_updated_at),
  }
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

export default function MerchantMolaTargetsPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [bootLoading, setBootLoading] = useState(true)
  const [targetsLoading, setTargetsLoading] = useState(false)
  const [sendingAll, setSendingAll] = useState(false)

  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')

  const [targets, setTargets] = useState<TargetRow[]>([])
  const [coupons, setCoupons] = useState<CouponCampaign[]>([])
  const [selectedCouponId, setSelectedCouponId] = useState('')
  const [offerTitle, setOfferTitle] = useState('Mola durağına özel teklif')
  const [offerText, setOfferText] = useState('')
  const [templateTitle, setTemplateTitle] = useState('Mola durağına özel teklif')
  const [templateText, setTemplateText] = useState('Mola durağına özel fırsat seni bekliyor.')
  const [templateCouponId, setTemplateCouponId] = useState('')
  const [templateActive, setTemplateActive] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateSaving, setTemplateSaving] = useState(false)

  const [sendingTargetKeys, setSendingTargetKeys] = useState<Set<string>>(new Set())
  const [cancellingTargetKeys, setCancellingTargetKeys] = useState<Set<string>>(new Set())

  const [resultText, setResultText] = useState('')
  const [resultTone, setResultTone] = useState<ResultTone>('success')

  const selectedBusiness = businesses.find((item) => item.id === selectedBusinessId) || null
  const selectedCoupon = coupons.find((item) => item.id === selectedCouponId) || null
  const isBusinessLocationReady =
    Number.isFinite(Number(selectedBusiness?.lat)) && Number.isFinite(Number(selectedBusiness?.lng))
  const activeOfferCount = targets.filter((item) => Boolean(item.last_offer_at)).length

  const loadBusinesses = async () => {
    setBootLoading(true)
    const userId = await requireCurrentUserId(supabase)
    if (!userId) {
      setBusinesses([])
      setSelectedBusinessId('')
      setBootLoading(false)
      return
    }

    const ownedBusinesses = await fetchOwnedBusinesses(supabase, userId)
    setBusinesses(ownedBusinesses)
    setSelectedBusinessId((current) => current || ownedBusinesses[0]?.id || '')
    setBootLoading(false)
  }

  const loadCoupons = async (businessId: string) => {
    const { data } = await supabase
      .from('coupon_campaigns')
      .select('id, title, discount_type, discount_value, monetary_value, valid_until, is_active')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    const now = new Date()
    const validCoupons = ((data || []) as (CouponCampaign & { is_active?: boolean })[]).filter((coupon) => {
      if (!coupon.valid_until) return true
      const expiry = new Date(coupon.valid_until)
      return Number.isNaN(expiry.getTime()) || expiry > now
    })
    setCoupons(validCoupons)
    setSelectedCouponId((current) => (current && validCoupons.some((item) => item.id === current) ? current : ''))
    setTemplateCouponId((current) => (current && validCoupons.some((item) => item.id === current) ? current : ''))
  }

  const cleanupExpiredOffers = async () => {
    try {
      await supabase.rpc('cleanup_expired_mola_offers_global_v1')
      return
    } catch {
      // fallback to legacy function
    }

    try {
      await supabase.rpc('cleanup_my_expired_mola_offers')
    } catch {
      // noop
    }
  }

  const loadTemplate = async (businessId: string) => {
    if (!businessId) return
    setTemplateLoading(true)
    try {
      const { data, error } = await supabase
        .from('mola_offer_templates')
        .select('title, offer_text, coupon_campaign_id, is_active')
        .eq('business_id', businessId)
        .maybeSingle()
      if (error) throw error

      const row = (data || null) as OfferTemplateRow | null
      setTemplateTitle(toText(row?.title) || 'Mola durağına özel teklif')
      setTemplateText(toText(row?.offer_text) || 'Mola durağına özel fırsat seni bekliyor.')
      setTemplateCouponId(toText(row?.coupon_campaign_id))
      setTemplateActive(row?.is_active === true)
    } catch {
      setTemplateTitle('Mola durağına özel teklif')
      setTemplateText('Mola durağına özel fırsat seni bekliyor.')
      setTemplateCouponId('')
      setTemplateActive(false)
    } finally {
      setTemplateLoading(false)
    }
  }

  const saveTemplate = async (nextActive?: boolean) => {
    if (!selectedBusinessId || templateSaving) return
    const active = nextActive ?? templateActive
    const title = templateTitle.trim() || 'Mola durağına özel teklif'
    const text = templateText.trim()
    const couponId = templateCouponId.trim()

    setTemplateSaving(true)
    try {
      const { error } = await supabase.from('mola_offer_templates').upsert(
        {
          business_id: selectedBusinessId,
          title,
          offer_text: text || null,
          coupon_campaign_id: couponId || null,
          is_active: active,
          expires_in_hours: 24,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_id' }
      )
      if (error) throw error

      setTemplateActive(active)
      setResultTone('success')
      setResultText(active ? 'Otomatik mola teklifi aktif edildi.' : 'Şablon kaydedildi.')
    } catch (error: unknown) {
      setResultTone('error')
      setResultText(`Şablon kaydedilemedi: ${normalizeError(error)}`)
      await loadTemplate(selectedBusinessId)
    } finally {
      setTemplateSaving(false)
    }
  }

  const attachOnlyActiveOfferState = async (businessId: string, sourceRows: TargetRow[]): Promise<TargetRow[]> => {
    const normalized = sourceRows.map((row) => ({
      ...row,
      last_offer_at: null,
      last_offer_title: null,
    }))
    if (normalized.length === 0) return normalized

    const userIds = Array.from(new Set(normalized.map((item) => item.user_id).filter(Boolean)))
    const stopKeys = Array.from(new Set(normalized.map((item) => item.stop_key).filter(Boolean)))
    if (userIds.length === 0 || stopKeys.length === 0) return normalized

    const { data } = await supabase
      .from('mola_business_offers')
      .select('user_id, stop_key, title, sent_at')
      .eq('business_id', businessId)
      .in('user_id', userIds)
      .in('stop_key', stopKeys)
      .in('status', ['sent', 'active'])
      .order('sent_at', { ascending: false })

    const latestByKey = new Map<string, DbOfferRow>()
    for (const raw of (data || []) as DbOfferRow[]) {
      const key = `${toText(raw.user_id)}|${toText(raw.stop_key)}`
      if (!key || latestByKey.has(key)) continue
      latestByKey.set(key, raw)
    }

    return normalized.map((row) => {
      const activeOffer = latestByKey.get(rowActionKey(row))
      if (!activeOffer) return row
      return {
        ...row,
        last_offer_at: toNullableText(activeOffer.sent_at),
        last_offer_title: toNullableText(activeOffer.title),
      }
    })
  }

  const fallbackTargetLoad = async (businessId: string): Promise<TargetRow[]> => {
    const { data } = await supabase
      .from('user_mola_stops')
      .select('user_id, stop_key, name, address, created_at')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    const stopRows = (data || []) as Array<Record<string, unknown>>
    const userIds = Array.from(
      new Set(stopRows.map((item) => toText(item.user_id)).filter((value) => value.length > 0))
    )

    const profileNameById = new Map<string, string>()
    if (userIds.length > 0) {
      const { data: profileRows } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
      for (const raw of profileRows || []) {
        const row = asObject(raw)
        const id = toText(row.id)
        if (!id) continue
        const fullName = toText(row.full_name)
        profileNameById.set(id, fullName || 'Kullanıcı')
      }
    }

    return stopRows.map((raw) => {
      const userId = toText(raw.user_id)
      return {
        user_id: userId,
        full_name: profileNameById.get(userId) || 'Kullanıcı',
        stop_key: toText(raw.stop_key),
        stop_name: toText(raw.name) || '-',
        stop_address: toText(raw.address),
        stop_added_at: toNullableText(raw.created_at),
        last_offer_at: null,
        last_offer_title: null,
        remaining_km: null,
        location_updated_at: null,
      }
    })
  }

  const loadTargets = async (businessId: string) => {
    setTargetsLoading(true)
    setResultText('')

    try {
      await cleanupExpiredOffers()
      let rows: TargetRow[] = []

      try {
        const { data, error } = await supabase.rpc('get_mola_targets_for_business_v2', {
          p_business_id: businessId,
        })
        if (error) throw error
        rows = ((data || []) as unknown[]).map(toTargetRow)
      } catch {
        try {
          const { data, error } = await supabase.rpc('get_mola_targets_for_business', {
            p_business_id: businessId,
          })
          if (error) throw error
          rows = ((data || []) as unknown[]).map(toTargetRow)
        } catch {
          rows = await fallbackTargetLoad(businessId)
        }
      }

      const withActiveOffers = await attachOnlyActiveOfferState(
        businessId,
        rows.filter((item) => item.user_id && item.stop_key)
      )
      setTargets(withActiveOffers)
    } catch (error: unknown) {
      setTargets([])
      setResultTone('error')
      setResultText(`Mola hedefleri yüklenemedi: ${normalizeError(error)}`)
    } finally {
      setTargetsLoading(false)
    }
  }

  const sendOffer = async (targetUserId?: string) => {
    if (!selectedBusinessId) return

    const title = offerTitle.trim()
    const text = offerText.trim()
    if (!title && !text) {
      setResultTone('error')
      setResultText('Başlık veya teklif metni gir.')
      return
    }

    if (targetUserId) {
      setSendingTargetKeys((current) => new Set(current).add(`${targetUserId}|single`))
    } else {
      setSendingAll(true)
    }

    try {
      const { data, error } = await supabase.rpc('send_mola_offer_v1', {
        p_business_id: selectedBusinessId,
        p_title: title,
        p_offer_text: text,
        p_coupon_campaign_id: selectedCouponId || null,
        p_target_user_id: targetUserId || null,
        p_expires_in_hours: 24,
      })

      if (error) throw error
      const mapped = asObject(data)
      const status = toText(mapped.status).toLowerCase()

      if (status === 'ok') {
        const sentCount = Number(mapped.sent_count || 0)
        if (sentCount > 0) {
          setResultTone('success')
          setResultText(`${sentCount} kullanıcıya mola teklifi gönderildi.`)
        } else {
          setResultTone('warn')
          setResultText('Uygun kullanıcı bulunamadı.')
        }
      } else if (status === 'coupon_not_found') {
        setResultTone('error')
        setResultText('Seçilen kupon geçersiz.')
      } else if (status === 'coupon_expired') {
        setResultTone('error')
        setResultText('Seçilen kuponun süresi dolmuş.')
      } else if (status === 'forbidden') {
        setResultTone('error')
        setResultText('Bu işletme için yetkin yok.')
      } else if (status === 'business_not_found') {
        setResultTone('error')
        setResultText('İşletme bulunamadı.')
      } else if (status === 'auth') {
        setResultTone('error')
        setResultText('Oturum hatası. Tekrar giriş yap.')
      } else if (status === 'empty') {
        setResultTone('error')
        setResultText('Mesaj boş olamaz.')
      } else if (status === 'error') {
        const detail = toText(mapped.detail)
        if (detail.includes('send_mola_offer_v1')) {
          setResultTone('error')
          setResultText('DB fonksiyonu eksik: send_mola_offer_v1')
        } else {
          setResultTone('error')
          setResultText(detail ? `Gönderim hatası: ${detail}` : 'Gönderim sırasında hata oluştu.')
        }
      } else {
        setResultTone('warn')
        setResultText('Gönderim tamamlandı ancak yanıt formatı beklenenden farklı.')
      }

      await loadTargets(selectedBusinessId)
    } catch (error: unknown) {
      const detail = normalizeError(error)
      if (detail.includes('send_mola_offer_v1')) {
        setResultTone('error')
        setResultText('DB fonksiyonu eksik: send_mola_offer_v1')
      } else {
        setResultTone('error')
        setResultText(`Gönderim sırasında hata oluştu: ${detail}`)
      }
    } finally {
      if (targetUserId) {
        setSendingTargetKeys((current) => {
          const next = new Set(current)
          next.delete(`${targetUserId}|single`)
          return next
        })
      } else {
        setSendingAll(false)
      }
    }
  }

  const cancelOffer = async (target: TargetRow) => {
    if (!selectedBusinessId) return

    const userId = target.user_id
    const stopKey = target.stop_key
    if (!userId || !stopKey) return

    const approved = window.confirm(
      `${target.full_name} için gönderilen aktif teklifi iptal etmek istiyor musun?\n\nDurak: ${target.stop_name}`
    )
    if (!approved) return

    const actionKey = rowActionKey(target)
    setCancellingTargetKeys((current) => new Set(current).add(actionKey))

    try {
      const { data, error } = await supabase
        .from('mola_business_offers')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', selectedBusinessId)
        .eq('user_id', userId)
        .eq('stop_key', stopKey)
        .in('status', ['sent', 'active'])
        .select('id')

      if (error) throw error

      const revokedCount = ((data || []) as Array<{ id: string }>).length
      if (revokedCount > 0) {
        setTargets((current) =>
          current.map((item) =>
            rowActionKey(item) === actionKey
              ? {
                  ...item,
                  last_offer_at: null,
                  last_offer_title: null,
                }
              : item
          )
        )
        setResultTone('success')
        setResultText('Teklif iptal edildi.')
      } else {
        setResultTone('warn')
        setResultText('İptal edilecek aktif teklif bulunamadı.')
      }

      await loadTargets(selectedBusinessId)
    } catch (error: unknown) {
      setResultTone('error')
      setResultText(`Teklif iptal edilemedi: ${normalizeError(error)}`)
    } finally {
      setCancellingTargetKeys((current) => {
        const next = new Set(current)
        next.delete(actionKey)
        return next
      })
    }
  }

  useEffect(() => {
    void loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedBusinessId) {
      setCoupons([])
      setTargets([])
      setTemplateCouponId('')
      setTemplateTitle('Mola durağına özel teklif')
      setTemplateText('Mola durağına özel fırsat seni bekliyor.')
      setTemplateActive(false)
      return
    }
    void Promise.all([loadCoupons(selectedBusinessId), loadTemplate(selectedBusinessId), loadTargets(selectedBusinessId)])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId])

  return (
    <div className="space-y-6">
      <div className="border-b border-[#2d313a] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <PanelTitle title="Mola Hedefleri" />
            <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b] mt-2">
              Mola listesine ekleyen kullanıcıları yönet, teklif gönder, tekil iptal et.
            </p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded px-3 py-1.5 border text-[10px] font-mono tracking-widest uppercase ${
            isBusinessLocationReady ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' : 'bg-amber-950/20 border-amber-900/50 text-amber-400'
          }`}>
            {isBusinessLocationReady ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>
              {isBusinessLocationReady ? 'İşletme konumu hazır' : 'İşletme konumu eksik'}
            </span>
          </div>
        </div>

        {resultText ? (
          <div
            className={`mt-4 rounded border px-4 py-3 text-[11px] font-mono uppercase tracking-wide flex items-start gap-2 ${
              resultTone === 'success'
                ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400'
                : resultTone === 'warn'
                  ? 'bg-amber-950/20 border-amber-900/50 text-amber-400'
                  : 'bg-rose-950/20 border-rose-900/50 text-rose-400'
            }`}
          >
            {resultTone === 'error' ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : resultTone === 'warn' ? (
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{resultText}</span>
          </div>
        ) : null}
      </div>

      {bootLoading ? (
        <div className="h-44 flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#38bdf8]" />
        </div>
      ) : !selectedBusiness ? (
        <div className="rounded border border-dashed border-[#2d313a] bg-[#0a0c10] p-5 text-[10px] font-mono uppercase tracking-widest text-[#64748b] text-center">
          Mola hedef yönetimi için en az bir işletme gerekli.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(330px,0.8fr)] gap-5">
          <HardwarePanel className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                İşletme Seç
                <select
                  className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
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

              <label className="text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Kupon (Opsiyonel)
                <select
                  className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
                  value={selectedCouponId}
                  onChange={(event) => setSelectedCouponId(event.target.value)}
                >
                  <option value="">Kupon Bağlama</option>
                  {coupons.map((coupon) => (
                    <option key={coupon.id} value={coupon.id}>
                      {(coupon.title || 'Kupon')} • {couponSummary(coupon)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
              Teklif Başlığı
              <input
                value={offerTitle}
                maxLength={80}
                onChange={(event) => setOfferTitle(event.target.value.slice(0, 80))}
                className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                placeholder="Mola teklifi başlığı"
              />
            </label>

            <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
              Teklif Mesajı
              <textarea
                value={offerText}
                maxLength={320}
                onChange={(event) => setOfferText(event.target.value.slice(0, 320))}
                className="mt-2 w-full min-h-[100px] px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50 resize-none custom-scrollbar placeholder:text-[#475569]"
                placeholder="Örn: Sizi bekliyoruz, bu mola durağına özel kupon aktif."
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => void loadTargets(selectedBusinessId)}
                disabled={targetsLoading}
                className="inline-flex items-center justify-center gap-2 rounded px-4 py-3 border border-[#2d313a] bg-[#16181d] text-[#e2e8f0] text-[10px] font-mono uppercase tracking-widest hover:bg-[#1a1d24] disabled:opacity-50 transition-colors"
              >
                {targetsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Hedefleri Yenile
              </button>

              <button
                type="button"
                onClick={() => void sendOffer()}
                disabled={sendingAll || targets.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded px-4 py-3 bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] text-[11px] font-mono uppercase tracking-widest border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {sendingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Hepsine Gönder
              </button>
            </div>

            <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 mt-6 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-[#1e232b] pb-3">
                <div>
                  <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#94a3b8]">Otomatik Şablon</p>
                  <p className="mt-1.5 text-[9px] font-mono text-[#64748b] leading-relaxed uppercase tracking-wider">
                    Aktifken kullanıcı bu işletmeyi Mola Yerlerim&#39;e eklediği anda teklif otomatik gider.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 text-[10px] font-mono font-semibold text-[#e2e8f0]">
                  {templateLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#38bdf8]" /> : null}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={templateActive}
                    disabled={templateSaving || templateLoading}
                    onClick={() => void saveTemplate(!templateActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                      templateActive ? 'bg-[#38bdf8]' : 'bg-[#1e232b] border border-[#2d313a]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-[#e2e8f0] transition-transform ${
                        templateActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  {templateActive ? 'ON' : 'OFF'}
                </div>
              </div>

              <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Şablon Başlığı
                <input
                  value={templateTitle}
                  maxLength={80}
                  onChange={(event) => setTemplateTitle(event.target.value.slice(0, 80))}
                  className="mt-2 w-full px-3 py-2.5 rounded bg-[#16181d] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                  placeholder="Şablon başlığı"
                />
              </label>

              <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Şablon Mesajı
                <textarea
                  value={templateText}
                  maxLength={320}
                  onChange={(event) => setTemplateText(event.target.value.slice(0, 320))}
                  className="mt-2 w-full min-h-[84px] px-3 py-2.5 rounded bg-[#16181d] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50 resize-none custom-scrollbar placeholder:text-[#475569]"
                  placeholder="Otomatik gönderilecek metin"
                />
              </label>

              <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Şablon Kuponu
                <select
                  className="mt-2 w-full px-3 py-2.5 rounded bg-[#16181d] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
                  value={templateCouponId}
                  onChange={(event) => setTemplateCouponId(event.target.value)}
                  disabled={templateSaving || templateLoading}
                >
                  <option value="">Kupon bağlama</option>
                  {coupons.map((coupon) => (
                    <option key={coupon.id} value={coupon.id}>
                      {(coupon.title || 'Kupon')} • {couponSummary(coupon)}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => void saveTemplate()}
                disabled={templateSaving || templateLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded px-4 py-2.5 bg-[#166534] border border-[#14532d] text-emerald-400 text-[10px] font-mono uppercase tracking-widest hover:bg-[#14532d] disabled:opacity-50 transition-colors"
              >
                {templateSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Şablonu Kaydet
              </button>
            </div>
          </HardwarePanel>

          <HardwarePanel className="p-5 space-y-5">
            <div className="rounded border border-[#2d313a] bg-[#101419] p-4">
              <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#64748b]">Canlı Önizleme</p>
              <p className="mt-1.5 text-[13px] font-medium text-[#e2e8f0] uppercase tracking-wide">{selectedBusiness.name}</p>
              <div className="mt-3 rounded border border-[#1e232b] bg-[#0a0c10] p-4">
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Başlık</p>
                <p className="mt-1 text-[12px] font-mono text-[#38bdf8] uppercase tracking-wide">{offerTitle.trim() || 'Mola teklifi başlığı'}</p>
                <p className="mt-3 text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Mesaj</p>
                <p className="mt-1 text-[10px] font-mono text-[#94a3b8] leading-relaxed uppercase tracking-wider">{offerText.trim() || 'Mesaj metni burada görünecek.'}</p>
                {selectedCoupon ? (
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded border border-emerald-900/50 bg-emerald-950/20 px-2 py-1 text-[9px] font-mono uppercase tracking-widest text-emerald-400">
                    <Ticket className="h-3.5 w-3.5" />
                    KUPON: {(selectedCoupon.title || 'Kupon').slice(0, 26)} • {couponSummary(selectedCoupon)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
                <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Hedef Kullanıcı</p>
                <p className="mt-1 text-lg font-mono text-[#e2e8f0]">{targets.length}</p>
              </div>
              <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
                <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Aktif Teklif</p>
                <p className="mt-1 text-lg font-mono text-[#e2e8f0]">{activeOfferCount}</p>
              </div>
              <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
                <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Aktif Kupon</p>
                <p className="mt-1 text-lg font-mono text-[#e2e8f0]">{coupons.length}</p>
              </div>
              <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
                <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Konum</p>
                <p className={`mt-1 text-sm font-mono uppercase tracking-wide ${isBusinessLocationReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isBusinessLocationReady ? 'Hazır' : 'Eksik'}
                </p>
              </div>
              <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
                <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Oto Şablon</p>
                <p className={`mt-1 text-sm font-mono uppercase tracking-wide ${templateActive ? 'text-[#38bdf8]' : 'text-[#64748b]'}`}>
                  {templateActive ? 'Aktif' : 'Pasif'}
                </p>
              </div>
              <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
                <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Geçerlilik</p>
                <p className="mt-1 text-sm font-mono text-[#e2e8f0]">24 SAAT</p>
              </div>
            </div>
          </HardwarePanel>
        </div>
      )}

      {selectedBusiness && !bootLoading && (
        <HardwarePanel className="p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d313a] pb-4 mb-4">
            <h2 className="text-[14px] font-medium text-[#e2e8f0] uppercase tracking-wide">Mola Hedef Listesi</h2>
            <span className="inline-flex items-center gap-1.5 rounded border border-[#2d313a] bg-[#0a0c10] px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[#94a3b8]">
              <UserRound className="h-3.5 w-3.5" />
              {targets.length} HEDEF
            </span>
          </div>

          {targetsLoading ? (
            <div className="mt-4 h-32 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#38bdf8]" />
            </div>
          ) : targets.length === 0 ? (
            <div className="mt-4 rounded border border-dashed border-[#2d313a] bg-[#0a0c10] p-5 text-[10px] font-mono uppercase tracking-widest text-[#64748b] text-center">
              BU İŞLETMEYİ MOLA YERLERİM LİSTESİNE EKLEYEN KULLANICI YOK.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
              {targets.map((target) => {
                const actionKey = rowActionKey(target)
                const sendingOne = sendingTargetKeys.has(`${target.user_id}|single`)
                const cancellingOne = cancellingTargetKeys.has(actionKey)
                const hasActiveOffer = Boolean(target.last_offer_at)

                return (
                  <article
                    key={actionKey}
                    className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 hover:border-[#475569] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 shrink-0 rounded border border-[#2d313a] bg-[#16181d] text-[#64748b] flex items-center justify-center">
                        <UserRound className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[#e2e8f0] uppercase tracking-wide truncate">{target.full_name}</p>
                        <p className="mt-1 text-[10px] font-mono text-[#64748b] uppercase tracking-widest truncate">{target.stop_name}</p>
                        {target.stop_address ? <p className="mt-1 text-[9px] font-mono text-[#475569] truncate uppercase tracking-wider">{target.stop_address}</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={sendingOne || cancellingOne}
                          onClick={() => void sendOffer(target.user_id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#226785] bg-[#153445] text-[#38bdf8] hover:brightness-110 disabled:opacity-50 transition-colors"
                          title="Teklif Gönder"
                        >
                          {sendingOne ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          disabled={sendingOne || cancellingOne}
                          onClick={() => void cancelOffer(target)}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded border transition-colors disabled:opacity-50 ${
                            hasActiveOffer ? 'border-rose-900/50 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40' : 'border-[#2d313a] bg-[#16181d] text-[#475569] hover:text-[#64748b]'
                          }`}
                          title="Teklifi İptal Et"
                        >
                          {cancellingOne ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#1e232b] flex flex-wrap gap-2 text-[9px] font-mono uppercase tracking-widest">
                      <span className="inline-flex items-center gap-1.5 rounded bg-[#16181d] border border-[#2d313a] px-2 py-1 text-[#38bdf8]">
                        <Clock3 className="h-3 w-3" />
                        MOLA: {formatAgo(target.stop_added_at)}
                      </span>
                      {target.last_offer_at ? (
                        <span className="inline-flex items-center gap-1.5 rounded bg-[#16181d] border border-[#2d313a] px-2 py-1 text-amber-400">
                          SON TEKLİF: {formatAgo(target.last_offer_at)}
                        </span>
                      ) : null}
                      {target.remaining_km != null ? (
                        <span className="inline-flex items-center gap-1.5 rounded bg-[#16181d] border border-[#2d313a] px-2 py-1 text-emerald-400">
                          <MapPin className="h-3 w-3" />
                          KALAN: {formatDistance(target.remaining_km)}
                        </span>
                      ) : null}
                      {target.location_updated_at ? (
                        <span className="inline-flex items-center gap-1.5 rounded bg-[#16181d] border border-[#2d313a] px-2 py-1 text-[#64748b]">
                          KONUM: {formatAgo(target.location_updated_at)}
                        </span>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </HardwarePanel>
      )}
    </div>
  )
}