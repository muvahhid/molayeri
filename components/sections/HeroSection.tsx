'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { LogIn, Store } from 'lucide-react'
import { SPATIAL } from '../../constants/spatialData'

const LOGO_URL =
  'https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/logo.png'
const IYZICO_URL =
  'https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/iyzico-white-bg.png'
const DOWNLOAD_LOGO_URL =
  'https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/indirmelogo.png'
const HERO_BIG_PHONE_URL =
  'https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/1.heic?v=front'
const HERO_SMALL_PHONE_URL =
  'https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/IMG_9425.HEIC?v=back'

export const HeroSection = () => (
  <section
    id="hero"
    className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-8 lg:pl-32 relative z-10"
  >
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9 }}
      className="w-full max-w-[1200px]"
    >
      <div className={`rounded-[3rem] p-8 md:p-12 ${SPATIAL.glassContainer} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-[0.86fr_1.14fr] gap-8 lg:gap-10 items-stretch">
          <div className="lg:pr-2 flex flex-col min-h-[560px] md:min-h-[640px] pt-[15px]">
            <div className="mt-4 md:mt-6 flex flex-col items-center">
              <img
                src={LOGO_URL}
                alt="Molayeri Logo"
                className="h-auto w-[110px] md:w-[150px] object-contain mb-4 -mt-[7px]"
                draggable={false}
              />

              <h1 className="max-w-[340px] text-[clamp(1.55rem,3.6vw,3.25rem)] font-black tracking-tight leading-[0.98] text-center">
                <span style={{ color: '#FFB36B' }}>
                  Yol İşletim
                </span>
                <br />
                <span
                  style={{
                    color: '#FF5A1F',
                    textShadow: 'none',
                    WebkitTextStroke: '0.5px rgba(120,35,10,0.32)',
                  }}
                >
                  Sistemi
                </span>
              </h1>
            </div>

            <p
              className="mt-4 max-w-[390px] mx-auto text-[14px] md:text-[15px] leading-relaxed font-semibold text-white/88 text-center"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Molayeri, keşif, iletişim ve ödeme akışını tek bir yüksek güven deneyiminde birleştirir.
              Sürücü ve işletme aynı ritimde hareket eder.
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
                  className="h-8 w-auto object-contain rounded-md bg-white/95 px-2 py-1"
                  draggable={false}
                />
                <span className="text-[12px] md:text-[13px] font-bold text-white/75 tracking-wide">
                  iyzico ile güvenli ödeme
                </span>
              </div>

              <a
                href="mailto:iletisim@molayeri.app"
                className="mt-[10px] inline-flex w-fit text-[13px] md:text-[14px] font-semibold text-white/85 hover:text-white transition-colors"
              >
                iletisim@molayeri.app
              </a>
            </div>
          </div>

          <div className="relative mx-auto lg:ml-auto lg:mr-0 w-[520px] md:w-[620px] h-[560px] md:h-[640px]">
            <motion.div
              initial={{ opacity: 0, x: 20, y: 20 }}
              animate={{ opacity: 0.88, x: 0, y: 0 }}
              transition={{ duration: 0.7, delay: 0.12 }}
              className="absolute z-10 right-[20px] md:right-[30px] top-10"
            >
              <div className="w-[245px] md:w-[270px] h-[500px] md:h-[540px] rounded-[40px] border-[6px] border-[#080A0F] bg-[#040507] shadow-[0_24px_56px_rgba(0,0,0,0.68)] overflow-hidden">
                <img
                  src={HERO_SMALL_PHONE_URL}
                  alt="Molayeri küçük telefon mockup"
                  className="w-full h-full object-contain"
                  style={{ objectPosition: 'center center' }}
                  draggable={false}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.85, delay: 0.04 }}
              className="absolute right-[220px] md:right-[250px] top-0 z-20"
            >
              <div className="w-[260px] md:w-[290px] h-[530px] md:h-[590px] rounded-[44px] border-[7px] border-[#07090D] bg-[#030406] shadow-[0_36px_86px_rgba(0,0,0,0.78)] overflow-hidden">
                <img
                  src={HERO_BIG_PHONE_URL}
                  alt="Molayeri büyük telefon mockup"
                  className="w-full h-full object-contain"
                  style={{ objectPosition: 'center center' }}
                  draggable={false}
                />
              </div>
            </motion.div>

            <p
              className="absolute -bottom-2 left-1/2 -translate-x-[47%] w-full text-center text-[12px] font-medium tracking-wide"
              style={{ color: '#FF6A2A' }}
            >
              *İşletmeler Örnektir, Gerçek Uygulama Görüntüleri Kullanılmıştır
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/register/business"
          className="group inline-flex h-12 items-center gap-2.5 rounded-2xl border border-[#FF7043]/70 bg-[#1F1412] px-6 text-[14px] md:text-[15px] font-extrabold text-[#FFE6DA] transition hover:bg-[#2A1714] hover:text-white"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FF7043]/20 border border-[#FF7043]/55">
            <Store className="h-4 w-4 text-[#FFD9C8] group-hover:text-white" />
          </span>
          İşletmeni Kaydet
        </Link>
        <Link
          href="/login"
          className="group inline-flex h-12 items-center gap-2.5 rounded-2xl border border-[#6EA8FF]/65 bg-[#121B2B] px-6 text-[14px] md:text-[15px] font-extrabold text-[#E6F0FF] transition hover:bg-[#19253A] hover:text-white"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#4D72BA]/22 border border-[#6EA8FF]/55">
            <LogIn className="h-4 w-4 text-[#D8E7FF] group-hover:text-white" />
          </span>
          Yönetici Girişi
        </Link>
      </div>
    </motion.div>
  </section>
)
