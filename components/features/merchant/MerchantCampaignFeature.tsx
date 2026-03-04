'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Crosshair, Flame, QrCode, Store, 
  MapPin, Users, Timer, Zap, 
  CheckCircle2, ScanLine, TrendingUp,
  Tag, Send
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

export default function MerchantCityCampaignsFeature({ activeIndex = 0 }: { activeIndex?: number }) {
  // Şehir İçi İşletmeci Renkleri
  const colors = {
    brandCyan: '#06B6D4',   // Hiper-Yerel Radar
    brandPink: '#EC4899',   // Flaş Kampanya Oluşturucu
    brandYellow: '#F59E0B', // Kasa / QR Tahsilat
    darkBg: '#050811',
    panelBg: '#121A2B'
  }

  const stepShellClass = 'w-full max-w-6xl min-h-[700px] grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center z-10'
  const phoneShellClass = 'w-full max-w-[360px] lg:min-w-[360px] lg:max-w-[360px] h-[640px] bg-[#050811] rounded-[44px] border-[10px] border-[#1E293B] shadow-[0_42px_80px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden relative shrink-0'
  
  const [pulseRadius, setPulseRadius] = useState(1)
  const [typedTitle, setTypedTitle] = useState('')
  const [scanActive, setScanActive] = useState(false)

  // Adım 0: Radar animasyonu
  useEffect(() => {
    if (activeIndex === 0) {
      const interval = setInterval(() => {
        setPulseRadius(prev => prev >= 3 ? 1 : prev + 1)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [activeIndex])

  // Adım 1: Kampanya daktilo efekti
  useEffect(() => {
    if (activeIndex === 1) {
      const text = "2. Kahve Bedava!"
      let i = 0
      setTypedTitle('')
      const typeInterval = setInterval(() => {
        if (i < text.length) {
          setTypedTitle(prev => prev + text.charAt(i))
          i++
        } else {
          clearInterval(typeInterval)
        }
      }, 100)
      return () => clearInterval(typeInterval)
    }
  }, [activeIndex])

  // Adım 2: QR Scan animasyonu
  useEffect(() => {
    if (activeIndex === 2) {
      setScanActive(true)
    } else {
      setScanActive(false)
    }
  }, [activeIndex])

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-transparent p-6 lg:p-12 font-sans">
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#06B6D4]/5 blur-[150px]" />

      <AnimatePresence mode="wait">
        
        {/* ========================================================= */}
        {/* ADIM 0: HİPER-YEREL RADAR (İşletmeci Hedefleme) */}
        {/* ========================================================= */}
        {activeIndex === 0 && (
          <motion.div 
            key="step0" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Crosshair} color={colors.brandCyan}
              title1="Sokağın Hakimi," title2="Trafiğin Yöneticisi Ol."
              subtitle="Dükkanınızın önünden geçip giden binlerce insanı izlemeyi bırakın. 1 KM ila 5 KM çapındaki yaya ve sürücüleri anlık olarak tarayın, ölü saatlerinizi canlandırmak için hedef kitlenizi belirleyin."
            />

            <div className={phoneShellClass}>
              <div className="relative flex-1 flex flex-col bg-[#0F172A] overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                
                <div className="relative z-10 p-5 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-6 bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                    <span className="text-white font-black text-[15px]">Müşteri Radarı</span>
                    <div className="bg-[#06B6D4]/20 px-3 py-1 rounded-lg border border-[#06B6D4]/40">
                      <span className="text-[#06B6D4] font-black text-[12px]">{pulseRadius} KM Çap</span>
                    </div>
                  </div>

                  <div className="flex-1 relative flex items-center justify-center">
                    {/* İşletmeci Radar Dalgaları */}
                    <motion.div animate={{ scale: pulseRadius * 1.5, opacity: [0.6, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute w-32 h-32 rounded-full border-2 border-[#06B6D4]" />
                    <motion.div animate={{ scale: pulseRadius * 2, opacity: [0.3, 0] }} transition={{ duration: 2, delay: 0.5, repeat: Infinity }} className="absolute w-32 h-32 rounded-full border border-[#06B6D4]/50 bg-[#06B6D4]/5" />
                    
                    {/* Merkez İşletme */}
                    <div className="w-14 h-14 bg-[#06B6D4] rounded-full flex items-center justify-center shadow-[0_0_30px_#06B6D4] relative z-20">
                      <Store size={24} className="text-[#050811]" />
                    </div>

                    {/* Çevredeki Potansiyel Müşteriler (Noktalar) */}
                    <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute top-[20%] left-[30%] w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_10px_white]" />
                    <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2, delay: 0.3, repeat: Infinity }} className="absolute bottom-[25%] right-[20%] w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]" />
                    <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.8, delay: 0.7, repeat: Infinity }} className="absolute top-[40%] right-[15%] w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white]" />
                  </div>

                  {/* Sonuç Kartı */}
                  <div className="bg-[#121A2B] border border-white/10 rounded-[24px] p-5 mt-auto shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#06B6D4]/10 blur-2xl rounded-full" />
                    <span className="text-white/60 text-[10px] font-black tracking-widest uppercase mb-1 block">Taranan Potansiyel</span>
                    <div className="flex items-end gap-3 mb-4">
                      <span className="text-white font-black text-[36px] leading-none">{pulseRadius * 420}</span>
                      <span className="text-[#06B6D4] font-bold text-[13px] pb-1">Kişi Bulundu</span>
                    </div>
                    <button className="w-full bg-[#06B6D4] text-[#050811] font-black text-[12px] py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                      <Zap size={16} /> BU KİTLEYE KAMPANYA ÇIK
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 1: FLAŞ KAMPANYA YÖNETİMİ (Kıtlık Psikolojisi) */}
        {/* ========================================================= */}
        {activeIndex === 1 && (
          <motion.div 
            key="step1" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Flame} color={colors.brandPink}
              title1="Bolluk Rehavet," title2="Kıtlık Kuyruk Yaratır."
              subtitle="Gün boyu geçerli olan kampanyalar ertelenir. İşletmenizin ölü saatlerinde 'Sadece 50 Kişiye' veya 'Son 1 Saat' limitli Flaş Fırsatlar oluşturun, müşterinin beynindeki aciliyet (FOMO) düğmesine basın."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <span className="text-white font-black text-[20px] tracking-tight">Flaş Fırsat Üretici</span>
              </div>

              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 bg-[#050811]">
                
                {/* Form Alanı */}
                <div className="flex flex-col gap-2">
                  <label className="text-white/60 text-[10px] font-black tracking-widest uppercase ml-1">Fırsat Başlığı</label>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center">
                    <Tag size={16} className="text-[#EC4899] mr-3" />
                    <span className="text-white font-bold text-[14px]">{typedTitle}<span className="animate-ping text-[#EC4899]">|</span></span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-white/60 text-[10px] font-black tracking-widest uppercase ml-1">Süre Limiti</label>
                    <div className="bg-[#EC4899]/10 border border-[#EC4899]/30 rounded-2xl p-4 flex flex-col items-center justify-center">
                      <Timer size={20} className="text-[#EC4899] mb-1" />
                      <span className="text-white font-black text-[14px]">1 Saat</span>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-white/60 text-[10px] font-black tracking-widest uppercase ml-1">Stok Limiti</label>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                      <Users size={20} className="text-white/60 mb-1" />
                      <span className="text-white font-black text-[14px]">20 Kişi</span>
                    </div>
                  </div>
                </div>

                {/* Canlı Önizleme Kartı */}
                <div className="mt-2">
                  <label className="text-white/60 text-[10px] font-black tracking-widest uppercase ml-1 block mb-2">Müşteri Görünümü</label>
                  <div className="bg-gradient-to-br from-[#2A0E18] to-[#120508] border border-[#EC4899]/40 rounded-[20px] p-4 shadow-lg relative overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 bg-[#EC4899] text-white text-[8px] font-black px-2 py-1 rounded-bl-lg">SON 59 DK</div>
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="text-white font-black text-[15px]">{typedTitle || "Fırsat Başlığı"}</span>
                      <span className="text-[#EC4899] text-[11px] font-bold">12 / 20 Kupon Kaldı!</span>
                    </div>
                  </div>
                </div>

                <button className="mt-auto w-full bg-[#EC4899] text-white font-black text-[13px] py-4 rounded-2xl tracking-widest shadow-[0_5px_20px_rgba(236,72,153,0.3)] flex items-center justify-center gap-2">
                  <Send size={16} /> RADARA FIRLAT
                </button>

              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 2: KASA VE QR TAHSİLAT (POS Hub Simülasyonu) */}
        {/* ========================================================= */}
        {activeIndex === 2 && (
          <motion.div 
            key="step2" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={QrCode} color={colors.brandYellow}
              title1="Pürüzsüz Deneyim," title2="Anında Tahsilat."
              subtitle="İndirim verdiniz diye kasada kargaşa yaşanmaz. Müşteri dijital cüzdanındaki bileti okutur; MolaYeri POS sisteminiz hem indirimi onaylar hem de ödemeyi saniyeler içinde güvenceye alır."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <span className="text-white font-black text-[20px] tracking-tight">Kasa (POS) Paneli</span>
              </div>

              <div className="flex-1 p-5 relative z-10 h-full flex flex-col bg-[#050811] items-center justify-center">
                
                {/* QR Okuyucu Kamera Alanı */}
                <div className="w-full max-w-[260px] aspect-square rounded-[32px] border-2 border-dashed border-[#F59E0B]/50 bg-black/40 relative flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                  
                  {/* Okuyucu Köşe Çizgileri */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-[#F59E0B] rounded-tl-xl" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-[#F59E0B] rounded-tr-xl" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-[#F59E0B] rounded-bl-xl" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-[#F59E0B] rounded-br-xl" />

                  <QrCode size={64} className="text-white/10" />

                  {/* Lazer Tarama Animasyonu */}
                  {scanActive && (
                    <motion.div 
                      className="absolute left-0 right-0 h-1 bg-[#F59E0B] shadow-[0_0_15px_#F59E0B]"
                      animate={{ top: ['10%', '90%', '10%'] }}
                      transition={{ duration: 2.5, ease: "linear", repeat: Infinity }}
                    />
                  )}
                </div>

                <div className="text-center mt-6">
                  <span className="text-white font-bold text-[15px]">Müşteri QR Kodunu Okutun</span>
                  <span className="text-white/50 text-[12px] block mt-1">İndirim ve ödeme otomatik çekilecektir.</span>
                </div>

                {/* Başarılı İşlem Pop-up (Simüle Edilmiş) */}
                <motion.div 
                  initial={{ y: 50, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  transition={{ delay: 1.5, type: 'spring' }}
                  className="absolute bottom-6 left-5 right-5 bg-[#22C55E] rounded-2xl p-4 shadow-[0_10px_30px_rgba(34,197,94,0.3)] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-black text-[14px]">Tahsilat Başarılı</span>
                      <span className="text-white/80 text-[10px] font-bold">2. Kahve Bedava Kuponu Kullanıldı</span>
                    </div>
                  </div>
                  <span className="text-white font-black text-[18px]">140 ₺</span>
                </motion.div>

              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}