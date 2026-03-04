'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus, RotateCcw, Store, X } from 'lucide-react'
import { SPATIAL } from '../../constants/spatialData'

const LOGO_URL =
  '/logo.png'
const IYZICO_URL =
  'https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/iyzico-white-bg.png'
const ANDROID_DOWNLOAD_BUTTON_URL =
  'https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/android.png'
const IOS_DOWNLOAD_BUTTON_URL =
  'https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/appios.png'
const HERO_BIG_PHONE_URL =
  'https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/abc.jpg'
const HERO_SMALL_PHONE_URL =
  'https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/abcd.jpg'

type HeroSectionProps = {
  embedded?: boolean
}

export const HeroSection = ({ embedded = false }: HeroSectionProps = {}) => {
  const [activeMockup, setActiveMockup] = useState<{ src: string; alt: string } | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isInteracting, setIsInteracting] = useState(false)
  const viewerRef = useRef<HTMLDivElement | null>(null)
  const zoomRef = useRef(1)
  const panOffsetRef = useRef({ x: 0, y: 0 })
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const gestureRef = useRef<{
    mode: 'none' | 'pan' | 'pinch'
    startScale: number
    startDistance: number
    startOffset: { x: number; y: number }
    startPoint: { x: number; y: number }
    startMidpoint: { x: number; y: number }
  }>({
    mode: 'none',
    startScale: 1,
    startDistance: 0,
    startOffset: { x: 0, y: 0 },
    startPoint: { x: 0, y: 0 },
    startMidpoint: { x: 0, y: 0 },
  })

  const clampZoom = (value: number) => Math.min(4, Math.max(1, value))

  const clampPan = (nextX: number, nextY: number, nextZoom: number) => {
    const viewport = viewerRef.current
    if (!viewport || nextZoom <= 1) return { x: 0, y: 0 }
    const maxX = (viewport.clientWidth * (nextZoom - 1)) / 2
    const maxY = (viewport.clientHeight * (nextZoom - 1)) / 2
    return {
      x: Math.min(maxX, Math.max(-maxX, nextX)),
      y: Math.min(maxY, Math.max(-maxY, nextY)),
    }
  }

  const applyZoom = (nextZoom: number) => {
    const normalizedZoom = clampZoom(nextZoom)
    setZoomLevel(normalizedZoom)
    zoomRef.current = normalizedZoom
    const normalizedPan = clampPan(panOffsetRef.current.x, panOffsetRef.current.y, normalizedZoom)
    setPanOffset(normalizedPan)
    panOffsetRef.current = normalizedPan
  }

  const setPan = (nextX: number, nextY: number, nextZoom: number) => {
    const normalized = clampPan(nextX, nextY, nextZoom)
    setPanOffset(normalized)
    panOffsetRef.current = normalized
  }

  const resetViewer = () => {
    pointersRef.current.clear()
    gestureRef.current.mode = 'none'
    setIsInteracting(false)
    setZoomLevel(1)
    zoomRef.current = 1
    setPanOffset({ x: 0, y: 0 })
    panOffsetRef.current = { x: 0, y: 0 }
  }

  const toLocalPoint = (clientX: number, clientY: number) => {
    const rect = viewerRef.current?.getBoundingClientRect()
    if (!rect) return { x: clientX, y: clientY }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const getDistance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y)

  const getMidpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  })

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!viewerRef.current) return
    viewerRef.current.setPointerCapture(event.pointerId)
    const point = toLocalPoint(event.clientX, event.clientY)
    pointersRef.current.set(event.pointerId, point)

    const points = Array.from(pointersRef.current.values())
    if (points.length >= 2) {
      const [first, second] = points
      gestureRef.current = {
        mode: 'pinch',
        startScale: zoomRef.current,
        startDistance: getDistance(first, second),
        startOffset: panOffsetRef.current,
        startPoint: first,
        startMidpoint: getMidpoint(first, second),
      }
      setIsInteracting(true)
      return
    }

    if (points.length === 1 && zoomRef.current > 1) {
      gestureRef.current = {
        ...gestureRef.current,
        mode: 'pan',
        startPoint: points[0],
        startOffset: panOffsetRef.current,
      }
      setIsInteracting(true)
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, toLocalPoint(event.clientX, event.clientY))
    const points = Array.from(pointersRef.current.values())
    const gesture = gestureRef.current

    if (gesture.mode === 'pinch' && points.length >= 2) {
      const [first, second] = points
      const distance = getDistance(first, second)
      if (!Number.isFinite(distance) || distance <= 0 || gesture.startDistance <= 0) return
      const nextZoom = clampZoom(gesture.startScale * (distance / gesture.startDistance))
      setZoomLevel(nextZoom)
      zoomRef.current = nextZoom
      const midpoint = getMidpoint(first, second)
      const nextX = gesture.startOffset.x + (midpoint.x - gesture.startMidpoint.x)
      const nextY = gesture.startOffset.y + (midpoint.y - gesture.startMidpoint.y)
      setPan(nextX, nextY, nextZoom)
      return
    }

    if (gesture.mode === 'pan' && points.length === 1 && zoomRef.current > 1) {
      const currentPoint = points[0]
      const dx = currentPoint.x - gesture.startPoint.x
      const dy = currentPoint.y - gesture.startPoint.y
      setPan(gesture.startOffset.x + dx, gesture.startOffset.y + dy, zoomRef.current)
    }
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId)
    const points = Array.from(pointersRef.current.values())
    if (points.length >= 2) {
      const [first, second] = points
      gestureRef.current = {
        mode: 'pinch',
        startScale: zoomRef.current,
        startDistance: getDistance(first, second),
        startOffset: panOffsetRef.current,
        startPoint: first,
        startMidpoint: getMidpoint(first, second),
      }
      return
    }
    if (points.length === 1 && zoomRef.current > 1) {
      gestureRef.current = {
        ...gestureRef.current,
        mode: 'pan',
        startPoint: points[0],
        startOffset: panOffsetRef.current,
      }
      return
    }
    gestureRef.current.mode = 'none'
    setIsInteracting(false)
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const deltaFactor = event.deltaY < 0 ? 1.09 : 0.91
    applyZoom(zoomRef.current * deltaFactor)
  }

  const handleDoubleClick = () => {
    applyZoom(zoomRef.current > 1.6 ? 1 : 2.2)
  }

  useEffect(() => {
    if (!activeMockup) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    resetViewer()
    return () => {
      document.body.style.overflow = prevOverflow
      pointersRef.current.clear()
      gestureRef.current.mode = 'none'
      setIsInteracting(false)
    }
  }, [activeMockup])

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveMockup(null)
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [])

  return (
    <section
      id="hero"
      className={`flex flex-col items-center justify-center text-center relative z-10 ${
        embedded
          ? 'min-h-0 px-0 py-0'
          : 'min-h-screen px-4 sm:px-6 pt-24 sm:pt-28 pb-8 lg:pl-32'
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
        className="w-full max-w-[1200px]"
      >
        <div
          className={`rounded-[2rem] sm:rounded-[2.5rem] md:rounded-[3rem] ${
            embedded ? 'p-4 sm:p-5' : 'p-5 sm:p-7 md:p-12'
          } ${SPATIAL.glassContainer} relative ${embedded ? 'overflow-visible' : 'overflow-hidden'}`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-[0.86fr_1.14fr] gap-8 lg:gap-10 items-stretch">
            <div className={`lg:pr-2 flex flex-col min-h-0 ${embedded ? '' : 'lg:min-h-[560px] xl:min-h-[640px]'} pt-[15px]`}>
              <div className="mt-4 md:mt-6 flex flex-col items-center">
                <div className="mb-4 -mt-[7px] flex flex-col items-center">
                  <img
                    src={LOGO_URL}
                    alt="Molayeri Logo"
                    className="h-auto w-[110px] md:w-[150px] object-contain"
                    draggable={false}
                  />
                  <span className="mt-1 block text-center font-mono text-[8px] font-bold tracking-[0.08em] text-[#38BDF8]">
                    {'>_'} Route OS
                  </span>
                </div>

                <div className="relative inline-block">
                  <h1 className="max-w-[340px] text-[clamp(1.55rem,3.6vw,3.25rem)] font-black tracking-tight leading-[0.98] text-center">
                    <span style={{ color: '#FFB36B' }}>
                      Rota
                    </span>
                    <br />
                    <span
                      style={{
                        color: '#FF5A1F',
                        textShadow: 'none',
                        WebkitTextStroke: '0.5px rgba(120,35,10,0.32)',
                      }}
                    >
                      İşletim{'\u00A0'}Sistemi
                    </span>
                  </h1>

                </div>
              </div>

              <p
                className="mt-4 max-w-[390px] mx-auto text-[14px] md:text-[15px] leading-relaxed font-semibold text-white/88 text-center"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Keşiften tahsilata kusursuz bir akış. MolaYeri; hareket halindeki kullanıcıyla, onu bekleyen işletmeyi tek bir dijital köprüde birleştirir.
                İhtiyaç anında fırsatlar saniyeler içinde ekrana düşer, ödemeler pürüzsüzce tamamlanır. Sokağın ve otoyolun ritmi artık aynı frekansta atıyor.
              </p>

              <Link
                href="/register/business"
                className="mt-[10px] inline-flex self-center h-8 items-center gap-1.5 rounded-[9px] border border-[#364255] bg-[linear-gradient(180deg,#161a21_0%,#0f1319_100%)] px-3 text-[9px] font-mono font-semibold uppercase tracking-[0.14em] text-[#f8fbff] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_14px_rgba(56,189,248,0.14)] transition-colors hover:border-[#4d5f7a] hover:text-[#e3f6ff] lg:hidden"
              >
                <Store className="h-3 w-3 text-[#5ad6ff] drop-shadow-[0_0_6px_rgba(90,214,255,0.45)]" />
                <span className="text-[#f8fbff] drop-shadow-[0_0_8px_rgba(90,214,255,0.3)]">İşletme Ekle</span>
              </Link>

              <div className="mt-auto pb-[15px] hidden lg:flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="overflow-hidden rounded-[9px]">
                    <img
                      src={ANDROID_DOWNLOAD_BUTTON_URL}
                      alt="Google Play'den indir"
                      className="h-auto w-[122px] md:w-[148px] object-contain scale-[1.01]"
                      draggable={false}
                    />
                  </div>
                  <div className="overflow-hidden rounded-[9px]">
                    <img
                      src={IOS_DOWNLOAD_BUTTON_URL}
                      alt="App Store'dan indir"
                      className="h-auto w-[122px] md:w-[148px] object-contain scale-[1.01]"
                      draggable={false}
                    />
                  </div>
                </div>

                <Link
                  href="/register/business"
                  className="inline-flex self-start h-8 items-center gap-1.5 rounded-[9px] border border-[#364255] bg-[linear-gradient(180deg,#161a21_0%,#0f1319_100%)] px-3 text-[9px] font-mono font-semibold uppercase tracking-[0.14em] text-[#f8fbff] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_14px_rgba(56,189,248,0.14)] transition-colors hover:border-[#4d5f7a] hover:text-[#e3f6ff]"
                >
                  <Store className="h-3 w-3 text-[#5ad6ff] drop-shadow-[0_0_6px_rgba(90,214,255,0.45)]" />
                  <span className="text-[#f8fbff] drop-shadow-[0_0_8px_rgba(90,214,255,0.3)]">İşletme Ekle</span>
                </Link>
              </div>
            </div>

            <div className={`lg:hidden mt-[10px] w-full max-w-[460px] mx-auto ${embedded ? 'pt-2' : ''}`}>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 items-end">
                <button
                  type="button"
                  onClick={() => setActiveMockup({ src: HERO_BIG_PHONE_URL, alt: 'Molayeri büyük telefon mockup' })}
                  className="rounded-[22px] border-[4px] border-[#07090D] bg-[#030406] shadow-[0_18px_40px_rgba(0,0,0,0.58)] overflow-hidden aspect-[9/19] cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-white/25"
                >
                  <img
                    src={HERO_BIG_PHONE_URL}
                    alt="Molayeri büyük telefon mockup"
                    className="w-full h-full object-contain"
                    style={{ objectPosition: 'center center' }}
                    draggable={false}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMockup({ src: HERO_SMALL_PHONE_URL, alt: 'Molayeri küçük telefon mockup' })}
                  className="rounded-[22px] border-[4px] border-[#080A0F] bg-[#040507] shadow-[0_16px_36px_rgba(0,0,0,0.52)] overflow-hidden aspect-[9/19] cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-white/25"
                >
                  <img
                    src={HERO_SMALL_PHONE_URL}
                    alt="Molayeri küçük telefon mockup"
                    className="w-full h-full object-contain"
                    style={{ objectPosition: 'center center' }}
                    draggable={false}
                  />
                </button>
              </div>
              <p className="mt-2 text-[7px] font-medium leading-[1.2] text-white/55 text-center">
                *Gerçek uygulama arayüzü, İşletmeler deneme amaçlıdır
              </p>
              <div className="mt-[13px] inline-flex items-center gap-2">
                <img
                  src={IYZICO_URL}
                  alt="iyzico"
                  className="h-5 w-auto object-contain rounded-[3px] border border-white/15 bg-white/92 px-1 py-[1px] shadow-none"
                  draggable={false}
                />
                <span className="text-[10px] font-semibold text-white/80 tracking-wide">ile güvenli ödeme</span>
              </div>
              <div className="mt-3 flex items-center justify-center gap-2.5">
                <div className="overflow-hidden rounded-[9px]">
                  <img
                    src={ANDROID_DOWNLOAD_BUTTON_URL}
                    alt="Google Play'den indir"
                    className="h-auto w-[122px] object-contain scale-[1.01]"
                    draggable={false}
                  />
                </div>
                <div className="overflow-hidden rounded-[9px]">
                  <img
                    src={IOS_DOWNLOAD_BUTTON_URL}
                    alt="App Store'dan indir"
                    className="h-auto w-[122px] object-contain scale-[1.01]"
                    draggable={false}
                  />
                </div>
              </div>
            </div>

            <div className="hidden lg:block relative mx-auto lg:ml-auto lg:mr-0 w-full max-w-[360px] sm:max-w-[460px] md:max-w-[620px] h-[360px] sm:h-[500px] md:h-[640px]">
              <motion.div
                initial={{ opacity: 0, x: 20, y: 20 }}
                animate={{ opacity: 0.88, x: 0, y: 0 }}
                transition={{ duration: 0.7, delay: 0.12 }}
                className="absolute z-10 right-0 sm:right-[20px] md:right-[30px] top-6 sm:top-10"
              >
                <button
                  type="button"
                  onClick={() => setActiveMockup({ src: HERO_SMALL_PHONE_URL, alt: 'Molayeri küçük telefon mockup' })}
                  className="w-[150px] sm:w-[210px] md:w-[270px] h-[300px] sm:h-[420px] md:h-[540px] rounded-[28px] sm:rounded-[34px] md:rounded-[40px] border-[4px] sm:border-[5px] md:border-[6px] border-[#080A0F] bg-[#040507] shadow-[0_24px_56px_rgba(0,0,0,0.68)] overflow-hidden cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-white/25"
                >
                  <img
                    src={HERO_SMALL_PHONE_URL}
                    alt="Molayeri küçük telefon mockup"
                    className="w-full h-full object-contain"
                    style={{ objectPosition: 'center center' }}
                    draggable={false}
                  />
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 22, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.85, delay: 0.04 }}
                className="absolute right-[120px] sm:right-[190px] md:right-[250px] top-0 z-20"
              >
                <button
                  type="button"
                  onClick={() => setActiveMockup({ src: HERO_BIG_PHONE_URL, alt: 'Molayeri büyük telefon mockup' })}
                  className="w-[165px] sm:w-[240px] md:w-[290px] h-[330px] sm:h-[490px] md:h-[590px] rounded-[30px] sm:rounded-[38px] md:rounded-[44px] border-[5px] sm:border-[6px] md:border-[7px] border-[#07090D] bg-[#030406] shadow-[0_36px_86px_rgba(0,0,0,0.78)] overflow-hidden cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-white/25"
                >
                  <img
                    src={HERO_BIG_PHONE_URL}
                    alt="Molayeri büyük telefon mockup"
                    className="w-full h-full object-contain"
                    style={{ objectPosition: 'center center' }}
                    draggable={false}
                  />
                </button>
              </motion.div>

              <div className="absolute bottom-2 left-1/2 z-30 -translate-x-1/2 flex flex-col items-center gap-1">
                <p className="whitespace-nowrap text-[7px] font-medium text-white/55">
                  *Gerçek uygulama arayüzü, İşletmeler deneme amaçlıdır
                </p>
                <div className="mt-[5px] inline-flex items-center gap-1.5">
                  <img
                    src={IYZICO_URL}
                    alt="iyzico"
                    className="h-[18px] w-auto object-contain rounded-[3px] border border-white/15 bg-white/92 px-1 py-[1px] shadow-none"
                    draggable={false}
                  />
                  <span className="text-[9px] font-semibold text-white/80 tracking-wide">ile güvenli ödeme</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {activeMockup && (
          <motion.div
            className="fixed inset-0 z-[90] bg-[#020409]/82 backdrop-blur-md px-3 py-4 sm:px-6 sm:py-8 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveMockup(null)}
          >
            <motion.div
              className="relative w-full max-w-[980px] rounded-[24px] border border-white/15 bg-[#050811]/94 shadow-[0_30px_90px_rgba(0,0,0,0.78)] overflow-hidden"
              initial={{ scale: 0.97, opacity: 0.7, y: 12 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0.7, y: 8 }}
              transition={{ duration: 0.22 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="h-11 border-b border-white/12 bg-white/[0.03] px-3 sm:px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#38BDF8]" />
                  <span className="text-[11px] font-semibold tracking-wide text-white/75">Canlı Önizleme</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyZoom(zoomRef.current * 0.9)}
                    className="h-7 w-7 rounded-md border border-white/15 bg-black/25 text-white/80 inline-flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                    aria-label="Küçült"
                  >
                    <Minus size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={resetViewer}
                    className="h-7 w-7 rounded-md border border-white/15 bg-black/25 text-white/80 inline-flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                    aria-label="Sıfırla"
                  >
                    <RotateCcw size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyZoom(zoomRef.current * 1.1)}
                    className="h-7 w-7 rounded-md border border-white/15 bg-black/25 text-white/80 inline-flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                    aria-label="Büyüt"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMockup(null)}
                    className="ml-1 h-8 w-8 rounded-lg border border-white/20 bg-black/40 text-white inline-flex items-center justify-center shadow-[0_8px_18px_rgba(0,0,0,0.45)] hover:bg-white/[0.08] transition-colors"
                    aria-label="Kapat"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div
                ref={viewerRef}
                className="relative h-[76vh] sm:h-[80vh] max-h-[860px] overflow-hidden bg-[radial-gradient(circle_at_50%_40%,rgba(56,189,248,0.08),rgba(2,6,23,0.84)_62%)]"
                onWheel={handleWheel}
                onDoubleClick={handleDoubleClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ touchAction: zoomLevel > 1 ? 'none' : 'manipulation' }}
              >
                <img
                  src={activeMockup.src}
                  alt={activeMockup.alt}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-h-[94%] max-w-[94%] w-auto h-auto object-contain select-none"
                  style={{
                    transform: `translate(calc(-50% + ${panOffset.x}px), calc(-50% + ${panOffset.y}px)) scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                    transition: isInteracting ? 'none' : 'transform 160ms ease-out',
                  }}
                  draggable={false}
                />
                <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/12 bg-black/40 px-3 py-1 text-[10px] font-semibold text-white/70 backdrop-blur-md">
                  Pinch / Çift dokunma ile büyüt · Sürükle
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveMockup(null)}
                className="sr-only"
                aria-label="Kapat"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
