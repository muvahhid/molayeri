'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingBag, Package, Zap, Coffee, 
  UtensilsCrossed, BatteryCharging, ArrowRight,
  MousePointerClick, CheckCircle2, Tag, 
  TrendingUp, Car, Sparkles, ChevronRight
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

export default function MerchantVitrinFeature({ activeIndex = 0 }: { activeIndex?: number }) {
  // Vitrin & Nöro-Satış Renkleri
  const colors = {
    brandGreen: '#4ADE80',  // Ana Vitrin Rengi (Büyüme/Satış)
    brandGold: '#FBBF24',   // Premium / Çapalama
    brandBlue: '#3B82F6',   // Bekleme / Şarj
    darkBg: '#050811',
    panelBg: '#121A2B'
  }

  const stepShellClass = 'w-full max-w-6xl min-h-[700px] grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center z-10'
  const phoneShellClass = 'w-full max-w-[360px] lg:min-w-[360px] lg:max-w-[360px] h-[640px] bg-[#050811] rounded-[44px] border-[10px] border-[#1E293B] shadow-[0_42px_80px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden relative shrink-0'
  
  // Animasyon stateleri
  const [bundleStep, setBundleStep] = useState(0)
  const [crossSellSent, setCrossSellSent] = useState(false)

  // Adım 1: Paketleme animasyonu döngüsü
  useEffect(() => {
    if (activeIndex === 1) {
      setBundleStep(0)
      const interval = setInterval(() => {
        setBundleStep(prev => (prev >= 2 ? 0 : prev + 1))
      }, 2500)
      return () => clearInterval(interval)
    }
  }, [activeIndex])

  // Adım 2: Çapraz satış bekleme sıfırlama
  useEffect(() => {
    if (activeIndex === 2) {
      setCrossSellSent(false)
    }
  }, [activeIndex])

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-transparent p-6 lg:p-12 font-sans">
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4ADE80]/5 blur-[150px]" />

      <AnimatePresence mode="wait">
        
        {/* ========================================================= */}
        {/* ADIM 0: ÇAPALAMA ETKİSİ (Anchoring / Fiyat Psikolojisi) */}
        {/* ========================================================= */}
        {activeIndex === 0 && (
          <motion.div 
            key="step0" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={TrendingUp} color={colors.brandGreen}
              title1="Fiyat Algısını Yönet," title2="Sepeti Büyüt."
              subtitle="Müşterinin beyni ilk gördüğü fiyata demir atar. Menünüzün en üstüne 'Premium' bir seçenek yerleştirerek, orta segment ürünlerinizin satışını %45 oranında artırın."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <span className="text-white font-black text-[20px] tracking-tight">Dijital Vitrin</span>
                <span className="text-[#4ADE80] text-[11px] font-bold block mt-1">Sürücü Görünümü (Canlı)</span>
              </div>

              <div className="flex-1 p-5 relative z-10 flex flex-col bg-[#050811] overflow-y-auto">
                <span className="text-white/40 text-[10px] font-black tracking-widest uppercase mb-4 block text-center">MENÜ SEÇİMİ</span>

                {/* Çapalama: 3'lü Fiyat Kartları */}
                <div className="flex flex-col gap-4">
                  
                  {/* Premium Kart (Çıpa / Anchor) */}
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                    className="bg-gradient-to-r from-[#FBBF24]/10 to-[#121A2B] border border-[#FBBF24]/40 rounded-[20px] p-4 relative"
                  >
                    <div className="absolute -top-2.5 right-4 bg-[#FBBF24] text-[#050811] px-2 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1 shadow-[0_0_10px_#FBBF24]">
                      <Sparkles size={10} /> VİP DENEYİM
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-black text-[15px]">Full Enerji Paketi</span>
                      <span className="text-[#FBBF24] font-black text-[18px]">450 ₺</span>
                    </div>
                    <span className="text-white/50 text-[11px] font-medium">Izgara Et + Tatlı + Sınırsız Kahve + Araç Yıkama</span>
                  </motion.div>

                  {/* Hedeflenen Orta Kart (Satılmak İstenen) */}
                  <motion.div 
                    initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                    className="bg-gradient-to-r from-[#4ADE80]/20 to-[#121A2B] border-2 border-[#4ADE80] rounded-[24px] p-5 shadow-[0_0_20px_rgba(74,222,128,0.2)] relative transform scale-[1.02]"
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4ADE80] text-[#050811] px-4 py-1 rounded-full text-[9px] font-black uppercase shadow-lg">
                      EN ÇOK TERCİH EDİLEN
                    </div>
                    <div className="flex justify-between items-center mb-2 mt-1">
                      <span className="text-white font-black text-[18px]">Mola Menüsü</span>
                      <span className="text-white font-black text-[22px]">280 ₺</span>
                    </div>
                    <span className="text-white/80 text-[12px] font-medium leading-relaxed block mb-4">Ev Yemeği Tabağı + Çorba + Taze Çay</span>
                    
                    <button className="w-full bg-[#4ADE80] text-[#050811] font-black text-[13px] py-3 rounded-xl flex items-center justify-center gap-2">
                      <MousePointerClick size={16} /> SEPETE EKLE
                    </button>
                  </motion.div>

                  {/* Basic Kart (Fiyat Karşılaştırması için) */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                    className="bg-white/5 border border-white/10 rounded-[20px] p-4 opacity-60"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-bold text-[14px]">Sadece Çorba</span>
                      <span className="text-white font-black text-[15px]">120 ₺</span>
                    </div>
                    <span className="text-white/40 text-[11px] font-medium">Günün Çorbası</span>
                  </motion.div>

                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 1: PAKETLEME (Decision Fatigue / Karar Yorgunluğu) */}
        {/* ========================================================= */}
        {activeIndex === 1 && (
          <motion.div 
            key="step1" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Package} color={colors.brandGreen}
              title1="Karar Yorgunluğunu Bitir," title2="Satışı Hızlandır."
              subtitle="Direksiyon başında saatlerce yorulmuş birine tek tek 40 çeşit ürün seçtirmek eziyettir. Ürünlerinizi 'Yolcu Paketlerine' dönüştürün; kasanızdaki yığılmayı bitirip dönüşüm oranını şaha kaldırın."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <span className="text-white font-black text-[20px] tracking-tight">Paket Üretici</span>
              </div>

              <div className="flex-1 p-5 relative z-10 flex flex-col bg-[#050811] items-center justify-center">
                
                {/* Animasyonlu Paketleme Süreci */}
                <div className="w-full relative h-64 flex flex-col items-center justify-center">
                  
                  {/* Tekil Ürünler */}
                  <AnimatePresence>
                    {bundleStep === 0 && (
                      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5, y: 50 }} className="flex gap-4 absolute top-10">
                        <div className="w-14 h-14 bg-[#121A2B] border border-white/10 rounded-2xl flex flex-col items-center justify-center shadow-lg">
                          <UtensilsCrossed size={20} className="text-white/60 mb-1" />
                          <span className="text-[8px] text-white/50">Ana Yemek</span>
                        </div>
                        <div className="w-14 h-14 bg-[#121A2B] border border-white/10 rounded-2xl flex flex-col items-center justify-center shadow-lg">
                          <Coffee size={20} className="text-white/60 mb-1" />
                          <span className="text-[8px] text-white/50">İçecek</span>
                        </div>
                        <div className="w-14 h-14 bg-[#121A2B] border border-white/10 rounded-2xl flex flex-col items-center justify-center shadow-lg">
                          <Tag size={20} className="text-white/60 mb-1" />
                          <span className="text-[8px] text-white/50">Tatlı</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Birleşme Animasyonu */}
                  <AnimatePresence>
                    {bundleStep === 1 && (
                      <motion.div initial={{ opacity: 0, scale: 1.5 }} animate={{ opacity: 1, scale: 1, rotate: 360 }} exit={{ opacity: 0, scale: 0 }} className="absolute z-20">
                        <div className="w-20 h-20 bg-[#4ADE80] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(74,222,128,0.5)]">
                          <Zap size={32} className="text-[#050811]" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Sonuç: Premium Paket */}
                  <AnimatePresence>
                    {bundleStep === 2 && (
                      <motion.div initial={{ opacity: 0, y: 50, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="absolute w-full px-4">
                        <div className="bg-gradient-to-b from-[#10291D] to-[#121A2B] border-2 border-[#4ADE80] rounded-[24px] p-5 text-center shadow-[0_10px_40px_rgba(74,222,128,0.2)]">
                          <Package size={40} className="text-[#4ADE80] mx-auto mb-3" />
                          <span className="text-white font-black text-[20px] block">Kamyoncu Dostu Menü</span>
                          <span className="text-[#4ADE80] text-[11px] font-bold block mt-1 uppercase tracking-widest">TEK TIKLA SATIN ALIM</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

                <div className="mt-8 text-center bg-white/5 p-4 rounded-2xl border border-white/10 w-full">
                  <span className="text-white/80 text-[12px] font-medium leading-relaxed">
                    Karmaşık menüler yerine <strong>1-Tıkla</strong> alınabilen hazır paketler sunarak kasadaki sipariş süresini %60 oranında kısaltırsınız.
                  </span>
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 2: ÇAPRAZ SATIŞ (Bekleme Süresini Nakde Çevir) */}
        {/* ========================================================= */}
        {activeIndex === 2 && (
          <motion.div 
            key="step2" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={BatteryCharging} color={colors.brandBlue}
              title1="Bekleme Alanını," title2="Satış Fırsatına Çevir."
              subtitle="Otoparkta aracını şarj eden veya yıkanmasını bekleyen müşterinin 15 ila 30 dakikası vardır. Tam o an telefonlarına düşen akıllı bir bildirimle onları tesisin içine, sıcak satışa çekin."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <span className="text-white font-black text-[20px] tracking-tight">Çapraz Satış (Cross-Sell)</span>
              </div>

              <div className="flex-1 p-5 relative z-10 flex flex-col bg-[#050811]">
                
                {/* Otopark/Şarj Durumu Dashboard */}
                <div className="bg-[#121A2B] border border-[#3B82F6]/30 rounded-[24px] p-5 relative overflow-hidden mb-6">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#3B82F6]/10 blur-2xl rounded-full" />
                  
                  <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
                      <BatteryCharging size={24} className="text-[#3B82F6]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-black text-[16px]">Şarj İstasyonu #2</span>
                      <span className="text-[#3B82F6] text-[11px] font-bold">1 Araç Beklemede</span>
                    </div>
                  </div>

                  <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex justify-between items-center relative z-10">
                    <span className="text-white/60 text-[11px] font-bold">Kalan Şarj Süresi:</span>
                    <span className="text-white font-mono font-black text-[14px]">18 DAKİKA</span>
                  </div>
                </div>

                {/* Aksiyon Butonu */}
                {!crossSellSent ? (
                  <motion.button 
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setCrossSellSent(true)}
                    className="w-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white font-black text-[13px] py-4 rounded-xl shadow-[0_5px_20px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2 mb-auto"
                  >
                    <Zap size={18} /> İÇERİ DAVET ET (İNDİRİM AT)
                  </motion.button>
                ) : (
                  <div className="flex-1 flex flex-col items-center mt-4">
                    <div className="w-16 h-16 bg-[#22C55E]/20 rounded-full flex items-center justify-center mb-3">
                      <CheckCircle2 size={32} className="text-[#22C55E]" />
                    </div>
                    <span className="text-white font-bold text-[14px]">Teklif Gönderildi</span>
                    <span className="text-white/50 text-[11px] mt-1 text-center px-4">Müşterinin telefonuna kahve indirimi iletildi.</span>
                    
                    {/* Müşteri Telefonu Pop-up Simülasyonu */}
                    <motion.div 
                      initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, type: 'spring' }}
                      className="mt-6 w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-[20px] p-4 relative"
                    >
                      <span className="absolute -top-3 left-4 bg-[#3B82F6] text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-md">
                        MÜŞTERİ EKRANI
                      </span>
                      <div className="flex items-start gap-3">
                        <Coffee size={20} className="text-white mt-1 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-[13px] leading-tight mb-1">Aracınız şarj olurken sıkılmayın! ☕</span>
                          <span className="text-white/80 text-[11px] leading-relaxed">İçeri gelin, bu mesaja özel taze kahvenizi %50 indirimli alın.</span>
                        </div>
                      </div>
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