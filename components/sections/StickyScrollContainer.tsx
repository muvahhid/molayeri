'use client'
import React, { useRef, useState, useEffect } from 'react'
import { useScroll } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { SPATIAL } from '../../constants/spatialData'

const NEON_STYLES: Record<string, React.CSSProperties> = {
  wallet: {
    color: '#7DD3FC',
    textShadow: '0 0 10px rgba(125,211,252,0.24)',
    filter: 'drop-shadow(0 0 8px rgba(125,211,252,0.28))',
  },
  radar: {
    color: '#FF8A3D',
    textShadow: '0 0 12px rgba(255,138,61,0.28)',
    filter: 'drop-shadow(0 0 8px rgba(255,138,61,0.3))',
  },
  convoy: {
    color: '#4ADE80',
    textShadow: '0 0 12px rgba(74,222,128,0.28)',
    filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.3))',
  },
  'long-road': {
    color: '#C084FC',
    textShadow: '0 0 12px rgba(192,132,252,0.30)',
    filter: 'drop-shadow(0 0 8px rgba(192,132,252,0.34))',
  },
  panic: {
    color: '#FF5D5D',
    textShadow: '0 0 12px rgba(255,93,93,0.30)',
    filter: 'drop-shadow(0 0 8px rgba(255,93,93,0.34))',
  },
}

type FeatureItem = {
  title: string
  desc: string
  icon: LucideIcon
}

type SectionData = {
  id: string
  title: string
  icon: LucideIcon
  color: string
  glow: string
  features: FeatureItem[]
}

type ChildWithActiveIndexProps = {
  activeIndex: number
}

export const StickyScrollContainer = ({ data, children }: { data: SectionData, children: React.ReactNode }) => {
  const containerRef = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] })
  const [activeIndex, setActiveIndex] = useState(0)
  const neonStyle = NEON_STYLES[data.id] ?? undefined
  const lastRawProgressRef = useRef(0)
  const smoothProgressRef = useRef(0)
  const lastSwitchAtRef = useRef(0)

  const jumpToIndex = (index: number) => {
    setActiveIndex(index)

    const sectionEl = containerRef.current
    if (!sectionEl) return

    const rect = sectionEl.getBoundingClientRect()
    const sectionTop = window.scrollY + rect.top
    const scrollableSpan = rect.height - window.innerHeight
    if (scrollableSpan <= 0) return

    const progressStops = [0.12, 0.46, 0.82]
    const clampedIndex = Math.max(0, Math.min(index, progressStops.length - 1))
    const targetY = sectionTop + scrollableSpan * progressStops[clampedIndex]

    window.scrollTo({
      top: targetY,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    // Hedef akış:
    // Asagi: 1 uzun -> 2 uzun -> 3 cok uzun
    // Yukari: 3 uzun -> 2 uzun -> 1 cok uzun
    // Ayrica "ziplama/atlama"yi kesmek icin:
    // - progress low-pass smoothing
    // - adimlar arasi kisa gecis kilidi
    const down01 = 0.34
    const down12 = 0.56
    const up21 = 0.72
    const up10 = 0.44
    const smoothing = 0.22
    const switchCooldownMs = 170

    const unsub = scrollYProgress.on('change', (rawP) => {
      const prevRaw = lastRawProgressRef.current
      const movingDown = rawP >= prevRaw
      lastRawProgressRef.current = rawP

      const smoothPrev = smoothProgressRef.current
      const smoothP = smoothPrev + (rawP - smoothPrev) * smoothing
      smoothProgressRef.current = smoothP

      setActiveIndex((prev) => {
        let next = prev

        if (movingDown) {
          if (prev === 0 && smoothP >= down01) next = 1
          else if (prev === 1 && smoothP >= down12) next = 2
        } else {
          if (prev === 2 && smoothP <= up21) next = 1
          else if (prev === 1 && smoothP <= up10) next = 0
        }

        if (next !== prev) {
          const now = performance.now()
          if (now - lastSwitchAtRef.current < switchCooldownMs) {
            return prev
          }
          lastSwitchAtRef.current = now
        }

        return next
      })
    })
    return () => unsub()
  }, [scrollYProgress])

  return (
    <section ref={containerRef} className="relative h-[340vh] md:h-[380vh] lg:h-[400vh]" id={data.id}>
      <div className="sticky top-0 h-screen flex items-center justify-center px-4 sm:px-6 pt-24 pb-8 lg:py-0 lg:px-20 lg:pl-32 overflow-visible lg:overflow-hidden">
        <div className={`absolute top-1/4 left-1/4 w-[40vw] h-[40vw] rounded-full blur-[120px] pointer-events-none opacity-30 ${data.glow.replace('/20', '')}`} />
        <div className="w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-5 sm:gap-8 lg:gap-16 relative z-10 items-center">
          <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
            <div className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-full ${SPATIAL.glassCard} w-max`}>
              <data.icon size={20} className={data.color} style={neonStyle} />
              <span className={`font-black tracking-widest uppercase text-sm ${data.color}`} style={neonStyle}>{data.title}</span>
            </div>
            <div className="flex flex-col gap-3 sm:gap-4 max-h-[32vh] sm:max-h-[36vh] lg:max-h-none overflow-y-auto pr-1">
              {data.features.map((feat: FeatureItem, i: number) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => jumpToIndex(i)}
                  aria-label={`${feat.title} sekmesine git`}
                  className={`transition-all duration-700 p-4 sm:p-5 rounded-2xl ${activeIndex === i ? SPATIAL.glassContainer : data.id === 'wallet' || data.id === 'radar' || data.id === 'convoy' || data.id === 'long-road' || data.id === 'panic' ? `${SPATIAL.glassCard} opacity-100 scale-[0.98]` : `${SPATIAL.glassCard} opacity-80 scale-95`}`}
                  style={activeIndex === i ? undefined : { filter: 'blur(1.1px)' }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <feat.icon size={20} className={activeIndex === i ? data.color : 'text-white/40'} style={neonStyle} />
                    <h3 className="text-base sm:text-[1.1rem] font-bold" style={neonStyle ?? { color: '#FFFFFF' }}>{feat.title}</h3>
                  </div>
                  <p className="text-xs sm:text-[13px]" style={data.id === 'wallet' || data.id === 'radar' || data.id === 'convoy' || data.id === 'long-road' || data.id === 'panic' ? { color: '#FFECEC' } : { color: 'rgba(255,255,255,0.85)' }}>{feat.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className={`h-[54vh] sm:h-[62vh] lg:h-[75vh] w-full rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[2.5rem] p-3 sm:p-4 ${SPATIAL.glassContainer} relative`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[2.5rem]" />
            {React.isValidElement<ChildWithActiveIndexProps>(children)
              ? React.cloneElement(children, { activeIndex })
              : children}
          </div>
        </div>
      </div>
    </section>
  )
}
