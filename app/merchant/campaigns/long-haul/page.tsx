'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Power, Trash2, Truck } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { ModuleTitle } from '../../_components/module-title'
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
      <div className="rounded-[28px] p-5 md:p-6 bg-[linear-gradient(145deg,#ffffff_0%,#f5f8ff_100%)] shadow-[0_20px_28px_-22px_rgba(15,23,42,0.55)]">
        <ModuleTitle title="Uzun Yol Kampanyası" />
        <div className="mt-4">
          <CampaignSubNav active="long-haul" />
        </div>
        <p className="text-sm text-slate-500 mt-3">
          İşletme kategorisine göre uzun yol kullanıcılarına mesafe bazlı kampanya yayınlayın.
        </p>
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
                <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">Aktif Uzun Yol</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">{activeCount}</p>
              </div>
              <div className="rounded-2xl p-4 bg-white border border-slate-100 shadow-[0_12px_20px_-18px_rgba(15,23,42,0.7)]">
                <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">Kayıtlı Uzun Yol</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">{campaigns.length}</p>
              </div>
            </div>

            {errorText ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold px-4 py-3">
                {errorText}
              </div>
            ) : null}

            {allowedKinds.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 font-semibold">
                Bu işletme yalnızca yakıt, yemek veya servis kategorilerinde ise uzun yol kampanyası yayınlayabilir.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
                <section className="rounded-[24px] p-5 bg-white border border-slate-100 shadow-[0_16px_24px_-20px_rgba(15,23,42,0.65)] space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.2),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
                    <Truck className="w-4 h-4 text-sky-700" />
                    <span className="text-sm font-semibold">Uzun Yol Kampanyası Oluştur</span>
                  </div>

                  <div className="space-y-1.5">
                    {KIND_OPTIONS.filter((kind) => allowedKinds.includes(kind.value)).map((kind) => {
                      const selected = campaignKind === kind.value
                      return (
                        <button
                          key={kind.value}
                          type="button"
                          onClick={() => setCampaignKind(kind.value)}
                          className={`w-full text-left rounded-xl px-3 py-2 border transition-all ${
                            selected
                              ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-[0_10px_16px_-14px_rgba(3,105,161,0.6)]'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className="text-sm font-bold">{kind.label}</div>
                          <div className="text-xs font-medium opacity-80">{kind.helper}</div>
                        </button>
                      )
                    })}
                  </div>

                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    Başlık
                    <input
                      className="mt-2 w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-700 font-bold border border-slate-200"
                      maxLength={90}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Örn: Motorinde litrede 2₺ indirim"
                    />
                  </label>

                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    Detay
                    <textarea
                      className="mt-2 w-full min-h-24 px-4 py-3 rounded-xl bg-slate-50 text-slate-700 font-semibold border border-slate-200"
                      maxLength={420}
                      value={details}
                      onChange={(event) => setDetails(event.target.value)}
                      placeholder="Kampanya şartları, saat aralığı, ürün kapsamı"
                    />
                  </label>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Mesafe Yarıçapı</p>
                    <div className="flex flex-wrap gap-2">
                      {DISTANCE_OPTIONS.map((km) => (
                        <button
                          key={km}
                          type="button"
                          onClick={() => setDistanceKm(km)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            distanceKm === km
                              ? 'bg-sky-100 text-sky-700 border border-sky-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {km} km
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    Kupon Bağla (Opsiyonel)
                    <select
                      className="mt-2 w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-700 font-semibold border border-slate-200"
                      value={selectedCouponId}
                      onChange={(event) => setSelectedCouponId(event.target.value)}
                    >
                      <option value="">Kupon bağlama</option>
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
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Yayınla
                  </button>
                </section>

                <section className="rounded-[24px] p-5 bg-white border border-slate-100 shadow-[0_16px_24px_-20px_rgba(15,23,42,0.65)]">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h2 className="text-base font-bold text-slate-800">Uzun Yol Yayınları</h2>
                    {recordsLoading ? <Loader2 className="w-4 h-4 animate-spin text-sky-600" /> : null}
                  </div>

                  {campaigns.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
                      Henüz uzun yol kampanyası yok.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {campaigns.map((campaign) => {
                        const campaignCoupon = parseCoupon(campaign.coupon_campaigns)
                        const isBusy = togglingId === campaign.id || deletingId === campaign.id
                        const isActive = Boolean(campaign.is_active)
                        const kindLabel =
                          KIND_OPTIONS.find((item) => item.value === campaign.campaign_kind)?.label || 'Kampanya'

                        return (
                          <article
                            key={campaign.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate">
                                  {campaign.title || 'Kampanya'}
                                </p>
                                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                  {kindLabel} • {campaign.distance_km || '-'} km • {formatDate(campaign.created_at)}
                                </p>
                                <p className="mt-2 text-sm font-medium text-slate-600">
                                  {campaign.details || '-'}
                                </p>
                                {campaignCoupon ? (
                                  <p className="mt-2 text-xs font-semibold text-sky-700">
                                    Kupon: {(campaignCoupon.code || '-').toUpperCase()} •{' '}
                                    {campaignCoupon.title || 'Kupon'}
                                  </p>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => toggleCampaign(campaign)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                    isActive ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {togglingId === campaign.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <span className="inline-flex items-center gap-1">
                                      <Power className="w-3.5 h-3.5" />
                                      {isActive ? 'Yayından Al' : 'Yayınla'}
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => deleteCampaign(campaign.id)}
                                  className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center"
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
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
