'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Store, ShieldCheck, Star, Settings, 
  MapPin, CheckCircle2, MessageSquare, 
  TrendingUp, Navigation, Fuel, Power,
  ChevronRight, Edit3
} from 'lucide-react'

type HeroTitleBlockProps = {
  title1: string
  title2: string
  subtitle: string
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  color: string
}

const HeroTitleBlock = ({ title1, title2, subtitle, icon: Icon, color }: HeroTitleBlockProps) => (
  <div className="relative z-10 flex max-w-[42rem] flex-col items-start gap-5 min-h-[250px]">
    <div className="relative rounded-[20px] border border-white/12 bg-white/[0.04] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
      <Icon size={34} style={{ color }} className="relative z-10" />
      <div className="absolute inset-0 rounded-[20px] blur-2xl opacity-10" style={{ backgroundColor: color }} />
    </div>

    <h2 className="text-[2.45rem] leading-[1.06] tracking-tight lg:text-[3.2rem] font-semibold">
      <span className="font-bold text-[#F3F8FF]">{title1}</span>
      <br />
      <span style={{ color }} className="font-bold">{title2}</span>
    </h2>

    <p className="mt-1 max-w-[38rem] text-[16px] font-medium leading-relaxed text-[#DCEBFF]">
      {subtitle}
    </p>
  </div>
)

export default function MerchantBranchFeature({ activeIndex = 0 }: { activeIndex?: number }) {
  // İşletmeci Paneli Renkleri (Dart dosyasından)
  const colors = {
    brandBlue: '#38BDF8', // Bu sekmenin ana vurgu rengi
    brandOrange: '#FF7043',
    brandGreen: '#22C55E',
    darkBg: '#050811',
    panelBg: '#121A2B',
    textSub: '#A5B4CC'
  }

  const stepShellClass = 'w-full max-w-6xl min-h-[700px] grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center z-10'
  const phoneShellClass = 'w-full max-w-[360px] lg:min-w-[360px] lg:max-w-[360px] h-[640px] bg-[#050811] rounded-[44px] border-[10px] border-[#1E293B] shadow-[0_42px_80px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden relative shrink-0'
  
  // Animasyon stateleri
  const [score, setScore] = useState(45)
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    if (activeIndex === 0) {
      setScore(45)
      const timer = setTimeout(() => setScore(98), 800)
      return () => clearTimeout(timer)
    }
  }, [activeIndex])

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-transparent p-6 lg:p-12 font-sans">
      {/* Ortam Işığı */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#38BDF8]/5 blur-[150px]" />

      <AnimatePresence mode="wait">
        
        {/* ========================================================= */}
        {/* ADIM 0: PROFİL VE GÜVEN İNŞASI (business_wizard_page simülasyonu) */}
        {/* ========================================================= */}
        {activeIndex === 0 && (
          <motion.div 
            key="step0" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={ShieldCheck} color={colors.brandBlue}
              title1="Eksik Profil," title2="Müşteri Kaçırır."
              subtitle="Yorgun bir sürücü bilmediği bir tesise girerken önce güven arar. Zengin fotoğraflar, doğru hizmet etiketleri ve net konum ile şüpheleri sıfırlayın. İnsanlar fiyata değil, güvene gelir."
            />

            {/* Sağ: Telefon Ekranı Simülasyonu */}
            <div className={phoneShellClass}>
              <div className="p-5 mt-4 flex flex-col h-full">
                
                <div className="text-center mb-6 mt-4">
                  <span className="text-white/60 text-[11px] font-black tracking-widest uppercase mb-2 block">Profil Tamlık Skoru</span>
                  <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="58" fill="none" stroke="#1E293B" strokeWidth="8" />
                      <motion.circle 
                        cx="64" cy="64" r="58" fill="none" stroke={colors.brandBlue} strokeWidth="8" strokeLinecap="round"
                        initial={{ strokeDasharray: "364", strokeDashoffset: 364 }}
                        animate={{ strokeDashoffset: 364 - (364 * score) / 100 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="flex flex-col items-center">
                      <span className="text-white font-black text-4xl">{score}</span>
                      <span className="text-[#38BDF8] text-[10px] font-bold">MÜKEMMEL</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#121A2B] border border-white/10 rounded-[24px] p-4 flex flex-col gap-4 shadow-lg flex-1">
                  
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#22C55E]/20 flex items-center justify-center">
                        <MapPin size={18} className="text-[#22C55E]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-[13px]">Hassas Konum</span>
                        <span className="text-white/50 text-[10px]">O-4 Otoyolu Eklendi</span>
                      </div>
                    </div>
                    <CheckCircle2 size={18} className="text-[#22C55E]" />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#22C55E]/20 flex items-center justify-center">
                        <Store size={18} className="text-[#22C55E]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-[13px]">Hizmet Etiketleri</span>
                        <span className="text-white/50 text-[10px]">7/24, Mescid, Bebek Bakım</span>
                      </div>
                    </div>
                    <CheckCircle2 size={18} className="text-[#22C55E]" />
                  </div>

                  <motion.div 
                    initial={{ opacity: 0.5, borderColor: 'rgba(255,255,255,0.05)' }} 
                    animate={{ opacity: score > 50 ? 1 : 0.5, borderColor: score > 50 ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)' }}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 mt-auto"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${score > 50 ? 'bg-[#22C55E]/20' : 'bg-white/10'}`}>
                        <Star size={18} className={score > 50 ? "text-[#22C55E]" : "text-white/40"} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-[13px]">Vitrin Fotoğrafları</span>
                        <span className="text-white/50 text-[10px]">6 Adet HD Görsel</span>
                      </div>
                    </div>
                    {score > 50 ? <CheckCircle2 size={18} className="text-[#22C55E]" /> : <div className="w-4 h-4 rounded-full border-2 border-white/20" />}
                  </motion.div>

                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 1: OPERASYON KOKPİTİ (isletmeci_page.dart Dashboard) */}
        {/* ========================================================= */}
        {activeIndex === 1 && (
          <motion.div 
            key="step1" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Settings} color={colors.brandOrange}
              title1="Dinamik Yönetim," title2="Sıfır Sürpriz."
              subtitle="Otoyoldaki bir sürücü kapalı bir tesise gelmekten nefret eder. Tek tuşla servisi durdurun, yakıt fiyatlarınızı anında güncelleyin. Doğru bilgi, markanızı rakiplerinizden ayırır."
            />

            <div className={phoneShellClass}>
              <div className="p-5 relative z-10 h-full flex flex-col bg-[#050811]">
                
                <div className="flex items-center justify-between mb-6 mt-2">
                  <div className="flex flex-col">
                    <span className="text-white font-black text-xl">İşletme Paneli</span>
                    <span className="text-[#38BDF8] text-[11px] font-bold">Oksijen Tesisleri O-4</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <Store size={18} className="text-white" />
                  </div>
                </div>

                {/* SERVİS AÇIK/KAPALI TOGGLE (Birebir Dart Klonu) */}
                <div className="h-[64px] bg-black/20 border border-white/10 rounded-[16px] px-4 flex items-center mb-4">
                  <motion.div animate={{ scale: isOpen ? [1, 1.2, 1] : 1 }} transition={{ duration: 2, repeat: Infinity }} className={`w-3 h-3 rounded-full mr-3 ${isOpen ? 'bg-[#22C55E] shadow-[0_0_10px_#22C55E]' : 'bg-red-500'}`} />
                  <span className="text-white/80 font-black text-[12px] tracking-widest flex-1">
                    {isOpen ? 'SERVİS AÇIK' : 'SERVİS KAPALI'}
                  </span>
                  <div 
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-14 h-[32px] rounded-full p-1 flex items-center cursor-pointer transition-colors duration-300 ${isOpen ? 'bg-[#22C55E]/40' : 'bg-red-500/40'}`}
                  >
                    <motion.div animate={{ x: isOpen ? 24 : 0 }} className={`w-6 h-6 rounded-full shadow-md ${isOpen ? 'bg-[#22C55E]' : 'bg-red-500'}`} />
                  </div>
                </div>

                {/* YAKIT FİYATLARI POPUP SİMÜLASYONU */}
                <div className="flex-1 bg-[#121A2B] border border-white/10 rounded-[24px] p-5 shadow-2xl relative overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <Fuel size={18} className="text-[#FF7043]" />
                    <span className="text-white font-black text-[15px]">Yakıt Fiyat Güncelle</span>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Benzin Input */}
                    <div className="bg-black/30 border border-white/10 rounded-[16px] p-3">
                      <span className="text-white font-bold text-[12px] mb-2 block">Benzin (95)</span>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-white/5 rounded-xl h-10 flex items-center px-3 justify-between">
                          <span className="text-white font-bold">42.50</span>
                          <span className="text-white/40 font-bold">₺</span>
                        </div>
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><span className="text-white font-black">-</span></div>
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><span className="text-white font-black">+</span></div>
                      </div>
                    </div>

                    {/* Motorin Input */}
                    <div className="bg-black/30 border border-white/10 rounded-[16px] p-3">
                      <span className="text-white font-bold text-[12px] mb-2 block">Motorin</span>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-white/5 rounded-xl h-10 flex items-center px-3 justify-between">
                          <span className="text-white font-bold">41.80</span>
                          <span className="text-white/40 font-bold">₺</span>
                        </div>
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><span className="text-white font-black">-</span></div>
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><span className="text-white font-black">+</span></div>
                      </div>
                    </div>
                  </div>

                  <button className="w-full mt-auto bg-[#FF7043] text-white font-black text-[12px] py-3.5 rounded-[14px] shadow-[0_5px_20px_rgba(255,112,67,0.3)] tracking-wider">
                    KAYDET
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 2: İTİBAR VE İSTATİSTİK (BusinessCommentsPage simülasyonu) */}
        {/* ========================================================= */}
        {activeIndex === 2 && (
          <motion.div 
            key="step2" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={TrendingUp} color={colors.brandGreen}
              title1="Canlı Veri," title2="Somut İtibar."
              subtitle="Yorumlarınıza verdiğiniz cevaplar ve canlı performans metrikleriniz, sürücülerin rotasını belirler. İyi bir müşteri deneyimini dijital vitrininize yansıtın."
            />

            <div className={phoneShellClass}>
              
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-white font-black text-xl">İtibar Merkezi</span>
                  <div className="bg-[#22C55E]/20 px-3 py-1 rounded-lg border border-[#22C55E]/40 flex items-center gap-1.5">
                    <Star size={12} className="text-[#22C55E] fill-[#22C55E]" />
                    <span className="text-[#22C55E] font-black text-[13px]">4.8</span>
                  </div>
                </div>

                {/* Dashboard BENTOS (_statCard klonu) */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col">
                    <span className="text-white/60 text-[9px] font-bold uppercase mb-1">Görünme</span>
                    <span className="text-white font-black text-[18px]">12.4K</span>
                  </div>
                  <div className="bg-[#38BDF8]/10 border border-[#38BDF8]/30 rounded-2xl p-3 flex flex-col">
                    <span className="text-[#38BDF8] text-[9px] font-bold uppercase mb-1">Tıklanma</span>
                    <span className="text-white font-black text-[18px]">3.1K</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col">
                    <span className="text-white/60 text-[9px] font-bold uppercase mb-1">Rota</span>
                    <span className="text-white font-black text-[18px]">840</span>
                  </div>
                </div>
              </div>

              {/* Yorum Merkezi (_buildReviewCard klonu) */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#050811]">
                
                <span className="text-white/40 text-[10px] font-black tracking-widest uppercase ml-1">SON YORUMLAR</span>

                <div className="bg-[#121A2B] border border-white/10 rounded-[20px] p-4 relative overflow-hidden">
                  <div className="absolute left-0 top-4 bottom-4 w-1 bg-[#38BDF8] rounded-r-full" />
                  
                  <div className="flex justify-between items-start mb-3 ml-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#38BDF8]/20 flex items-center justify-center text-[#38BDF8] font-black text-[12px]">
                        A***
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-[13px]">Ahmet K.</span>
                        <span className="text-white/40 text-[9px]">Bugün, 14:30</span>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} size={10} className="text-amber-400 fill-amber-400" />)}
                    </div>
                  </div>

                  <div className="bg-black/30 border border-white/5 rounded-xl p-3 mb-3 ml-2">
                    <p className="text-white/90 text-[12px] leading-relaxed">
                      Uzun yolda her zaman durduğumuz yer. Tuvaletleri çok temiz ve kasada sıra beklemedik. Harika!
                    </p>
                  </div>

                  <div className="flex gap-2 ml-2">
                    <button className="flex-1 py-2 bg-white/5 border border-white/10 rounded-[10px] text-white/80 text-[10px] font-bold hover:bg-white/10 transition-colors">
                      ŞİKAYET ET
                    </button>
                    <button className="flex-1 py-2 bg-[#38BDF8]/15 border border-[#38BDF8]/40 rounded-[10px] text-[#38BDF8] text-[10px] font-black tracking-wide hover:bg-[#38BDF8]/25 transition-colors">
                      CEVAPLA
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}