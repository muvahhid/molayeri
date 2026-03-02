'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Power, Terminal, Trash2, Truck } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { PanelTitle } from '../../_components/panel-title'
import { CampaignSubNav } from '../_components/campaign-subnav'
import { categorySlugFromName, type MerchantBusiness } from '../../_lib/helpers'
import {
  fetchBusinessCategoryNames,
  fetchOwnedBusinesses,
  requireCurrentUserId,
} from '../../_lib/queries'

type CouponOption = {
  id: string
  title: string | null
  code: string | null
  discount_type: string | null
  discount_value: number | null
  monetary_value: number | null
  valid_until: string | null
  is_active: boolean | null
}

type LongHaulCampaign = {
  id: string
  campaign_kind: 'fuel_price_discount' | 'meal_offer' | 'service_offer'
  title: string | null
  details: string | null
  distance_km: number | null
  coupon_campaign_id: string | null
  is_active: boolean | null
  created_at: string | null
  published_at: string | null
  coupon_campaigns: CouponOption | CouponOption[] | null
}

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100, 200]

const KIND_OPTIONS: Array<{ value: LongHaulCampaign['campaign_kind']; label: string; helper: string }> = [
  {
    value: 'fuel_price_discount',
    label: 'Yakıt Fiyat İndirimi',
    helper: 'Akaryakıt işletmeleri için fiyat/fiş bazlı teklif',
  },
  {
    value: 'meal_offer',
    label: 'Yemek Kampanyası',
    helper: 'Restoran ve kafe işletmeleri için yemek fırsatı',
  },
  {
    value: 'service_offer',
    label: 'Servis Kampanyası',
    helper: 'Servis, bakım, lastik, yıkama gibi teknik teklif',
  },
]

const KIND_TO_SLUG: Record<LongHaulCampaign['campaign_kind'], string> = {
  fuel_price_discount: 'yakit',
  meal_offer: 'yemek',
  service_offer: 'servis',
}

function parseCoupon(raw: LongHaulCampaign['coupon_campaigns']): CouponOption | null {
  if (!raw) return null
  return (Array.isArray(raw) ? raw[0] : raw) || null
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('tr-TR')
}

function couponSummary(coupon: CouponOption): string {
  if (coupon.discount_type === 'percentage') {
    return `%${Math.trunc(coupon.discount_value || 0)} indirim`
  }
  if (coupon.discount_type === 'free') {
    return `${Math.round(coupon.monetary_value || 0)}₺ hediye`
  }
  if (coupon.discount_type === 'item') {
    return 'Ürün/Hizmet kuponu'
  }
  return 'Kupon'
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

export default function MerchantLongHaulCampaignsPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [bootLoading, setBootLoading] = useState(true)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')

  const [allowedKinds, setAllowedKinds] = useState<Array<LongHaulCampaign['campaign_kind']>>([])
  const [campaignKind, setCampaignKind] = useState<LongHaulCampaign['campaign_kind'] | ''>('')
  const [distanceKm, setDistanceKm] = useState(25)
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [selectedCouponId, setSelectedCouponId] = useState('')

  const [coupons, setCoupons] = useState<CouponOption[]>([])
  const [campaigns, setCampaigns] = useState<LongHaulCampaign[]>([])
  const [errorText, setErrorText] = useState('')

  const selectedBusiness = businesses.find((item) => item.id === selectedBusinessId) || null

  const loadBusinesses = async () => {
    setBootLoading(true)
    setErrorText('')

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

  const loadAllowedKinds = async (business: MerchantBusiness) => {
    const categoryNames = await fetchBusinessCategoryNames(supabase, business.id)
    const slugs = new Set<string>()

    const typeSlug = categorySlugFromName(business.type || '')
    if (typeSlug !== 'other') {
      slugs.add(typeSlug)
    }

    for (const categoryName of categoryNames) {
      const slug = categorySlugFromName(categoryName)
      if (slug !== 'other') {
        slugs.add(slug)
      }
    }

    const nextKinds = KIND_OPTIONS.filter((item) => slugs.has(KIND_TO_SLUG[item.value])).map(
      (item) => item.value
    )

    setAllowedKinds(nextKinds)
    setCampaignKind((current) => {
      if (current && nextKinds.includes(current as LongHaulCampaign['campaign_kind'])) {
        return current
      }
      return nextKinds[0] || ''
    })
  }

  const loadCoupons = async (businessId: string) => {
    const { data } = await supabase
      .from('coupon_campaigns')
      .select('id, title, code, discount_type, discount_value, monetary_value, valid_until, is_active')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    const now = new Date()
    const items = ((data || []) as CouponOption[]).filter((coupon) => {
      if (!coupon.valid_until) return true
      const validUntil = new Date(coupon.valid_until)
      if (Number.isNaN(validUntil.getTime())) return true
      return validUntil > now
    })

    setCoupons(items)
    setSelectedCouponId((current) => {
      if (!current) return ''
      return items.some((coupon) => coupon.id === current) ? current : ''
    })
  }

  const loadCampaigns = async (businessId: string) => {
    const { data, error } = await supabase
      .from('long_haul_campaigns')
      .select(
        'id, campaign_kind, title, details, distance_km, coupon_campaign_id, is_active, created_at, published_at, coupon_campaigns(id, title, code, discount_type, discount_value, monetary_value, valid_until, is_active)'
      )
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    setCampaigns((data || []) as LongHaulCampaign[])
  }

  const reloadContext = async () => {
    if (!selectedBusiness) {
      setAllowedKinds([])
      setCampaignKind('')
      setCoupons([])
      setCampaigns([])
      return
    }

    setRecordsLoading(true)
    setErrorText('')
    try {
      await Promise.all([
        loadAllowedKinds(selectedBusiness),
        loadCoupons(selectedBusiness.id),
        loadCampaigns(selectedBusiness.id),
      ])
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Uzun yol kampanyaları yüklenemedi.')
    } finally {
      setRecordsLoading(false)
    }
  }

  const createCampaign = async () => {
    if (!selectedBusiness) return

    if (!campaignKind) {
      window.alert('Bu işletme için uygun uzun yol kampanyası kategorisi yok.')
      return
    }

    const normalizedTitle = title.trim().slice(0, 90)
    const normalizedDetails = details.trim().slice(0, 420)

    if (!normalizedTitle || !normalizedDetails) {
      window.alert('Başlık ve detay alanlarını doldurun.')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('long_haul_campaigns').insert({
      business_id: selectedBusiness.id,
      campaign_kind: campaignKind,
      title: normalizedTitle,
      details: normalizedDetails,
      distance_km: distanceKm,
      coupon_campaign_id: selectedCouponId || null,
      is_active: true,
    })
    setSaving(false)

    if (error) {
      window.alert('Kampanya yayınlanamadı.')
      return
    }

    setTitle('')
    setDetails('')
    setSelectedCouponId('')
    await loadCampaigns(selectedBusiness.id)
  }

  const toggleCampaign = async (campaign: LongHaulCampaign) => {
    if (!selectedBusiness) return

    setTogglingId(campaign.id)
    const { error } = await supabase
      .from('long_haul_campaigns')
      .update({ is_active: !campaign.is_active })
      .eq('id', campaign.id)
    setTogglingId(null)

    if (error) {
      window.alert('Kampanya durumu güncellenemedi.')
      return
    }

    await loadCampaigns(selectedBusiness.id)
  }

  const deleteCampaign = async (campaignId: string) => {
    if (!selectedBusiness) return

    setDeletingId(campaignId)
    const { error } = await supabase.from('long_haul_campaigns').delete().eq('id', campaignId)
    setDeletingId(null)

    if (error) {
      window.alert('Kampanya silinemedi.')
      return
    }

    await loadCampaigns(selectedBusiness.id)
  }

  useEffect(() => {
    void loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void reloadContext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId])

  const activeCount = campaigns.filter((campaign) => campaign.is_active).length

  return (
    <div className="space-y-6">
      <div className="border-b border-[#2d313a] pb-4">
        <PanelTitle title="Uzun Yol Kampanyası" />
        <div className="mt-4">
          <CampaignSubNav active="long-haul" />
        </div>
        <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b] mt-3">
          İşletme kategorisine göre uzun yol kullanıcılarına mesafe bazlı kampanya yayınlayın.
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
                <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b]">Aktif Uzun Yol</p>
                <p className="mt-2 text-xl font-mono text-[#e2e8f0]">{activeCount}</p>
              </HardwarePanel>
              <HardwarePanel className="p-4 flex flex-col items-start group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
                <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b]">Kayıtlı Uzun Yol</p>
                <p className="mt-2 text-xl font-mono text-[#e2e8f0]">{campaigns.length}</p>
              </HardwarePanel>
            </div>

            {errorText ? (
              <div className="rounded border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-[11px] font-mono text-rose-400 uppercase tracking-wide">
                [HATA] {errorText}
              </div>
            ) : null}

            {allowedKinds.length === 0 ? (
              <div className="rounded border border-amber-900/50 bg-amber-950/20 p-4 text-[11px] font-mono uppercase tracking-wide text-amber-400">
                BU İŞLETME YALNIZCA YAKIT, YEMEK VEYA SERVİS KATEGORİLERİNDE İSE UZUN YOL KAMPANYASI YAYINLAYABİLİR.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[430px_1fr] gap-5">
                <HardwarePanel className="p-5 space-y-5">
                  <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] border-b border-[#2d313a] pb-3 w-full">
                    <Truck className="w-4 h-4 text-[#38bdf8]" />
                    <span>Uzun Yol Kampanyası Oluştur</span>
                  </div>

                  <div className="space-y-2">
                    {KIND_OPTIONS.filter((kind) => allowedKinds.includes(kind.value)).map((kind) => {
                      const selected = campaignKind === kind.value
                      return (
                        <button
                          key={kind.value}
                          type="button"
                          onClick={() => setCampaignKind(kind.value)}
                          className={`w-full text-left rounded-md px-4 py-3 border transition-all ${
                            selected
                              ? 'border-[#226785] bg-[#153445] text-[#38bdf8]'
                              : 'border-[#2d313a] bg-[#0a0c10] text-[#94a3b8] hover:border-[#475569] hover:text-[#e2e8f0]'
                          }`}
                        >
                          <div className="text-[11px] font-mono tracking-widest uppercase">{kind.label}</div>
                          <div className="text-[10px] font-mono text-[#64748b] mt-1">{kind.helper}</div>
                        </button>
                      )
                    })}
                  </div>

                  <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    Başlık
                    <input
                      className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] text-[#e2e8f0] text-sm font-mono border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                      maxLength={90}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Örn: Motorinde litrede 2₺ indirim"
                    />
                  </label>

                  <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    Detay
                    <textarea
                      className="mt-2 w-full min-h-[100px] px-4 py-3 rounded bg-[#0a0c10] text-[#e2e8f0] text-sm font-mono border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 custom-scrollbar resize-none placeholder:text-[#475569]"
                      maxLength={420}
                      value={details}
                      onChange={(event) => setDetails(event.target.value)}
                      placeholder="Kampanya şartları, saat aralığı, ürün kapsamı"
                    />
                  </label>

                  <div>
                    <p className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest border-b border-[#1e232b] pb-1.5 mb-3">Mesafe Yarıçapı</p>
                    <div className="flex flex-wrap gap-2">
                      {DISTANCE_OPTIONS.map((km) => (
                        <button
                          key={km}
                          type="button"
                          onClick={() => setDistanceKm(km)}
                          className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-widest border transition-colors ${
                            distanceKm === km
                              ? 'bg-[#153445] text-[#38bdf8] border-[#226785]'
                              : 'bg-[#0a0c10] text-[#64748b] border-[#2d313a] hover:border-[#475569] hover:text-[#e2e8f0]'
                          }`}
                        >
                          {km} km
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    Kupon Bağla (Opsiyonel)
                    <select
                      className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] text-[#e2e8f0] text-sm font-mono border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
                      value={selectedCouponId}
                      onChange={(event) => setSelectedCouponId(event.target.value)}
                    >
                      <option value="">KUPON BAĞLAMA</option>
                      {coupons.map((coupon) => (
                        <option key={coupon.id} value={coupon.id}>
                          {coupon.title || 'Kupon'} • {couponSummary(coupon)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={createCampaign}
                    disabled={saving}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] text-[11px] font-mono uppercase tracking-widest border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {saving ? 'İŞLENİYOR...' : 'YAYINLA'}
                  </button>
                </HardwarePanel>

                <HardwarePanel className="p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d313a] pb-3">
                    <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0]">
                      <Terminal className="w-4 h-4 text-[#38bdf8]" />
                      <span>Uzun Yol Yayınları</span>
                    </div>
                    {recordsLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#38bdf8]" /> : null}
                  </div>

                  {campaigns.length === 0 ? (
                    <div className="rounded border border-dashed border-[#2d313a] bg-[#0a0c10] p-5 text-[10px] font-mono uppercase tracking-widest text-[#64748b] text-center">
                      HENÜZ UZUN YOL KAMPANYASI YOK.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                      {campaigns.map((campaign) => {
                        const campaignCoupon = parseCoupon(campaign.coupon_campaigns)
                        const isBusy = togglingId === campaign.id || deletingId === campaign.id
                        const isActive = Boolean(campaign.is_active)
                        const kindLabel = KIND_OPTIONS.find((item) => item.value === campaign.campaign_kind)?.label || 'Kampanya'

                        return (
                          <article
                            key={campaign.id}
                            className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 hover:border-[#475569] transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-sm font-mono font-medium text-[#e2e8f0] uppercase tracking-wide truncate">
                                  {campaign.title || 'Kampanya'}
                                </p>
                                <p className="mt-1.5 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                                  {kindLabel} • {campaign.distance_km || '-'} KM • {formatDate(campaign.created_at)}
                                </p>
                                <p className="mt-3 text-[11px] font-mono text-[#94a3b8] leading-relaxed">
                                  {campaign.details || '-'}
                                </p>
                                {campaignCoupon ? (
                                  <p className="mt-3 inline-flex items-center px-2 py-1 rounded bg-[#101920] border border-[#1e232b] text-[10px] font-mono text-[#38bdf8] uppercase tracking-widest">
                                    KUPON: {(campaignCoupon.code || '-')} • {campaignCoupon.title || 'Kupon'}
                                  </p>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-2 shrink-0 border-t border-[#1e232b] sm:border-t-0 pt-3 sm:pt-0">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => toggleCampaign(campaign)}
                                  className={`px-3 py-2 rounded text-[9px] font-mono uppercase tracking-widest border transition-colors ${
                                    isActive 
                                      ? 'bg-rose-950/20 text-rose-400 border-rose-900/50 hover:bg-rose-900/40' 
                                      : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/50 hover:bg-emerald-900/40'
                                  }`}
                                >
                                  {togglingId === campaign.id ? (
                                    'İŞLENİYOR'
                                  ) : (
                                    <span className="inline-flex items-center gap-1">
                                      <Power className="w-3 h-3" />
                                      {isActive ? 'YAYINDAN AL' : 'YAYINLA'}
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => deleteCampaign(campaign.id)}
                                  className="w-8 h-8 rounded border border-rose-900/50 bg-rose-950/20 text-rose-400 flex items-center justify-center hover:bg-rose-900/40 transition-colors"
                                >
                                  {deletingId === campaign.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </HardwarePanel>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
