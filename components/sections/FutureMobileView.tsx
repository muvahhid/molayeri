'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Grid2x2, House, Sparkles, X } from 'lucide-react'
import type { SpatialSection } from '../../constants/spatialData'

export default function FutureMobileView({
  sections,
  audienceMode,
  onToggleAudience,
  selectedSectionId,
  onSelectSection,
  selectedFeatureIndex,
  onSelectFeatureIndex,
}: {
  sections: SpatialSection[]
  audienceMode: 'user' | 'merchant'
  onToggleAudience: () => void
  selectedSectionId: string
  onSelectSection: (sectionId: string) => void
  selectedFeatureIndex: number
  onSelectFeatureIndex: (index: number) => void
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isHomeSelected = selectedSectionId === 'home'
  const selectedSection = sections.find((section) => section.id === selectedSectionId) ?? sections[0]
  const safeFeatureIndex = Math.max(0, Math.min(selectedFeatureIndex, selectedSection.features.length - 1))
  const selectedFeature = selectedSection.features[safeFeatureIndex]
  const menuItems = useMemo(
    () => [
      {
        id: 'home',
        label: 'Ana Sayfa',
        sub: 'Özet',
        icon: House,
      },
      ...sections.map((section) => ({
        id: section.id,
        label: section.navLabel || section.title,
        sub: `${section.features.length} adım`,
        icon: section.icon,
      })),
    ],
    [sections]
  )

  return (
    <section className="lg:hidden relative z-20 px-4 pt-24 pb-14">
      <div className="mx-auto max-w-[460px] space-y-4">
        <div className="rounded-[24px] border border-white/12 bg-white/[0.03] backdrop-blur-xl p-3 shadow-[0_18px_34px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white/80">
              <Sparkles className="h-4 w-4 text-[#FF8A3D]" />
              <span className="text-[11px] font-bold tracking-[0.14em] uppercase">Mobil Akış</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleAudience}
                className={`h-9 rounded-xl px-3 text-[11px] font-extrabold tracking-wide border transition-colors ${
                  audienceMode === 'user'
                    ? 'text-[#38BDF8] border-[#38BDF8]/45 bg-[#38BDF8]/12'
                    : 'text-[#FF7043] border-[#FF7043]/45 bg-[#FF7043]/12'
                }`}
              >
                {audienceMode === 'user' ? 'İŞLETMECİYİM' : 'KULLANICIYIM'}
              </button>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="h-9 w-9 rounded-xl border border-white/20 bg-white/[0.05] text-white/85 flex items-center justify-center"
                aria-label="Sayfa menüsünü aç"
              >
                {isMenuOpen ? <X className="h-4 w-4" /> : <Grid2x2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="rounded-[24px] border border-white/12 bg-white/[0.03] backdrop-blur-xl p-3 shadow-[0_18px_34px_rgba(0,0,0,0.35)]">
            <div className="grid grid-cols-3 gap-2.5">
              {menuItems.map((item, idx) => {
                const active = selectedSectionId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectSection(item.id)
                      setIsMenuOpen(false)
                    }}
                    className={`aspect-square rounded-[16px] border p-2 text-left transition-colors ${
                      active ? 'border-white/35 bg-white/[0.13]' : 'border-white/12 bg-white/[0.04]'
                    }`}
                  >
                    <div className="h-full flex flex-col">
                      <div className="h-7 w-7 rounded-lg border border-white/20 bg-white/[0.06] flex items-center justify-center">
                        <item.icon size={13} className={active ? 'text-white' : 'text-white/70'} />
                      </div>
                      <div className="mt-2 text-[10px] font-extrabold text-white/85 leading-tight">{item.label}</div>
                      <div className="text-[9px] text-white/50 mt-0.5">{item.sub}</div>
                      <div className="mt-auto pt-2 flex items-end gap-1">
                        {[0, 1, 2].map((bar) => {
                          const heights = [8, 13, 10]
                          const h = heights[(idx + bar) % heights.length]
                          return (
                            <span
                              key={bar}
                              className={`w-1.5 rounded-sm ${active ? 'bg-white/75' : 'bg-white/35'}`}
                              style={{ height: `${h}px` }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="rounded-[24px] border border-white/12 bg-white/[0.03] backdrop-blur-xl p-4 shadow-[0_18px_34px_rgba(0,0,0,0.35)]">
          {!isHomeSelected && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sections.map((section) => {
                const active = section.id === selectedSection.id
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => onSelectSection(section.id)}
                    className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-bold transition-colors ${
                      active ? 'text-white border-white/35 bg-white/[0.12]' : 'text-white/70 border-white/15 bg-white/[0.04]'
                    }`}
                  >
                    <section.icon size={14} className={active ? 'text-white' : 'text-white/60'} />
                    {section.navLabel || section.title}
                  </button>
                )
              })}
            </div>
          )}

          <div className="mt-3 rounded-[18px] border border-white/15 bg-black/20 p-4">
            {isHomeSelected ? (
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-white/[0.08] border border-white/15 flex items-center justify-center">
                    <House size={17} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-extrabold text-[15px] leading-tight">Future Ana Sayfa</div>
                    <div className="text-white/55 text-[11px] mt-0.5">Mobil odaklı hızlı navigasyon</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-[12px] border border-white/12 bg-white/[0.04] p-2.5">
                    <div className="text-white/50 text-[9px] font-bold uppercase tracking-wide">Mod</div>
                    <div className="text-white text-[12px] font-extrabold mt-1">{audienceMode === 'user' ? 'Kullanıcı' : 'İşletmeci'}</div>
                  </div>
                  <div className="rounded-[12px] border border-white/12 bg-white/[0.04] p-2.5">
                    <div className="text-white/50 text-[9px] font-bold uppercase tracking-wide">Sayfalar</div>
                    <div className="text-white text-[12px] font-extrabold mt-1">{sections.length} modül</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-white/[0.08] border border-white/15 flex items-center justify-center">
                  <selectedSection.icon size={17} className={selectedSection.color} />
                </div>
                <div>
                  <div className="text-white font-extrabold text-[15px] leading-tight">{selectedSection.title}</div>
                  <div className="text-white/55 text-[11px] mt-0.5">Mobil kullanıma optimize edildi</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isHomeSelected && (
          <div className="rounded-[24px] border border-white/12 bg-white/[0.03] backdrop-blur-xl p-4 shadow-[0_18px_34px_rgba(0,0,0,0.35)]">
            <div className="text-white/65 text-[11px] font-bold tracking-[0.12em] uppercase mb-3">Modül Adımları</div>
            <div className="space-y-2.5">
              {selectedSection.features.map((feature, index) => {
                const active = safeFeatureIndex === index
                return (
                  <button
                    key={feature.title}
                    type="button"
                    onClick={() => onSelectFeatureIndex(index)}
                    className={`w-full text-left rounded-[16px] border p-3 transition-colors ${
                      active ? 'border-white/30 bg-white/[0.11]' : 'border-white/12 bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <feature.icon size={15} className={active ? 'text-white' : 'text-white/65'} />
                      <span className={`text-[12px] font-bold ${active ? 'text-white' : 'text-white/75'}`}>{feature.title}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 rounded-[16px] border border-white/14 bg-black/20 p-3.5">
              <div className="text-white text-[13px] font-bold">{selectedFeature.title}</div>
              <p className="text-white/70 text-[12px] leading-relaxed mt-1.5">{selectedFeature.desc}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/register/business"
            className="h-11 rounded-xl border border-[#FF7043]/55 bg-[#FF7043]/12 text-[#FFDCCF] text-[12px] font-extrabold flex items-center justify-center gap-1.5"
          >
            İşletmeni Kaydet
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/login"
            className="h-11 rounded-xl border border-[#38BDF8]/55 bg-[#38BDF8]/12 text-[#DDF5FF] text-[12px] font-extrabold flex items-center justify-center gap-1.5"
          >
            Yönetici Girişi
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
