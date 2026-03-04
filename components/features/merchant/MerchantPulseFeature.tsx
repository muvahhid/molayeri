'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, Filter, Magnet, Zap, 
  ArrowDown, Users, TrendingUp, MapPin, 
  CheckCircle2, Clock, CarFront, Eye,
  BarChart2, Target
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

export default function MerchantPulseFeature({ activeIndex = 0 }: { activeIndex?: number }) {
  // Nabız (Pulse) ve Huni Renkleri
  const colors = {
    brandOrange: '#FF8A3D', // Ana Pulse Rengi
    brandBlue: '#38BDF8',   // Farkındalık / Top Funnel
    brandPurple: '#A855F7', // İlgi / Mid Funnel
    brandGreen: '#4ADE80',  // Dönüşüm / Bottom Funnel
    darkBg: '#050811',
    panelBg: '#121A2B'
  }

  const stepShellClass = 'w-full max-w-6xl min-h-[700px] grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center z-10'
  const phoneShellClass = 'w-full max-w-[360px] lg:min-w-[360px] lg:max-w-[360px] h-[640px] bg-[#050811] rounded-[44px] border-[10px] border-[#1E293B] shadow-[0_42px_80px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden relative shrink-0'
  
  // Animasyon stateleri
  const [funnelParticles, setFunnelParticles] = useState<number[]>([])
  const [liveVisitors, setLiveVisitors] = useState(42)
  const [upsellSent, setUpsellSent] = useState(false)

  // Adım 0: Huni partikül animasyonu
  useEffect(() => {
    if (activeIndex === 0) {
      const interval = setInterval(() => {
        setFunnelParticles(prev => [...prev, Date.now()].slice(-6)) // Ekranda max 6 partikül
      }, 800)
      return () => clearInterval(interval)
    }
  }, [activeIndex])

  // Adım 1: Canlı ziyaretçi dalgalanması
  useEffect(() => {
    if (activeIndex === 1) {
      const interval = setInterval(() => {
        setLiveVisitors(prev => prev + (Math.floor(Math.random() * 5) - 2)) // 40-45 arası dalgalanma
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [activeIndex])

  // Adım 2: Upsell reset
  useEffect(() => {
    if (activeIndex === 2) {
      setUpsellSent(false)
    }
  }, [activeIndex])

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-transparent p-6 lg:p-12 font-sans">
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF8A3D]/5 blur-[150px]" />

      <AnimatePresence mode="wait">
        
        {/* ========================================================= */}
        {/* ADIM 0: GÖRÜNÜRLÜK (Farkındalık / Top of Funnel) */}
        {/* ========================================================= */}
        {activeIndex === 0 && (
          <motion.div 
            key="step0" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Filter} color={colors.brandOrange}
              title1="Trafiği İzleme," title2="Trafiği Dönüştür."
              subtitle="Otoyoldan geçen on binlerce araç sadece bir istatistik değildir. MolaYeri Pulse ile güzergahtaki araçların kaçının sizi gördüğünü ve kaçının içeri girdiğini anlık bir Satış Hunisi (Funnel) üzerinden takip edin."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FF8A3D]/20 flex items-center justify-center">
                    <Activity size={18} className="text-[#FF8A3D]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-black text-[18px] leading-tight">Canlı Nabız</span>
                    <span className="text-[#FF8A3D] text-[11px] font-bold">Son 24 Saat Dönüşüm Hunisi</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-5 relative z-10 flex flex-col bg-[#050811] overflow-hidden">
                
                {/* Huni Simülasyonu */}
                <div className="flex-1 flex flex-col items-center justify-center gap-2 relative">
                  
                  {/* Animasyonlu Partiküller (Yukarıdan aşağı akan araçlar) */}
                  <AnimatePresence>
                    {funnelParticles.map((id) => (
                      <motion.div
                        key={id}
                        initial={{ top: 0, opacity: 0, scale: 0.5 }}
                        animate={{ top: '80%', opacity: [0, 1, 1, 0], scale: [0.5, 1, 0.5] }}
                        transition={{ duration: 2.5, ease: "linear" }}
                        className="absolute z-20 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"
                      />
                    ))}
                  </AnimatePresence>

                  {/* Level 1: Görünürlük */}
                  <div className="w-full bg-[#38BDF8]/10 border border-[#38BDF8]/30 rounded-t-3xl rounded-b-lg p-4 text-center relative z-10">
                    <span className="text-[#38BDF8] text-[10px] font-black uppercase tracking-widest block mb-1">Haritada Görüntülenme</span>
                    <span className="text-white font-black text-[28px] leading-none">18.450</span>
                  </div>
                  <ArrowDown size={16} className="text-white/20" />

                  {/* Level 2: İlgi */}
                  <div className="w-[85%] bg-[#A855F7]/10 border border-[#A855F7]/30 rounded-xl p-4 text-center relative z-10">
                    <span className="text-[#A855F7] text-[10px] font-black uppercase tracking-widest block mb-1">Profil İnceleme</span>
                    <span className="text-white font-black text-[24px] leading-none">4.120</span>
                  </div>
                  <ArrowDown size={16} className="text-white/20" />

                  {/* Level 3: Aksiyon (Dönüşüm) */}
                  <div className="w-[70%] bg-[#4ADE80]/10 border border-[#4ADE80]/30 rounded-t-lg rounded-b-3xl p-4 text-center relative z-10 shadow-[0_10px_30px_rgba(74,222,128,0.1)]">
                    <span className="text-[#4ADE80] text-[10px] font-black uppercase tracking-widest block mb-1">Rotaya Ekleyen</span>
                    <span className="text-white font-black text-[20px] leading-none">1.240</span>
                  </div>
                </div>

                <div className="mt-6 bg-[#121A2B] border border-white/5 rounded-[20px] p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#38BDF8]" />
                  <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider block mb-1">SİSTEM ÖNERİSİ</span>
                  <p className="text-white/90 text-[11px] font-medium leading-relaxed mb-3">
                    Güzergah trafiğiniz çok yüksek ancak profil inceleme oranınız %22'de kaldı. Görünürlüğü artırmak için "Akşam Trafiği" etiketi açın.
                  </p>
                  <button className="bg-[#38BDF8]/15 text-[#38BDF8] w-full py-2.5 rounded-lg text-[11px] font-black tracking-wide border border-[#38BDF8]/30 hover:bg-[#38BDF8]/25">
                    HIZLI ETİKET AÇ
                  </button>
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 1: NİYET VE İLGİ (Merakı Nakde Dönüştür) */}
        {/* ========================================================= */}
        {activeIndex === 1 && (
          <motion.div 
            key="step1" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Magnet} color={colors.brandPurple}
              title1="Merakı Yakala," title2="Nakde Dönüştür."
              subtitle="Tesis detayınıza bakan bir sürücü otoyolda durmaya karar vermek üzeredir. Karar penceresi sadece 3 saniyedir. Onu kasadaki hız ve pürüzsüzlük vaadiyle içeri çekin."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <span className="text-white font-black text-[20px] tracking-tight">Canlı Ziyaretçiler</span>
              </div>

              <div className="flex-1 p-5 relative z-10 flex flex-col bg-[#050811]">
                
                {/* Canlı Ziyaretçi Dashboard */}
                <div className="bg-gradient-to-br from-[#1E0B2D] to-[#121A2B] border border-[#A855F7]/30 rounded-[24px] p-6 text-center shadow-xl relative overflow-hidden mb-6">
                  <div className="absolute top-4 right-4 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 text-[9px] font-black uppercase tracking-widest">CANLI</span>
                  </div>

                  <Eye size={28} className="text-[#A855F7] mx-auto mb-3" />
                  <span className="text-white/60 text-[11px] font-bold uppercase tracking-widest block mb-1">Şu An Profilinize Bakanlar</span>
                  <span className="text-white font-black text-[48px] leading-none drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                    {liveVisitors}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
                      <Target size={16} className="text-white/60" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-[13px]">Karar Anı Kancası</span>
                      <span className="text-white/40 text-[10px] mt-0.5">Sadece anlık bakanlara özel</span>
                    </div>
                  </div>
                  
                  {/* Sistem Otomatik Mesajı */}
                  <div className="bg-black/40 border border-[#A855F7]/20 rounded-2xl p-4">
                    <span className="text-[#A855F7] text-[9px] font-black tracking-widest uppercase block mb-2">GÖSTERİLECEK MESAJ</span>
                    <p className="text-white/90 text-[12px] leading-relaxed italic">
                      "Yolunuza sadece 3 dk mesafede. Kasada beklemeden tek QR ile ödeyin, yola hemen dönün."
                    </p>
                  </div>
                </div>

                <button className="mt-auto w-full bg-[#A855F7] text-white font-black text-[13px] py-4 rounded-xl shadow-[0_5px_20px_rgba(168,85,247,0.3)] tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                  <Zap size={16} /> 24 SAATLİK CTA ÇIK
                </button>

              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 2: KESİN DÖNÜŞÜM (Cepteki Müşterinin Sepetini Büyüt) */}
        {/* ========================================================= */}
        {activeIndex === 2 && (
          <motion.div 
            key="step2" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={TrendingUp} color={colors.brandGreen}
              title1="Cepteki Müşterinin," title2="Sepetini Büyüt."
              subtitle="Sizi rotasına ekleyen kişinin gelmesi garantidir. Artık amaç sadece gelmesi değil, geldiğinde daha çok harcamasıdır. FOMO (Kayıp Kaçınma) tetikleyicisiyle sepet tutarını ikiye katlayın."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <span className="text-white font-black text-[20px] tracking-tight">Upsell (Sepet Büyütme)</span>
              </div>

              <div className="flex-1 p-5 relative z-10 flex flex-col bg-[#050811]">
                
                {/* Rotadaki Araç Simülasyonu */}
                <div className="bg-[#121A2B] border border-[#4ADE80]/30 rounded-[24px] p-5 mb-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#4ADE80]/10 blur-2xl rounded-full" />
                  
                  <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-[#4ADE80]/20 flex items-center justify-center">
                      <MapPin size={24} className="text-[#4ADE80]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-black text-[16px]">Rotasına Ekleyenler</span>
                      <span className="text-[#4ADE80] text-[11px] font-bold">Son 1 Saatte 12 Araç</span>
                    </div>
                  </div>

                  <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex justify-between items-center relative z-10">
                    <span className="text-white/60 text-[11px] font-bold">Ortalama Kalan Mesafe:</span>
                    <span className="text-white font-mono font-black text-[14px]">~ 5 KM</span>
                  </div>
                </div>

                {!upsellSent ? (
                  <motion.div className="flex flex-col gap-4 mt-auto">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-[20px]">
                      <span className="text-white/60 text-[9px] font-black tracking-widest uppercase block mb-2">TETİKLENEN PSİKOLOJİ</span>
                      <p className="text-white/80 text-[12px] font-medium leading-relaxed">
                        Kuponun süresiz olması ertelenmesine yol açar. Hafif bir süre baskısı satışı garantiler.
                      </p>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                      onClick={() => setUpsellSent(true)}
                      className="w-full bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-[#050811] font-black text-[13px] py-4 rounded-xl shadow-[0_5px_20px_rgba(74,222,128,0.4)] tracking-widest flex items-center justify-center gap-2"
                    >
                      <Clock size={16} /> YAKLAŞANLARA BİLDİRİM AT
                    </motion.button>
                  </motion.div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                      <div className="w-16 h-16 bg-[#4ADE80]/20 rounded-full flex items-center justify-center mb-4 border border-[#4ADE80]/50">
                        <CheckCircle2 size={32} className="text-[#4ADE80]" />
                      </div>
                    </motion.div>
                    <span className="text-white font-bold text-[15px] mb-1">Bildirim Gönderildi</span>
                    <span className="text-white/50 text-[11px] text-center px-4">
                      Sizi rotasına ekleyen araçlara 45 dakika geçerli %15 indirim tanımlandı.
                    </span>

                    <motion.div 
                      initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}
                      className="mt-8 bg-white/5 border border-[#4ADE80]/30 rounded-2xl p-4 w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <BarChart2 size={16} className="text-[#4ADE80]" />
                        <span className="text-white/80 text-[11px] font-bold">Kasadaki Dönüşüm</span>
                      </div>
                      <span className="text-[#4ADE80] font-black text-[14px]">+ %32</span>
                    </motion.div>
                  </div>
                )}

              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}