'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, House } from 'lucide-react'
import type { SpatialSection } from '../../constants/spatialData'

const LOGO_URL =
  '/logo.png'

const HOME_STEP_LABELS = ['Adım 1', 'Adım 2', 'Adım 3']

export default function FutureMobileView({
  sections,
  audienceMode,
  onToggleAudience,
  selectedSectionId,
  onSelectSection,
  selectedFeatureIndex,
  onSelectFeatureIndex,
  preview,
}: {
  sections: SpatialSection[]
  audienceMode: 'user' | 'merchant'
  onToggleAudience: () => void
  selectedSectionId: string
  onSelectSection: (sectionId: string) => void
  selectedFeatureIndex: number
  onSelectFeatureIndex: (index: number) => void
  preview: ReactNode
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isHomeSelected = selectedSectionId === 'home'
  const selectedSection = sections.find((section) => section.id === selectedSectionId) ?? sections[0] ?? null
  const menuAccent = audienceMode === 'user' ? '#38BDF8' : '#FF7043'
  const menuToneClass =
    audienceMode === 'user'
      ? 'text-[#38BDF8] border-[#38BDF8]/45 bg-[#38BDF8]/12'
      : 'text-[#FF7043] border-[#FF7043]/45 bg-[#FF7043]/12'

  const stepItems = useMemo(() => {
    if (!selectedSection || isHomeSelected) {
      return HOME_STEP_LABELS.map((label) => ({
        compactLabel: label,
        fullLabel: label,
        icon: House,
      }))
    }

    const items = selectedSection.features.slice(0, 3).map((feature) => ({
      compactLabel: feature.title,
      fullLabel: feature.title,
      icon: feature.icon,
    }))

    while (items.length < 3) {
      items.push({
        compactLabel: `Adım ${items.length + 1}`,
        fullLabel: 'Hazırlanıyor',
        icon: selectedSection.icon,
      })
    }

    return items
  }, [isHomeSelected, selectedSection])

  const activeStep = Math.max(0, Math.min(selectedFeatureIndex, 2))
  const activeStepItem = stepItems[activeStep] ?? stepItems[0]

  const menuItems = useMemo(
    () => [
      {
        id: 'home',
        label: 'Ana Sayfa',
        icon: House,
      },
      ...sections.map((section) => ({
        id: section.id,
        label: section.navLabel || section.title,
        icon: section.icon,
      })),
    ],
    [sections]
  )

  if (!selectedSection) return null

  return (
    <section className="lg:hidden relative z-20 px-4 pt-24 pb-14">
      <div className="mx-auto max-w-[460px] space-y-4">
        <div className="rounded-[22px] border border-white/12 bg-white/[0.03] backdrop-blur-xl p-3.5 shadow-[0_16px_32px_rgba(0,0,0,0.32)]">
          <div className="flex items-center justify-between gap-2.5">
            <img src={LOGO_URL} alt="Molayeri Logo" className="h-8 w-auto object-contain" draggable={false} />
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
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className={`mt-3 h-11 w-full rounded-xl border px-3 text-left flex items-center justify-between ${menuToneClass}`}
          >
            <span className="text-[12px] font-bold">
              {isHomeSelected ? 'Ana Sayfa' : selectedSection.navLabel || selectedSection.title}
            </span>
            {isMenuOpen ? (
              <ChevronUp className="h-4 w-4" style={{ color: menuAccent }} />
            ) : (
              <ChevronDown className="h-4 w-4" style={{ color: menuAccent }} />
            )}
          </button>

          {isMenuOpen && (
            <div className="mt-2.5 rounded-xl border border-white/12 bg-black/20 p-2 max-h-[220px] overflow-y-auto">
              {menuItems.map((item) => {
                const active = selectedSectionId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectSection(item.id)
                      setIsMenuOpen(false)
                    }}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-[12px] font-bold transition-colors flex items-center gap-2.5 ${
                      active ? `${menuToneClass} border` : 'text-white/75 hover:bg-white/[0.06]'
                    }`}
                  >
                    <item.icon size={14} className={active ? (audienceMode === 'user' ? 'text-[#38BDF8]' : 'text-[#FF7043]') : 'text-white/65'} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {!isHomeSelected && (
          <div className="rounded-[22px] border border-white/14 bg-[linear-gradient(168deg,rgba(255,255,255,0.08)_-18%,rgba(255,255,255,0.02)_62%)] backdrop-blur-xl p-3.5 sm:p-4 shadow-[0_18px_34px_rgba(0,0,0,0.34)]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black tracking-[0.12em] uppercase text-white/55">Adım Geçişi</span>
              <span className="text-[11px] font-black text-white/75">{activeStep + 1}/3</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {[0, 1, 2].map((stepIndex) => {
                const active = activeStep === stepIndex
                const item = stepItems[stepIndex] ?? stepItems[0]
                return (
                  <button
                    key={stepIndex}
                    type="button"
                    onClick={() => onSelectFeatureIndex(stepIndex)}
                    aria-current={active ? 'step' : undefined}
                    className={`relative h-[56px] sm:h-[60px] min-w-0 overflow-hidden rounded-[13px] sm:rounded-[15px] border px-1.5 sm:px-2 pt-1.5 sm:pt-2 pb-1.5 transition-[background-color,border-color,box-shadow,color] duration-300 ease-out flex flex-col items-center justify-between ${
                      active
                        ? 'border-white/38 bg-white/[0.14] text-white shadow-[0_8px_16px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.2)]'
                        : 'border-white/16 bg-black/20 text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                    }`}
                  >
                    <span className={`flex h-[18px] w-[18px] sm:h-5 sm:w-5 items-center justify-center rounded-full ${active ? 'bg-white/[0.1]' : 'bg-white/[0.04]'}`}>
                      <item.icon
                        size={11}
                        className={active ? (audienceMode === 'user' ? 'text-[#38BDF8]' : 'text-[#FF7043]') : 'text-white/48'}
                      />
                    </span>
                    <span className="block max-w-full truncate px-0.5 text-[8.5px] sm:text-[9.5px] font-semibold leading-[1.1] tracking-[0.01em]">
                      {item.compactLabel}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-2 flex h-8 items-center rounded-xl border border-white/12 bg-black/25 px-3 text-[10.5px] sm:text-[11px] font-semibold text-white/78">
              <span className="truncate">{activeStepItem.fullLabel}</span>
            </div>
          </div>
        )}

        <div
          className={`rounded-[22px] border border-white/12 bg-white/[0.03] backdrop-blur-xl shadow-[0_18px_34px_rgba(0,0,0,0.35)] ${
            isHomeSelected ? 'p-[6px] overflow-hidden' : 'p-3.5'
          }`}
        >
          <div
            className={`border border-white/14 bg-black/20 overflow-hidden ${
              isHomeSelected ? 'rounded-[22px]' : 'rounded-[18px] min-h-[560px]'
            }`}
          >
            {preview}
          </div>
        </div>
      </div>
    </section>
  )
}
