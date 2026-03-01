'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mic2, Radio, Users, MapPin, 
  Volume2, MessageCircle, Truck, Wrench, 
  Fuel, Coffee, Tag, CheckCircle2, Navigation
} from 'lucide-react'

// DÜZELTME BURADA: "export const" yerine "export default function" kullanıldı.
export default function LongHaulFeature({ activeIndex = 0 }: { activeIndex?: number }) {
  // Uygulamanın Orijinal Dart Renkleri
  const colors = {
    lhPanel: '#131D30',
    lhInfo: '#42A5F5',     
    lhAccent: '#FF7043',   
    lhOk: '#22C55E',       
    bgGlow: '#42A5F5'
  }

  const [isSpeaking, setIsSpeaking] = useState(false)
  const stepShellClass =
    'w-full max-w-6xl min-h-[700px] grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center z-10'
  const phoneShellClass =
    'w-full max-w-[360px] lg:min-w-[360px] lg:max-w-[360px] h-[640px] bg-[#0F172A] rounded-[44px] border-[10px] border-[#1E293B] shadow-[0_42px_80px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden relative shrink-0'
  const stepMotion = {
    initial: { opacity: 0, y: 20, scale: 0.985, filter: 'blur(12px)' },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -14, scale: 0.99, filter: 'blur(10px)' },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }
  
  useEffect(() => {
    if (activeIndex === 1) {
      const interval = setInterval(() => setIsSpeaking(prev => !prev), 1200)
      return () => clearInterval(interval)
    }
  }, [activeIndex])

  const HeroTitleBlock = ({ title1, title2, subtitle, icon: Icon, color, compact = false }: any) => (
    <div className="flex flex-col items-start gap-5 max-w-[42rem] min-h-[250px] z-10 relative">
      <div className="p-4 rounded-[20px] bg-white/[0.04] border border-white/12 shadow-[0_12px_30px_rgba(0,0,0,0.28)] relative">
        <Icon size={34} style={{ color }} className="relative z-10" />
        <div className="absolute inset-0 rounded-[20px] blur-2xl opacity-10" style={{ backgroundColor: color }} />
      </div>
      <h2 className={`${compact ? 'text-[1.85rem] lg:text-[2.4rem]' : 'text-[2.45rem] lg:text-[3.2rem]'} font-semibold text-white leading-[1.06] tracking-tight`}>
        <span className="font-bold text-[#F3F8FF]">{title1}</span> <br />
        <span className="font-bold" style={{ color }}>{title2}</span>
      </h2>
      <p className="text-[#DCEBFF] text-[16px] font-bold leading-relaxed mt-1 max-w-[38rem]">
        {subtitle}
      </p>
    </div>
  )

  return (
    <div className="w-full h-full p-6 lg:p-12 flex items-center justify-center relative overflow-hidden bg-transparent font-sans">
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#42A5F5]/5 blur-[150px] rounded-full pointer-events-none z-0" />

      <AnimatePresence mode="wait">
        
        {/* ========================================================= */}
        {/* ADIM 0: SESLİ SOHBET ODALARI */}
        {/* ========================================================= */}
        {activeIndex === 0 && (
          <motion.div 
            key="step0"
            initial={stepMotion.initial}
            animate={stepMotion.animate}
            exit={stepMotion.exit}
            transition={stepMotion.transition}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Radio} color={colors.lhInfo}
              title1="Sesli Sohbet" title2="Odaları."
              subtitle="Sabit ve dinamik odalar tek panelde görünür; sürücüler tek dokunuşla sohbete katılır."
            />

            <div className={phoneShellClass}>
              
              <div className="bg-[#131D30] px-4 pt-6 pb-4 border-b border-white/10">
                <span className="text-white font-black text-2xl tracking-tight block mb-4">Uzun Yol</span>
                <div className="flex gap-2">
                  <div className="bg-white/10 border border-white/20 rounded-[12px] px-4 py-2 flex items-center justify-center shadow-inner">
                    <span className="text-[#42A5F5] font-black text-[12px]">Odalar</span>
                  </div>
                  <div className="rounded-[12px] px-4 py-2 flex items-center justify-center opacity-60">
                    <span className="text-white font-bold text-[12px]">Canlı</span>
                  </div>
                  <div className="rounded-[12px] px-4 py-2 flex items-center justify-center opacity-60">
                    <span className="text-white font-bold text-[12px]">Kampanyalar</span>
                  </div>
                </div>
              </div>

              <div className="px-4 py-4 flex gap-2 overflow-hidden">
                <div className="bg-[#42A5F5] rounded-xl px-3 py-1.5 flex items-center shadow-[0_0_15px_rgba(66,165,245,0.4)]">
                  <span className="text-white font-black text-[11px]">Tümü</span>
                </div>
                <div className="bg-white/[0.05] border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                  <Truck size={12} className="text-white/80" />
                  <span className="text-white/80 font-bold text-[11px]">Uzun Araç</span>
                </div>
                <div className="bg-white/[0.05] border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                  <Wrench size={12} className="text-white/80" />
                  <span className="text-white/80 font-bold text-[11px]">Servis</span>
                </div>
              </div>

              <div className="flex-1 px-4 overflow-y-auto pb-6 flex flex-col gap-4">
                <div className="bg-gradient-to-br from-[#1E293B] to-[#131D30] rounded-[24px] p-5 border border-[#42A5F5]/30 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#42A5F5]/10 blur-2xl rounded-full" />
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-white font-black text-[16px]">Kamyoncular Kulübü</span>
                    <span className="bg-[#42A5F5]/20 text-[#42A5F5] border border-[#42A5F5]/40 text-[9px] font-black px-2.5 py-1 rounded-md tracking-widest">SABİT ODA</span>
                  </div>
                  <span className="text-white/80 text-[12px] font-bold block mb-4 relative z-10">Türkiye geneli ağır vasıta kanalı.</span>
                  <div className="flex items-center justify-between mt-auto relative z-10">
                    <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full border border-white/5">
                      <Users size={12} className="text-[#42A5F5]" />
                      <span className="text-white font-bold text-[10px]">145 / 500</span>
                    </div>
                    <button className="bg-[#42A5F5] text-white font-black text-[11px] px-5 py-2.5 rounded-xl shadow-[0_0_15px_rgba(66,165,245,0.4)]">SESE KATIL</button>
                  </div>
                </div>

                <div className="bg-[#131D30] rounded-[24px] p-5 border border-white/10 shadow-lg relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-white font-black text-[16px]">Bolu Dağı Durumu</span>
                  </div>
                  <span className="text-white/80 text-[12px] font-bold block mb-4">Yol durumu ve hava koşulları bilgilendirmesi.</span>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                      <Users size={12} className="text-white/70" />
                      <span className="text-white/90 font-bold text-[10px]">32 / 100</span>
                    </div>
                    <button className="bg-white/10 text-white/90 font-black text-[11px] px-5 py-2.5 rounded-xl border border-white/10">SESE KATIL</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 1: KATILDIĞIM ODA AKIŞI */}
        {/* ========================================================= */}
        {activeIndex === 1 && (
          <motion.div 
            key="step1"
            initial={stepMotion.initial}
            animate={stepMotion.animate}
            exit={stepMotion.exit}
            transition={stepMotion.transition}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Mic2} color={colors.lhOk}
              title1="Katıldığım" title2="Oda Akışı."
              subtitle="Katıldığın odada katılımcı listesi, konuşan durumları ve hızlı ses kontrolü bir arada."
              compact
            />

            <div className={phoneShellClass}>
              <div className="bg-[#131D30] px-4 pt-6 pb-4 border-b border-white/10">
                <span className="text-white font-black text-[16px] tracking-tight block mb-3">Uzun Yol</span>
                <div className="flex gap-2">
                  <div className="rounded-[12px] px-4 py-2 flex items-center justify-center opacity-60">
                    <span className="text-white font-bold text-[11px]">Odalar</span>
                  </div>
                  <div className="bg-white/10 border border-white/20 rounded-[12px] px-4 py-2 flex items-center justify-center shadow-inner">
                    <span className="text-[#22C55E] font-black text-[11px]">Canlı</span>
                  </div>
                  <div className="rounded-[12px] px-4 py-2 flex items-center justify-center opacity-60">
                    <span className="text-white font-bold text-[11px]">Kampanyalar</span>
                  </div>
                </div>
              </div>

              <div className="p-4 flex flex-col h-full">
                <div className="bg-gradient-to-br from-[#1E293B] to-[#131D30] rounded-[24px] p-4 border border-[#22C55E]/30 shadow-lg relative overflow-hidden mb-4">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#22C55E]/10 blur-3xl rounded-full" />
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div>
                      <span className="text-white font-black text-[17px] leading-tight block mb-1 truncate">Kamyoncular Kulübü</span>
                      <span className="text-[#22C55E] text-[10px] font-bold">Canlı ses bağlantısı aktif</span>
                    </div>
                  </div>
                  <div className="flex gap-3 relative z-10">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-[16px] py-3.5 flex flex-col items-center justify-center gap-1 shadow-inner cursor-pointer hover:bg-white/10 transition-colors">
                      <Mic2 size={20} className="text-[#22C55E]" />
                      <span className="text-white font-bold text-[10px]">Mikrofon Açık</span>
                    </div>
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-[16px] py-3.5 flex flex-col items-center justify-center gap-1 shadow-inner cursor-pointer hover:bg-white/10 transition-colors">
                      <Volume2 size={20} className="text-[#42A5F5]" />
                      <span className="text-white font-bold text-[10px]">Hoparlör Açık</span>
                    </div>
                  </div>
                </div>

                <span className="text-white/60 text-[10px] font-black tracking-widest uppercase mb-3 px-1">Oda Katılımcıları (145)</span>

                <div className="flex flex-col gap-3 overflow-y-auto flex-1 pb-4">
                  <div className={`bg-white/[0.04] border rounded-[16px] p-3.5 flex items-center gap-4 transition-colors duration-300 ${isSpeaking ? 'border-[#22C55E]/60 bg-[#22C55E]/10' : 'border-white/10'}`}>
                    <div className="w-11 h-11 rounded-full bg-[#42A5F5]/20 flex items-center justify-center border border-[#42A5F5]/50">
                      <span className="text-[#42A5F5] font-black text-lg">S</span>
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-white font-bold text-[13px]">Sen (34 ABC 123)</span>
                        {isSpeaking && (
                          <div className="flex gap-1 items-end h-4">
                            <motion.div animate={{ height: ['40%', '100%', '40%'] }} transition={{ duration: 0.5, repeat: Infinity }} className="w-1 bg-[#22C55E] rounded-full" />
                            <motion.div animate={{ height: ['80%', '30%', '80%'] }} transition={{ duration: 0.5, repeat: Infinity }} className="w-1 bg-[#22C55E] rounded-full" />
                            <motion.div animate={{ height: ['50%', '90%', '50%'] }} transition={{ duration: 0.5, repeat: Infinity }} className="w-1 bg-[#22C55E] rounded-full" />
                          </div>
                        )}
                      </div>
                      <span className="text-[#22C55E] text-[10px] font-black">Dinliyor ve Konuşuyor</span>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-[16px] p-3.5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                      <span className="text-white/70 font-black text-lg">A</span>
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-white font-bold text-[13px] mb-0.5">Ahmet Usta</span>
                      <span className="text-white/50 text-[10px] font-bold">Sadece Dinliyor</span>
                    </div>
                  </div>
                </div>

                <button className="w-full mt-auto bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] font-black text-[12px] py-3.5 rounded-[16px] tracking-wider hover:bg-[#EF4444]/20 transition-colors">
                  ODADAN AYRIL
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 2: KAMPANYA AKIŞI */}
        {/* ========================================================= */}
        {activeIndex === 2 && (
          <motion.div 
            key="step2"
            initial={stepMotion.initial}
            animate={stepMotion.animate}
            exit={stepMotion.exit}
            transition={stepMotion.transition}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Tag} color={colors.lhAccent}
              title1="Kampanya" title2="Akışı."
              subtitle="Uzun yol kampanyaları konuma göre listelenir; yakıt/yemek teklifleri kuponla değerlendirilir."
              compact
            />

            <div className={phoneShellClass}>
              <div className="bg-[#131D30] px-4 pt-6 pb-4 border-b border-white/10">
                <span className="text-white font-black text-[16px] tracking-tight block mb-3">Uzun Yol</span>
                <div className="flex gap-2">
                  <div className="rounded-[12px] px-4 py-2 flex items-center justify-center opacity-60">
                    <span className="text-white font-bold text-[11px]">Odalar</span>
                  </div>
                  <div className="rounded-[12px] px-4 py-2 flex items-center justify-center opacity-60">
                    <span className="text-white font-bold text-[11px]">Canlı</span>
                  </div>
                  <div className="bg-white/10 border border-white/20 rounded-[12px] px-4 py-2 flex items-center justify-center shadow-inner">
                    <span className="text-[#FF7043] font-black text-[11px]">Kampanyalar</span>
                  </div>
                </div>
              </div>

              <div className="p-4 flex flex-col gap-4 overflow-y-auto h-full">
                <span className="text-white/60 text-[10px] font-black tracking-widest uppercase px-1">Yakındaki Fırsatlar</span>

                <div className="bg-gradient-to-br from-[#1E293B] to-[#131D30] rounded-[24px] p-4 border border-[#42A5F5]/30 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#42A5F5]/10 blur-2xl rounded-full" />
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <span className="text-white font-black text-[15px] leading-tight pr-2">Opet - Bolu Dağı</span>
                    <div className="flex items-center gap-1 bg-[#42A5F5]/10 border border-[#42A5F5]/20 px-2.5 py-1 rounded-full">
                      <Navigation size={10} className="text-[#42A5F5]" />
                      <span className="text-[#42A5F5] font-black text-[8px]">10 KM</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-5 relative z-10 bg-white/5 border border-white/5 p-3 rounded-2xl">
                    <div className="w-10 h-10 rounded-full bg-[#42A5F5]/20 flex items-center justify-center shrink-0">
                      <Fuel size={20} className="text-[#42A5F5]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#42A5F5] font-black text-[12px] uppercase tracking-wide">%5 Motorin İndirimi</span>
                      <span className="text-white/80 text-[10px] font-bold mt-0.5">Uzun araçlara özel anında indirim.</span>
                    </div>
                  </div>
                  <button className="w-full bg-[#42A5F5] text-white font-black text-[11px] py-3 rounded-xl shadow-[0_0_15px_rgba(66,165,245,0.4)] flex items-center justify-center gap-2 hover:bg-[#1E88E5] transition-colors">
                    <Tag size={16} /> KUPONU CÜZDANA EKLE
                  </button>
                </div>

                <div className="bg-gradient-to-br from-[#1E293B] to-[#131D30] rounded-[24px] p-4 border border-[#FF7043]/30 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF7043]/10 blur-2xl rounded-full" />
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <span className="text-white font-black text-[15px] leading-tight pr-2">Berceste Tesisleri</span>
                    <div className="flex items-center gap-1 bg-[#FF7043]/10 border border-[#FF7043]/20 px-2.5 py-1 rounded-full">
                      <Navigation size={10} className="text-[#FF7043]" />
                      <span className="text-[#FF7043] font-black text-[8px]">25 KM</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-5 relative z-10 bg-white/5 border border-white/5 p-3 rounded-2xl">
                    <div className="w-10 h-10 rounded-full bg-[#FF7043]/20 flex items-center justify-center shrink-0">
                      <Coffee size={20} className="text-[#FF7043]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#FF7043] font-black text-[12px] uppercase tracking-wide">Ücretsiz Çay & Çorba</span>
                      <span className="text-white/80 text-[10px] font-bold mt-0.5">Sıcak yemek ve ikram fırsatı.</span>
                    </div>
                  </div>
                  <button className="w-full bg-[#FF7043] text-white font-black text-[11px] py-3 rounded-xl shadow-[0_0_15px_rgba(255,112,67,0.4)] flex items-center justify-center gap-2 hover:bg-[#F97316] transition-colors">
                    <Tag size={16} /> KUPONU CÜZDANA EKLE
                  </button>
                </div>

              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
