'use client'

import { useEffect, useMemo, useState } from 'react'
import { BadgePercent, Loader2, Plus, Trash2, Terminal } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { fetchOwnedBusinesses, requireCurrentUserId } from '../_lib/queries'
import type { MerchantBusiness } from '../_lib/helpers'
import { PanelTitle } from '../_components/panel-title'
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
  // Karanlık temaya uygun, hafif cam (glass) etkili post-it stili
  return {
    shell: {
      borderColor: toRgba(color, active ? 0.6 : 0.3),
      background: `linear-gradient(180deg, ${toRgba(color, active ? 0.15 : 0.05)} 0%, rgba(10,12,16,0.95) 100%)`,
      boxShadow: active
        ? `0 4px 12px ${toRgba(color, 0.2)}, inset 0 1px 0 rgba(255,255,255,0.05)`
        : `0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.02)`,
    },
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
      <div className="border-b border-[#2d313a] pb-4">
        <PanelTitle title="Kampanya Yönetimi" />
        <div className="mt-4">
          <CampaignSubNav active="tags" />
        </div>
        <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b] mt-3">
          İşletme kartında görünen etiket mesajlarını yönetin. Kupon yönetimi artık ayrı menüde.
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
                <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b]">Aktif Etiket</p>
                <p className="mt-2 text-xl font-mono text-[#e2e8f0]">{activeCampaignCount}</p>
              </HardwarePanel>
              <HardwarePanel className="p-4 flex flex-col items-start group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
                <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b]">Kayıtlı Etiket</p>
                <p className="mt-2 text-xl font-mono text-[#e2e8f0]">{campaigns.length}</p>
              </HardwarePanel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[430px_1fr] gap-4">
              <div className="space-y-4">
                
                <HardwarePanel className="p-5 space-y-5">
                  <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] border-b border-[#2d313a] pb-3 w-full">
                    <BadgePercent className="w-4 h-4 text-[#38bdf8]" />
                    <span>Etiket Kampanyası Oluştur</span>
                  </div>

                  <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    Etiket Metni
                    <textarea
                      className="mt-2 w-full min-h-[80px] px-4 py-3 rounded bg-[#0a0c10] text-[#e2e8f0] text-sm font-mono border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 custom-scrollbar resize-none placeholder:text-[#475569]"
                      maxLength={TAG_TEXT_MAX}
                      value={tagText}
                      onChange={(event) => setTagText(limitTagText(event.target.value))}
                      placeholder="Örn: Restoran %10 🍔"
                    />
                    <div className="mt-1.5 flex justify-end">
                      <span
                        className={`text-[10px] font-mono tracking-widest ${
                          TAG_TEXT_MAX - tagText.length <= 5 ? 'text-rose-400' : 'text-[#475569]'
                        }`}
                      >
                        {TAG_TEXT_MAX - tagText.length}/{TAG_TEXT_MAX}
                      </span>
                    </div>
                  </label>

                  <div className="space-y-3">
                     <div className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest border-b border-[#1e232b] pb-1.5">Renk Belirle</div>
                     <div className="flex flex-wrap gap-2">
                       {TAG_COLORS.map((color, index) => (
                         <button
                           key={color}
                           type="button"
                           onClick={() => setTagColorIndex(index)}
                           className={`h-7 w-7 rounded border-2 transition-transform ${
                             tagColorIndex === index ? 'border-[#38bdf8] scale-110' : 'border-[#2d313a]'
                           }`}
                           style={{ backgroundColor: color }}
                         />
                       ))}
                     </div>
                  </div>

                  <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] mb-3">Seçili Renk Önizleme</p>
                    <div
                      className="relative inline-flex max-w-full items-center gap-2 rounded border px-3 py-1.5 transition-colors"
                      style={previewPostitStyle.shell}
                    >
                      <span className="h-3.5 w-1 rounded-sm" style={{ backgroundColor: selectedTagColor }} />
                      <span className="truncate text-[13px] font-mono uppercase tracking-wide" style={{ color: selectedTagColor }}>
                        {limitTagText(tagText.trim()) || 'ETİKET METNİ ÖNİZLEMESİ'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                     <div className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest border-b border-[#1e232b] pb-1.5">Hızlı Şablonlar</div>
                     <div className="flex flex-wrap gap-2">
                       {QUICK_EMOJIS.map((emoji) => (
                         <button
                           key={emoji}
                           type="button"
                           onClick={() => setTagText((current) => limitTagText(`${current} ${emoji}`.trim()))}
                           className="px-2.5 py-1.5 rounded bg-[#0a0c10] border border-[#2d313a] text-sm text-[#e2e8f0] hover:border-[#475569] transition-colors"
                         >
                           {emoji}
                         </button>
                       ))}
                       {QUICK_TEMPLATE_PRESETS.map((preset) => (
                         <button
                           key={`${preset.category}-${preset.text}`}
                           type="button"
                           onClick={() => setTagText(limitTagText(preset.text))}
                           className="px-2.5 py-1.5 rounded bg-[#0a0c10] border border-[#2d313a] text-[10px] font-mono text-[#94a3b8] uppercase tracking-widest hover:text-[#e2e8f0] hover:border-[#475569] transition-colors"
                         >
                           {preset.category}: {preset.text}
                         </button>
                       ))}
                     </div>
                  </div>

                  <button
                    type="button"
                    onClick={addTagCampaign}
                    disabled={savingTag}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] text-[11px] font-mono uppercase tracking-widest border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 disabled:opacity-50"
                  >
                    {savingTag ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {savingTag ? 'KAYDEDİLİYOR...' : 'ETİKETİ KAYDET'}
                  </button>
                </HardwarePanel>

                <HardwarePanel className="p-5">
                  <div className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] mb-3 border-b border-[#2d313a] pb-2">Etiket Nerede Görünür?</div>
                  <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 flex justify-center">
                    <img
                      src="https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/IMG_3895.jpg"
                      alt="Kampanya etiketlerinin kartta görünümü"
                      className="w-[85%] rounded border border-[#1e232b] mix-blend-lighten opacity-80"
                    />
                  </div>
                  <p className="mt-3 text-[10px] font-mono text-[#64748b] leading-relaxed tracking-wider uppercase">
                    Bu örnekteki renkli çerçeveli alanlar, burada oluşturduğun etiket kampanyalarının kullanıcıya görüneceği bölgedir. Dilediğiniz rengi seçip yayınlayabilirsiniz.
                  </p>
                </HardwarePanel>
              </div>

              <HardwarePanel className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d313a] pb-3">
                  <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0]">
                     <Terminal className="w-4 h-4 text-[#38bdf8]" />
                     <span>Etiket Arşivi</span>
                  </div>
                  <span className="px-3 py-1.5 rounded border border-[#2d313a] bg-[#0a0c10] text-[10px] font-mono text-[#64748b] tracking-widest uppercase">
                    YAYINDA {activeCampaignCount}/{MAX_ACTIVE_CAMPAIGNS} | KAYITLI {campaigns.length}/{MAX_SAVED_CAMPAIGNS}
                  </span>
                </div>

                {recordsLoading ? (
                  <div className="h-32 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#38bdf8]" />
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="rounded border border-dashed border-[#2d313a] bg-[#0a0c10] p-5 text-[10px] font-mono uppercase tracking-widest text-[#64748b] text-center">
                    HENÜZ ETİKET KAMPANYASI YOK.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
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
                        <article key={campaign.id} className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 hover:border-[#475569] transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="relative inline-flex max-w-full items-center gap-2 rounded border px-2.5 py-1.5 transition-colors" style={postitStyle.shell}>
                                <span className="h-3.5 w-1 rounded-sm" style={{ backgroundColor: tagColor }} />
                                <span className="text-[12px] font-mono uppercase tracking-wide truncate max-w-[240px]" style={{ color: tagColor }}>
                                  {campaign.text || 'ETİKET METNİ YOK'}
                                </span>
                              </div>
                              <div className="mt-3 h-1 w-full rounded-sm bg-[#16181d] border border-[#2d313a] overflow-hidden">
                                <div className="h-full rounded-sm" style={{ width: '42%', backgroundColor: tagColor }} />
                              </div>
                              <p className="mt-2 text-[9px] font-mono uppercase tracking-widest text-[#64748b]">
                                {campaign.is_active ? 'YAYINDA' : 'TASLAK'} • {formatDate(campaign.created_at)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 border-t border-[#1e232b] sm:border-t-0 pt-3 sm:pt-0">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => toggleTagActive(campaign)}
                                className={`px-3 py-2 rounded text-[9px] font-mono uppercase tracking-widest border transition-colors ${
                                  campaign.is_active 
                                    ? 'bg-rose-950/20 text-rose-400 border-rose-900/50 hover:bg-rose-900/40' 
                                    : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/50 hover:bg-emerald-900/40'
                                }`}
                              >
                                {togglingTagId === campaign.id ? 'İŞLENİYOR' : campaign.is_active ? 'YAYINDAN AL' : 'YAYINLA'}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => deleteTag(campaign.id)}
                                className="w-8 h-8 rounded border border-rose-900/50 bg-rose-950/20 text-rose-400 flex items-center justify-center hover:bg-rose-900/40 transition-colors"
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
              </HardwarePanel>
            </div>
          </>
        )}
      </div>
    </div>
  )
}