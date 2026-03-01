'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mic2, Users, Navigation, MapPin, 
  ShieldAlert, Gift, Volume2, 
  CheckCircle2, XCircle, Power, ChevronLeft,
  Lock, Car, Truck, Compass, Clock, Search
} from 'lucide-react'

export const ConvoyFeature = ({ activeIndex = 0 }: { activeIndex?: number }) => {
  // Uygulamanın Orijinal Dart Renkleri (active_convoy_page & find_convoy_page)
  const colors = {
    darkBase: '#0F172A',
    accentBlue: '#5BA8FF',
    fireOrange: '#FF7043',
    safeGreen: '#22C55E',
    orangeAlert: '#FF9F1C',
    panicRed: '#E75A6E'
  }

  const [isSpeaking, setIsSpeaking] = useState(false)
  const stepShellClass =
    'w-full max-w-6xl min-h-[700px] grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center z-10'
  const phoneShellClass =
    'w-full max-w-[360px] lg:min-w-[360px] lg:max-w-[360px] h-[640px] bg-[#0F172A] rounded-[44px] border-[10px] border-[#1E293B] shadow-[0_42px_80px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden relative shrink-0'
  
  useEffect(() => {
    if (activeIndex === 1) {
      const interval = setInterval(() => setIsSpeaking(prev => !prev), 1200)
      return () => clearInterval(interval)
    }
  }, [activeIndex])

  // Premium, Yüksek Kontrastlı Apple Stili Başlık
  const HeroTitleBlock = ({ title1, title2, subtitle, icon: Icon, color }: any) => (
    <div className="flex flex-col items-start gap-5 max-w-[42rem] min-h-[250px] z-10 relative">
      <div className="p-4 rounded-[20px] bg-white/[0.04] border border-white/12 shadow-[0_12px_30px_rgba(0,0,0,0.28)] relative">
        <Icon size={34} style={{ color }} className="relative z-10" />
        <div className="absolute inset-0 rounded-[20px] blur-2xl opacity-10" style={{ backgroundColor: color }} />
      </div>
      <h2 className="text-[2.45rem] lg:text-[3.2rem] font-semibold text-white leading-[1.06] tracking-tight">
        <span className="font-bold text-[#F3F8FF]">{title1}</span>
        <br />
        <span className="font-bold" style={{ color }}>{title2}</span>
      </h2>
      <p className="text-[#DCEBFF] text-[16px] font-medium leading-relaxed mt-1 max-w-[38rem]">
        {subtitle}
      </p>
    </div>
  )

  return (
    <div className="w-full h-full p-6 lg:p-12 flex items-center justify-center relative overflow-hidden bg-transparent font-sans">
      
      {/* Ortam Işığı (Simülasyona derinlik katar) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#5BA8FF]/5 blur-[150px] rounded-full pointer-events-none z-0" />

      <AnimatePresence mode="wait">
        
        {/* ========================================================= */}
        {/* ADIM 0: KONVOY BUL & KATIL (find_convoy_page.dart) */}
        {/* ========================================================= */}
        {activeIndex === 0 && (
          <motion.div 
            key="step0"
            initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.985 }}
            animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }}
            style={{ transformOrigin: 'center center' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Search} color={colors.accentBlue}
              title1="Dijital Konvoy." title2="Birlikte Sürün."
              subtitle="Rotanıza uygun konvoyları araç tipine göre filtreleyin, şifreli özel konvoylara PIN ile katılın ve yola hemen çıkın."
            />

            {/* Sağ: Telefon Ekranı Simülasyonu */}
            <div className={`${phoneShellClass} z-10 p-5`}>
              
              <span className="text-white font-black text-2xl tracking-tight mb-5 mt-2">Konvoy Bul</span>

              {/* Özel PIN Girişi (_codeCtrl klonu) */}
              <div className="bg-[#1A2438] border border-white/10 rounded-2xl p-4 flex items-center gap-3 mb-6 shadow-inner">
                <Lock size={20} className="text-[#5BA8FF]" />
                <span className="text-white/80 font-medium text-[15px]">Özel Pin ile Katıl...</span>
                <div className="ml-auto bg-[#5BA8FF] p-2 rounded-xl">
                  <ChevronLeft size={16} className="text-white rotate-180" />
                </div>
              </div>

              <span className="text-white font-bold text-sm mb-3">Araç Kategorileri</span>
              
              {/* Kategoriler (Binek, Motosiklet, vb.) */}
              <div className="flex gap-3 mb-6 overflow-hidden">
                <div className="bg-[#5BA8FF]/15 border border-[#5BA8FF]/40 rounded-2xl p-3 flex flex-col items-center gap-2 min-w-[75px]">
                  <Car size={24} className="text-[#5BA8FF]" />
                  <span className="text-[#5BA8FF] font-black text-[11px]">Binek</span>
                </div>
                <div className="bg-[#1A2438] border border-white/5 rounded-2xl p-3 flex flex-col items-center gap-2 min-w-[75px] opacity-70">
                  <Compass size={24} className="text-white" />
                  <span className="text-white font-bold text-[11px]">Motor</span>
                </div>
                <div className="bg-[#1A2438] border border-white/5 rounded-2xl p-3 flex flex-col items-center gap-2 min-w-[75px] opacity-70">
                  <Truck size={24} className="text-white" />
                  <span className="text-white font-bold text-[11px]">Karavan</span>
                </div>
              </div>

              {/* Konvoy Kartı (find_convoy_page kart klonu) */}
              <div className="bg-[#1A2438] border border-[#5BA8FF]/30 rounded-3xl p-5 shadow-lg relative flex flex-col mt-auto mb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-white font-black text-[17px] block mb-1">Ege Turu 2024</span>
                    <span className="text-[#5BA8FF] text-[12px] font-bold">Lider: Ahmet K. • Binek Araç</span>
                  </div>
                </div>

                <div className="text-white/90 text-[13px] font-bold leading-relaxed mb-5">
                  📍 İstanbul, Kadıköy <br />
                  ➡ İzmir, Çeşme
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <div className="bg-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <Clock size={12} className="text-white/80" />
                    <span className="text-white/90 text-[11px] font-bold">Yarın 09:00</span>
                  </div>
                  <div className="bg-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <Users size={12} className="text-white/80" />
                    <span className="text-white/90 text-[11px] font-bold">4 Kişi</span>
                  </div>
                </div>

                <button className="w-full bg-[#5BA8FF] text-white font-black text-[13px] py-4 rounded-xl shadow-[0_0_15px_rgba(91,168,255,0.3)] tracking-wider">
                  İNCELE & KATIL
                </button>
              </div>

            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 1: LİDER HARİTASI (active_convoy_page.dart) */}
        {/* ========================================================= */}
        {activeIndex === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.985 }}
            animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }}
            style={{ transformOrigin: 'center center' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Navigation} color={colors.safeGreen}
              title1="Lider Haritası." title2="Canlı Takip."
              subtitle="Konvoy dizilimi, hızlar ve canlı konumlar tek bakışta. Ekip üyelerini haritadan izleyin, iletişimi panellerden yönetin."
            />

            {/* Sağ: Active Convoy Page Simülasyonu */}
            <div className={phoneShellClass}>
              
              {/* Harita Alanı (_buildMapSection) */}
              <div className="flex-[1.2] bg-[#0A0F1A] relative overflow-hidden border-b border-white/20">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#5BA8FF]/10 to-transparent" />

                <svg className="absolute inset-0 w-full h-full z-0" preserveAspectRatio="none">
                  <motion.path 
                    d="M 50,250 C 120,180 220,120 300,50" fill="transparent" stroke="#5BA8FF" strokeWidth="4" strokeDasharray="8 8" opacity="0.6"
                    animate={{ strokeDashoffset: [0, -40] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </svg>

                {/* Lider Marker */}
                <motion.div className="absolute top-[25%] left-[65%] z-20 flex flex-col items-center">
                  <div className="bg-[#FF7043] text-white text-[11px] font-black px-3 py-1 rounded-lg mb-1.5 shadow-xl">Lider (Sen)</div>
                  <div className="w-6 h-6 bg-[#FF7043] rounded-full border-[3px] border-[#0A0F1A] shadow-[0_0_20px_#FF7043] flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                  </div>
                </motion.div>

                {/* Üye Marker */}
                <motion.div animate={{ x: [-5, 5, -5], y: [5, -5, 5] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-[50%] left-[35%] z-10 flex flex-col items-center">
                  <div className="bg-[#5BA8FF] text-white text-[11px] font-bold px-3 py-1 rounded-lg mb-1.5 shadow-xl">Ahmet K.</div>
                  <div className="w-5 h-5 bg-[#5BA8FF] rounded-full border-[3px] border-[#0A0F1A] shadow-[0_0_15px_#5BA8FF]" />
                </motion.div>

                <div className="absolute top-5 left-5 right-5 flex justify-between items-start z-30">
                  <div className="bg-[#0F172A]/90 backdrop-blur-md border border-white/20 px-4 py-2 rounded-2xl flex flex-col shadow-2xl">
                    <span className="text-white/70 text-[10px] font-black tracking-widest mb-0.5">HEDEF</span>
                    <span className="text-white font-black text-[14px]">İzmir (320 km)</span>
                  </div>
                </div>
              </div>

              {/* Katılımcı Listesi (_buildMembersPanel) */}
              <div className="flex-1 bg-[#0F172A] p-5 flex flex-col gap-3 overflow-y-auto">
                <span className="text-white/60 text-[11px] font-black tracking-widest uppercase mb-1">KONVOY ÜYELERİ (3/10)</span>
                
                <div className="bg-white/[0.05] border border-[#FF7043]/50 rounded-[16px] p-3.5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#FF7043]/20 flex items-center justify-center border border-[#FF7043]">
                    <span className="text-[#FF7043] font-black text-lg">L</span>
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-white font-bold text-[14px] mb-0.5">Lider (Sen)</span>
                    <span className="text-white/80 text-[12px] font-medium">110 km/s • 0m</span>
                  </div>
                  <Mic2 size={20} className="text-[#22C55E]" />
                </div>

                <div className={`bg-white/[0.03] border rounded-[16px] p-3.5 flex items-center gap-4 transition-colors duration-300 ${isSpeaking ? 'border-[#22C55E]/60 bg-[#22C55E]/10' : 'border-white/10'}`}>
                  <div className="w-11 h-11 rounded-full bg-[#5BA8FF]/20 flex items-center justify-center border border-[#5BA8FF]/50">
                    <span className="text-[#5BA8FF] font-black text-lg">A</span>
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-white font-bold text-[14px]">Ahmet K.</span>
                      {isSpeaking && (
                        <div className="flex gap-1 items-end h-4">
                          <motion.div animate={{ height: ['40%', '100%', '40%'] }} transition={{ duration: 0.5, repeat: Infinity }} className="w-1 bg-[#22C55E] rounded-full" />
                          <motion.div animate={{ height: ['80%', '30%', '80%'] }} transition={{ duration: 0.5, repeat: Infinity }} className="w-1 bg-[#22C55E] rounded-full" />
                          <motion.div animate={{ height: ['50%', '90%', '50%'] }} transition={{ duration: 0.5, repeat: Infinity }} className="w-1 bg-[#22C55E] rounded-full" />
                        </div>
                      )}
                    </div>
                    <span className="text-white/80 text-[12px] font-medium">108 km/s • 50m geride</span>
                  </div>
                </div>
              </div>

              {/* Alt Kontrol Paneli (_buildControlPanel) */}
              <div className="h-[95px] bg-[#0F172A] border-t border-white/10 p-4 flex gap-3 z-20">
                <div className="flex-1 bg-white/[0.08] border border-[#22C55E]/40 rounded-[16px] flex flex-col items-center justify-center text-[#22C55E]">
                  <Mic2 size={22} className="mb-1" />
                  <span className="text-[10px] font-black tracking-wider">AÇIK</span>
                </div>
                <div className="flex-1 bg-white/[0.08] border border-[#5BA8FF]/40 rounded-[16px] flex flex-col items-center justify-center text-[#5BA8FF]">
                  <Volume2 size={22} className="mb-1" />
                  <span className="text-[10px] font-black tracking-wider">AÇIK</span>
                </div>
                <div className="flex-[1.5] bg-[#E75A6E]/15 border border-[#E75A6E]/40 rounded-[16px] flex flex-col items-center justify-center text-[#E75A6E] shadow-inner">
                  <ShieldAlert size={22} className="mb-1" />
                  <span className="text-[10px] font-black tracking-widest">PANİK</span>
                </div>
                <div className="flex-[1.5] bg-[#FF7043] rounded-[16px] flex flex-col items-center justify-center text-white shadow-[0_0_20px_rgba(255,112,67,0.4)]">
                  <Power size={22} className="mb-1" />
                  <span className="text-[10px] font-black tracking-widest">BİTİR</span>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 2: KONVOY TEKLİFLERİ (captain_offers_page.dart) */}
        {/* ========================================================= */}
        {activeIndex === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.985 }}
            animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }}
            style={{ transformOrigin: 'center center' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Gift} color={colors.fireOrange}
              title1="Kaptana Özel." title2="Anlık Teklifler."
              subtitle="Rotanızdaki tesisler kalabalık grubunuza özel indirimler sunar. Kaptan olarak teklifi değerlendirin, tüm ekibe kazandırın."
            />

            {/* Sağ: Captain Offers Paneli */}
            <div className={`${phoneShellClass} p-5`}>
              
              {/* Header */}
              <div className="flex items-center gap-4 mb-6 mt-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <ChevronLeft size={24} className="text-white" />
                </div>
                <span className="text-white font-black text-2xl tracking-tight">Gelen Teklifler</span>
              </div>

              {/* Sekmeler (_buildTabBtn klonu) */}
              <div className="flex gap-2 mb-8">
                <div className="flex-1 bg-white/[0.05] border border-[#FF7043]/50 rounded-[14px] p-3 text-center shadow-inner">
                  <span className="text-[#FF7043] text-[10px] font-black tracking-widest">FIRSATLAR</span>
                </div>
                <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[14px] p-3 text-center">
                  <span className="text-white/50 text-[10px] font-black tracking-widest">SOHBETLER</span>
                </div>
                <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[14px] p-3 text-center">
                  <span className="text-white/50 text-[10px] font-black tracking-widest">GEÇMİŞ</span>
                </div>
              </div>

              {/* Teklif Kartı (_buildOfferCard klonu) */}
              <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-[28px] p-6 border border-[#22C55E]/30 shadow-[0_20px_40px_rgba(34,197,94,0.15)] relative overflow-hidden flex flex-col">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#22C55E]/15 blur-3xl rounded-full" />
                
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <span className="text-white font-black text-xl">Oksijen Tesisleri O-4</span>
                  <span className="bg-[#FF7043]/20 text-[#FF7043] border border-[#FF7043]/40 text-[10px] font-black px-3 py-1.5 rounded-lg tracking-widest">BEKLİYOR</span>
                </div>
                
                <div className="flex items-center gap-2 mb-6 relative z-10">
                  <MapPin size={16} className="text-white/70" />
                  <span className="text-white/80 text-[13px] font-bold">Tesise 25 KM kaldı</span>
                </div>

                <div className="bg-[#22C55E]/15 border border-[#22C55E]/30 rounded-2xl p-5 mb-6 relative z-10 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#22C55E]/20 flex items-center justify-center shrink-0">
                    <Gift size={28} className="text-[#22C55E]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#22C55E] font-black text-[15px] uppercase tracking-wide">Tüm Ekibe %15 İndirim</span>
                    <span className="text-white/80 text-[12px] font-medium mt-1">Yemek ve İçeceklerde Geçerli</span>
                  </div>
                </div>

                <div className="flex gap-3 relative z-10 mt-auto">
                  <button className="flex-[0.8] bg-white/[0.08] border border-[#E75A6E]/50 text-[#FCA5A5] text-[13px] font-black py-4 rounded-[16px] flex items-center justify-center gap-2">
                    <XCircle size={18} /> REDDET
                  </button>
                  <button className="flex-[1.2] bg-[#22C55E] text-white text-[13px] font-black py-4 rounded-[16px] shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} /> KABUL ET
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
