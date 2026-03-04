'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Ticket, Gift, Percent, Clock, 
  TrendingUp, QrCode, ShieldCheck, 
  CheckCircle2, Users, Coffee, 
  BarChart3, PlusCircle, ScanLine
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

export default function MerchantCouponFeature({ activeIndex = 0 }: { activeIndex?: number }) {
  // Kupon & Sadakat Yönetimi Renkleri
  const colors = {
    brandYellow: '#F59E0B', // Kupon / Hediye
    brandBlue: '#3B82F6',   // Zaman / Ölü Saatler
    brandGreen: '#10B981',  // ROI / Tahsilat
    darkBg: '#050811',
    panelBg: '#121A2B'
  }

  const stepShellClass = 'w-full max-w-6xl min-h-[700px] grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center z-10'
  const phoneShellClass = 'w-full max-w-[360px] lg:min-w-[360px] lg:max-w-[360px] h-[640px] bg-[#050811] rounded-[44px] border-[10px] border-[#1E293B] shadow-[0_42px_80px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden relative shrink-0'
  
  const [ticketCreated, setTicketCreated] = useState(false)
  const [timeTraffic, setTimeTraffic] = useState([80, 40, 20, 30, 90, 100])
  const [scanActive, setScanActive] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Adım 0: Kupon Üretim Animasyonu
  useEffect(() => {
    if (activeIndex === 0) {
      setTicketCreated(false)
      const timer = setTimeout(() => setTicketCreated(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [activeIndex])

  // Adım 1: Ölü Saatlerin Canlanması Animasyonu
  useEffect(() => {
    if (activeIndex === 1) {
      setTimeTraffic([80, 40, 20, 30, 90, 100]) // 14:00 - 16:00 arası düşük (20, 30)
      const timer = setTimeout(() => {
        setTimeTraffic([80, 40, 85, 90, 90, 100]) // Kupon sonrası yükseliş
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [activeIndex])

  // Adım 2: QR Okuma Animasyonu
  useEffect(() => {
    if (activeIndex === 2) {
      setScanActive(true)
      setPaymentSuccess(false)
      const timer = setTimeout(() => {
        setScanActive(false)
        setPaymentSuccess(true)
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [activeIndex])

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-transparent p-6 lg:p-12 font-sans">
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F59E0B]/5 blur-[150px]" />

      <AnimatePresence mode="wait">
        
        {/* ========================================================= */}
        {/* ADIM 0: KUPON OLUŞTURMA (Karşılıklılık İlkesi) */}
        {/* ========================================================= */}
        {activeIndex === 0 && (
          <motion.div 
            key="step0" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Gift} color={colors.brandYellow}
              title1="Küçük Bir Jest," title2="Kalıcı Bir Sadakat."
              subtitle="Kupon dağıtmak kârdan zarar etmek değildir; misafirlerinizle aranızda sarsılmaz bir bağ kurmanın en zarif yoludur. Doğru zamanda verilen küçük bir hediye, ilk ziyareti kalıcı bir alışkanlığa dönüştürür."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <span className="text-white font-black text-[20px] tracking-tight">Kupon Üretici</span>
              </div>

              <div className="flex-1 p-5 relative z-10 flex flex-col bg-[#050811] overflow-y-auto">
                
                {/* Kupon Tipleri (coupon_management_page.dart birebir) */}
                <span className="text-white/40 text-[10px] font-black tracking-widest uppercase block mb-3 ml-1">KUPON TÜRÜ</span>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center opacity-50">
                    <Percent size={18} className="text-white mb-1" />
                    <span className="text-white font-bold text-[11px]">Yüzde İndirim</span>
                  </div>
                  <div className="bg-[#F59E0B]/15 border border-[#F59E0B]/40 rounded-2xl p-3 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.15)] relative overflow-hidden">
                    <div className="absolute top-1 right-2 w-1.5 h-1.5 bg-[#F59E0B] rounded-full" />
                    <Coffee size={18} className="text-[#F59E0B] mb-1" />
                    <span className="text-white font-black text-[11px]">Bedava Ürün</span>
                  </div>
                </div>

                <AnimatePresence>
                  {!ticketCreated ? (
                    <motion.div 
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="flex-1 flex flex-col gap-4"
                    >
                      <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                        <span className="text-white/40 text-[10px] font-bold block mb-1">Hediye Edilecek Ürün</span>
                        <span className="text-white font-black text-[14px]">Taze Filtre Kahve</span>
                      </div>
                      <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                        <span className="text-white/40 text-[10px] font-bold block mb-1">Kullanım Limiti</span>
                        <span className="text-white font-black text-[14px]">Sadece İlk Ziyaret</span>
                      </div>
                      <button className="mt-auto w-full bg-[#F59E0B] text-[#050811] font-black text-[13px] py-4 rounded-xl shadow-[0_5px_15px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2">
                        <PlusCircle size={18} /> KUPONU OLUŞTUR
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring' }}
                      className="flex-1 flex flex-col items-center justify-center relative"
                    >
                      {/* Fiziksel Bilet Simülasyonu */}
                      <div className="w-full bg-gradient-to-b from-[#F59E0B] to-[#D97706] rounded-2xl p-1 relative shadow-[0_15px_35px_rgba(245,158,11,0.3)]">
                        {/* Çentikler */}
                        <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#050811] rounded-full -translate-y-1/2" />
                        <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#050811] rounded-full -translate-y-1/2" />
                        
                        <div className="bg-[#121A2B] rounded-xl p-5 border border-white/10 border-dashed text-center">
                          <Coffee size={32} className="text-[#F59E0B] mx-auto mb-2" />
                          <span className="text-white font-black text-[20px] block leading-tight">1 Ücretsiz<br/>Kahve</span>
                          <div className="w-full h-px border-b border-dashed border-white/20 my-4" />
                          <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">İlk Ziyarete Özel</span>
                        </div>
                      </div>
                      <div className="bg-white/10 text-white/80 px-4 py-2 rounded-full text-[11px] font-bold mt-6 flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-[#22C55E]" /> Cüzdanlara Dağıtıldı
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 1: ÖLÜ SAAT YÖNETİMİ (Zaman Bazlı Segmentasyon) */}
        {/* ========================================================= */}
        {activeIndex === 1 && (
          <motion.div 
            key="step1" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Clock} color={colors.brandBlue}
              title1="Ölü Saatleri," title2="Fırsata Çevirin."
              subtitle="Tesisinizin öğleden sonra boş kaldığı saatleri akıllı algoritmalarla tespit edin. Sadece o saat diliminde geçerli dinamik kuponlar üreterek, günün her anında kapasitenizi tam verimle kullanın."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
                    <BarChart3 size={18} className="text-[#3B82F6]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-black text-[16px] leading-tight">Trafik Yoğunluğu</span>
                    <span className="text-[#3B82F6] text-[11px] font-bold">Saatlik Analiz</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-5 flex flex-col bg-[#050811]">
                
                {/* Saatlik Bar Grafiği */}
                <div className="bg-[#121A2B] border border-white/10 rounded-[24px] p-5 mb-6 shadow-xl">
                  <div className="flex items-end justify-between h-32 border-b border-white/10 pb-2 gap-2 relative">
                    
                    {/* Ölü Saat Vurgu Alanı */}
                    <div className="absolute left-[34%] right-[34%] top-0 bottom-0 bg-[#3B82F6]/10 border-x border-dashed border-[#3B82F6]/40 rounded-t-lg flex flex-col items-center justify-start pt-2">
                       <span className="text-[#3B82F6] text-[8px] font-black tracking-widest bg-[#050811] px-1 rounded">ATIL ZAMAN</span>
                    </div>

                    {timeTraffic.map((h, i) => (
                      <motion.div 
                        key={i}
                        animate={{ height: `${h}%` }}
                        transition={{ type: 'spring', stiffness: 50 }}
                        className={`w-full rounded-t-md relative z-10 ${i === 2 || i === 3 ? 'bg-[#3B82F6] shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-white/20'}`} 
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-white/40 text-[10px] font-bold px-1">
                    <span>10:00</span>
                    <span className="text-[#3B82F6]">14:00</span>
                    <span className="text-[#3B82F6]">16:00</span>
                    <span>20:00</span>
                  </div>
                </div>

                {/* Dinamik Kupon Aktivasyonu */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="bg-gradient-to-br from-[#102447] to-[#0A162B] border border-[#3B82F6]/40 rounded-[20px] p-5 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-[#3B82F6] text-white px-3 py-1 text-[9px] font-black rounded-bl-xl tracking-widest">
                    OTOMATİK AKTİF
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <Clock size={20} className="text-[#3B82F6]" />
                    <span className="text-white font-black text-[15px]">Öğle Arası %25</span>
                  </div>
                  <p className="text-white/70 text-[11px] font-medium leading-relaxed mb-4">
                    Sistem 14:00 - 16:00 arası trafik düşüşünü tespit etti. Yakındaki 450 misafire cazip indirim kuponu iletildi.
                  </p>
                  <div className="flex items-center gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5">
                    <Users size={14} className="text-[#3B82F6]" />
                    <span className="text-white font-bold text-[11px]">+32 Yeni Rezervasyon Alındı</span>
                  </div>
                </motion.div>

              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 2: ÖLÇÜLEBİLİR GETİRİ VE POS (Kusursuz Tahsilat) */}
        {/* ========================================================= */}
        {activeIndex === 2 && (
          <motion.div 
            key="step2" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={TrendingUp} color={colors.brandGreen}
              title1="Ölçülebilir Getiri," title2="Pürüzsüz Tahsilat."
              subtitle="Dağıttığınız her kuponun kasanıza ne kadar net ciro getirdiğini (ROI) anlık izleyin. Misafirleriniz QR kodunu okuttuğunda indirim otomatik yansır; ödeme güvence altına alınır, muhasebe karmaşası yaşanmaz."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <span className="text-white font-black text-[20px] tracking-tight">Kasa & Tahsilat</span>
              </div>

              <div className="flex-1 p-5 relative z-10 flex flex-col bg-[#050811]">
                
                {/* QR Okuyucu Alanı */}
                <div className="w-full aspect-[4/3] rounded-[24px] border-2 border-[#10B981]/30 bg-[#121A2B] relative flex flex-col items-center justify-center overflow-hidden shadow-inner mb-6">
                  
                  {!paymentSuccess ? (
                    <>
                      <QrCode size={48} className="text-white/20 mb-3" />
                      <span className="text-white/60 text-[11px] font-bold uppercase tracking-widest">Misafir Kodunu Okutun</span>
                      
                      {scanActive && (
                        <motion.div 
                          className="absolute left-0 right-0 h-1.5 bg-[#10B981] shadow-[0_0_20px_#10B981]"
                          animate={{ top: ['10%', '90%', '10%'] }}
                          transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                        />
                      )}
                    </>
                  ) : (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center text-center"
                    >
                      <div className="w-16 h-16 bg-[#10B981] rounded-full flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                        <CheckCircle2 size={32} className="text-[#050811]" />
                      </div>
                      <span className="text-white font-black text-[18px]">Tahsilat Onaylandı</span>
                      <span className="text-white/70 text-[12px] font-medium mt-1">"%15 İndirim" Uygulandı</span>
                    </motion.div>
                  )}
                </div>

                {/* ROI (Yatırım Getirisi) Dashboard */}
                <div className="mt-auto">
                  <span className="text-white/40 text-[10px] font-black tracking-widest uppercase ml-1 block mb-3">KAMPANYA PERFORMANSI (ROI)</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#121A2B] border border-white/10 rounded-[20px] p-4 flex flex-col">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-2">
                        <Ticket size={14} className="text-white/60" />
                      </div>
                      <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-0.5">Kullanılan</span>
                      <span className="text-white font-black text-[20px]">142 <span className="text-white/30 text-[12px]">Adet</span></span>
                    </div>
                    
                    <div className="bg-gradient-to-br from-[#062618] to-[#121A2B] border border-[#10B981]/40 rounded-[20px] p-4 flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-[#10B981]/10 rounded-full blur-xl" />
                      <div className="w-8 h-8 rounded-full bg-[#10B981]/20 flex items-center justify-center mb-2 relative z-10">
                        <TrendingUp size={14} className="text-[#10B981]" />
                      </div>
                      <span className="text-[#10B981] text-[10px] font-bold uppercase tracking-wider mb-0.5 relative z-10">Net Getiri</span>
                      <span className="text-white font-black text-[20px] relative z-10">+42.5K <span className="text-[#10B981] text-[12px]">₺</span></span>
                    </div>
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