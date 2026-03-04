'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Crosshair, BellRing, Target, Map, 
  Send, Zap, Navigation, Heart, 
  Smartphone, UserCheck, MapPin, 
  ChevronRight, CarFront
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

export default function MerchantTargetFeature({ activeIndex = 0 }: { activeIndex?: number }) {
  // Mikro-Lokasyon & Hedefleme Renkleri
  const colors = {
    brandPink: '#F472B6',   // Ana Geofence Rengi
    brandPurple: '#A855F7', // Niyet / Acil Durum
    brandCyan: '#06B6D4',   // Retargeting / Sadakat
    darkBg: '#050811',
    panelBg: '#121A2B'
  }

  const stepShellClass = 'w-full max-w-6xl min-h-[700px] grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center z-10'
  const phoneShellClass = 'w-full max-w-[360px] lg:min-w-[360px] lg:max-w-[360px] h-[640px] bg-[#050811] rounded-[44px] border-[10px] border-[#1E293B] shadow-[0_42px_80px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden relative shrink-0'
  
  // Animasyon stateleri
  const [vehicleCount, setVehicleCount] = useState(0)
  const [searchTyped, setSearchTyped] = useState('')
  const [notificationPop, setNotificationPop] = useState(false)

  // Adım 0: Geofence Araç Sayma
  useEffect(() => {
    if (activeIndex === 0) {
      setVehicleCount(0)
      const interval = setInterval(() => {
        setVehicleCount(prev => {
          if (prev >= 342) {
            clearInterval(interval)
            return 342
          }
          return prev + 19
        })
      }, 50)
      return () => clearInterval(interval)
    }
  }, [activeIndex])

  // Adım 1: Niyet Odaklı Arama Yazma
  useEffect(() => {
    if (activeIndex === 1) {
      const text = "Acil Yemek & Mola"
      let i = 0
      setSearchTyped('')
      const typeInterval = setInterval(() => {
        if (i < text.length) {
          setSearchTyped(prev => prev + text.charAt(i))
          i++
        } else {
          clearInterval(typeInterval)
        }
      }, 80)
      return () => clearInterval(typeInterval)
    }
  }, [activeIndex])

  // Adım 2: Kilit Ekranı Bildirimi Düşme
  useEffect(() => {
    if (activeIndex === 2) {
      setNotificationPop(false)
      const timer = setTimeout(() => {
        setNotificationPop(true)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [activeIndex])

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-transparent p-6 lg:p-12 font-sans">
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F472B6]/5 blur-[150px]" />

      <AnimatePresence mode="wait">
        
        {/* ========================================================= */}
        {/* ADIM 0: GEOFENCING (Bölgesel Hedefleme) */}
        {/* ========================================================= */}
        {activeIndex === 0 && (
          <motion.div 
            key="step0" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Target} color={colors.brandPink}
              title1="Sınırlarını Çiz," title2="Kendi Trafiğini Yarat."
              subtitle="Tesisinize 5 KM yaklaşan sürücüleri coğrafi çit (Geofence) teknolojisiyle tespit edin. Yoruldukları tam o kritik anda telefonlarına düşen hiper-yerel bir bildirimle direksiyonu size kırmalarını sağlayın."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <span className="text-white font-black text-[20px] tracking-tight">Geofence Hedefleme</span>
                <div className="flex gap-2 mt-2">
                  <span className="bg-[#F472B6]/20 text-[#F472B6] px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-[#F472B6]/30">5 KM Yarıçap</span>
                  <span className="bg-white/10 text-white/60 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest">Canlı Tarama</span>
                </div>
              </div>

              <div className="flex-1 p-5 relative z-10 flex flex-col bg-[#050811] overflow-hidden">
                
                {/* Harita ve Çit Simülasyonu */}
                <div className="flex-1 relative rounded-[24px] border border-[#F472B6]/30 bg-[#121A2B] overflow-hidden mb-5 shadow-[0_0_30px_rgba(244,114,182,0.1)] flex items-center justify-center">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                  
                  {/* Merkez Tesis */}
                  <div className="absolute z-20 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_white]">
                    <div className="w-3 h-3 bg-[#F472B6] rounded-full" />
                  </div>

                  {/* Geofence Alanı */}
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    transition={{ duration: 1 }}
                    className="absolute z-10 w-48 h-48 rounded-full border-2 border-dashed border-[#F472B6] bg-[#F472B6]/10 flex items-center justify-center"
                  >
                    <div className="absolute top-2 bg-[#F472B6] text-[#050811] px-2 py-0.5 rounded-full text-[8px] font-black">5 KM ÇİTİ</div>
                  </motion.div>

                  {/* Hedefe Giren Araçlar */}
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute top-[25%] left-[25%] z-20 text-[#F472B6]"><CarFront size={16} /></motion.div>
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }} className="absolute bottom-[20%] right-[30%] z-20 text-[#F472B6]"><CarFront size={16} /></motion.div>
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 1 }} className="absolute top-[40%] right-[20%] z-20 text-[#F472B6]"><CarFront size={16} /></motion.div>
                </div>

                <div className="bg-[#121A2B] border border-white/10 rounded-[20px] p-5 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[#F472B6]/10 blur-xl rounded-full" />
                  <span className="text-white/50 text-[10px] font-black tracking-widest uppercase block mb-1">Bölgedeki Aktif Hedef</span>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-white font-black text-[32px] leading-none">{vehicleCount}</span>
                    <span className="text-[#F472B6] font-bold text-[12px] pb-1">Araç / Sürücü</span>
                  </div>
                  <button className="w-full bg-[#F472B6] text-white font-black text-[13px] py-3.5 rounded-xl shadow-[0_5px_15px_rgba(244,114,182,0.4)] flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                    <Send size={16} /> ANLIK TEKLİF FIRLAT
                  </button>
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 1: NİYET ODAKLI HEDEFLEME (Problem Çözücü) */}
        {/* ========================================================= */}
        {activeIndex === 1 && (
          <motion.div 
            key="step1" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={Crosshair} color={colors.brandPurple}
              title1="Sorun Anında," title2="Çözüm Olarak Belir."
              subtitle="Yolculuk esnasında acil bir ihtiyaç veya özel bir tesis arayan sürücü fiyat sormaz, hızla çözüm arar. Uygulama içi aramalarda veya panik modunda, niyet odaklı hedeflemeyle doğrudan en üstte siz yer alın."
            />

            <div className={phoneShellClass}>
              <div className="bg-[#121A2B] pt-8 pb-4 px-5 border-b border-white/10 shrink-0">
                <span className="text-white font-black text-[20px] tracking-tight">Niyet Yakalama</span>
              </div>

              <div className="flex-1 p-5 relative z-10 flex flex-col bg-[#050811]">
                
                {/* Sürücü Arama Çubuğu Simülasyonu */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 mb-6">
                  <Map size={18} className="text-white/40" />
                  <span className="text-white font-bold text-[14px] flex-1">{searchTyped}<span className="animate-ping text-[#A855F7]">|</span></span>
                </div>

                <span className="text-white/40 text-[10px] font-black tracking-widest uppercase block mb-3 ml-1">SÜRÜCÜYE GÖSTERİLEN SONUÇ</span>

                {/* İşletmecinin Sponsorlu/Hedeflenmiş Kartı */}
                <AnimatePresence>
                  {searchTyped.length > 10 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-[#2A113E] to-[#13071C] border-2 border-[#A855F7]/50 rounded-[24px] p-5 shadow-[0_15px_35px_rgba(168,85,247,0.2)] relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 bg-[#A855F7] text-white text-[9px] font-black px-3 py-1.5 rounded-bl-xl tracking-widest flex items-center gap-1">
                        <Zap size={10} /> ÖNCELİKLİ ÇÖZÜM
                      </div>
                      
                      <div className="flex flex-col mb-4 mt-2">
                        <span className="text-white font-black text-[18px]">Oksijen Tesisleri O-4</span>
                        <span className="text-[#A855F7] text-[12px] font-bold mt-1">7/24 Sıcak Yemek ve Temiz Tuvalet</span>
                      </div>

                      <div className="bg-black/40 border border-white/5 rounded-xl p-3 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Navigation size={14} className="text-white/60" />
                          <span className="text-white/80 text-[11px] font-bold">Rotanızın Üzerinde</span>
                        </div>
                        <span className="text-white font-black text-[14px]">8.5 KM</span>
                      </div>

                      <button className="w-full bg-[#A855F7] text-white font-black text-[12px] py-3 rounded-xl tracking-wider hover:bg-[#9333EA] transition-colors">
                        YOL TARİFİ AL
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 2: YENİDEN PAZARLAMA (Müdavim Yaratma / Retargeting) */}
        {/* ========================================================= */}
        {activeIndex === 2 && (
          <motion.div 
            key="step2" initial={{ opacity: 0, scaleX: 0.92, scaleY: 0.98 }} animate={{ opacity: 1, scaleX: 1, scaleY: 1 }} exit={{ opacity: 0, scaleX: 0.95, scaleY: 0.99 }} transition={{ duration: 0.5 }}
            className={stepShellClass}
          >
            <HeroTitleBlock 
              icon={UserCheck} color={colors.brandCyan}
              title1="Yabancıyı," title2="Müdavime Çevir."
              subtitle="Sizi daha önce favorilerine ekleyen veya ziyaret eden misafirleriniz tekrar aynı güzergaha çıktığında reklam körlüğünü kırın. Onlara 'Hoş Geldiniz' diyen kişiselleştirilmiş bir bildirim gönderin."
            />

            <div className={phoneShellClass}>
              {/* Telefon Kilit Ekranı Simülasyonu */}
              <div className="flex-1 relative bg-[url('https://images.unsplash.com/photo-1554110397-9bac0839c7c9?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center overflow-hidden">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
                
                <div className="relative z-10 flex flex-col items-center pt-12 h-full">
                  {/* Kilit Ekranı Saati */}
                  <span className="text-white/90 font-medium text-[64px] tracking-tight leading-none drop-shadow-md">14:28</span>
                  <span className="text-white/80 font-medium text-[15px] mt-2 drop-shadow-md">14 Ekim Çarşamba</span>
                  <div className="mt-8 px-4 w-full">
                    
                    {/* Bildirim Kartı Animasyonu */}
                    <AnimatePresence>
                      {notificationPop && (
                        <motion.div 
                          initial={{ y: -50, opacity: 0, scale: 0.9 }} 
                          animate={{ y: 0, opacity: 1, scale: 1 }} 
                          transition={{ type: "spring", stiffness: 150, damping: 15 }}
                          className="w-full bg-[#121A2B]/80 backdrop-blur-xl border border-white/20 rounded-[24px] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.5)] relative overflow-hidden"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#06B6D4]" />
                          
                          <div className="flex justify-between items-center mb-2 pl-2">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-[#06B6D4] rounded-md flex items-center justify-center">
                                <Heart size={10} className="text-[#050811] fill-[#050811]" />
                              </div>
                              <span className="text-white/60 text-[11px] font-bold tracking-widest uppercase">MolaYeri</span>
                            </div>
                            <span className="text-white/40 text-[10px] font-medium">Şimdi</span>
                          </div>

                          <div className="pl-2">
                            <span className="text-white font-bold text-[14px] block mb-1">Tekrar Hoş Geldiniz! ☕</span>
                            <span className="text-white/80 text-[12px] leading-snug block">
                              Geçen ayki ziyaretinizi unutmadık. Favoriniz olan Köfteci Yusuf'a 20 KM kaldı. Size özel ikram kahveniz hazır.
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                  
                  {/* Alttaki kilit ikonu vs */}
                  <div className="mt-auto mb-8 flex gap-20">
                     <div className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center backdrop-blur-md">
                       <Smartphone size={20} className="text-white/80" />
                     </div>
                     <div className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center backdrop-blur-md">
                       <Crosshair size={20} className="text-white/80" />
                     </div>
                  </div>
                  <div className="w-32 h-1.5 bg-white/50 rounded-full mb-2" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}