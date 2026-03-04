'use client'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useTransform, type MotionValue } from 'framer-motion'
import { House, LoaderCircle } from 'lucide-react'
import { SPATIAL, THEME, type SpatialSection } from '../../constants/spatialData'

const NAV_NEON_STYLES: Record<string, React.CSSProperties> = {
  convoy: {
    color: '#4ADE80',
    textShadow: '0 0 10px rgba(74,222,128,0.28)',
    filter: 'drop-shadow(0 0 6px rgba(74,222,128,0.3))',
  },
  'long-road': {
    color: '#C084FC',
    textShadow: '0 0 10px rgba(192,132,252,0.30)',
    filter: 'drop-shadow(0 0 6px rgba(192,132,252,0.34))',
  },
  panic: {
    color: '#FF5D5D',
    textShadow: '0 0 10px rgba(255,93,93,0.32)',
    filter: 'drop-shadow(0 0 6px rgba(255,93,93,0.36))',
  },
}

export const CommandCenterNav = ({
  activeSection,
  progress,
  sections,
  audienceMode,
  onToggleAudience,
}: {
  activeSection: string
  progress: MotionValue<number>
  sections: SpatialSection[]
  audienceMode: 'user' | 'merchant'
  onToggleAudience: () => void
}) => {
  const getNavLabel = (section: SpatialSection) => {
    if (section.navLabel) return section.navLabel
    const sectionId = section.id
    const title = section.title
    if (sectionId === 'convoy') return 'Dijital Konvoy'
    if (sectionId === 'long-road') return 'Uzun Yol'
    return title.split(' ')[0]
  }

  const progressWidth = useTransform(progress, [0, 1], ['0%', '100%'])
  const audienceToggleLabel = audienceMode === 'user' ? 'İşletmeciyim' : 'Kullanıcıyım'
  const navContainerClass = 'w-[96%] sm:w-[95%] md:w-[92%]'
  const navMaxWidth = audienceMode === 'merchant' ? 1360 : 1120
  const navItemPaddingClass = 'px-3 sm:px-4'
  const [isNavigating, setIsNavigating] = useState(false)
  const [targetLabel, setTargetLabel] = useState<string | null>(null)
  const navTokenRef = useRef(0)
  const cleanupTimerRef = useRef<number | null>(null)

  const clearTimer = (ref: { current: number | null }) => {
    if (ref.current !== null) {
      window.clearTimeout(ref.current)
      ref.current = null
    }
  }

  const sleep = (ms: number) => new Promise<void>((resolve) => {
    const id = window.setTimeout(resolve, ms)
    cleanupTimerRef.current = id
  })

  const preloadAssets = async (target: HTMLElement) => {
    const assets = Array.from(target.querySelectorAll('img,video')) as Array<HTMLImageElement | HTMLVideoElement>
    if (assets.length === 0) return

    const waiters = assets.map((asset) => new Promise<void>((resolve) => {
      if (asset instanceof HTMLImageElement) {
        if (asset.complete) return resolve()
        const done = () => resolve()
        asset.addEventListener('load', done, { once: true })
        asset.addEventListener('error', done, { once: true })
        return
      }
      if (asset.readyState >= 2) return resolve()
      const done = () => resolve()
      asset.addEventListener('loadeddata', done, { once: true })
      asset.addEventListener('error', done, { once: true })
    }))

    await Promise.race([Promise.all(waiters), sleep(900)])
  }

  const scrollToSection = (sectionId: string) => {
    const target = document.getElementById(sectionId)
    if (!target) return

    const navOffset = 24
    const targetTop = target.getBoundingClientRect().top + window.scrollY - navOffset
    const maxTop = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
    const finalTop = Math.min(Math.max(targetTop, 0), maxTop)
    const isSameSection = activeSection === sectionId
    const nearTarget = Math.abs(window.scrollY - finalTop) <= 8
    if (isSameSection && nearTarget) return

    const navToken = navTokenRef.current + 1
    navTokenRef.current = navToken
    setTargetLabel(
      sectionId === 'hero'
        ? 'Ana Sayfa'
        : (() => {
            const sec = sections.find((s) => s.id === sectionId)
            return sec ? getNavLabel(sec) : 'Akış'
          })()
    )
    setIsNavigating(true)

    requestAnimationFrame(async () => {
      await preloadAssets(target)
      await sleep(220)
      if (navTokenRef.current !== navToken) return
      window.scrollTo({ top: finalTop, behavior: 'auto' })
      requestAnimationFrame(() => {
        if (navTokenRef.current !== navToken) return
        setIsNavigating(false)
        setTargetLabel(null)
      })
    })
  }

  useEffect(() => {
    return () => {
      clearTimer(cleanupTimerRef)
    }
  }, [])

  return (
    <>
      <motion.nav
        className={`fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 ${navContainerClass}`}
        animate={{ maxWidth: navMaxWidth }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        style={{ willChange: 'max-width' }}
      >
        <div className={`p-1.5 sm:p-2 rounded-[1.4rem] sm:rounded-[2rem] ${SPATIAL.glassContainer} border-t-white/20 flex items-center justify-center relative overflow-hidden`}>
          <motion.div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#FF7043] via-[#8A77FF] to-[#29B6F6]" style={{ width: progressWidth }} />
          <div className="flex w-full flex-wrap items-center gap-2 p-1">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <button onClick={() => scrollToSection('hero')} className={`relative shrink-0 ${navItemPaddingClass} py-2 rounded-full text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${activeSection === 'hero' ? 'text-white' : THEME.textMuted}`}>
              {activeSection === 'hero' && <motion.div layoutId="nav-glow" className="absolute inset-0 bg-white/10 shadow-[inset_0_0_12px_rgba(255,255,255,0.1)] border border-white/20 rounded-full z-0" transition={{ type: 'spring', stiffness: 300, damping: 25 }} />}
              <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                <House className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Ana Sayfa
              </span>
            </button>
            {sections.map(sec => {
              const isActive = activeSection === sec.id
              const activeStyle = isActive ? NAV_NEON_STYLES[sec.id] : undefined
              return (
                <button key={sec.id} onClick={() => scrollToSection(sec.id)} className={`relative shrink-0 ${navItemPaddingClass} py-2 rounded-full text-xs sm:text-sm font-bold transition-colors ${isActive ? sec.color : THEME.textMuted}`}>
                  {isActive && <motion.div layoutId="nav-glow" className="absolute inset-0 bg-white/10 shadow-[inset_0_0_12px_rgba(255,255,255,0.1)] border border-white/20 rounded-full z-0" transition={{ type: 'spring', stiffness: 300, damping: 25 }} />}
                  <span className="relative z-10 flex items-center gap-1.5 sm:gap-2" style={activeStyle}>
                    <sec.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={activeStyle} />
                    {getNavLabel(sec)}
                  </span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={onToggleAudience}
              className={`relative shrink-0 ${navItemPaddingClass} py-2 rounded-full text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                audienceMode === 'merchant'
                  ? 'text-[#38BDF8] border border-[#38BDF8]/40 bg-[#38BDF8]/10'
                  : 'text-[#FF7043] border border-[#FF7043]/40 bg-[#FF7043]/10'
              }`}
            >
              <span className="relative z-10">{audienceToggleLabel}</span>
            </button>
            </div>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isNavigating && (
          <motion.div
            className="fixed inset-0 z-[60] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-[#050811]/20 backdrop-blur-[1.5px]" />
            <motion.div
              className="absolute top-[78px] sm:top-[92px] left-1/2 -translate-x-1/2 px-4 sm:px-5 py-2.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl shadow-[0_10px_28px_rgba(0,0,0,0.35)] flex items-center gap-2.5"
              initial={{ y: -10, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              <LoaderCircle size={15} className="text-[#FF8A3D] animate-spin" />
              <span className="text-[12px] font-bold tracking-wide text-white/90">
                {targetLabel ? `${targetLabel} hazırlanıyor` : 'Akış hazırlanıyor'}
              </span>
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-[#FF8A3D]"
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
