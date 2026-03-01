'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  QrCode,
  CreditCard,
  Tag,
  ShieldCheck,
  Sparkles,
  MapPin,
  BellRing,
  Gift,
  BookmarkPlus,
  ArrowDown,
  CheckCircle2,
  Lock,
} from 'lucide-react'

type NotificationItem = {
  id: string
  type: 'bookmark' | 'radar' | 'offer'
  title: string
  desc: string
}

type HeroTitleBlockProps = {
  title1: string
  title2: string
  subtitle: string
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  color: string
  centered?: boolean
}

const HeroTitleBlock = ({ title1, title2, subtitle, icon: Icon, color, centered = false }: HeroTitleBlockProps) => (
  <div className={`relative z-10 flex max-w-[42rem] flex-col gap-5 ${centered ? 'items-center text-center' : 'items-start text-left'}`}>
    <div className="relative rounded-[20px] border border-white/12 bg-white/[0.02] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
      <Icon size={34} style={{ color }} className="relative z-10" />
      <div className="absolute inset-0 rounded-[20px] blur-2xl opacity-10" style={{ backgroundColor: color }} />
    </div>

    <h2 className="text-[2.45rem] leading-[1.06] tracking-tight lg:text-[3.2rem] font-semibold">
      <span className="font-bold text-[#F3F8FF]">{title1}</span>
      <br />
      <span style={{ color }} className="font-bold">{title2}</span>
    </h2>

    <p className="mt-1 max-w-[38rem] text-[16px] font-medium leading-relaxed text-[#DCEBFF]">{subtitle}</p>
  </div>
)

export const WalletFeature = ({ activeIndex = 0 }: { activeIndex?: number }) => {
  const colors = {
    cyan: '#7DD3FC',
    blue: '#93C5FD',
    orange: '#FDBA74',
  }

  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  useEffect(() => {
    if (activeIndex === 2) {
      const reset = setTimeout(() => setNotifications([]), 0)

      const t1 = setTimeout(() => {
        setNotifications((prev) => [
          ...prev,
          { id: 'n1', type: 'bookmark', title: 'Mola Yerlerine Eklendi', desc: 'Tesis rotanıza işlendi.' },
        ])
      }, 800)

      const t2 = setTimeout(() => {
        setNotifications((prev) => [
          ...prev,
          { id: 'n2', type: 'radar', title: 'Yaklaşıyorsun!', desc: '15 KM kaldı. Mola ister misin?' },
        ])
      }, 3500)

      const t3 = setTimeout(() => {
        setNotifications((prev) => [
          ...prev,
          { id: 'n3', type: 'offer', title: 'Özel Teklif Geldi', desc: '%10 İndirim cüzdanına eklendi.' },
        ])
      }, 6500)

      return () => {
        clearTimeout(reset)
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    }
    return undefined
  }, [activeIndex])

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-transparent p-6 lg:p-12">
      <div className="pointer-events-none absolute left-1/2 top-[47%] z-0 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1E88E5]/[0.018] blur-[170px]" />
      <div className="pointer-events-none absolute bottom-[8%] right-[14%] z-0 h-[46%] w-[46%] rounded-full bg-[#FF7043]/[0.014] blur-[155px]" />

      <AnimatePresence mode="wait">
        {activeIndex === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.45 }}
            className="z-10 flex w-full max-w-6xl flex-col items-center justify-center gap-10"
          >
            <div className="relative mx-auto h-[360px] w-full max-w-[460px]">
              <motion.div
                animate={{ y: [-8, 8, -8], rotateY: [-4, 4, -4], rotateX: [1.5, -1.5, 1.5] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute right-4 top-7 z-10 h-[176px] w-[285px] rounded-[20px] border border-white/14 p-5 shadow-[0_28px_56px_rgba(0,0,0,0.45)] overflow-hidden sm:right-8 sm:w-[300px]"
                style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' }}
              >
                <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-white/5 blur-3xl" />
                <div className="relative z-10 flex items-start justify-between">
                  <div className="h-7 w-10 rounded-md bg-gray-300/20" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white">Mastercard</span>
                </div>
                <div className="relative z-10 mb-3 mt-auto text-lg font-mono tracking-[3px] text-white">•••• •••• •••• 4242</div>
                <div className="relative z-10 flex items-end justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="h-6 w-6 rounded-full bg-red-500/85 mix-blend-screen" />
                    <div className="-ml-3 h-6 w-6 rounded-full bg-yellow-500/85 mix-blend-screen" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [8, -8, 8], rotateY: [4, -4, 4], rotateX: [-1.5, 1.5, -1.5] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute bottom-7 left-4 z-20 h-[192px] w-[300px] rounded-[22px] border border-white/24 p-6 shadow-[0_34px_68px_rgba(0,0,0,0.62)] backdrop-blur-md overflow-hidden sm:left-8 sm:w-[320px]"
                style={{ background: 'linear-gradient(135deg, rgba(2,62,138,0.32) 0%, rgba(5,8,17,0.82) 100%)' }}
              >
                <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-[#00B4D8]/12 blur-3xl" />
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex h-8 w-12 items-center justify-center rounded-md border border-white/10 bg-white/10">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <Lock size={19} className="text-white/70" />
                </div>
                <div className="relative z-10 mb-4 mt-auto text-[1.45rem] font-mono tracking-[4px] text-white drop-shadow-md">5400 •••• •••• 9084</div>
                <div className="relative z-10 flex items-end justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white">KART SAHİBİ</span>
                    <span className="text-[13px] font-bold tracking-wider text-white">YOLCU</span>
                  </div>
                  <span className="text-[15px] font-black italic tracking-widest text-white">VISA</span>
                </div>
              </motion.div>
            </div>

            <HeroTitleBlock
              centered
              icon={Wallet}
              color={colors.cyan}
              title1="Tüm Cüzdanınız."
              title2="Tek Panelde."
              subtitle="Kayıtlı banka kartlarınız ve kazandığınız tüm indirimler tek bir güvenli arayüzde. Kasada fiziksel cüzdan arama devri bitiyor."
            />

            <div className="inline-flex items-center gap-3 rounded-full border border-white/16 bg-white/[0.03] px-4 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
              <img
                src="https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/iyzico-white-bg.png"
                alt="iyzico"
                className="h-6 w-auto"
              />
              <span className="text-[12px] font-semibold text-[#D9EEFF] tracking-wide">güvencesiyle korunur</span>
            </div>
          </motion.div>
        )}

        {activeIndex === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.45 }}
            className="z-10 grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2"
          >
            <div className="flex flex-col gap-7">
              <HeroTitleBlock
                icon={QrCode}
                color={colors.blue}
                title1="Ödeme ve Kupon."
                title2="Sihirli Tek QR."
                subtitle="Kasadaki işlemleri hızlandırıyoruz. Ödeme yönteminiz ve indirim kuponunuz iyzico güvencesiyle tek bir koda dönüşür."
              />
              <div className="flex w-full max-w-[26rem] items-center gap-4 rounded-[18px] border border-white/14 bg-white/[0.03] p-4 shadow-[0_12px_26px_rgba(0,0,0,0.28)]">
                <ShieldCheck size={28} className="text-[#8EC5FF]" />
                <div>
                  <span className="block text-[14px] font-bold tracking-wide text-white">iyzico Korumalı Ödeme</span>
                  <span className="text-xs font-medium text-[#D8E7F9]">Uçtan uca şifreli altyapı</span>
                </div>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[360px] flex-col items-center justify-center gap-4">
              <div className="flex w-full gap-3">
                <motion.div initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-1 flex-col items-center gap-2 rounded-[18px] border border-white/14 bg-white/[0.04] p-4 text-center shadow-[0_12px_24px_rgba(0,0,0,0.24)]">
                  <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#1E88E5]/16">
                    <CreditCard size={19} className="text-[#8EC5FF]" />
                  </div>
                  <span className="text-[9px] font-black tracking-widest text-[#D5E6FB]">ÖDEME KARTI</span>
                  <span className="text-[13px] font-bold text-[#F1F7FF]">VISA 9084</span>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="flex flex-1 flex-col items-center gap-2 rounded-[18px] border border-white/14 bg-white/[0.04] p-4 text-center shadow-[0_12px_24px_rgba(0,0,0,0.24)]">
                  <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#FF7043]/16">
                    <Tag size={19} className="text-[#FFC49E]" />
                  </div>
                  <span className="text-[9px] font-black tracking-widest text-[#D5E6FB]">AKTİF KUPON</span>
                  <span className="text-[13px] font-bold text-[#FFE0CE]">%10 İndirim</span>
                </motion.div>
              </div>

              <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity }} className="my-0.5 flex h-8 items-center justify-center">
                <ArrowDown size={26} className="text-white/30" />
              </motion.div>

              <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 }} className="relative rounded-[32px] border-[10px] border-[#050811] bg-white p-6 shadow-[0_0_42px_rgba(30,136,229,0.14)]">
                <div className="grid h-40 w-40 grid-cols-5 grid-rows-5 gap-1.5 opacity-92">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div key={`qr-${i}`} className={`rounded-md ${(i % 2 === 0 || i % 3 === 0) ? 'bg-[#050811]' : 'bg-[#050811]/20'}`} />
                  ))}
                </div>
                <div className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[#1E88E5] px-5 py-2.5 text-[11px] font-black tracking-widest text-white shadow-xl">
                  <CheckCircle2 size={14} /> GÜVENLİ QR
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {activeIndex === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.45 }}
            className="z-10 grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2"
          >
            <HeroTitleBlock
              icon={MapPin}
              color={colors.orange}
              title1="Mola Yerlerim."
              title2="Akıllı Fırsatlar."
              subtitle="Favori tesislerinizi kaydedin. Güzergah üzerinde yaklaştığınız an, size özel teklifler doğrudan ekranınıza düşsün."
            />

            <div className="relative mx-auto flex h-[410px] w-full max-w-[410px] flex-col justify-center">
              <div className="absolute bottom-10 left-10 top-10 z-0 w-px bg-gradient-to-b from-white/18 to-transparent" />

              <div className="z-10 flex w-full flex-col gap-5">
                <AnimatePresence>
                  {notifications.map((n) => {
                    const isOffer = n.type === 'offer'
                    const isRadar = n.type === 'radar'
                    const iconColor = isOffer ? colors.orange : isRadar ? colors.blue : '#C4D0DF'
                    const bgGlow = isOffer ? 'bg-[#FF7043]/10 border-[#FF7043]/30' : 'bg-[#1A2438]/75 border-white/12'
                    const IconComp = n.type === 'bookmark' ? BookmarkPlus : n.type === 'radar' ? BellRing : Gift

                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: 24, scale: 0.96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                        className={`flex w-full items-center gap-4 rounded-[20px] border p-4 shadow-[0_12px_24px_rgba(0,0,0,0.24)] ${bgGlow}`}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/6 shadow-inner">
                          <IconComp size={20} style={{ color: iconColor }} />
                        </div>
                        <div className="flex flex-col">
                          <span className="mb-0.5 text-[15px] font-bold tracking-wide text-white">{n.title}</span>
                          <span className="text-[13px] font-medium text-[#DCEBFF]">{n.desc}</span>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
