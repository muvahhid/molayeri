'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, Flag, ArrowUpDown, Fuel, Zap, UtensilsCrossed, 
  Store, Coffee, Wrench, SlidersHorizontal, Navigation, 
  BookmarkPlus, Star, Search,
  ChevronLeft, ListFilter, ArrowDownUp, Sparkles
} from 'lucide-react'

// --- SİMÜLASYON VERİ TABANI (TAM 5 ADET VE KOMPAKT VERİLER) ---
const MOCK_BUSINESSES = [
  { id: 1, name: 'Oksijen Tesisleri O-4', road: 'O-4', note: 'Kuzey Yönü', status: true, rating: 4.8, km: 12.5, cat: 'yakit', features: ['Tuvalet', 'Mescid'], c_tags: [{t: 'Yakıtta %5', c: '#FF7043'}] },
  { id: 2, name: 'Köfteci Yusuf', road: 'E-80', note: 'Sapanca', status: true, rating: 4.3, km: 18.2, cat: 'yemek', features: ['Restoran', 'Otopark'], c_tags: [{t: 'Ücretsiz Çay', c: '#FFA726'}] },
  { id: 3, name: 'ZES Hızlı Şarj', road: 'D-100', note: 'AVM İçi', status: true, rating: 4.9, km: 5.1, cat: 'sarj', features: ['7/24'], c_tags: [] },
  { id: 4, name: 'Starbucks', road: 'O-5', note: 'Dinlenme Tesisi', status: true, rating: 4.5, km: 22.0, cat: 'kafe', features: ['Tuvalet'], c_tags: [{t: 'Kahve Büyütme', c: '#8D6E63'}] },
  { id: 5, name: 'Migros Jet', road: 'E-80', note: 'Tesis İçi', status: false, rating: 4.0, km: 12.8, cat: 'market', features: ['Market'], c_tags: [] },
]

export const RadarFeature = ({ activeIndex = 0 }: { activeIndex?: number }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState(MOCK_BUSINESSES)

  // Kontrol Stateleri
  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')
  const [shortestRoute, setShortestRoute] = useState(false)
  const [avoidTolls, setAvoidTolls] = useState(false)
  const [routeCat, setRouteCat] = useState('yakit')
  
  const [radiusKm, setRadiusKm] = useState(15)
  const [radiusCat, setRadiusCat] = useState('yakit')
  
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const featureOptions = ['Tuvalet', '7/24', 'Mescid', 'Restoran', 'Market', 'Otopark', 'Duş']

  // Simülasyon Motoru
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => {
      let filtered = [...MOCK_BUSINESSES]
      if (activeIndex === 0) {
        filtered = filtered.filter(b => b.cat === routeCat)
      } else if (activeIndex === 1) {
        filtered = filtered.filter(b => b.cat === radiusCat && b.km <= radiusKm)
      } else if (activeIndex === 2) {
        // Nokta Atışı demosunda sağ blokta varsayılan 4 örnek işletme görünür,
        // filtre seçimleri ile bu 4 örnek üzerinden eleme simüle edilir.
        filtered = filtered.filter(b => [1, 2, 3, 4].includes(b.id))
        if (selectedFeatures.length > 0) {
          filtered = filtered.filter(b => selectedFeatures.every(feat => b.features.includes(feat)))
        }
      }
      setResults(filtered)
      setIsLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [activeIndex, routeCat, radiusCat, radiusKm, selectedFeatures])

  // UI Yardımcıları
  const getRoadColor = (road: string) => {
    if (road.startsWith('O')) return 'border-[#E28743]/50 bg-[#E28743]/15 text-[#E28743]'
    if (road.startsWith('E')) return 'border-[#57D184]/50 bg-[#57D184]/15 text-[#57D184]'
    if (road.startsWith('D')) return 'border-[#5BA8FF]/50 bg-[#5BA8FF]/15 text-[#5BA8FF]'
    return 'border-white/20 bg-white/5 text-white/70'
  }

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'yakit': return Fuel; case 'sarj': return Zap;
      case 'yemek': return UtensilsCrossed; case 'market': return Store;
      case 'kafe': return Coffee; case 'servis': return Wrench;
      default: return Search;
    }
  }

  // --- ÜST BLOK BUTONLARI ---
  const ActionCategoryButton = ({ active, icon: Icon, label, onClick, big = false }: any) => (
    <button onClick={onClick} className={`relative flex flex-col items-center justify-center rounded-[20px] border transition-all duration-300 w-full ${big ? 'h-[120px]' : 'h-[100px]'} ${
      active ? 'bg-[#FF7043]/15 border-[#FF7043]/80 shadow-[0_0_20px_rgba(255,112,67,0.15)]' : 'bg-black/30 border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
    }`}>
      {active && <div className="absolute inset-0 bg-gradient-to-br from-[#FF7043]/10 to-transparent rounded-[20px] pointer-events-none" />}
      <Icon size={big ? 36 : 28} className={`mb-3 relative z-10 transition-colors ${active ? 'text-[#FF7043]' : 'text-white/70'}`} strokeWidth={active ? 2.5 : 2} />
      <span className={`text-[12px] font-bold tracking-widest relative z-10 transition-colors ${active ? 'text-white' : 'text-white/70'}`}>{label}</span>
    </button>
  )

  const SwitchTile = ({ label, active, onToggle }: any) => (
    <div className="flex-1 rounded-[18px] bg-black/40 border border-white/10 px-5 py-4 flex items-center justify-between">
      <span className="text-white text-[14px] font-bold leading-tight">{label}</span>
      <button onClick={onToggle} className={`w-14 h-[30px] rounded-full p-1.5 transition-colors flex items-center ${active ? 'bg-[#FF7043]' : 'bg-white/20'}`}>
        <motion.div layout className={`w-5 h-5 rounded-full shadow-md bg-white ${active ? 'ml-auto' : ''}`} />
      </button>
    </div>
  )

  const DiscoverHeaderAction = ({ icon: Icon, label, accent }: any) => (
    <div className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-[12px] border transition-colors cursor-pointer hover:bg-white/5 ${accent ? 'bg-[#FF7043]/15 border-[#FF7043]/60' : 'bg-black/30 border-white/10'}`}>
      <Icon size={14} className={accent ? 'text-[#FF7043]' : 'text-white/75'} />
      <span className={`text-[11px] font-bold tracking-wide ${accent ? 'text-white' : 'text-white/75'}`}>{label}</span>
    </div>
  )

  return (
    <div className="w-full h-full p-6 lg:p-12 flex items-center justify-center relative overflow-hidden">
      <AnimatePresence mode="wait">
        
        {/* ========================================================= */}
        {/* ADIM 0: GÜZERGAH ARAMA (Dokunulmadı) */}
        {/* ========================================================= */}
        {activeIndex === 0 && (
          <motion.div 
            key="route-mode"
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }} transition={{ duration: 0.4 }}
            className="w-full max-w-2xl flex flex-col gap-8"
          >
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FF7043]/10 border border-[#FF7043]/30 mb-6">
                <ArrowUpDown size={28} className="text-[#FF7043]" />
              </div>
              <h2 className="text-3xl font-extrabold !text-white tracking-wide mb-3">Güzergaha Göre Keşfet</h2>
              <p className="text-white/75 text-sm font-medium">Başlangıç ve varış noktanızı seçin, rotanız üzerindeki en iyi durakları bulalım.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="h-[64px] rounded-[20px] bg-black/50 border border-white/10 flex items-center px-6 shadow-inner">
                <input type="text" placeholder="Adres Yaz veya GPS Bas" value={origin} onChange={(e)=>setOrigin(e.target.value)} className="bg-transparent flex-1 outline-none text-white text-[15px] font-semibold placeholder:text-white/30" />
                <div className="w-10 h-10 rounded-full bg-[#FF7043]/10 flex items-center justify-center cursor-pointer hover:bg-[#FF7043]/20 transition-colors">
                  <MapPin size={20} className="text-[#FF7043]" />
                </div>
              </div>
              <div className="h-[64px] rounded-[20px] bg-black/50 border border-white/10 flex items-center px-6 shadow-inner">
                <input type="text" placeholder="Varış Adresi Yaz" value={dest} onChange={(e)=>setDest(e.target.value)} className="bg-transparent flex-1 outline-none text-white text-[15px] font-semibold placeholder:text-white/30" />
                <div className="w-10 h-10 rounded-full bg-[#FF7043]/10 flex items-center justify-center cursor-pointer hover:bg-[#FF7043]/20 transition-colors">
                  <Flag size={20} className="text-[#FF7043]" />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <SwitchTile label={<>En Kısa<br/>Rota</>} active={shortestRoute} onToggle={() => setShortestRoute(!shortestRoute)} />
              <SwitchTile label={<>Ücretsiz<br/>Yollar</>} active={avoidTolls} onToggle={() => setAvoidTolls(!avoidTolls)} />
            </div>

            <div className="grid grid-cols-4 gap-4 mt-4">
              <ActionCategoryButton active={routeCat==='yakit'} onClick={()=>setRouteCat('yakit')} icon={Fuel} label="YAKIT" big={true} />
              <ActionCategoryButton active={routeCat==='sarj'} onClick={()=>setRouteCat('sarj')} icon={Zap} label="ŞARJ" big={true} />
              <ActionCategoryButton active={routeCat==='yemek'} onClick={()=>setRouteCat('yemek')} icon={UtensilsCrossed} label="YEMEK" big={true} />
              <ActionCategoryButton active={routeCat==='market'} onClick={()=>setRouteCat('market')} icon={Store} label="MARKET" big={true} />
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 1: MESAFE ARAMA (Dokunulmadı) */}
        {/* ========================================================= */}
        {activeIndex === 1 && (
          <motion.div 
            key="radius-mode"
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }} transition={{ duration: 0.4 }}
            className="w-full max-w-3xl flex flex-col gap-10"
          >
            <div className="text-center mb-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FF7043]/10 border border-[#FF7043]/30 mb-6">
                <Search size={28} className="text-[#FF7043]" />
              </div>
              <h2 className="text-3xl font-extrabold !text-white tracking-wide mb-3">Çevreni Tara</h2>
              <p className="text-white/75 text-sm font-medium">Bulunduğun konumu merkez alır ve seçtiğin yarıçaptaki işletmeleri listeler.</p>
            </div>

            <div className="bg-black/30 border border-white/10 rounded-[28px] p-8 flex flex-col gap-8 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-white text-lg font-bold">Tarama Yarıçapı</span>
                <div className="px-5 py-2.5 rounded-[14px] bg-[#FF7043]/15 border border-[#FF7043]/40 text-[#FF7043] text-xl font-black shadow-[0_0_20px_rgba(255,112,67,0.2)]">
                  {radiusKm} KM
                </div>
              </div>

              <div className="relative h-12 flex items-center justify-center w-full px-4">
                <input type="range" min="1" max="50" value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} className="w-full absolute z-20 opacity-0 cursor-pointer h-full" />
                <div className="w-full h-3.5 rounded-full bg-black/80 overflow-hidden relative shadow-inner border border-white/5">
                  <motion.div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#FF7043] to-[#FFA726]" style={{ width: `${(radiusKm/50)*100}%` }} />
                </div>
                <div className="w-10 h-10 rounded-full bg-white shadow-[0_0_25px_rgba(255,112,67,0.9)] absolute z-10 pointer-events-none border-[4px] border-[#050811]" style={{ left: `calc(${(radiusKm/50)*100}% - 20px)` }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5 mt-2">
              <ActionCategoryButton active={radiusCat==='yakit'} onClick={()=>setRadiusCat('yakit')} icon={Fuel} label="YAKIT" big={true} />
              <ActionCategoryButton active={radiusCat==='sarj'} onClick={()=>setRadiusCat('sarj')} icon={Zap} label="ŞARJ" big={true} />
              <ActionCategoryButton active={radiusCat==='yemek'} onClick={()=>setRadiusCat('yemek')} icon={UtensilsCrossed} label="YEMEK" big={true} />
              <ActionCategoryButton active={radiusCat==='market'} onClick={()=>setRadiusCat('market')} icon={Store} label="MARKET" big={true} />
              <ActionCategoryButton active={radiusCat==='kafe'} onClick={()=>setRadiusCat('kafe')} icon={Coffee} label="KAFE" big={true} />
              <ActionCategoryButton active={radiusCat==='servis'} onClick={()=>setRadiusCat('servis')} icon={Wrench} label="SERVİS" big={true} />
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ADIM 3: KOMPAKT FİLTRE + KÜÇÜK VE DÜZENLİ SONUÇ KARTLARI */}
        {/* ========================================================= */}
        {activeIndex === 2 && (
          <motion.div 
            key="results-mode"
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }} transition={{ duration: 0.4 }}
            className="w-full h-full flex flex-col lg:flex-row gap-5 lg:gap-6 min-w-0" // min-w-0 flex taşmasını engeller
          >
            {/* SOL TARAF: Dar ve Kompakt Filtre (240px'e düşürüldü) */}
            <div className="w-full lg:w-[240px] h-full flex flex-col bg-black/40 border border-white/10 rounded-[32px] p-5 shadow-2xl shrink-0">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full bg-[#FF7043]/15 flex items-center justify-center border border-[#FF7043]/30">
                  <SlidersHorizontal size={16} className="text-[#FF7043]" />
                </div>
                <div>
                  <h3 className="!text-white text-[14px] font-extrabold tracking-wide">Filtrele</h3>
                  <p className="text-white/75 text-[9px] font-medium mt-0.5">İhtiyacına uygun tesisi bul.</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2">
                {featureOptions.map(feat => {
                    const isSel = selectedFeatures.includes(feat)
                    return (
                      <button key={feat} onClick={() => setSelectedFeatures(prev => isSel ? prev.filter(f => f !== feat) : [...prev, feat])} 
                        className={`flex items-center justify-between w-full px-3 py-2.5 rounded-[12px] border transition-all duration-200 ${isSel ? 'bg-[#FF7043]/10 border-[#FF7043]/50' : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'}`}>
                        <span className={`text-[11px] font-bold ${isSel ? 'text-white' : 'text-white/70'}`}>{feat}</span>
                        <div className={`w-4 h-4 rounded-[4px] border-[1.5px] flex items-center justify-center transition-colors ${isSel ? 'bg-[#FF7043] border-[#FF7043]' : 'border-white/20'}`}>
                          {isSel && <motion.div initial={{scale:0}} animate={{scale:1}} className="w-1.5 h-1.5 bg-white rounded-[2px]" />}
                        </div>
                      </button>
                    )
                })}
              </div>

              <div className="mt-4 flex gap-2 shrink-0">
                <button onClick={() => setSelectedFeatures([])} className="flex-1 py-2.5 rounded-[10px] border border-white/10 bg-white/5 text-white/75 text-[10px] font-bold hover:bg-white/10 transition-colors">
                  TEMİZLE
                </button>
                <button className="flex-[1.5] py-2.5 rounded-[10px] border border-[#FF7043]/70 bg-[#FF7043]/20 text-white text-[11px] font-black tracking-widest hover:bg-[#FF7043]/30 transition-colors shadow-[0_0_15px_rgba(255,112,67,0.2)]">
                  UYGULA
                </button>
              </div>
            </div>

            {/* SAĞ TARAF: Kompakt Sonuç Kartları (Asla Taşmaz) */}
            <div className="flex-1 h-full flex flex-col bg-white/[0.02] border border-white/10 rounded-[32px] overflow-hidden min-w-0">
              
              {/* Başlık Barı */}
              <div className="h-[74px] shrink-0 border-b border-white/[0.08] flex items-center px-5 bg-black/20">
                <div className="bg-black/40 rounded-[14px] p-2 flex items-center gap-2.5 border border-white/5 w-full">
                  <div className="w-9 h-9 rounded-[11px] bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 hover:bg-white/10 cursor-pointer transition-colors">
                    <ChevronLeft size={14} className="text-white" />
                  </div>
                  <DiscoverHeaderAction icon={ListFilter} label="Filtre" />
                  <DiscoverHeaderAction icon={ArrowDownUp} label="Sırala" />
                  <DiscoverHeaderAction icon={Sparkles} label="AI" accent={true} />
                </div>
              </div>

              {/* İçerik / Kartlar */}
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar relative">
                <div className="flex items-center gap-2 mb-4 px-1">
                  <Search size={14} className="text-white/75" />
                  <span className="text-white/75 text-[10px] font-bold tracking-wider">{results.length} SONUÇ LİSTELENDİ</span>
                </div>

                {isLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pb-20">
                    <div className="w-10 h-10 rounded-full border-t-2 border-[#FF7043] animate-spin mb-4" />
                    <span className="text-white/75 text-[11px] font-mono tracking-widest animate-pulse">SİMÜLASYON HESAPLANIYOR...</span>
                  </div>
                ) : results.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4"><Search size={24} className="text-white/20" /></div>
                    <h3 className="text-white text-[14px] font-bold mb-2">Uygun Sonuç Bulunamadı</h3>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 min-w-0">
                    {results.map((b) => {
                      const CatIcon = getCategoryIcon(b.cat)
                      return (
                        <motion.div
                          key={b.id}
                          role="tab"
                          aria-label={`${b.name} örnek işletme`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-[16px] bg-black/45 border border-white/10 shadow-lg flex gap-3 min-w-0"
                        >
                          <div className="flex-1 flex flex-col items-start min-w-0">
                            <h3 className="!text-white font-extrabold text-[13px] mb-1.5 truncate w-full">{b.name}</h3>

                            <div className="flex items-center gap-1.5 mb-2 flex-wrap min-w-0 w-full">
                              <span className={`px-1.5 py-0.5 rounded-[4px] border text-[8px] font-black uppercase shrink-0 ${getRoadColor(b.road)}`}>{b.road}</span>
                              <span className="text-white/75 text-[9px] font-extrabold truncate shrink-0">{b.note}</span>
                            </div>

                            {b.c_tags.length > 0 && (
                              <div className="flex gap-1.5 mb-2.5 h-[18px] min-w-0 w-full">
                                {b.c_tags.map((tag, i) => (
                                  <div key={i} className="flex items-center border rounded-[4px] overflow-hidden pr-1.5 h-full shrink-0 max-w-full" style={{ backgroundColor: `${tag.c}15`, borderColor: `${tag.c}40` }}>
                                    <div className="w-[2px] h-[8px] rounded-full ml-1" style={{ backgroundColor: tag.c }} />
                                    <span className="text-[8px] font-extrabold px-1 tracking-wide truncate" style={{ color: tag.c }}>{tag.t}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-1.5 mt-auto w-full">
                              <button className="flex-1 py-1.5 bg-[#FF7043]/20 border border-[#FF7043]/40 rounded-[8px] flex items-center justify-center gap-1 hover:bg-[#FF7043]/30 transition-colors">
                                <Navigation size={10} className="text-[#FF7043] fill-[#FF7043]" />
                                <span className="text-[9px] font-black tracking-wider text-[#FF7043]">GİT</span>
                              </button>
                              <button className="flex-1 py-1.5 bg-[#7DE2D8]/10 border border-[#7DE2D8]/30 rounded-[8px] flex items-center justify-center gap-1 hover:bg-[#7DE2D8]/20 transition-colors">
                                <BookmarkPlus size={10} className="text-[#7DE2D8]" />
                                <span className="text-[9px] font-black tracking-wider text-[#7DE2D8]">MOLA</span>
                              </button>
                            </div>
                          </div>

                          <div className="w-[60px] flex flex-col items-center justify-between bg-black/20 border border-white/5 rounded-[12px] p-1.5 shrink-0">
                            <div className="w-full aspect-square rounded-[8px] bg-white/[0.04] flex items-center justify-center mb-1 shadow-inner border border-white/5">
                              <CatIcon size={20} className="text-[#FF7043]/70" strokeWidth={1.5} />
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-0.5">
                                <Star size={10} className="text-amber-400 fill-amber-400" />
                                <span className="text-white font-black text-[11px]">{b.rating.toFixed(1)}</span>
                              </div>
                              <span className="text-white/75 font-black text-[8px] bg-white/5 px-1.5 py-0.5 rounded-[4px]">{b.km.toFixed(1)} KM</span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
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
