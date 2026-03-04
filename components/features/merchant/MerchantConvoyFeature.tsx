'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, CarFront, MessageSquare, ShieldCheck, 
  MapPin, CheckCircle2, TrendingUp, Navigation, 
  Gift, Crown, Zap, Handshake, Send // Send importu eklendi
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

export default function MerchantConvoyFeature({ activeIndex = 0 }: { activeIndex?: number }) {
  // B2B Konvoy & Müzakere Renkleri
  const colors = {
    brandTurquoise: '#22D3EE', // Ana Konvoy Rengi
    brandPurple: '#A855F7',    // VIP / Müzakere
    brandGreen: '#10B981',     // Toplu Tahsilat / Onay
    darkBg: '#050811',
    panelBg: '#121A2B'
  }

  const stepShellClass = 'w-full max-w-6xl min-h-[700px] grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center z-10'
  const phoneShellClass = 'w-full max-w-[360px] lg:min-w-[360px] lg:max-w-[360px] h-[640px] bg-[#050811] rounded-[44px] border-[10px] border-[#1E293B] shadow-[0_42px_80px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden relative shrink-0'
  
  const [radarPing, setRadarPing] = useState(0)
  const [distance, setDistance] = useState(18.5)
  const [chatStep, setChatStep] = useState(0)

  // Adım 0: Konvoy Radarı Hareketi
  useEffect(() => {
    if (activeIndex === 0) {
      const interval = setInterval(() => setRadarPing(p => p + 1), 2000)
      return () => clearInterval(interval)
    }
  }, [activeIndex])

  // Adım 1: Chat/Müzakere Akışı
  useEffect(() => {
    if (activeIndex === 1) {
      setChatStep(0)
      const t1 = setTimeout(() => setChatStep(1), 1500) // İşletmeci teklif atar
      const t2 = setTimeout(() => setChatStep(2), 3500) // Kaptan "Kabul Edildi" döner
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [activeIndex])

  // Adım 2: Konvoyun Yaklaşması
  useEffect(() => {
    if (activeIndex === 2) {
      setDistance(18.5)
      const interval = setInterval(() => {
        setDistance(prev => {
          if (prev <= 0.1) {
            clearInterval(interval)
            return 0
          }
          return prev - 0.4
        })
      }, 100)
      return () => clearInterval(interval)
    }
  }, [activeIndex])

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-transparent p-6 lg:p-12 font-sans">
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#22D3EE]/5 blur-[150px]" />

      <AnimatePresence mode="wait">
        
        {/* ========================================================= */}
        {/* ADIM 0: KONVOY RADARI (Topluluk Sinerjisi) */}
        {/* ========================================================= */}
        {activeIndex === 0 && (
          <motion.div 
            key="step0" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Users} color={colors.brandTurquoise}
              title1="Grup Sinerjisi," title2="VIP Karşılamayla Başlar."
              subtitle="Kalabalık gruplara tek tek ulaşmak yerine, konvoy kaptanına grubuna özel şık bir davet sunun. Lider davetinizi kabul ettiğinde, tüm ekip ayrıcalıklı hizmetinizle tanışsın ve sadık müşteriniz olsun."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <span className="text-white font-black text-[20px] tracking-tight">Grup Keşif Radarı</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" />
                  <span className="text-[#22D3EE] text-[11px] font-bold">Yaklaşan Gruplar Aranıyor...</span>
                </div>
              </div>

              <div className="flex-1 p-5 relative z-10 flex flex-col bg-[#050811] overflow-hidden">
                
                {/* Dinamik Harita ve Konvoy Hareketi */}
                <div className="flex-1 relative border border-white/10 rounded-[24px] bg-[#121A2B] overflow-hidden mb-4 flex items-center justify-center shadow-inner">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                  
                  {/* Tesis */}
                  <div className="absolute top-6 right-6 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20">
                    <MapPin size={20} className="text-white" />
                  </div>

                  {/* Konvoy Grubu (3 Araç Birlikte Hareket Eder) */}
                  <motion.div 
                    className="absolute bottom-10 left-6 flex flex-col gap-2"
                    animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {/* Kaptan (VIP) */}
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-[#22D3EE] rounded-full flex items-center justify-center shadow-[0_0_20px_#22D3EE] relative z-20">
                        <Crown size={20} className="text-[#050811]" />
                      </div>
                      <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                        <span className="text-white font-bold text-[10px]">İzmir Gezginleri (6 Araç)</span>
                      </div>
                    </div>
                    {/* Üyeler */}
                    <div className="flex gap-2 ml-4">
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center border border-white/30"><CarFront size={12} className="text-white/80" /></div>
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center border border-white/30"><CarFront size={12} className="text-white/80" /></div>
                      <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center border border-white/30"><span className="text-white/60 text-[9px] font-black">+3</span></div>
                    </div>
                  </motion.div>
                </div>

                <div className="bg-gradient-to-r from-[#22D3EE]/20 to-[#121A2B] border border-[#22D3EE]/40 rounded-[20px] p-4 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className="text-white font-black text-[15px]">İzmir Gezginleri</span>
                      <span className="text-white/60 text-[11px] font-bold">Kaptan: Kemal K. • 15 Kişi</span>
                    </div>
                    <div className="bg-[#22D3EE] text-[#050811] px-2 py-1 rounded-md text-[10px] font-black uppercase">
                      24 KM KALDI
                    </div>
                  </div>
                  
                  <button className="w-full bg-[#22D3EE] text-[#050811] font-black text-[12px] py-3 rounded-xl shadow-[0_5px_15px_rgba(34,211,238,0.3)] tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                    <Gift size={16} /> KAPTANA ÖZEL DAVET GÖNDER
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 1: DİJİTAL MÜZAKERE (Misafirperverlik) */}
        {/* ========================================================= */}
        {activeIndex === 1 && (
          <motion.div 
            key="step1" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Handshake} color={colors.brandPurple}
              title1="Anlaşmayı Dijitalde Kur," title2="Kapıda Sadece Gülümse."
              subtitle="Grup kapıya geldiğinde yaşanan ödeme ve fiyat karmaşasına son verin. Uygulama üzerinden karşılıklı mutabakat sağlayın, misafirleriniz tesise geldiğinde sadece sizin VIP hizmetinizin keyfini çıkarsın."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#A855F7]/20 flex items-center justify-center">
                    <Crown size={18} className="text-[#A855F7]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-black text-[16px] leading-tight">Kemal K. (Kaptan)</span>
                    <span className="text-[#A855F7] text-[11px] font-bold">Misafir İletişim Odası</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-4 flex flex-col gap-4 bg-[#050811] overflow-y-auto">
                
                {/* Tesisin Attığı Davet (Sağda) */}
                <AnimatePresence>
                  {chatStep >= 1 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} 
                      className="ml-auto w-[85%] bg-gradient-to-br from-[#3B1559] to-[#250D3A] border border-[#A855F7]/40 rounded-2xl rounded-tr-none p-4 shadow-lg"
                    >
                      <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                        <Gift size={14} className="text-[#A855F7]" />
                        <span className="text-white font-black text-[12px] uppercase">Grup Davetiniz</span>
                      </div>
                      <ul className="text-white/80 text-[11px] font-medium leading-relaxed mb-3 space-y-1">
                        <li>• Tüm gruba kasada <strong className="text-white">%15 Misafir İndirimi</strong></li>
                        <li>• <strong className="text-[#A855F7]">Kaptana (Size) Özel</strong> İkram Menüsü</li>
                        <li>• Grubunuz için hazır ayrılmış 6 araçlık otopark</li>
                      </ul>
                      <span className="text-white/40 text-[9px] block text-right">14:32</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Kaptanın Kabul Etmesi (Solda) */}
                <AnimatePresence>
                  {chatStep >= 2 && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ type: "spring" }}
                      className="mr-auto w-[85%] bg-[#121A2B] border border-[#10B981]/40 rounded-2xl rounded-tl-none p-4 shadow-lg relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-[#10B981]/10 rounded-full blur-xl" />
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#10B981]/20 flex items-center justify-center">
                          <CheckCircle2 size={16} className="text-[#10B981]" />
                        </div>
                        <span className="text-white font-black text-[14px]">Davetiniz Onaylandı!</span>
                      </div>
                      <p className="text-white/70 text-[11px] font-medium leading-relaxed">
                        Çok naziksiniz, bu teklifinizi grubumla paylaştım. Yaklaşık 20 dakika sonra 6 araç otoparktayız.
                      </p>
                      <span className="text-white/40 text-[9px] block text-right mt-2">14:35</span>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
              
              {/* Alt Chat Bar */}
              <div className="h-[70px] bg-[#121A2B] border-t border-white/10 p-3 flex gap-2 shrink-0 items-center">
                <div className="flex-1 bg-black/40 border border-white/10 rounded-xl h-full flex items-center px-3">
                  <span className="text-white/30 text-[11px] font-medium">Mesaj yazın...</span>
                </div>
                <div className="w-12 h-full bg-white/10 rounded-xl flex items-center justify-center opacity-50">
                  <Send size={16} className="text-white" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 2: TOPLU TAHSİLAT & KARŞILAMA (Kusursuz Operasyon) */}
        {/* ========================================================= */}
        {activeIndex === 2 && (
          <motion.div 
            key="step2" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={TrendingUp} color={colors.brandGreen}
              title1="Ön Taahhüt," title2="Kusursuz Hazırlık."
              subtitle="Mola yerini önceden belirleyen konvoylar sayesinde, işletmenizde masa ve personel kapasite planlamasını mükemmel yapın. Grup geldiğinde cüzdanlarındaki tek bir QR kodu okutarak indirimlerini saniyeler içinde uygulayın."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <span className="text-white font-black text-[20px] tracking-tight">Beklenen Misafirler</span>
              </div>

              <div className="flex-1 p-5 relative z-10 flex flex-col bg-[#050811]">
                
                {/* Gelen Konvoy Kartı */}
                <div className="bg-[#121A2B] border border-[#10B981]/30 rounded-[24px] p-5 mb-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-[#10B981] text-[#050811] text-[9px] font-black px-3 py-1.5 rounded-bl-xl tracking-widest">
                    YAKLAŞIYOR
                  </div>

                  <div className="flex flex-col mb-4 mt-2">
                    <span className="text-white font-black text-[18px]">İzmir Gezginleri</span>
                    <span className="text-white/60 text-[11px] font-bold mt-1">Grup Ayrıcalığı: %15 İndirim Aktif</span>
                  </div>

                  {/* Yaklaşma Progress Bar */}
                  <div className="bg-black/40 border border-white/5 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center text-[10px] font-bold mb-2">
                      <span className="text-white/60">Kalan Mesafe</span>
                      <span className="text-[#10B981] font-mono text-[12px]">{distance.toFixed(1)} KM</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden relative">
                      <motion.div 
                        className="absolute top-0 left-0 bottom-0 bg-[#10B981]" 
                        style={{ width: `${Math.max(5, 100 - (distance / 18.5) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-2 bg-white/5 py-3 rounded-xl border border-white/5">
                    <div className="flex flex-col items-center">
                      <span className="text-white/40 text-[9px] font-black uppercase">Araç</span>
                      <span className="text-white font-black text-[16px]">6</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col items-center">
                      <span className="text-white/40 text-[9px] font-black uppercase">Misafir</span>
                      <span className="text-white font-black text-[16px]">15</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col items-center">
                      <span className="text-white/40 text-[9px] font-black uppercase">Durum</span>
                      <span className="text-[#10B981] font-black text-[12px] mt-1">Yolda</span>
                    </div>
                  </div>
                </div>

                {/* Tahsilat Butonu (Geldiğinde aktifleşir) */}
                <div className="mt-auto">
                  <AnimatePresence>
                    {distance <= 0.1 ? (
                      <motion.button 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="w-full bg-[#10B981] text-[#050811] font-black text-[14px] py-4 rounded-[16px] shadow-[0_5px_25px_rgba(16,185,129,0.4)] tracking-widest flex items-center justify-center gap-2"
                      >
                        <Zap size={18} /> GRUBU KARŞILA (QR)
                      </motion.button>
                    ) : (
                      <button className="w-full bg-white/5 border border-white/10 text-white/30 font-black text-[12px] py-4 rounded-[16px] tracking-widest cursor-not-allowed flex items-center justify-center gap-2">
                        <CarFront size={16} /> MİSAFİRLER BEKLENİYOR
                      </button>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}