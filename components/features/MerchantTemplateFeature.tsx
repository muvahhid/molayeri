'use client'

import type { SpatialSection } from '../../constants/spatialData'

const MERCHANT_ACCENT_BY_ID: Record<string, string> = {
  'merchant-dashboard': '#FF8A3D',
  'merchant-campaigns': '#38BDF8',
  'merchant-offers': '#4ADE80',
  'merchant-messages': '#C084FC',
  'merchant-analytics': '#FF5D5D',
}

export default function MerchantTemplateFeature({
  section,
  activeIndex = 0,
}: {
  section: SpatialSection
  activeIndex?: number
}) {
  const safeIndex = Math.max(0, Math.min(activeIndex, section.features.length - 1))
  const currentFeature = section.features[safeIndex]
  const accent = MERCHANT_ACCENT_BY_ID[section.id] ?? '#FF8A3D'

  return (
    <div className="w-full h-full p-4 sm:p-6 lg:p-12 flex items-center justify-center relative overflow-hidden bg-transparent font-sans">
      <div className="w-full max-w-6xl min-h-[560px] lg:min-h-[700px] grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-center z-10">
        <div className="flex flex-col items-start gap-4 sm:gap-5 max-w-[42rem] min-h-[250px] z-10 relative">
          <div className="p-4 rounded-[20px] bg-white/[0.04] border border-white/12 shadow-[0_12px_30px_rgba(0,0,0,0.28)] relative">
            <section.icon size={34} style={{ color: accent }} className="relative z-10" />
            <div className="absolute inset-0 rounded-[20px] blur-2xl opacity-10" style={{ backgroundColor: accent }} />
          </div>
          <h2 className="text-[2rem] sm:text-[2.45rem] lg:text-[3.1rem] font-semibold text-white leading-[1.06] tracking-tight">
            <span className="font-bold text-[#F3F8FF]">{section.title}</span>
            <br />
            <span className="font-bold" style={{ color: accent }}>
              5 Menü • Boş Şablon
            </span>
          </h2>
          <p className="text-[#DCEBFF] text-[14px] sm:text-[16px] font-medium leading-relaxed mt-1 max-w-[38rem]">
            Bu alan işletmeci akışı için hazır şablondur. Seçili menü: <span style={{ color: accent }}>{section.navLabel || section.title}</span>.
            Sonraki adımda her menüyü gerçek veri ve iş kurallarıyla dolduracağız.
          </p>
        </div>

        <div className="w-full max-w-[320px] sm:max-w-[360px] lg:min-w-[360px] lg:max-w-[360px] h-[560px] sm:h-[620px] lg:h-[640px] bg-[#0F172A] rounded-[36px] sm:rounded-[44px] border-[8px] sm:border-[10px] border-[#1E293B] shadow-[0_42px_80px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden relative shrink-0">
          <div className="px-4 pt-6 pb-4 border-b border-white/10 bg-[#121A2B]">
            <span className="text-white font-black text-[18px] tracking-tight block">{section.title}</span>
            <span className="text-white/60 text-[12px] font-semibold">Boş Sayfa Şablonu</span>
          </div>

          <div className="p-4 flex flex-col gap-3">
            {section.features.map((feature, index) => {
              const selected = index === safeIndex
              return (
                <div
                  key={feature.title}
                  className={`rounded-[14px] border p-3.5 transition-colors ${
                    selected ? 'border-white/25 bg-white/[0.08]' : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <feature.icon size={15} className={selected ? 'text-white' : 'text-white/55'} />
                    <span className={`text-[12px] font-bold ${selected ? 'text-white' : 'text-white/70'}`}>{feature.title}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex-1 px-4 pb-4">
            <div className="h-full rounded-[20px] border border-white/12 bg-white/[0.03] p-4 flex flex-col">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 w-max">
                <currentFeature.icon size={14} className="text-white/80" />
                <span className="text-[11px] font-black tracking-wide text-white/85">{currentFeature.title}</span>
              </div>

              <div className="flex-1 mt-4 rounded-[16px] border border-dashed border-white/15 bg-black/20 flex items-center justify-center p-4 text-center">
                <p className="text-white/60 text-[12px] font-medium leading-relaxed">
                  Bu bölüm şimdilik boş şablon.
                  <br />
                  <span className="text-white/40">Gerçek bileşenler sonraki adımda eklenecek.</span>
                </p>
              </div>

              <button
                type="button"
                className="mt-4 h-11 rounded-[14px] border border-white/15 bg-white/[0.04] text-white/55 text-[12px] font-bold tracking-wide cursor-default"
              >
                Şablon Hazır
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

