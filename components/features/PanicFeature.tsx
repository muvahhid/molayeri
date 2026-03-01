'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShieldAlert, Navigation, Zap, Fuel, Wrench, 
  MapPin, Star, AlertCircle, Car
} from 'lucide-react'

type PhoneTopHeaderProps = {
  headline: string
  subtitle: string
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  color: string
  kicker: string
}

function PhoneTopHeader({ headline, subtitle, icon: Icon, color, kicker }: PhoneTopHeaderProps) {
  return (
    <div className="text-center">
      <div className="inline-flex -translate-y-1 items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1.5">
        <Icon size={14} style={{ color }} />
        <span className="text-[11px] font-extrabold tracking-[0.18em] uppercase text-white/70">{kicker}</span>
      </div>

      <h3
        className="mt-5 text-[40px] leading-[0.98] font-black tracking-tight text-white"
        style={{ color: '#FFFFFF', textShadow: '0 10px 28px rgba(229,83,83,0.26)' }}
      >
        {headline}
      </h3>

      <p className="mx-auto mt-2 max-w-[340px] text-[14px] font-semibold leading-relaxed text-white/90">
        {subtitle}
      </p>
    </div>
  )
}

function PhoneStage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-[360px] lg:-ml-4">
      {children}
    </div>
  )
}

export default function PanicFeature({ activeIndex = 0 }: { activeIndex?: number }) {
  // Orijinal Uygulama Renkleri (panic_page.dart & home_page.dart)
  const colors = {
    darkBase: '#050811',
    panelBg: '#121A2B',
    urgentRed: '#E55353', // Dart kodundaki _urgentAccent
    textSub: '#A5B4CC',
    safeGreen: '#22C55E'
  }

  // 1. Adım (Radar/Tarama) simülasyon state'i
  const [scanStep, setScanStep] = useState(0)

  useEffect(() => {
    if (activeIndex === 1) {
      const t0 = setTimeout(() => setScanStep(0), 0)
      const t1 = setTimeout(() => setScanStep(1), 2500) // Konum bulundu
      const t2 = setTimeout(() => setScanStep(2), 5000) // Noktalar listeleniyor
      return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
    }
  }, [activeIndex])

  return (
    <div className="w-full h-full p-4 lg:p-8 flex items-start justify-center relative overflow-hidden bg-transparent font-sans">

      <AnimatePresence mode="wait">
        
        {/* ========================================================= */}
        {/* ADIM 0: TEK DOKUNUŞ ACİL AKIŞ (home_page.dart simülasyonu) */}
        {/* ========================================================= */}
        {activeIndex === 0 && (
          <motion.div 
            key="step0" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }}
            className="w-full max-w-[980px] flex justify-center z-10"
          >
            {/* Sağ: Telefon Ekranı Simülasyonu (Home Page) */}
            <PhoneStage>
              <div className="mb-3 px-2">
                <PhoneTopHeader
                  icon={ShieldAlert}
                  color={colors.urgentRed}
                  kicker="Acil Mod"
                  headline="Tek Dokunuş Acil Akış"
                  subtitle="Panik butonu ile acil mod anında açılır; kullanıcı doğrudan yardım akışına girer."
                />
              </div>

              <div className="w-full h-[540px] bg-[#050811] rounded-[48px] border-[12px] border-[#1E293B] shadow-[0_36px_72px_rgba(0,0,0,0.70)] flex flex-col relative overflow-hidden">
              
              {/* Ana Sayfa Header */}
              <div className="pt-10 px-5 pb-6 bg-gradient-to-b from-[#121A2B] to-transparent">
                <span className="text-white/60 text-[12px] font-black tracking-widest uppercase">Hoş Geldiniz</span>
                <span className="text-white font-black text-2xl block mt-1">Yolcu</span>
              </div>

              {/* Rota Arama Input (home_page.dart) */}
              <div className="px-5 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                  <Navigation size={20} className="text-[#A5B4CC]" />
                  <span className="text-[#A5B4CC] font-bold text-[14px]">Nereye gidiyoruz?</span>
                </div>
              </div>

              {/* Grid Butonlar */}
              <div className="px-5 grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-[20px] p-4 flex flex-col items-center justify-center gap-2">
                  <Car size={24} className="text-[#42A5F5]" />
                  <span className="text-white font-bold text-[13px]">Garajım</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-[20px] p-4 flex flex-col items-center justify-center gap-2">
                  <MapPin size={24} className="text-[#22C55E]" />
                  <span className="text-white font-bold text-[13px]">Mola Yerleri</span>
                </div>
              </div>

              {/* Dev Panik Butonu (home_page.dart içindeki _buildPanicButton) */}
              <div className="absolute bottom-10 left-0 w-full flex justify-center z-20">
                <motion.div 
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-[108px] h-[108px] bg-[#E55353] rounded-full flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_30px_rgba(229,83,83,0.45)]"
                >
                  <ShieldAlert size={30} className="text-white" />
                  <span className="text-white font-black text-[13px] tracking-widest leading-none">PANİK</span>
                </motion.div>
              </div>

              {/* Alt Navbar Gölgesi */}
              <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-black to-transparent pointer-events-none" />
              </div>
            </PhoneStage>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 1: CANLI KONUM VE YÖN (Tarama/Radar Animasyonu) */}
        {/* ========================================================= */}
        {activeIndex === 1 && (
          <motion.div 
            key="step1" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }}
            className="w-full max-w-[980px] flex justify-center z-10"
          >
            <PhoneStage>
              <div className="mb-3 px-2">
                <PhoneTopHeader
                  icon={Navigation}
                  color={colors.urgentRed}
                  kicker="Canlı Tarama"
                  headline="Canlı Konum ve Yön"
                  subtitle="Konum alınır, acil ihtiyaç noktaları taranır ve en uygun seçenekler anında çıkar."
                />
              </div>

              <div className="w-full h-[540px] bg-[#050811] rounded-[48px] border-[12px] border-[#1E293B] shadow-[0_36px_72px_rgba(0,0,0,0.70)] flex flex-col items-center justify-center relative overflow-hidden">
              
              {/* Radar Dalgaları */}
              <motion.div 
                animate={{ scale: [0.5, 2], opacity: [0.8, 0] }} 
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="absolute w-[200px] h-[200px] border-2 border-[#E55353] rounded-full"
              />
              <motion.div 
                animate={{ scale: [0.5, 2.5], opacity: [0.6, 0] }} 
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                className="absolute w-[200px] h-[200px] border-2 border-[#E55353] rounded-full"
              />

              {/* Merkez İkon */}
              <div className="w-20 h-20 bg-[#E55353]/20 border border-[#E55353]/50 rounded-full flex items-center justify-center relative z-10 shadow-[0_0_40px_rgba(229,83,83,0.5)]">
                <Navigation size={32} className="text-[#E55353]" />
              </div>

              {/* Dinamik Tarama Metni */}
              <div className="absolute bottom-32 flex flex-col items-center text-center px-6">
                <AnimatePresence mode="wait">
                  {scanStep === 0 && (
                    <motion.span key="s0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-white font-black text-xl mb-2">Konum Alınıyor...</motion.span>
                  )}
                  {scanStep === 1 && (
                    <motion.span key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-[#22C55E] font-black text-xl mb-2">Konum Saptandı</motion.span>
                  )}
                  {scanStep === 2 && (
                    <motion.span key="s2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-[#E55353] font-black text-xl mb-2">Noktalar Bulundu</motion.span>
                  )}
                </AnimatePresence>
                <span className="text-[#A5B4CC] text-sm font-medium">Yakındaki yakıt, şarj ve servis noktaları haritada taranıyor.</span>
              </div>

              </div>
            </PhoneStage>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 2: ANINDA YARDIM GÖRÜNÜMÜ (panic_page.dart simülasyonu) */}
        {/* ========================================================= */}
        {activeIndex === 2 && (
          <motion.div 
            key="step2" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }}
            className="w-full max-w-[980px] flex justify-center z-10"
          >
            {/* Sağ: Telefon Ekranı (panic_page.dart klonu) */}
            <PhoneStage>
              <div className="mb-3 px-2">
                <PhoneTopHeader
                  icon={AlertCircle}
                  color={colors.urgentRed}
                  kicker="Acil Noktalar"
                  headline="Anında Yardım Görünümü"
                  subtitle="Yakıt, şarj ve servis için en yakın noktalar tek panelde listelenir."
                />
              </div>

              <div className="w-full h-[540px] bg-[#050811] rounded-[48px] border-[12px] border-[#1E293B] shadow-[0_36px_72px_rgba(0,0,0,0.70)] flex flex-col relative overflow-hidden">
              
              {/* Header */}
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-[#E55353]/30 shadow-[0_10px_30px_rgba(229,83,83,0.1)]">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-[#E55353]/10 flex items-center justify-center border border-[#E55353]/30">
                    <ShieldAlert size={20} className="text-[#E55353]" />
                  </div>
                  <span className="text-white font-black text-[22px] tracking-tight">Acil Yardım</span>
                </div>

                {/* Tab Bar (_buildTabContent) */}
                <div className="flex gap-2">
                  <div className="flex-1 bg-[#E55353] rounded-[14px] py-2.5 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(229,83,83,0.4)]">
                    <Fuel size={14} className="text-white" />
                    <span className="text-white font-black text-[12px]">YAKIT</span>
                  </div>
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-[14px] py-2.5 flex items-center justify-center gap-2">
                    <Zap size={14} className="text-white/60" />
                    <span className="text-white/60 font-bold text-[12px]">ŞARJ</span>
                  </div>
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-[14px] py-2.5 flex items-center justify-center gap-2">
                    <Wrench size={14} className="text-white/60" />
                    <span className="text-white/60 font-bold text-[12px]">SERVİS</span>
                  </div>
                </div>
              </div>

              {/* Liste İçeriği (_buildListItem klonu) */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                
                <span className="text-[#E55353] font-black text-[11px] tracking-widest uppercase px-1">En Yakın Yakıt İstasyonları</span>

                {/* Kart 1 */}
                <div className="bg-[#121A2B] rounded-[24px] p-5 border border-white/10 shadow-lg flex flex-col relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-white font-black text-[16px] mb-1">Opet Bolu Dağı</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-[#FF9F1C] fill-[#FF9F1C]" />
                          <span className="text-white font-bold text-[11px]">4.8</span>
                        </div>
                        <span className="text-white/40 text-[10px]">•</span>
                        <span className="text-white/60 font-medium text-[11px]">Açık (24 Saat)</span>
                      </div>
                    </div>
                    <div className="bg-white/10 px-2.5 py-1 rounded-md border border-white/5">
                      <span className="text-white font-black text-[12px]">2.4 KM</span>
                    </div>
                  </div>

                  <button className="w-full bg-[#E55353] text-white font-black text-[13px] py-3.5 rounded-xl flex items-center justify-center gap-2 tracking-widest hover:bg-red-600 transition-colors shadow-[0_5px_20px_rgba(229,83,83,0.3)]">
                    <Navigation size={16} /> YOL TARİFİ
                  </button>
                </div>

                {/* Kart 2 */}
                <div className="bg-[#121A2B] rounded-[24px] p-5 border border-white/5 shadow-lg flex flex-col relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-white font-black text-[16px] mb-1">Shell Düzce Merkez</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-[#FF9F1C] fill-[#FF9F1C]" />
                          <span className="text-white font-bold text-[11px]">4.2</span>
                        </div>
                        <span className="text-white/40 text-[10px]">•</span>
                        <span className="text-white/60 font-medium text-[11px]">Açık</span>
                      </div>
                    </div>
                    <div className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                      <span className="text-white/80 font-black text-[12px]">5.1 KM</span>
                    </div>
                  </div>

                  <button className="w-full bg-white/5 border border-white/10 text-white font-black text-[13px] py-3.5 rounded-xl flex items-center justify-center gap-2 tracking-widest hover:bg-white/10 transition-colors">
                    <Navigation size={16} /> YOL TARİFİ
                  </button>
                </div>

              </div>

              </div>
            </PhoneStage>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
