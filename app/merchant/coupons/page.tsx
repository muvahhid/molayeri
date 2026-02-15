'use client'

import { useEffect, useMemo, useState } from 'react'
import { BadgePercent, Check, Copy, Gift, Loader2, Ticket, Trash2 } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { fetchOwnedBusinesses, requireCurrentUserId } from '../_lib/queries'
import type { MerchantBusiness } from '../_lib/helpers'
import { ModuleTitle } from '../_components/module-title'

type CouponCampaign = {
  id: string
  title: string | null
  code: string | null
  discount_type: string | null
  discount_value: number | null
  monetary_value: number | null
  max_usage_limit: number | null
  usage_count: number | null
  valid_until: string | null
  is_active: boolean | null
  created_at: string | null
}

type CouponType = 'percentage' | 'free' | 'item'

type CouponUsageCampaign = {
  title: string | null
  code: string | null
  discount_type: string | null
  discount_value: number | null
  monetary_value: number | null
}

type CouponUsageRow = {
  id: string | null
  user_id: string | null
  code: string | null
  used_at: string | null
  created_at: string | null
  coupon_campaigns: CouponUsageCampaign | CouponUsageCampaign[] | null
  [key: string]: unknown
}

type CouponUsageItem = {
  id: string
  userName: string
  userShort: string
  usedAt: string | null
  couponTitle: string
  couponCode: string
  couponValueLabel: string
  discountType: CouponType | 'unknown'
  tlImpact: number
}

type CouponUsageSummary = {
  totalUsage: number
  percentUsage: number
  freeUsage: number
  itemUsage: number
  totalDiscountTl: number
  totalGiftTl: number
  totalBenefitTl: number
}

function createEmptyUsageSummary(): CouponUsageSummary {
  return {
    totalUsage: 0,
    percentUsage: 0,
    freeUsage: 0,
    itemUsage: 0,
    totalDiscountTl: 0,
    totalGiftTl: 0,
    totalBenefitTl: 0,
  }
}

function toSafeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return 0
  const parsed = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function firstPositiveFromKeys(row: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = toSafeNumber(row[key])
    if (value > 0) return value
  }
  return 0
}

function money(value: number): string {
  return `${value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`
}

function couponBenefitText(coupon: CouponCampaign): string {
  if (coupon.discount_type === 'percentage') {
    return `%${Math.trunc(coupon.discount_value || 0)} indirim`
  }
  if (coupon.discount_type === 'free') {
    return 'Hediye kuponu'
  }
  if (coupon.discount_type === 'item') {
    return 'Ürün kuponu'
  }
  return 'Kupon'
}

function formatDate(value: string | null): string {
  if (!value) return 'Süresiz'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return 'Süresiz'
  return dt.toLocaleDateString('tr-TR')
}

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function couponTitlePlaceholderByType(type: CouponType): string {
  if (type === 'item') return 'Örn: Ücretsiz yıkama'
  if (type === 'free') return 'Örn: Türk Kahvesi'
  return 'Örn: Restoran %10'
}

function generateSystemCouponCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const createPart = (length: number) =>
    Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')

  return `MLY-${createPart(4)}-${createPart(4)}`
}

export default function MerchantCouponsPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [bootLoading, setBootLoading] = useState(true)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [usageLoading, setUsageLoading] = useState(false)
  const [savingCoupon, setSavingCoupon] = useState(false)
  const [togglingCouponId, setTogglingCouponId] = useState<string | null>(null)
  const [copyingCouponId, setCopyingCouponId] = useState<string | null>(null)
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null)

  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [coupons, setCoupons] = useState<CouponCampaign[]>([])
  const [usageRows, setUsageRows] = useState<CouponUsageItem[]>([])
  const [usageSummary, setUsageSummary] = useState<CouponUsageSummary>(createEmptyUsageSummary())

  const [couponTitle, setCouponTitle] = useState('')
  const [couponType, setCouponType] = useState<CouponType>('percentage')
  const [couponDiscountValue, setCouponDiscountValue] = useState('10')
  const [couponGiftValue, setCouponGiftValue] = useState('100')
  const [couponMaxUsage, setCouponMaxUsage] = useState('100')
  const [couponValidUntil, setCouponValidUntil] = useState('')
  const [couponIndefinite, setCouponIndefinite] = useState(true)

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId) || null
  const activeCouponCount = coupons.filter((coupon) => coupon.is_active).length

  const loadBusinesses = async () => {
    setBootLoading(true)
    const userId = await requireCurrentUserId(supabase)

    if (!userId) {
      setBootLoading(false)
      return
    }

    const owned = await fetchOwnedBusinesses(supabase, userId)
    setBusinesses(owned)
    setSelectedBusinessId((current) => current || owned[0]?.id || '')
    setBootLoading(false)
  }

  const loadCoupons = async (businessId: string) => {
    setRecordsLoading(true)
    const { data } = await supabase
      .from('coupon_campaigns')
      .select(
        'id, title, code, discount_type, discount_value, monetary_value, max_usage_limit, usage_count, valid_until, is_active, created_at'
      )
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    setCoupons((data || []) as CouponCampaign[])
    setRecordsLoading(false)
  }

  const loadCouponUsageHistory = async (businessId: string) => {
    setUsageLoading(true)
    const summary = createEmptyUsageSummary()

    const { data, error } = await supabase
      .from('user_coupons')
      .select('*, coupon_campaigns(title, code, discount_type, discount_value, monetary_value)')
      .eq('business_id', businessId)
      .eq('status', 'used')
      .order('used_at', { ascending: false })
      .limit(250)

    if (error) {
      setUsageRows([])
      setUsageSummary(summary)
      setUsageLoading(false)
      return
    }

    const rows = (data || []) as CouponUsageRow[]
    const userIds = Array.from(
      new Set(
        rows
          .map((row) => row.user_id)
          .filter((id): id is string => Boolean(id))
      )
    )

    const userNameMap = new Map<string, string>()
    if (userIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      for (const profile of profileRows || []) {
        const id = String((profile as { id?: string | null }).id || '')
        const fullName = String((profile as { full_name?: string | null }).full_name || '').trim()
        if (id) {
          userNameMap.set(id, fullName || 'Kullanıcı')
        }
      }
    }

    const mapped = rows.map((raw): CouponUsageItem => {
      const campaignRaw = raw.coupon_campaigns
      const campaign = (Array.isArray(campaignRaw) ? campaignRaw[0] : campaignRaw) || null
      const rowRecord = raw as Record<string, unknown>

      const discountType = (campaign?.discount_type || 'unknown') as CouponUsageItem['discountType']
      const percentTl = firstPositiveFromKeys(rowRecord, [
        'discount_amount',
        'discount_tl',
        'discount_value_tl',
        'benefit_tl',
        'benefit_amount',
        'applied_discount_amount',
      ])
      const freeTl = discountType === 'free' ? Math.max(0, toSafeNumber(campaign?.monetary_value)) : 0

      let couponValueLabel = 'Kupon'
      if (discountType === 'percentage') {
        couponValueLabel = `%${Math.trunc(toSafeNumber(campaign?.discount_value))} indirim`
      } else if (discountType === 'free') {
        couponValueLabel = `${money(freeTl)} hediye`
      } else if (discountType === 'item') {
        couponValueLabel = 'Ürün hediyesi'
      }

      const userId = raw.user_id || ''
      const fallbackShort = userId ? `U-${userId.slice(0, 6)}` : 'Bilinmiyor'
      const userName = userNameMap.get(userId) || fallbackShort
      const tlImpact = discountType === 'percentage' ? percentTl : discountType === 'free' ? freeTl : 0

      summary.totalUsage += 1
      if (discountType === 'percentage') {
        summary.percentUsage += 1
        summary.totalDiscountTl += tlImpact
      } else if (discountType === 'free') {
        summary.freeUsage += 1
        summary.totalGiftTl += freeTl
      } else if (discountType === 'item') {
        summary.itemUsage += 1
      }
      summary.totalBenefitTl += tlImpact

      return {
        id: raw.id || `${raw.user_id || 'unknown'}-${raw.used_at || Date.now()}`,
        userName,
        userShort: fallbackShort,
        usedAt: raw.used_at || raw.created_at || null,
        couponTitle: campaign?.title || 'Kupon',
        couponCode: raw.code || campaign?.code || '-',
        couponValueLabel,
        discountType,
        tlImpact,
      }
    })

    setUsageRows(mapped)
    setUsageSummary(summary)
    setUsageLoading(false)
  }

  const refreshBusinessCouponData = async (businessId: string) => {
    await Promise.all([loadCoupons(businessId), loadCouponUsageHistory(businessId)])
  }

  const createCoupon = async () => {
    if (!selectedBusinessId) return

    if (!couponTitle.trim()) {
      window.alert('Kupon başlığı zorunludur.')
      return
    }

    const maxUsageLimit = Math.max(1, Number.parseInt(couponMaxUsage, 10) || 100)
    const discountValue = couponType === 'percentage' ? Math.max(1, Number.parseInt(couponDiscountValue, 10) || 10) : 0
    const monetaryValue =
      couponType === 'free' ? Math.max(0, Number.parseFloat(couponGiftValue.replace(',', '.')) || 0) : 0
    const validUntilIso =
      couponIndefinite || !couponValidUntil ? null : new Date(`${couponValidUntil}T23:59:59`).toISOString()

    setSavingCoupon(true)

    let insertedCode = ''
    let insertError: string | null = null
    for (let attempt = 0; attempt < 6; attempt += 1) {
      insertedCode = generateSystemCouponCode()
      const { error } = await supabase.from('coupon_campaigns').insert({
        business_id: selectedBusinessId,
        title: couponTitle.trim(),
        code: insertedCode,
        discount_type: couponType,
        discount_value: discountValue,
        monetary_value: monetaryValue,
        valid_until: validUntilIso,
        max_usage_limit: maxUsageLimit,
        is_active: true,
      })

      if (!error) {
        insertError = null
        break
      }

      const errorText = `${error.message || ''} ${error.details || ''}`.toLowerCase()
      const isDuplicate = errorText.includes('duplicate') || errorText.includes('coupon_campaigns_code_key')
      if (isDuplicate) {
        insertError = 'duplicate'
        continue
      }

      insertError = error.message || 'insert-failed'
      break
    }
    setSavingCoupon(false)

    if (insertError) {
      window.alert('Kupon kaydedilemedi. Lütfen tekrar deneyin.')
      return
    }

    window.alert(`Kupon oluşturuldu. Kod: ${insertedCode}`)
    setCouponTitle('')
    setCouponType('percentage')
    setCouponDiscountValue('10')
    setCouponGiftValue('100')
    setCouponMaxUsage('100')
    setCouponValidUntil('')
    setCouponIndefinite(true)
    await refreshBusinessCouponData(selectedBusinessId)
  }

  const toggleCouponActive = async (coupon: CouponCampaign) => {
    if (!selectedBusinessId) return

    setTogglingCouponId(coupon.id)
    const { error } = await supabase
      .from('coupon_campaigns')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id)
    setTogglingCouponId(null)

    if (error) {
      window.alert('Kupon durumu güncellenemedi.')
      return
    }
    await refreshBusinessCouponData(selectedBusinessId)
  }

  const deleteCoupon = async (couponId: string) => {
    if (!selectedBusinessId) return
    setDeletingCouponId(couponId)
    const { error } = await supabase.from('coupon_campaigns').delete().eq('id', couponId)
    setDeletingCouponId(null)

    if (error) {
      window.alert('Kupon silinemedi.')
      return
    }
    await refreshBusinessCouponData(selectedBusinessId)
  }

  const copyCouponCode = async (coupon: CouponCampaign) => {
    const code = coupon.code || ''
    if (!code) return

    try {
      setCopyingCouponId(coupon.id)
      await navigator.clipboard.writeText(code)
      window.alert(`Kupon kodu kopyalandı: ${code}`)
    } catch {
      window.alert('Kod kopyalanamadı.')
    } finally {
      setCopyingCouponId(null)
    }
  }

  useEffect(() => {
    void loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedBusinessId) {
      setCoupons([])
      setUsageRows([])
      setUsageSummary(createEmptyUsageSummary())
      return
    }
    void refreshBusinessCouponData(selectedBusinessId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId])

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] p-5 md:p-6 bg-[linear-gradient(145deg,#ffffff_0%,#f5f8ff_100%)] shadow-[0_20px_28px_-22px_rgba(15,23,42,0.55)]">
        <ModuleTitle title="Kupon Yönetimi" />
        <p className="text-sm text-slate-500 mt-1">Kupon oluştur, aktif/pasif yönet ve kodları hızlıca kopyala.</p>
      </div>

      <div className="rounded-[28px] p-5 md:p-6 bg-[linear-gradient(145deg,#ffffff_0%,#f3f7ff_100%)] shadow-[0_20px_28px_-22px_rgba(15,23,42,0.55)] space-y-5">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
          İşletme Seç
          <select
            className="mt-2 w-full px-4 py-3 rounded-xl bg-white text-slate-700 font-bold shadow-sm border border-slate-200"
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

        {bootLoading ? (
          <div className="h-20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : !selectedBusiness ? (
          <div className="text-sm text-slate-500">İşletme bulunamadı.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 bg-white border border-slate-100 shadow-[0_12px_20px_-18px_rgba(15,23,42,0.7)]">
                <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">Aktif Kupon</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">{activeCouponCount}</p>
              </div>
              <div className="rounded-2xl p-4 bg-white border border-slate-100 shadow-[0_12px_20px_-18px_rgba(15,23,42,0.7)]">
                <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">Toplam Kupon</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">{coupons.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
              <section className="rounded-[24px] p-5 bg-white border border-slate-100 shadow-[0_16px_24px_-20px_rgba(15,23,42,0.65)] space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.2),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
                  <Ticket className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold">Yeni Kupon Oluştur</span>
                </div>

                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Kupon Başlığı
                  <input
                    value={couponTitle}
                    onChange={(event) => setCouponTitle(event.target.value)}
                    className="mt-2 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700"
                    placeholder={couponTitlePlaceholderByType(couponType)}
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Kupon Kodu
                  <div className="mt-2 w-full px-3 py-2.5 rounded-xl bg-slate-100 border border-dashed border-slate-300 text-sm font-semibold text-slate-600">
                    Sistem otomatik üretir
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    Kupon kaydedildiğinde benzersiz kod sistem tarafından atanır.
                  </p>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'percentage', label: 'Yüzde', icon: BadgePercent },
                    { key: 'free', label: 'Hediye', icon: Gift },
                    { key: 'item', label: 'Ürün', icon: Ticket },
                  ] as const).map((option) => {
                    const Icon = option.icon
                    const isActive = couponType === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setCouponType(option.key)}
                        className={`rounded-xl border px-2 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${
                          isActive ? 'border-blue-300 bg-blue-100 text-blue-700' : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {option.label}
                      </button>
                    )
                  })}
                </div>

                {couponType === 'percentage' ? (
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    İndirim Yüzdesi
                    <input
                      value={couponDiscountValue}
                      onChange={(event) => setCouponDiscountValue(event.target.value)}
                      inputMode="numeric"
                      className="mt-2 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700"
                      placeholder="10"
                    />
                  </label>
                ) : null}

                {couponType === 'free' ? (
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    Hediye Değeri (₺)
                    <input
                      value={couponGiftValue}
                      onChange={(event) => setCouponGiftValue(event.target.value)}
                      inputMode="decimal"
                      className="mt-2 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700"
                      placeholder="100"
                    />
                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                      Bu tutar sadece kasada hesaplama içindir, kupon üzerinde gösterilmez.
                    </p>
                  </label>
                ) : null}

                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Kullanım Limiti
                  <input
                    value={couponMaxUsage}
                    onChange={(event) => setCouponMaxUsage(event.target.value)}
                    inputMode="numeric"
                    className="mt-2 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700"
                    placeholder="100"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={couponIndefinite}
                    onChange={(event) => setCouponIndefinite(event.target.checked)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  Süresiz kupon
                </label>

                {!couponIndefinite ? (
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    Son Geçerlilik Tarihi
                    <input
                      type="date"
                      value={couponValidUntil}
                      onChange={(event) => setCouponValidUntil(event.target.value)}
                      className="mt-2 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700"
                    />
                  </label>
                ) : null}

                <button
                  type="button"
                  onClick={createCoupon}
                  disabled={savingCoupon}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                >
                  {savingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Kuponu Oluştur
                </button>
              </section>

              <section className="rounded-[24px] p-5 bg-white border border-slate-100 shadow-[0_16px_24px_-20px_rgba(15,23,42,0.65)]">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-bold text-slate-800">Kupon Listesi</h3>
                  <span className="text-xs font-semibold text-slate-500">Aktif {activeCouponCount} / Toplam {coupons.length}</span>
                </div>

                {recordsLoading ? (
                  <div className="h-24 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  </div>
                ) : coupons.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
                    Henüz kupon yok.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {coupons.map((coupon) => (
                      <article key={coupon.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{coupon.title || 'Kupon'}</p>
                            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-xs font-extrabold text-slate-700">
                              {coupon.code || 'KOD YOK'}
                            </div>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{couponBenefitText(coupon)}</p>
                            <p className="text-xs text-slate-500">Limit: {coupon.max_usage_limit || 0} | Kullanım: {coupon.usage_count || 0}</p>
                            <p className="text-xs text-slate-500">Geçerlilik: {formatDate(coupon.valid_until)}</p>
                          </div>

                          <span
                            className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                              coupon.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {coupon.is_active ? 'AKTİF' : 'PASİF'}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyCouponCode(coupon)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700"
                          >
                            {copyingCouponId === coupon.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                            Kodu Kopyala
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCouponActive(coupon)}
                            disabled={togglingCouponId === coupon.id}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                              coupon.is_active ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {togglingCouponId === coupon.id ? '...' : coupon.is_active ? 'Pasife Al' : 'Aktif Et'}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCoupon(coupon.id)}
                            disabled={deletingCouponId === coupon.id}
                            className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center"
                          >
                            {deletingCouponId === coupon.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-[24px] p-5 bg-white border border-slate-100 shadow-[0_16px_24px_-20px_rgba(15,23,42,0.65)]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800">Kupon Kullanım Geçmişi</h3>
                <span className="text-xs font-semibold text-slate-500">Kim kullandı, ne zaman kullandı, değeri ve TL etkisi</span>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">Toplam Kullanım</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{usageSummary.totalUsage}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">Yüzde İndirim (TL)</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{money(usageSummary.totalDiscountTl)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">Hediye (TL)</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{money(usageSummary.totalGiftTl)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">Ürün Kuponu</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{usageSummary.itemUsage}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">Toplam TL Etkisi</p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">{money(usageSummary.totalBenefitTl)}</p>
                </div>
              </div>

              {usageLoading ? (
                <div className="h-24 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                </div>
              ) : usageRows.length === 0 ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
                  Henüz kullanım geçmişi yok.
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100/80 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Kullanan</th>
                        <th className="px-3 py-2 text-left font-semibold">Kupon</th>
                        <th className="px-3 py-2 text-left font-semibold">Değer</th>
                        <th className="px-3 py-2 text-left font-semibold">TL Etkisi</th>
                        <th className="px-3 py-2 text-left font-semibold">Kullanım Zamanı</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageRows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-200">
                          <td className="px-3 py-2">
                            <p className="font-semibold text-slate-800">{row.userName}</p>
                            <p className="text-xs text-slate-500">{row.userShort}</p>
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-slate-800">{row.couponTitle}</p>
                            <p className="text-xs text-slate-500">{row.couponCode}</p>
                          </td>
                          <td className="px-3 py-2 text-slate-700 font-semibold">{row.couponValueLabel}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {row.tlImpact > 0 ? money(row.tlImpact) : '-'}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{formatDateTime(row.usedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
