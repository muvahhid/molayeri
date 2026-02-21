'use client'

import { useEffect, useMemo, useState } from 'react'
import { BadgePercent, Loader2, Plus, Trash2 } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { fetchOwnedBusinesses, requireCurrentUserId } from '../_lib/queries'
import type { MerchantBusiness } from '../_lib/helpers'
import { ModuleTitle } from '../_components/module-title'
import { CampaignSubNav } from './_components/campaign-subnav'

type Campaign = {
  id: string
  text: string | null
  color_index: number | null
  image_url: string | null
  is_active: boolean | null
  created_at: string | null
}

const MAX_ACTIVE_CAMPAIGNS = 2
const MAX_SAVED_CAMPAIGNS = 25
const TAG_TEXT_MAX = 25

const TAG_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
const QUICK_EMOJIS = ['🔥', '☕️', '🍔', '⛽️', '🎁', '⚡️', '📢', '🍰']
const QUICK_TEMPLATE_PRESETS: { category: string; text: string }[] = [
  { category: 'Yakıt', text: 'Motorinde %7 indirim ⛽️' },
  { category: 'Restoran', text: 'Restoranda %10 fırsat 🍔' },
  { category: 'Kafe', text: 'Kahvede 2 al 1 öde ☕️' },
  { category: 'Market', text: 'Market sepette %12 indirim 🛒' },
  { category: 'Fırın', text: 'Sıcak poğaça + çay 29₺ 🥐' },
  { category: 'Kasap', text: 'Mangal paketinde %10 🥩' },
  { category: 'Oto Yıkama', text: 'Köpük yıkama hediye 🚿' },
  { category: 'Oto Servis', text: 'Bakım işçilikte %10 🔧' },
  { category: 'Lastik', text: '4 lastikte balans hediye 🛞' },
  { category: 'Şarj', text: 'Gece şarjına bonus ⚡️' },
]

function formatDate(value: string | null): string {
  if (!value) return '-'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleDateString('tr-TR')
}

function limitTagText(value: string): string {
  return value.slice(0, TAG_TEXT_MAX)
}

function toRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '').trim()
  const expanded =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : cleaned

  const r = Number.parseInt(expanded.slice(0, 2), 16) || 0
  const g = Number.parseInt(expanded.slice(2, 4), 16) || 0
  const b = Number.parseInt(expanded.slice(4, 6), 16) || 0

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getPostitStyle(color: string, active: boolean) {
  return {
    shell: {
      borderColor: toRgba(color, active ? 0.56 : 0.38),
      background: `linear-gradient(180deg, ${toRgba(color, active ? 0.14 : 0.09)} 0%, rgba(248,250,252,0.95) 100%)`,
      boxShadow: active
        ? `0 10px 18px -16px ${toRgba(color, 0.75)}, inset 0 1px 0 rgba(255,255,255,0.95)`
        : `0 8px 16px -16px rgba(15,23,42,0.5), inset 0 1px 0 rgba(255,255,255,0.94)`,
    },
  }
}

export default function MerchantCampaignsPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [bootLoading, setBootLoading] = useState(true)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [savingTag, setSavingTag] = useState(false)
  const [togglingTagId, setTogglingTagId] = useState<string | null>(null)
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null)

  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [tagText, setTagText] = useState('')
  const [tagColorIndex, setTagColorIndex] = useState(0)

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId) || null
  const activeCampaignCount = campaigns.filter((campaign) => campaign.is_active).length
  const selectedTagColor = TAG_COLORS[tagColorIndex] || TAG_COLORS[0]
  const previewPostitStyle = getPostitStyle(selectedTagColor, true)

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

  const loadCampaigns = async (businessId: string) => {
    setRecordsLoading(true)
    const { data } = await supabase
      .from('business_campaigns')
      .select('id, text, color_index, image_url, is_active, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    const isTagCampaign = (campaign: Campaign) => {
      const hasColor = campaign.color_index !== null && campaign.color_index !== undefined
      const hasImage = Boolean((campaign.image_url || '').trim())
      return hasColor && !hasImage
    }

    const sorted = [...((data || []) as Campaign[]).filter(isTagCampaign)].sort((left, right) => {
      const activeDiff = Number(Boolean(right.is_active)) - Number(Boolean(left.is_active))
      if (activeDiff !== 0) {
        return activeDiff
      }

      const leftTime = new Date(left.created_at || 0).getTime()
      const rightTime = new Date(right.created_at || 0).getTime()
      return rightTime - leftTime
    })

    setCampaigns(sorted)
    setRecordsLoading(false)
  }

  const addTagCampaign = async () => {
    if (!selectedBusinessId) return

    const normalizedTagText = limitTagText(tagText.trim())

    if (!normalizedTagText) {
      window.alert('Lütfen etiket metni yazın.')
      return
    }

    if (campaigns.length >= MAX_SAVED_CAMPAIGNS) {
      window.alert(`Maksimum kayıtlı etiket: ${MAX_SAVED_CAMPAIGNS}`)
      return
    }

    setSavingTag(true)
    const { error } = await supabase.from('business_campaigns').insert({
      business_id: selectedBusinessId,
      text: normalizedTagText,
      color_index: tagColorIndex,
      image_url: null,
      is_active: false,
    })
    setSavingTag(false)

    if (error) {
      window.alert('Etiket kaydedilemedi. Lütfen tekrar deneyin.')
      return
    }

    setTagText('')
    await loadCampaigns(selectedBusinessId)
  }

  const toggleTagActive = async (campaign: Campaign) => {
    if (!selectedBusinessId) return

    if (!campaign.is_active && activeCampaignCount >= MAX_ACTIVE_CAMPAIGNS) {
      window.alert(`Aynı anda en fazla ${MAX_ACTIVE_CAMPAIGNS} etiket yayına alınabilir.`)
      return
    }

    setTogglingTagId(campaign.id)
    const { error } = await supabase
      .from('business_campaigns')
      .update({ is_active: !campaign.is_active })
      .eq('id', campaign.id)
    setTogglingTagId(null)

    if (error) {
      window.alert('Etiket durumu güncellenemedi.')
      return
    }

    await loadCampaigns(selectedBusinessId)
  }

  const deleteTag = async (campaignId: string) => {
    if (!selectedBusinessId) return

    setDeletingTagId(campaignId)
    const { error } = await supabase.from('business_campaigns').delete().eq('id', campaignId)
    setDeletingTagId(null)

    if (error) {
      window.alert('Etiket silinemedi.')
      return
    }

    await loadCampaigns(selectedBusinessId)
  }

  useEffect(() => {
    void loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedBusinessId) {
      setCampaigns([])
      return
    }
    void loadCampaigns(selectedBusinessId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId])

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] p-5 md:p-6 bg-[linear-gradient(145deg,#ffffff_0%,#f5f8ff_100%)] shadow-[0_20px_28px_-22px_rgba(15,23,42,0.55)]">
        <ModuleTitle title="Kampanya Yönetimi" />
        <div className="mt-4">
          <CampaignSubNav active="tags" />
        </div>
        <p className="text-sm text-slate-500 mt-1">
          İşletme kartında görünen etiket mesajlarını yönetin. Kupon yönetimi artık ayrı menüde.
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
                <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">Aktif Etiket</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">{activeCampaignCount}</p>
              </div>
              <div className="rounded-2xl p-4 bg-white border border-slate-100 shadow-[0_12px_20px_-18px_rgba(15,23,42,0.7)]">
                <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">Kayıtlı Etiket</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">{campaigns.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[430px_1fr] gap-4">
              <div className="space-y-4">
                <section className="rounded-[24px] p-5 bg-white border border-slate-100 shadow-[0_16px_24px_-20px_rgba(15,23,42,0.65)] space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.2),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
                    <BadgePercent className="w-4 h-4 text-rose-600" />
                    <span className="text-sm font-semibold">Etiket Kampanyası Oluştur</span>
                  </div>

                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    Etiket Metni
                    <textarea
                      className="mt-2 w-full min-h-20 px-4 py-3 rounded-xl bg-slate-50 text-slate-700 font-bold border border-slate-200"
                      maxLength={TAG_TEXT_MAX}
                      value={tagText}
                      onChange={(event) => setTagText(limitTagText(event.target.value))}
                      placeholder="Örn: Restoran %10 🍔"
                    />
                    <div className="mt-1.5 flex justify-end">
                      <span
                        className={`text-[11px] font-semibold ${
                          TAG_TEXT_MAX - tagText.length <= 5 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        {TAG_TEXT_MAX - tagText.length}/{TAG_TEXT_MAX}
                      </span>
                    </div>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {TAG_COLORS.map((color, index) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setTagColorIndex(index)}
                        className={`h-8 w-8 rounded-full border-2 transition-transform ${
                          tagColorIndex === index ? 'border-slate-700 scale-110' : 'border-white'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-2">Seçili Renk Önizleme</p>
                    <div
                      className="relative inline-flex max-w-full items-center gap-2 rounded-[8px] border px-2.5 py-1.5"
                      style={previewPostitStyle.shell}
                    >
                      <span className="h-3.5 w-1 rounded-full" style={{ backgroundColor: selectedTagColor }} />
                      <span className="truncate text-sm font-bold" style={{ color: selectedTagColor }}>
                        {limitTagText(tagText.trim()) || 'Etiket metni önizlemesi'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setTagText((current) => limitTagText(`${current} ${emoji}`.trim()))}
                        className="px-2 py-1 rounded-lg text-base bg-slate-100 border border-slate-200"
                      >
                        {emoji}
                      </button>
                    ))}
                    {QUICK_TEMPLATE_PRESETS.map((preset) => (
                      <button
                        key={`${preset.category}-${preset.text}`}
                        type="button"
                        onClick={() => setTagText(limitTagText(preset.text))}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200"
                      >
                        {preset.category}: {preset.text}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addTagCampaign}
                    disabled={savingTag}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingTag ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Etiketi Kaydet
                  </button>
                </section>

                <section className="rounded-[24px] p-4 bg-white border border-slate-100 shadow-[0_16px_24px_-20px_rgba(15,23,42,0.65)]">
                  <div className="text-[11px] uppercase tracking-widest font-semibold text-slate-500 mb-2">Etiket Nerede Görünür?</div>
                  <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(150deg,#f7faff_0%,#eff4fb_100%)] p-3 shadow-[0_16px_26px_-22px_rgba(15,23,42,0.6),inset_0_1px_0_rgba(255,255,255,0.95)]">
                    <img
                      src="/campaign-help/IMG_3872.jpg"
                      alt="Kampanya etiketlerinin kartta görünümü"
                      className="w-[80%] mx-auto rounded-[20px] border border-slate-300 shadow-[0_12px_20px_-16px_rgba(15,23,42,0.55)]"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Bu örnekteki kırmızı çerçeveli alanlar, burada oluşturduğun etiket kampanyalarının kullanıcıya görüneceği bölgedir. Dilediğiniz rengi seçip yayınlayabilirsiniz
                  </p>
                </section>
              </div>

              <section className="rounded-[24px] p-5 bg-white border border-slate-100 shadow-[0_16px_24px_-20px_rgba(15,23,42,0.65)]">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-base font-bold text-slate-800">Etiket Arşivi</h2>
                <span className="text-xs font-semibold text-slate-500">
                  Yayında {activeCampaignCount}/{MAX_ACTIVE_CAMPAIGNS} | Kayıtlı {campaigns.length}/{MAX_SAVED_CAMPAIGNS}
                </span>
              </div>

              {recordsLoading ? (
                <div className="h-24 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                </div>
              ) : campaigns.length === 0 ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
                  Henüz etiket kampanyası yok.
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => {
                    const parsedColorIndex = Number(campaign.color_index ?? 0)
                    const colorSafeIndex =
                      Number.isFinite(parsedColorIndex) && parsedColorIndex >= 0
                        ? Math.min(parsedColorIndex, TAG_COLORS.length - 1)
                        : 0
                    const tagColor = TAG_COLORS[colorSafeIndex] || TAG_COLORS[0]
                    const isBusy = togglingTagId === campaign.id || deletingTagId === campaign.id
                    const postitStyle = getPostitStyle(tagColor, Boolean(campaign.is_active))

                    return (
                      <article key={campaign.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="relative inline-flex max-w-full items-center gap-2 rounded-[8px] border px-2.5 py-1.5" style={postitStyle.shell}>
                              <span className="h-3.5 w-1 rounded-full" style={{ backgroundColor: tagColor }} />
                              <span className="text-sm font-bold truncate max-w-[240px]" style={{ color: tagColor }}>
                                {campaign.text || 'Etiket metni yok'}
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 w-full rounded-full" style={{ backgroundColor: `${tagColor}33` }}>
                              <div className="h-full rounded-full" style={{ width: '42%', backgroundColor: tagColor }} />
                            </div>
                            <p className="mt-2 text-[11px] font-semibold text-slate-500">
                              {campaign.is_active ? 'YAYINDA' : 'TASLAK'} • {formatDate(campaign.created_at)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => toggleTagActive(campaign)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                campaign.is_active ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {togglingTagId === campaign.id ? '...' : campaign.is_active ? 'Yayından Al' : 'Yayınla'}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => deleteTag(campaign.id)}
                              className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center"
                            >
                              {deletingTagId === campaign.id ? (
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
          </>
        )}
      </div>
    </div>
  )
}
