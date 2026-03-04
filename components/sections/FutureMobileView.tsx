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

  const stepLabels = useMemo(() => {
    if (!selectedSection) return HOME_STEP_LABELS
    if (isHomeSelected) return HOME_STEP_LABELS
    const labels = selectedSection.features.slice(0, 3).map((feature) => feature.title)
    while (labels.length < 3) labels.push('Adım')
    return labels
  }, [isHomeSelected, selectedSection])

  const activeStep = Math.max(0, Math.min(selectedFeatureIndex, 2))

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
          <div className="rounded-[22px] border border-white/12 bg-white/[0.03] backdrop-blur-xl p-4 shadow-[0_16px_32px_rgba(0,0,0,0.32)]">
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((stepIndex) => {
                const active = activeStep === stepIndex
                return (
                  <button
                    key={stepIndex}
                    type="button"
                    onClick={() => onSelectFeatureIndex(stepIndex)}
                    className={`h-10 rounded-xl border text-[12px] font-extrabold transition-colors ${
                      active ? 'border-white/35 bg-white/[0.13] text-white' : 'border-white/15 bg-black/20 text-white/70'
                    }`}
                  >
                    {stepIndex + 1}
                  </button>
                )
              })}
            </div>
            <div className="mt-2 text-white/75 text-[12px] font-semibold">{stepLabels[activeStep]}</div>
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
