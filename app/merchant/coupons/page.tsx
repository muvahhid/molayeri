'use client'

import { useEffect, useMemo, useState } from 'react'
import { BadgePercent, Check, Copy, Gift, Loader2, Ticket, Trash2 } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { fetchOwnedBusinesses, requireCurrentUserId } from '../_lib/queries'
import type { MerchantBusiness } from '../_lib/helpers'
import { PanelTitle } from '../_components/panel-title'

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
  show_in_detail: boolean | null
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

export default function MerchantCouponsPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [bootLoading, setBootLoading] = useState(true)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [usageLoading, setUsageLoading] = useState(false)
  const [savingCoupon, setSavingCoupon] = useState(false)
  const [togglingCouponId, setTogglingCouponId] = useState<string | null>(null)
  const [copyingCouponId, setCopyingCouponId] = useState<string | null>(null)
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null)
  const [detailTogglingCouponId, setDetailTogglingCouponId] = useState<string | null>(null)
  const [detailFlagSupported, setDetailFlagSupported] = useState(true)

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
    let detailSupported = true
    let rows: CouponCampaign[] = []

    const detailed = await supabase
      .from('coupon_campaigns')
      .select(
        'id, title, code, discount_type, discount_value, monetary_value, max_usage_limit, usage_count, valid_until, is_active, show_in_detail, created_at'
      )
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (detailed.error) {
      detailSupported = false
      const fallback = await supabase
        .from('coupon_campaigns')
        .select(
          'id, title, code, discount_type, discount_value, monetary_value, max_usage_limit, usage_count, valid_until, is_active, created_at'
        )
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      rows = ((fallback.data || []) as CouponCampaign[]).map((coupon) => ({
        ...coupon,
        show_in_detail: false,
      }))
    } else {
      rows = (detailed.data || []) as CouponCampaign[]
    }

    setDetailFlagSupported(detailSupported)
    setCoupons(rows)
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
        show_in_detail: false,
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
    const nextActive = !coupon.is_active
    const { error } = await supabase
      .from('coupon_campaigns')
      .update(nextActive ? { is_active: true } : { is_active: false, show_in_detail: false })
      .eq('id', coupon.id)
    setTogglingCouponId(null)

    if (error) {
      window.alert('Kupon durumu güncellenemedi.')
      return
    }
    await refreshBusinessCouponData(selectedBusinessId)
  }

  const toggleCouponDetailVisibility = async (coupon: CouponCampaign) => {
    if (!selectedBusinessId) return
    if (!detailFlagSupported) {
      window.alert("Detayda yayınlama alanı eksik. DB'de 'show_in_detail' alanı olmalı.")
      return
    }
    if (!coupon.show_in_detail && !coupon.is_active) {
      window.alert('Detayda yayınlamak için kupon önce aktif olmalı.')
      return
    }

    setDetailTogglingCouponId(coupon.id)
    const { error } = await supabase
      .from('coupon_campaigns')
      .update({ show_in_detail: !coupon.show_in_detail })
      .eq('id', coupon.id)
    setDetailTogglingCouponId(null)

    if (error) {
      window.alert('Detay yayın durumu güncellenemedi.')
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
      <div className="border-b border-[#2d313a] pb-4">
        <PanelTitle title="Kupon Yönetimi" />
        <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b] mt-2">
          Kupon oluştur, aktif/pasif yönet ve kodları hızlıca kopyala.
        </p>
      </div>

      <div className="space-y-5">
        <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
          İşletme Seç
          <select
            className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm outline-none focus:border-[#38bdf8]/50 appearance-none uppercase tracking-wide"
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
            <Loader2 className="w-6 h-6 animate-spin text-[#38bdf8]" />
          </div>
        ) : !selectedBusiness ? (
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] bg-[#0a0c10] border border-dashed border-[#2d313a] p-5 text-center rounded">İşletme bulunamadı.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <HardwarePanel className="p-4 flex flex-col items-start group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
                <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b]">Aktif Kupon</p>
                <p className="mt-2 text-xl font-mono text-[#e2e8f0]">{activeCouponCount}</p>
              </HardwarePanel>
              <HardwarePanel className="p-4 flex flex-col items-start group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
                <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b]">Toplam Kupon</p>
                <p className="mt-2 text-xl font-mono text-[#e2e8f0]">{coupons.length}</p>
              </HardwarePanel>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5">
              
              <HardwarePanel className="p-5 space-y-5">
                <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] border-b border-[#2d313a] pb-3 w-full">
                  <Ticket className="w-4 h-4 text-[#38bdf8]" />
                  <span>Yeni Kupon Oluştur</span>
                </div>

                <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                  Kupon Başlığı
                  <input
                    value={couponTitle}
                    onChange={(event) => setCouponTitle(event.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] text-[#e2e8f0] text-sm font-mono border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                    placeholder={couponTitlePlaceholderByType(couponType)}
                  />
                </label>

                <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                  Kupon Kodu
                  <div className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-dashed border-[#2d313a] text-sm font-mono text-[#64748b]">
                    SİSTEM OTOMATİK ÜRETİR
                  </div>
                  <p className="mt-1.5 text-[9px] font-mono tracking-widest text-[#475569]">
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
                        className={`rounded border px-2 py-2.5 text-[10px] font-mono uppercase tracking-widest inline-flex items-center justify-center gap-1.5 transition-colors ${
                          isActive ? 'border-[#226785] bg-[#153445] text-[#38bdf8]' : 'border-[#2d313a] bg-[#0a0c10] text-[#64748b] hover:border-[#475569] hover:text-[#94a3b8]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {option.label}
                      </button>
                    )
                  })}
                </div>

                {couponType === 'percentage' ? (
                  <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    İndirim Yüzdesi
                    <input
                      value={couponDiscountValue}
                      onChange={(event) => setCouponDiscountValue(event.target.value)}
                      inputMode="numeric"
                      className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] text-[#e2e8f0] text-sm font-mono border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                      placeholder="10"
                    />
                  </label>
                ) : null}

                {couponType === 'free' ? (
                  <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    Hediye Değeri (₺)
                    <input
                      value={couponGiftValue}
                      onChange={(event) => setCouponGiftValue(event.target.value)}
                      inputMode="decimal"
                      className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] text-[#e2e8f0] text-sm font-mono border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                      placeholder="100"
                    />
                    <p className="mt-1.5 text-[9px] font-mono tracking-widest text-[#475569]">
                      Bu tutar sadece kasada hesaplama içindir, kupon üzerinde gösterilmez.
                    </p>
                  </label>
                ) : null}

                <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                  Kullanım Limiti
                  <input
                    value={couponMaxUsage}
                    onChange={(event) => setCouponMaxUsage(event.target.value)}
                    inputMode="numeric"
                    className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] text-[#e2e8f0] text-sm font-mono border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                    placeholder="100"
                  />
                </label>

                <label className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={couponIndefinite}
                    onChange={(event) => setCouponIndefinite(event.target.checked)}
                    className="w-4 h-4 rounded border-[#2d313a] bg-[#0a0c10] accent-[#38bdf8]"
                  />
                  Süresiz kupon
                </label>

                {!couponIndefinite ? (
                  <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    Son Geçerlilik Tarihi
                    <input
                      type="date"
                      value={couponValidUntil}
                      onChange={(event) => setCouponValidUntil(event.target.value)}
                      className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] text-[#e2e8f0] text-sm font-mono border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569] [color-scheme:dark]"
                    />
                  </label>
                ) : null}

                <button
                  type="button"
                  onClick={createCoupon}
                  disabled={savingCoupon}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] text-[11px] font-mono uppercase tracking-widest border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 disabled:opacity-50"
                >
                  {savingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {savingCoupon ? 'İŞLENİYOR...' : 'KUPONU OLUŞTUR'}
                </button>
              </HardwarePanel>

              <HardwarePanel className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d313a] pb-3">
                  <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0]">
                    <Ticket className="w-4 h-4 text-[#38bdf8]" />
                    <span>Kupon Listesi</span>
                  </div>
                  <span className="px-3 py-1.5 rounded border border-[#2d313a] bg-[#0a0c10] text-[10px] font-mono text-[#64748b] tracking-widest uppercase">
                    AKTİF {activeCouponCount} / TOPLAM {coupons.length}
                  </span>
                </div>

                {!detailFlagSupported ? (
                  <div className="rounded border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-[10px] font-mono tracking-widest uppercase text-amber-400">
                    [SİSTEM] DETAYDA YAYINLAMA ALANI EKSİK. DB GÜNCELLEMESİ GEREKLİ.
                  </div>
                ) : null}

                {recordsLoading ? (
                  <div className="h-24 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-[#38bdf8]" />
                  </div>
                ) : coupons.length === 0 ? (
                  <div className="rounded border border-dashed border-[#2d313a] bg-[#0a0c10] p-5 text-[10px] font-mono uppercase tracking-widest text-[#64748b] text-center">
                    HENÜZ KUPON YOK.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                    {coupons.map((coupon) => (
                      <article key={coupon.id} className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 hover:border-[#475569] transition-colors flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-medium text-[#e2e8f0] uppercase tracking-wide truncate">{coupon.title || 'KUPON'}</p>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest border ${
                                  coupon.is_active ? 'border-emerald-900/50 bg-emerald-950/30 text-emerald-400' : 'border-[#2d313a] bg-[#16181d] text-[#64748b]'
                                }`}
                              >
                                {coupon.is_active ? 'AKTİF' : 'PASİF'}
                              </span>
                              {coupon.show_in_detail ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest border border-[#226785] bg-[#153445] text-[#38bdf8]">
                                  DETAYDA
                                </span>
                              ) : null}
                            </div>
                          </div>
                          
                          <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#101419] border border-[#1e232b] text-[11px] font-mono text-[#38bdf8] tracking-widest">
                            {coupon.code || 'KOD YOK'}
                          </div>

                          <div className="mt-3 space-y-1">
                            <p className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-widest">{couponBenefitText(coupon)}</p>
                            <p className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest">LİMİT: {coupon.max_usage_limit || 0} | KULLANIM: {coupon.usage_count || 0}</p>
                            <p className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest">GEÇERLİLİK: {formatDate(coupon.valid_until)}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#1e232b] flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyCouponCode(coupon)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[9px] font-mono uppercase tracking-widest border border-[#2d313a] bg-transparent text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
                          >
                            {copyingCouponId === coupon.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                            KOPYALA
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleCouponActive(coupon)}
                            disabled={togglingCouponId === coupon.id}
                            className={`px-2.5 py-1.5 rounded text-[9px] font-mono uppercase tracking-widest border transition-colors ${
                              coupon.is_active ? 'border-rose-900/50 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40' : 'border-emerald-900/50 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/40'
                            }`}
                          >
                            {togglingCouponId === coupon.id ? '...' : coupon.is_active ? 'PASİFE AL' : 'AKTİF ET'}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleCouponDetailVisibility(coupon)}
                            disabled={
                              detailTogglingCouponId === coupon.id ||
                              (!coupon.is_active && !coupon.show_in_detail) ||
                              !detailFlagSupported
                            }
                            className={`px-2.5 py-1.5 rounded text-[9px] font-mono uppercase tracking-widest border transition-colors disabled:opacity-50 ${
                              coupon.show_in_detail ? 'border-[#226785] bg-[#153445] text-[#38bdf8]' : 'border-[#2d313a] bg-[#16181d] text-[#64748b] hover:text-[#e2e8f0]'
                            }`}
                          >
                            {detailTogglingCouponId === coupon.id
                              ? '...'
                              : coupon.show_in_detail
                                ? 'DETAYDAN KALDIR'
                                : 'DETAYDA YAYINLA'}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteCoupon(coupon.id)}
                            disabled={deletingCouponId === coupon.id}
                            className="w-7 h-7 rounded border border-rose-900/50 bg-rose-950/20 text-rose-400 flex items-center justify-center hover:bg-rose-900/40 transition-colors ml-auto"
                          >
                            {deletingCouponId === coupon.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </HardwarePanel>
            </div>

            <HardwarePanel className="p-5 md:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d313a] pb-3">
                <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0]">
                  <Ticket className="w-4 h-4 text-[#38bdf8]" />
                  <span>Kupon Kullanım Geçmişi</span>
                </div>
                <span className="text-[10px] font-mono text-[#64748b] tracking-widest uppercase">
                  Kim kullandı, ne zaman kullandı, değeri ve TL etkisi
                </span>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
                <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
                  <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Toplam Kullanım</p>
                  <p className="text-xl font-mono text-[#e2e8f0] mt-2">{usageSummary.totalUsage}</p>
                </div>
                <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
                  <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Yüzde İndirim (TL)</p>
                  <p className="text-xl font-mono text-[#e2e8f0] mt-2">{money(usageSummary.totalDiscountTl)}</p>
                </div>
                <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
                  <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Hediye (TL)</p>
                  <p className="text-xl font-mono text-[#e2e8f0] mt-2">{money(usageSummary.totalGiftTl)}</p>
                </div>
                <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
                  <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Ürün Kuponu</p>
                  <p className="text-xl font-mono text-[#e2e8f0] mt-2">{usageSummary.itemUsage}</p>
                </div>
                <div className="rounded border border-[#166534] bg-[#14532d]/20 p-4 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-emerald-500/0 group-hover:bg-emerald-500/50 transition-colors" />
                  <p className="text-[9px] uppercase tracking-widest font-mono text-emerald-500/70">Toplam TL Etkisi</p>
                  <p className="text-xl font-mono text-emerald-400 mt-2">{money(usageSummary.totalBenefitTl)}</p>
                </div>
              </div>

              {usageLoading ? (
                <div className="h-24 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-[#38bdf8]" />
                </div>
              ) : usageRows.length === 0 ? (
                <div className="rounded border border-dashed border-[#2d313a] bg-[#0a0c10] p-5 text-[10px] font-mono uppercase tracking-widest text-[#64748b] text-center">
                  HENÜZ KULLANIM GEÇMİŞİ YOK.
                </div>
              ) : (
                <div className="rounded border border-[#2d313a] bg-[#16181d] overflow-x-auto">
                  <table className="min-w-full text-left border-collapse">
                    <thead className="bg-[#101419] border-b border-[#2d313a]">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Kullanan</th>
                        <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Kupon</th>
                        <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Değer</th>
                        <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">TL Etkisi</th>
                        <th className="px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Kullanım Zamanı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e232b]">
                      {usageRows.map((row) => (
                        <tr key={row.id} className="hover:bg-[#1a1d24] transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-[12px] font-medium text-[#e2e8f0] uppercase tracking-wide">{row.userName}</p>
                            <p className="text-[10px] font-mono text-[#64748b] mt-0.5 tracking-widest">{row.userShort}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-[12px] font-medium text-[#e2e8f0] uppercase tracking-wide">{row.couponTitle}</p>
                            <p className="text-[10px] font-mono text-[#38bdf8] mt-0.5 tracking-widest">{row.couponCode}</p>
                          </td>
                          <td className="px-4 py-3 text-[11px] font-mono text-[#94a3b8] uppercase tracking-widest">{row.couponValueLabel}</td>
                          <td className="px-4 py-3 text-[11px] font-mono text-[#e2e8f0] tracking-widest">
                            {row.tlImpact > 0 ? money(row.tlImpact) : '-'}
                          </td>
                          <td className="px-4 py-3 text-[11px] font-mono text-[#64748b] tracking-widest">{formatDateTime(row.usedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </HardwarePanel>
          </>
        )}
      </div>
    </div>
  )
}