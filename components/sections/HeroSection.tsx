'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Store, X } from 'lucide-react'
import { SPATIAL } from '../../constants/spatialData'

const LOGO_URL =
  '/logo.png'
const IYZICO_URL =
  'https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/iyzico-white-bg.png'
const DOWNLOAD_LOGO_URL =
  'https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/indirmelogo.png'
const HERO_BIG_PHONE_URL =
  'https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/abc.jpg'
const HERO_SMALL_PHONE_URL =
  'https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/abcd.jpg'

type HeroSectionProps = {
  embedded?: boolean
}

export const HeroSection = ({ embedded = false }: HeroSectionProps = {}) => {
  const [activeMockup, setActiveMockup] = useState<{ src: string; alt: string } | null>(null)

  useEffect(() => {
    if (!activeMockup) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
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

              <div className="mt-auto pb-[15px] flex flex-col gap-4">
                <div>
                  <img
                    src={DOWNLOAD_LOGO_URL}
                    alt="Uygulamayı İndir"
                    className="h-auto w-[126px] md:w-[154px] object-contain"
                    draggable={false}
                  />
                </div>

                <div className="flex items-center gap-2.5">
                  <img
                    src={IYZICO_URL}
                    alt="iyzico"
                    className="h-7 w-auto object-contain rounded-[4px] border border-white/20 bg-white/90 px-1.5 py-0.5 shadow-none"
                    draggable={false}
                  />
                  <span className="text-[12px] md:text-[13px] font-bold text-white/75 tracking-wide">
                    iyzico ile güvenli ödeme
                  </span>
                </div>

                <Link
                  href="/register/business"
                  className="mt-[10px] h-10 pl-3 pr-[5px] rounded-[12px] text-[12px] md:text-[13px] font-extrabold tracking-wide border border-[#52FF9D]/55 bg-[linear-gradient(135deg,rgba(30,255,140,0.24),rgba(15,120,74,0.14))] inline-flex items-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] hover:brightness-110 transition-all w-fit self-start"
                  style={{ color: '#52FF9D', WebkitTextFillColor: '#52FF9D' }}
                >
                  <Store size={15} />
                  İşletmeni Ekle
                </Link>
              </div>
            </div>

            <div className={`lg:hidden w-full max-w-[460px] mx-auto ${embedded ? 'pt-2' : ''}`}>
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

              <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[7px] font-medium text-white/55">
                *Gerçek uygulama arayüzü, İşletmeler deneme amaçlıdır
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {activeMockup && (
          <motion.div
            className="fixed inset-0 z-[90] bg-black/72 backdrop-blur-md px-4 py-6 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveMockup(null)}
          >
            <motion.div
              className="relative rounded-[26px] border border-white/20 bg-[#050811]/90 p-3 shadow-[0_28px_80px_rgba(0,0,0,0.75)]"
              initial={{ scale: 0.94, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0.7 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setActiveMockup(null)}
                className="absolute -top-3 -right-3 h-9 w-9 rounded-full border border-white/25 bg-black/70 text-white inline-flex items-center justify-center shadow-[0_8px_18px_rgba(0,0,0,0.45)]"
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
              <img
                src={activeMockup.src}
                alt={activeMockup.alt}
                className="block max-h-[86vh] max-w-[92vw] w-auto h-auto object-contain rounded-[20px]"
                draggable={false}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
