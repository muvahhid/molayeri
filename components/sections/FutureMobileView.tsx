'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
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
  const selectedSection = sections.find((section) => section.id === selectedSectionId) ?? sections[0]
  const safeFeatureIndex = Math.max(0, Math.min(selectedFeatureIndex, selectedSection.features.length - 1))
  const selectedFeature = selectedSection.features[safeFeatureIndex]

  return (
    <section className="lg:hidden relative z-20 px-4 pt-24 pb-14">
      <div className="mx-auto max-w-[460px] space-y-4">
        <div className="rounded-[24px] border border-white/12 bg-white/[0.03] backdrop-blur-xl p-3 shadow-[0_18px_34px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white/80">
              <Sparkles className="h-4 w-4 text-[#FF8A3D]" />
              <span className="text-[11px] font-bold tracking-[0.14em] uppercase">Mobil Akış</span>
            </div>
            <button
              type="button"
              onClick={onToggleAudience}
              className={`h-9 rounded-xl px-4 text-[12px] font-extrabold tracking-wide border transition-colors ${
                audienceMode === 'user'
                  ? 'text-[#38BDF8] border-[#38BDF8]/45 bg-[#38BDF8]/12'
                  : 'text-[#FF7043] border-[#FF7043]/45 bg-[#FF7043]/12'
              }`}
            >
              {audienceMode === 'user' ? 'İŞLETMECİYİM' : 'KULLANICIYIM'}
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/12 bg-white/[0.03] backdrop-blur-xl p-4 shadow-[0_18px_34px_rgba(0,0,0,0.35)]">
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

          <div className="mt-3 rounded-[18px] border border-white/15 bg-black/20 p-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-white/[0.08] border border-white/15 flex items-center justify-center">
                <selectedSection.icon size={17} className={selectedSection.color} />
              </div>
              <div>
                <div className="text-white font-extrabold text-[15px] leading-tight">{selectedSection.title}</div>
                <div className="text-white/55 text-[11px] mt-0.5">Mobil kullanıma optimize edildi</div>
              </div>
            </div>
          </div>
        </div>

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
