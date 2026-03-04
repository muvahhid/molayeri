'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PieChart, DollarSign, Wallet, QrCode, 
  ShieldCheck, TrendingUp, CheckCircle2, 
  ArrowRightLeft, Building, Zap, FileText,
  BadgeCheck, Clock
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

export default function MerchantRevenueFeature({ activeIndex = 0 }: { activeIndex?: number }) {
  // Finans ve POS Renkleri
  const colors = {
    brandCoral: '#FF5D5D',  // Finansal Kokpit / Analiz
    brandPurple: '#A855F7', // POS ve QR Hızı
    brandGreen: '#10B981',  // Cüzdan, Güven ve İyzico
    darkBg: '#050811',
    panelBg: '#121A2B'
  }

  const stepShellClass = 'w-full max-w-6xl min-h-[700px] grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center z-10'
  const phoneShellClass = 'w-full max-w-[360px] lg:min-w-[360px] lg:max-w-[360px] h-[640px] bg-[#050811] rounded-[44px] border-[10px] border-[#1E293B] shadow-[0_42px_80px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden relative shrink-0'
  
  // Animasyon stateleri
  const [revenueAmount, setRevenueAmount] = useState(0)
  const [scanActive, setScanActive] = useState(false)
  const [checkoutComplete, setCheckoutComplete] = useState(false)
  const [payoutStatus, setPayoutStatus] = useState<'idle' | 'processing' | 'success'>('idle')

  // Adım 0: Ciro sayacı animasyonu
  useEffect(() => {
    if (activeIndex === 0) {
      setRevenueAmount(0)
      const interval = setInterval(() => {
        setRevenueAmount(prev => {
          if (prev >= 142500) {
            clearInterval(interval)
            return 142500
          }
          return prev + 4500
        })
      }, 30)
      return () => clearInterval(interval)
    }
  }, [activeIndex])

  // Adım 1: QR Okuma animasyonu
  useEffect(() => {
    if (activeIndex === 1) {
      setScanActive(true)
      setCheckoutComplete(false)
      const timer = setTimeout(() => {
        setScanActive(false)
        setCheckoutComplete(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [activeIndex])

  // Adım 2: Ödeme Alma (Payout) animasyonu sıfırlama
  useEffect(() => {
    if (activeIndex === 2) {
      setPayoutStatus('idle')
    }
  }, [activeIndex])

  const handlePayout = () => {
    if (payoutStatus !== 'idle') return
    setPayoutStatus('processing')
    setTimeout(() => setPayoutStatus('success'), 2000)
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-transparent p-6 lg:p-12 font-sans">
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF5D5D]/5 blur-[150px]" />

      <AnimatePresence mode="wait">
        
        {/* ========================================================= */}
        {/* ADIM 0: FİNANSAL KOKPİT (Şeffaflık ve Net Ciro) */}
        {/* ========================================================= */}
        {activeIndex === 0 && (
          <motion.div 
            key="step0" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={PieChart} color={colors.brandCoral}
              title1="Karmaşık Muhasebe Bitti," title2="Net Ciro Cebinizde."
              subtitle="Gün sonu hesaplaşmaları, karmaşık excel tabloları ve kayıp kupon maliyetleriyle uğraşmayın. Finansal kokpitiniz, dağıttığınız indirimlerin ardından kasanıza giren NET rakamı anlık ve şeffaf olarak gösterir."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-white font-black text-[20px] tracking-tight">Finansal Özet</span>
                  <div className="bg-white/5 px-2 py-1 rounded border border-white/10 flex items-center gap-1">
                    <Clock size={12} className="text-white/60" />
                    <span className="text-white/80 font-bold text-[10px]">Bugün</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-5 relative z-10 flex flex-col bg-[#050811] overflow-y-auto">
                
                {/* Ana Ciro Göstergesi */}
                <div className="bg-gradient-to-b from-[#FF5D5D]/20 to-[#121A2B] border border-[#FF5D5D]/40 rounded-[24px] p-6 text-center shadow-[0_10px_30px_rgba(255,93,93,0.15)] relative overflow-hidden mb-5">
                  <div className="w-12 h-12 bg-[#FF5D5D] rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_#FF5D5D]">
                    <DollarSign size={24} className="text-[#050811]" />
                  </div>
                  <span className="text-[#FF5D5D] font-black text-[11px] tracking-widest uppercase block mb-1">GÜNLÜK NET CİRO</span>
                  <div className="flex justify-center items-end gap-1">
                    <span className="text-white font-black text-[40px] leading-none">
                      {revenueAmount.toLocaleString('tr-TR')}
                    </span>
                    <span className="text-white/60 font-bold text-[16px] pb-1">₺</span>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2 bg-black/40 py-1.5 px-3 rounded-full w-max mx-auto border border-white/5">
                    <TrendingUp size={12} className="text-[#22C55E]" />
                    <span className="text-[#22C55E] text-[10px] font-bold">Düne göre +%18</span>
                  </div>
                </div>

                {/* Brüt - Kesinti Tablosu */}
                <div className="bg-[#121A2B] border border-white/10 rounded-[20px] p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-[12px] font-bold">Brüt Tahsilat</span>
                    <span className="text-white font-black text-[14px]">185.000 ₺</span>
                  </div>
                  <div className="w-full h-px bg-white/5" />
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                      <span className="text-white/60 text-[12px] font-bold">Kupon & İndirim Payı</span>
                    </div>
                    <span className="text-[#F59E0B] font-black text-[14px]">- 42.500 ₺</span>
                  </div>
                </div>

                {/* Günlük Grafik Simülasyonu */}
                <div className="mt-5 flex-1 flex flex-col justify-end">
                  <span className="text-white/40 text-[10px] font-black tracking-widest uppercase mb-3">SAATLİK KASA AKIŞI</span>
                  <div className="flex items-end justify-between h-24 border-b border-white/10 pb-2">
                    {[30, 50, 40, 80, 60, 100, 90].map((h, i) => (
                      <motion.div 
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className={`w-full rounded-t-sm mx-1 ${i === 5 ? 'bg-[#FF5D5D] shadow-[0_0_10px_#FF5D5D]' : 'bg-white/20'}`} 
                      />
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 1: KASA (POS) HUB (Pürüzsüz Tahsilat) */}
        {/* ========================================================= */}
        {activeIndex === 1 && (
          <motion.div 
            key="step1" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={QrCode} color={colors.brandPurple}
              title1="Kasada Beklemek Yok," title2="Sürtünmesiz Tahsilat."
              subtitle="Misafiriniz kasaya geldiğinde cüzdan veya bozuk para aramaz. Ekranındaki tek bir QR kodu okutun; MolaYeri POS Hub hem kupon indirimini uygular hem de ödemeyi saniyeler içinde tamamlar."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <span className="text-white font-black text-[20px] tracking-tight">POS (Tahsilat) Ekranı</span>
              </div>

              <div className="flex-1 p-5 relative z-10 flex flex-col bg-[#050811] items-center justify-center">
                
                <AnimatePresence mode="wait">
                  {!checkoutComplete ? (
                    <motion.div 
                      key="scanner"
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="w-full flex flex-col items-center"
                    >
                      <div className="w-full max-w-[260px] aspect-square rounded-[32px] border-2 border-dashed border-[#A855F7]/50 bg-black/40 relative flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.15)] mb-6">
                        
                        {/* Okuyucu Köşe Çizgileri */}
                        <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-[#A855F7] rounded-tl-xl" />
                        <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-[#A855F7] rounded-tr-xl" />
                        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-[#A855F7] rounded-bl-xl" />
                        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-[#A855F7] rounded-br-xl" />

                        <QrCode size={64} className="text-white/10" />

                        {/* Lazer Tarama Animasyonu */}
                        {scanActive && (
                          <motion.div 
                            className="absolute left-0 right-0 h-1 bg-[#A855F7] shadow-[0_0_20px_#A855F7]"
                            animate={{ top: ['10%', '90%', '10%'] }}
                            transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                          />
                        )}
                      </div>
                      <span className="text-white font-bold text-[15px]">Misafir QR Kodunu Okutun</span>
                      <span className="text-white/50 text-[12px] block mt-1 text-center">İndirim tanımlaması ve ödeme<br/>tek seferde yapılacaktır.</span>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="receipt"
                      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring" }}
                      className="w-full bg-[#121A2B] border border-[#22C55E]/40 rounded-[24px] p-6 relative overflow-hidden shadow-2xl"
                    >
                      <div className="absolute top-0 left-0 right-0 h-2 bg-[#22C55E]" />
                      
                      <div className="flex flex-col items-center mb-6 mt-2">
                        <div className="w-16 h-16 bg-[#22C55E]/20 rounded-full flex items-center justify-center mb-3">
                          <CheckCircle2 size={32} className="text-[#22C55E]" />
                        </div>
                        <span className="text-white font-black text-[22px]">Ödeme Alındı</span>
                        <span className="text-white/50 text-[12px] font-medium">İşlem No: #TRX-9482</span>
                      </div>

                      <div className="bg-black/30 rounded-xl p-4 flex flex-col gap-2 mb-4 border border-white/5">
                        <div className="flex justify-between items-center text-[12px]">
                          <span className="text-white/70 font-medium">Full Enerji Paketi</span>
                          <span className="text-white font-bold">450.00 ₺</span>
                        </div>
                        <div className="flex justify-between items-center text-[12px]">
                          <span className="text-[#A855F7] font-bold">MolaYeri İndirimi</span>
                          <span className="text-[#A855F7] font-black">- 50.00 ₺</span>
                        </div>
                        <div className="w-full h-px bg-white/10 my-1" />
                        <div className="flex justify-between items-center">
                          <span className="text-white/80 font-bold text-[14px]">Çekilen Tutar</span>
                          <span className="text-[#22C55E] font-black text-[20px]">400.00 ₺</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => { setCheckoutComplete(false); setScanActive(true); setTimeout(()=>setCheckoutComplete(true), 2000) }}
                        className="w-full bg-white/5 border border-white/10 text-white font-bold text-[12px] py-3 rounded-xl hover:bg-white/10 transition-colors"
                      >
                        YENİ İŞLEM BAŞLAT
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 2: CÜZDAN & HAK EDİŞ (İyzico Güvencesi) */}
        {/* ========================================================= */}
        {activeIndex === 2 && (
          <motion.div 
            key="step2" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={ShieldCheck} color={colors.brandGreen}
              title1="Sıfır İptal Riski," title2="Garantili Hak Ediş."
              subtitle="Ters ibraz (Chargeback) veya sahte ödeme endişesine son. BDDK lisanslı İyzico altyapısıyla tüm işlemleriniz en üst düzeyde korunur ve paranız ertesi gün doğrudan işletme hesabınıza aktarılır."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <span className="text-white font-black text-[20px] tracking-tight">İşletme Cüzdanı</span>
              </div>

              <div className="flex-1 p-5 relative z-10 flex flex-col bg-[#050811]">
                
                {/* İyzico Güvence Kartı */}
                <div className="bg-gradient-to-br from-[#10B981]/20 to-[#121A2B] border border-[#10B981]/40 rounded-[24px] p-6 relative overflow-hidden mb-4">
                  <div className="absolute top-0 right-0 bg-[#10B981] text-[#050811] text-[9px] font-black px-3 py-1.5 rounded-bl-xl tracking-widest flex items-center gap-1">
                    <BadgeCheck size={10} /> BDDK LİSANSLI
                  </div>
                  
                  <span className="text-white/80 text-[11px] font-bold uppercase tracking-widest block mb-2">ÇEKİLEBİLİR BAKİYE</span>
                  <div className="flex items-end gap-1 mb-4">
                    <span className="text-white font-black text-[38px] leading-none">42.500</span>
                    <span className="text-[#10B981] font-bold text-[16px] pb-1">,00 ₺</span>
                  </div>

                  <div className="flex items-center gap-2 bg-black/30 border border-white/5 p-2 rounded-lg mb-5 w-max">
                    <Building size={14} className="text-white/60" />
                    <span className="text-white/80 text-[10px] font-mono">TR42 0006 **** **** 9238</span>
                  </div>

                  {/* Para Çekme Butonu */}
                  <motion.button 
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                    onClick={handlePayout}
                    className={`w-full font-black text-[13px] py-4 rounded-xl tracking-widest flex items-center justify-center gap-2 transition-colors ${payoutStatus === 'success' ? 'bg-[#10B981] text-[#050811]' : 'bg-white text-[#050811] shadow-[0_5px_15px_rgba(255,255,255,0.2)]'}`}
                  >
                    {payoutStatus === 'idle' && <><ArrowRightLeft size={16} /> BANKA HESABINA AKTAR</>}
                    {payoutStatus === 'processing' && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Zap size={18} /></motion.div>}
                    {payoutStatus === 'success' && <><CheckCircle2 size={18} /> AKTARIM BAŞLADI</>}
                  </motion.button>
                </div>

                {/* Bilgi / Güven Maddeleri */}
                <div className="flex flex-col gap-3 mt-2">
                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#3B82F6]/20 flex items-center justify-center shrink-0">
                      <ShieldCheck size={14} className="text-[#3B82F6]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-[12px]">İyzico Koruması</span>
                      <span className="text-white/50 text-[10px] mt-0.5">Ödemeleriniz %100 güvence altındadır.</span>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 flex items-center justify-center shrink-0">
                      <Clock size={14} className="text-[#F59E0B]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-[12px]">Ertesi Gün Ödeme</span>
                      <span className="text-white/50 text-[10px] mt-0.5">Talebiniz ilk iş günü hesabınıza yatar.</span>
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