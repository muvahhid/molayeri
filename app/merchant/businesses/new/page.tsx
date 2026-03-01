'use client'

import { useState, useEffect, useCallback } from 'react'
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { 
  CheckCircle, MapPin, Store, Phone, 
  Upload, Trash2, Search, Star, Plus, Map, 
  AlertTriangle, Navigation, Check
} from 'lucide-react'
import {
  USER_MEMBERSHIP_TERMS_VERSION,
  KVKK_TERMS_VERSION,
  BUSINESS_MEMBERSHIP_TERMS_VERSION,
  BUSINESS_KVKK_TERMS_VERSION,
  USER_MEMBERSHIP_TERMS_TEXT,
  KVKK_TERMS_TEXT,
  BUSINESS_MEMBERSHIP_TERMS_TEXT,
  BUSINESS_KVKK_TERMS_TEXT,
} from '@/lib/legal-documents'

// --- FIRE ORANGE NEUMORPHIC THEME ---
const BG_MAIN = "bg-[#eef0f4]"
const TXT_DARK = "text-slate-700"
const ACCENT_COLOR = "text-orange-500"

// Gölgeler
const SHADOW_OUT = "shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff]"
const SHADOW_IN = "shadow-[inset_6px_6px_12px_#d1d5db,inset_-6px_-6px_12px_#ffffff]"
const SHADOW_BTN = "shadow-[6px_6px_12px_#d1d5db,-6px_-6px_12px_#ffffff]"

// --- UI COMPONENTS ---

type Category = { id: string; name: string; [key: string]: unknown }
type Feature = { id: string; name: string; category_id?: string | null; is_global?: boolean | null; [key: string]: unknown }
type PlacePrediction = { place_id: string; description: string; types?: string[] }
type RuleKey = 'r1' | 'r2' | 'r3'
type RuleState = Record<RuleKey, boolean>
type LegalModalState = { title: string; version: string; body: string } | null

type NeuCardProps = {
  children: ReactNode
  className?: string
}

type NeuInputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: LucideIcon
  label?: string
  rightElement?: ReactNode
}

type NeuTextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
}

type NeuSwitchProps = {
  checked: boolean
  onChange: (next: boolean) => void
}

type NeuButtonProps = {
  onClick?: () => void
  children: ReactNode
  variant?: 'primary' | 'solid'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

type SuccessModalProps = {
  isOpen: boolean
  onClose: () => void
}

type LegalModalProps = {
  state: LegalModalState
  onClose: () => void
}

const NeuCard = ({ children, className = "" }: NeuCardProps) => (
  <div className={`${BG_MAIN} rounded-[40px] ${SHADOW_OUT} border border-white/60 p-8 ${className}`}>
    {children}
  </div>
)

const NeuInput = ({ icon: Icon, label, rightElement, ...props }: NeuInputProps) => (
  <div className="mb-6 group">
    {label && <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-4">{label}</label>}
    <div className="relative flex items-center">
      {Icon && <Icon className="absolute left-5 w-5 h-5 text-slate-400 group-focus-within:text-orange-500 transition-colors pointer-events-none"/>}
      <input 
        {...props}
        className={`w-full ${BG_MAIN} ${Icon ? 'pl-14' : 'pl-6'} ${rightElement ? 'pr-16' : 'pr-6'} py-5 rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all
        ${SHADOW_IN} border border-transparent focus:ring-2 focus:ring-orange-400/20 placeholder:text-slate-400/60`}
      />
      {rightElement && <div className="absolute right-2">{rightElement}</div>}
    </div>
  </div>
)

const NeuTextArea = ({ label, ...props }: NeuTextAreaProps) => (
  <div className="mb-6 group">
    {label && <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-4">{label}</label>}
    <textarea 
      {...props}
      className={`w-full ${BG_MAIN} px-6 py-5 rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all resize-none
      ${SHADOW_IN} border border-transparent focus:ring-2 focus:ring-orange-400/20 placeholder:text-slate-400/60 min-h-[120px]`}
    />
  </div>
)

const NeuSwitch = ({ checked, onChange }: NeuSwitchProps) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(!checked); }} 
    className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-all duration-300 ease-in-out ${checked ? 'bg-orange-500 shadow-inner' : `${BG_MAIN} ${SHADOW_IN}`}`}
  >
    <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
  </div>
)

const NeuButton = ({ onClick, children, variant = "primary", className = "", disabled=false, type = 'button' }: NeuButtonProps) => {
  const base = "relative overflow-hidden transition-all duration-200 rounded-2xl font-black flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] uppercase tracking-wide text-sm select-none"
  const primary = `${BG_MAIN} text-slate-600 ${SHADOW_BTN} border border-white/60 hover:text-orange-600 hover:-translate-y-0.5 active:${SHADOW_IN}`
  const solid = `bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-[6px_6px_20px_rgba(249,115,22,0.4),-6px_-6px_20px_rgba(255,255,255,0.8)] border border-orange-400/20 hover:brightness-110 hover:-translate-y-0.5`

  let style = primary
  if (variant === 'solid') style = solid

  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${style} ${className}`}>{children}</button>
}

// --- SUCCESS MODAL ---
const SuccessModal = ({ isOpen, onClose }: SuccessModalProps) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#eef0f4] rounded-[40px] p-10 max-w-md w-full text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-300 border border-white relative overflow-hidden">
        <div className="w-24 h-24 bg-[#eef0f4] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff] text-green-500">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-2">İşletme Kaydedildi</h2>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed text-sm">
          Yeni işletme kaydınız tamamlandı. Panel ana sayfasına otomatik yönlendiriliyorsunuz.
        </p>
        <NeuButton onClick={onClose} variant="solid" className="w-full py-5">Harika, Anladım</NeuButton>
      </div>
    </div>
  )
}

const LegalModal = ({ state, onClose }: LegalModalProps) => {
  if (!state) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] bg-[#eef0f4] rounded-[32px] border border-white shadow-2xl p-6 md:p-8 flex flex-col">
        <div className="mb-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-orange-500">{state.version}</p>
          <h3 className="text-xl font-black text-slate-800 mt-1">{state.title}</h3>
        </div>
        <div className="flex-1 overflow-y-auto rounded-2xl bg-white/70 border border-white p-4 md:p-5 text-sm text-slate-700 leading-6 whitespace-pre-wrap">
          {state.body}
        </div>
        <div className="pt-5 flex justify-end">
          <NeuButton onClick={onClose} variant="solid" className="px-6 py-3">
            Kapat
          </NeuButton>
        </div>
      </div>
    </div>
  )
}

export default function BusinessWizard() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState('')
  const [accountTermsAccepted, setAccountTermsAccepted] = useState(false)
  const [accountKvkkAccepted, setAccountKvkkAccepted] = useState(false)
  const [legalModal, setLegalModal] = useState<LegalModalState>(null)
  
  // DATA STATES
  const [bizForm, setBizForm] = useState({ 
    name: '', phone: '', desc: '', address: '', 
    coordsInput: '', lat: '', lng: '',
    roadName: '', roadDesc: '' 
  })
  
  const [placeQuery, setPlaceQuery] = useState('')
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [detectedRoadType, setDetectedRoadType] = useState<string | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [features, setFeatures] = useState<Feature[]>([]) 
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set())
  const [selectedFeats, setSelectedFeats] = useState<Set<string>>(new Set())
  const [brands, setBrands] = useState<Record<string, string[]>>({}) 

  const [photos, setPhotos] = useState<File[]>([])
  const [coverIndex, setCoverIndex] = useState(0)
  const [rules, setRules] = useState<RuleState>({ r1: false, r2: false, r3: false })

  useEffect(() => {
    if (!showSuccess) return
    const timeoutId = window.setTimeout(() => {
      router.push('/merchant/dashboard')
    }, 1400)
    return () => window.clearTimeout(timeoutId)
  }, [showSuccess, router])

  const checkUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      router.replace('/login')
      return
    }

    setCurrentUserId(data.user.id)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name,membership_terms_accepted_at,kvkk_accepted_at')
      .eq('id', data.user.id)
      .maybeSingle()

    const displayName = (profile?.full_name || data.user.user_metadata?.full_name || data.user.email || '').toString()
    setCurrentUserDisplayName(displayName)

    const hasMembership = Boolean(profile?.membership_terms_accepted_at)
    const hasKvkk = Boolean(profile?.kvkk_accepted_at)
    setAccountTermsAccepted(hasMembership)
    setAccountKvkkAccepted(hasKvkk)
    setStep(hasMembership && hasKvkk ? 2 : 1)
  }, [router, supabase])

  const saveLegalToProfile = useCallback(
    async (userId: string) => {
      const acceptedAtIso = new Date().toISOString()
      await supabase.from('profiles').upsert(
        {
          id: userId,
          membership_terms_accepted_at: acceptedAtIso,
          membership_terms_version: USER_MEMBERSHIP_TERMS_VERSION,
          kvkk_accepted_at: acceptedAtIso,
          kvkk_version: KVKK_TERMS_VERSION,
        },
        { onConflict: 'id' }
      )
    },
    [supabase]
  )

  const fetchData = useCallback(async () => {
    const [cRes, fRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('features').select('*').order('name')
    ])
    if (cRes.data) setCategories(cRes.data)
    if (fRes.data) setFeatures(fRes.data)
  }, [supabase])

  useEffect(() => {
    void checkUser()
    void fetchData()
  }, [checkUser, fetchData])

  // --- LOGIC HELPER: TYPE DETERMINATION ---
  const normalize = (s: string) => s.toLowerCase().replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '')
  
  const getCatSlug = (dbName: string) => {
    const n = normalize(dbName)
    if (n.includes('yakit') || n.includes('akaryak') || n.includes('benzin') || n.includes('petrol') || n.includes('istasyon')) return 'yakit'
    if (n.includes('sarj') || n.includes('elektrik') || n.includes('ev') || n.includes('charge')) return 'sarj'
    if (n.includes('yemek') || n.includes('restoran') || n.includes('lokanta') || n.includes('kebap') || n.includes('pizza') || n.includes('burger')) return 'yemek'
    if (n.includes('market') || n.includes('bufe') || n.includes('tekel') || n.includes('bakkal') || n.includes('shop')) return 'market'
    if (n.includes('kafe') || n.includes('kahve') || n.includes('cafe') || n.includes('coffee')) return 'kafe'
    if (n.includes('otel') || n.includes('konak') || n.includes('hotel') || n.includes('motel')) return 'otel'
    if (n.includes('servis') || n.includes('tamir') || n.includes('oto') || n.includes('lastik')) return 'servis'
    if (n.includes('avm') || n.includes('alisveris') || n.includes('mall')) return 'alisveris'
    if (n.includes('cami') || n.includes('mescit') || n.includes('mosque')) return 'mosque'
    if (n.includes('dinlenme') || n.includes('tesis')) return 'restfacility'
    return 'other'
  }

  const determineMainType = () => {
    if (selectedCats.size === 0) return 'other'
    const slugs: string[] = []
    selectedCats.forEach(catId => {
      const catName = categories.find(c => c.id === catId)?.name || ''
      slugs.push(getCatSlug(catName))
    })
    if (slugs.includes('yakit')) return 'yakit'
    if (slugs.includes('sarj')) return 'sarj'
    if (slugs.includes('otel')) return 'otel'
    if (slugs.includes('yemek')) return 'yemek'
    if (slugs.includes('market')) return 'market'
    if (slugs.includes('kafe')) return 'kafe'
    return slugs[0] || 'other'
  }

  // --- ACTIONS ---

  const handleAccountComplianceContinue = async () => {
    setAccountError(null)
    if (!currentUserId) {
      setAccountError('Aktif oturum bulunamadı. Lütfen tekrar giriş yapın.')
      return
    }
    if (!accountTermsAccepted || !accountKvkkAccepted) {
      setAccountError('Üyelik sözleşmesi ve KVKK metnini onaylamadan devam edemezsiniz.')
      return
    }
    setLoading(true)
    try {
      await saveLegalToProfile(currentUserId)
      setStep(2)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sözleşme onayı kaydedilemedi.'
      setAccountError(message)
    } finally {
      setLoading(false)
    }
  }

  // PLACES API
  const searchPlaces = async (val: string) => {
    setPlaceQuery(val)
    if (val.length < 3) { setPredictions([]); return }
    const PROXY = "https://places-proxy-163005734460.europe-west1.run.app"
    try {
      const res = await fetch(`${PROXY}/places/autocomplete?input=${val}&token=${Date.now()}`)
      const json = await res.json()
      setPredictions(json.predictions || [])
    } catch (e) { console.error(e) }
  }

  const selectPlace = async (placeId: string, desc: string) => {
    setPlaceQuery(desc)
    setPredictions([])
    setSelectedPlaceId(placeId)
    const PROXY = "https://places-proxy-163005734460.europe-west1.run.app"
    try {
      const res = await fetch(`${PROXY}/places/details?place_id=${placeId}&token=${Date.now()}`)
      const json = await res.json()
      const result = json.result
      if (result) {
        const loc = result.geometry.location
        const types = result.types || []
        
        // Auto fill
        setBizForm(prev => ({ 
          ...prev, 
          address: desc, 
          lat: loc.lat.toString(), 
          lng: loc.lng.toString(),
          coordsInput: `${loc.lat}, ${loc.lng}`
        }))
        
        let rType = 'service'
        if (types.includes('highway') || types.includes('motorway')) rType = 'motorway'
        else if (types.includes('route') || types.includes('primary_road')) rType = 'main_road'
        setDetectedRoadType(rType)

        const match = desc.match(/\b(O-\s*\d+|E\s*-?\s*\d{1,3}|D\s*-?\s*\d{1,3}|TEM|E-?5)\b/i)
        if (match) setBizForm(prev => ({ ...prev, roadName: match[0].toUpperCase().replace(/\s/g, '') }))
      }
    } catch (e) { console.error(e) }
  }

  // HARİTA BUTONU
  const openMap = () => {
    let url = "https://www.google.com/maps"
    if (bizForm.lat && bizForm.lng) url = `https://www.google.com/maps/search/?api=1&query=${bizForm.lat},${bizForm.lng}`
    else if (bizForm.address) url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bizForm.address)}`
    window.open(url, "_blank")
  }

  const handleCoordsChange = (val: string) => {
    setBizForm(prev => ({ ...prev, coordsInput: val }))
    const parts = val.split(',')
    if (parts.length === 2) {
      setBizForm(prev => ({ ...prev, lat: parts[0].trim(), lng: parts[1].trim() }))
    }
  }

  const toggleCat = (id: string, name: string) => {
    const next = new Set(selectedCats)
    if (next.has(id)) {
      next.delete(id)
      const newBrands = { ...brands }; delete newBrands[id]; setBrands(newBrands)
    } else {
      next.add(id)
      const n = name.toLowerCase()
      if (['yakit','yemek','kafe','market','restoran','akaryak'].some(k => n.includes(k))) {
         setBrands(prev => ({ ...prev, [id]: [''] }))
      }
    }
    setSelectedCats(next)
  }

  const updateBrand = (catId: string, idx: number, val: string) => {
    const list = [...(brands[catId] || [])]; list[idx] = val; setBrands({ ...brands, [catId]: list })
  }

  const handleFinalSubmit = async () => {
    if (!rules.r1 || !rules.r2 || !rules.r3) return alert('Lütfen kuralları onaylayın.')
    if (photos.length < 3) return alert('En az 3 fotoğraf yüklemelisiniz.')
    setLoading(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if(!userId) throw new Error("Kullanıcı bulunamadı")
      const legalAcceptedAtIso = new Date().toISOString()

      // TİP BELİRLEME
      const determinedType = determineMainType()

      // 1. İşletme
      const { data: biz, error } = await supabase.from('businesses').insert({
        owner_id: userId,
        name: bizForm.name,
        description: bizForm.desc,
        phone: bizForm.phone,
        address_text: bizForm.address,
        lat: parseFloat(bizForm.lat),
        lng: parseFloat(bizForm.lng),
        road_name: bizForm.roadName,
        road_note: bizForm.roadDesc,
        road_place_id: selectedPlaceId,
        road_type: detectedRoadType,
        status: 'pending', 
        type: determinedType,
        business_terms_accepted_at: legalAcceptedAtIso,
        business_terms_version: BUSINESS_MEMBERSHIP_TERMS_VERSION,
        business_kvkk_accepted_at: legalAcceptedAtIso,
        business_kvkk_version: BUSINESS_KVKK_TERMS_VERSION,
        business_terms_accepted_by_name: currentUserDisplayName || userData.user?.email || 'Bilinmiyor',
      }).select().single()
      if (error) throw error
      const bizId = biz.id

      // 2. Yan Tablolar
      const catInserts = Array.from(selectedCats).map(c => ({ business_id: bizId, category_id: c }))
      if(catInserts.length) await supabase.from('business_categories').insert(catInserts)

      const featInserts = Array.from(selectedFeats).map(f => ({ business_id: bizId, feature_id: f, value: 'true' }))
      if(featInserts.length) await supabase.from('business_features').insert(featInserts)

      const storeInserts: Array<{ business_id: string; name: string; floor_info: string }> = []
      Object.entries(brands).forEach(([catId, bList]) => {
        const cName = categories.find(c=>c.id===catId)?.name || 'Mağaza'
        bList.forEach(bName => { if(bName.trim()) storeInserts.push({ business_id: bizId, name: bName.trim(), floor_info: cName }) })
      })
      if(storeInserts.length) await supabase.from('business_stores').insert(storeInserts)

      // 3. Fotoğraflar
      for (let i = 0; i < photos.length; i++) {
        const path = `${bizId}/${Date.now()}_${i}.jpg`
        const { error: upErr } = await supabase.storage.from('business-photos').upload(path, photos[i])
        if(!upErr) {
          const { data } = supabase.storage.from('business-photos').getPublicUrl(path)
          await supabase.from('business_photos').insert({ business_id: bizId, url: data.publicUrl, is_cover: i===coverIndex })
        }
      }

      // 4. Profil Güncelleme (GÜVENLİ)
      // Önce mevcut profili çek, Admin veya İşletmeci ise dokunma
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role,membership_terms_accepted_at,kvkk_accepted_at')
        .eq('id', userId)
        .single()

      if (!currentProfile?.membership_terms_accepted_at || !currentProfile?.kvkk_accepted_at) {
        await saveLegalToProfile(userId)
      }
      
      if (currentProfile?.role !== 'admin' && currentProfile?.role !== 'isletmeci') {
         await supabase.from('profiles').update({ role: 'pending_business' }).eq('id', userId)
      }
      
      setShowSuccess(true)

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Kayıt sırasında beklenmeyen bir hata oluştu.'
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  const steps = [{ n: 1, t: 'HESAP' }, { n: 2, t: 'KONUM' }, { n: 3, t: 'DETAY' }, { n: 4, t: 'GÖRSEL' }, { n: 5, t: 'ONAY' }]
  const finalRules: Array<{
    k: RuleKey
    t: string
    legal?: { title: string; version: string; body: string }
  }> = [
    { k: 'r1', t: 'Girdiğim bilgilerin doğruluğunu beyan ederim.' },
    {
      k: 'r2',
      t: 'İşletme üyelik sözleşmesini okudum ve kabul ediyorum.',
      legal: {
        title: 'İşletme Üyelik ve Hizmet Sözleşmesi',
        version: BUSINESS_MEMBERSHIP_TERMS_VERSION,
        body: BUSINESS_MEMBERSHIP_TERMS_TEXT,
      },
    },
    {
      k: 'r3',
      t: 'İşletme KVKK metnini okudum ve onaylıyorum.',
      legal: {
        title: 'İşletme KVKK Aydınlatma Metni',
        version: BUSINESS_KVKK_TERMS_VERSION,
        body: BUSINESS_KVKK_TERMS_TEXT,
      },
    },
  ]
  const activeStepIndex = Math.max(0, steps.findIndex((item) => item.n === step))
  const progressWidth = steps.length > 1 ? (activeStepIndex / (steps.length - 1)) * 100 : 0

  return (
    <div className={`min-h-screen flex flex-col items-center py-12 px-4 ${BG_MAIN} text-slate-600 font-sans`}>
      <SuccessModal isOpen={showSuccess} onClose={() => router.push('/merchant/dashboard')} />
      <LegalModal state={legalModal} onClose={() => setLegalModal(null)} />

      <div className="w-full max-w-3xl">
        
        {/* HEADER */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500 text-white shadow-xl shadow-orange-200 mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Yeni İşletme Kaydı</h1>
          <p className="text-slate-500 font-medium mt-2">Kayıt akışına panel içinde devam edin.</p>
        </div>

        {/* STEPPER */}
        <div className="mb-12 relative px-4">
          <div className="absolute top-1/2 left-0 w-full h-2 bg-slate-200 rounded-full -translate-y-1/2 -z-10 shadow-inner"></div>
          <div className="absolute top-1/2 left-0 h-2 bg-orange-500 rounded-full -translate-y-1/2 -z-10 transition-all duration-500 ease-out" style={{ width: `${progressWidth}%` }}></div>
          <div className="flex justify-between">
            {steps.map((s, index) => (
              <div key={s.n} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-4 border-[#eef0f4] ${step >= s.n ? 'bg-orange-500 text-white shadow-lg shadow-orange-300 scale-110' : 'bg-slate-300 text-slate-500'}`}>
                  {step > s.n ? <Check className="w-5 h-5"/> : index + 1}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${step >= s.n ? 'text-orange-600' : 'text-slate-400'}`}>{s.t}</span>
              </div>
            ))}
          </div>
        </div>

        <NeuCard className="animate-in fade-in slide-in-from-bottom-8 duration-500">

          {/* STEP 1: ACCOUNT COMPLIANCE */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className={`text-xl font-black mb-6 flex items-center gap-2 ${TXT_DARK}`}>
                <Store className={ACCENT_COLOR}/> HESAP UYUM ONAYI
              </h2>
              <div className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 bg-white/70 border border-white">
                {currentUserDisplayName
                  ? `${currentUserDisplayName} hesabı ile devam ediliyor.`
                  : 'Aktif kullanıcı hesabı ile devam ediliyor.'}{' '}
                İşletme kaydına geçmeden önce üyelik sözleşmesi ve KVKK onayı zorunludur.
              </div>
              <div className="space-y-3">
                <label className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border-2 ${accountTermsAccepted ? 'bg-orange-50 border-orange-200' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${accountTermsAccepted ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>{accountTermsAccepted && <Check className="w-4 h-4 text-white"/>}</div>
                  <input type="checkbox" className="hidden" checked={accountTermsAccepted} onChange={(e)=>setAccountTermsAccepted(e.target.checked)} />
                  <span className="text-sm font-bold text-slate-600 flex-1">Kullanıcı üyelik sözleşmesini okudum ve kabul ediyorum.</span>
                  <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setLegalModal({ title: 'Kullanıcı Üyelik Sözleşmesi', version: USER_MEMBERSHIP_TERMS_VERSION, body: USER_MEMBERSHIP_TERMS_TEXT }) }} className="text-xs font-black uppercase tracking-wide px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-orange-600">
                    Metni Oku
                  </button>
                </label>
                <label className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border-2 ${accountKvkkAccepted ? 'bg-orange-50 border-orange-200' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${accountKvkkAccepted ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>{accountKvkkAccepted && <Check className="w-4 h-4 text-white"/>}</div>
                  <input type="checkbox" className="hidden" checked={accountKvkkAccepted} onChange={(e)=>setAccountKvkkAccepted(e.target.checked)} />
                  <span className="text-sm font-bold text-slate-600 flex-1">KVKK aydınlatma metnini okudum ve onaylıyorum.</span>
                  <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setLegalModal({ title: 'KVKK Aydınlatma Metni', version: KVKK_TERMS_VERSION, body: KVKK_TERMS_TEXT }) }} className="text-xs font-black uppercase tracking-wide px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-orange-600">
                    Metni Oku
                  </button>
                </label>
              </div>
              {accountError ? (
                <div className="rounded-2xl px-4 py-3 text-sm font-semibold text-red-700 bg-red-100 border border-red-200">
                  {accountError}
                </div>
              ) : null}
              <div className="pt-2 flex gap-4">
                <NeuButton onClick={() => router.push('/merchant/dashboard')} className="flex-1 py-5">
                  PANELE DÖN
                </NeuButton>
                <NeuButton onClick={handleAccountComplianceContinue} variant="solid" className="flex-1 py-5" disabled={loading}>
                  {loading ? 'KAYDEDİLİYOR...' : 'ONAYLA VE DEVAM ET'}
                </NeuButton>
              </div>
            </div>
          )}
          
          {/* STEP 2: LOCATION */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className={`text-xl font-black mb-6 flex items-center gap-2 ${TXT_DARK}`}><MapPin className={ACCENT_COLOR}/> KONUM VE DETAYLAR</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <NeuInput icon={Store} label="İşletme Adı" placeholder="Tabela Adı" value={bizForm.name} onChange={(e)=>setBizForm({...bizForm, name:e.target.value})} />
                 <NeuInput icon={Phone} label="İşletme Telefonu" placeholder="İletişim Numarası" value={bizForm.phone} onChange={(e)=>setBizForm({...bizForm, phone:e.target.value})} />
              </div>

              {/* SEARCH */}
              <div className="relative z-20">
                 <NeuInput icon={Search} label="Konum Ara" placeholder="Google Maps&apos;te Ara..." value={placeQuery} onChange={(e)=>searchPlaces(e.target.value)} />
                 {predictions.length > 0 && (
                   <div className="absolute top-[85px] left-0 w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 max-h-60 overflow-y-auto">
                     {predictions.map((p) => (
                       <div key={p.place_id} onClick={()=>selectPlace(p.place_id, p.description)} className="p-4 hover:bg-orange-50 cursor-pointer text-sm font-bold text-slate-600 border-b border-slate-50 flex items-center gap-3">
                         <MapPin className="w-4 h-4 text-orange-400"/> {p.description}
                       </div>
                     ))}
                   </div>
                 )}
              </div>

              <NeuInput icon={MapPin} label="Açık Adres" placeholder="Mahalle, Cadde, No..." value={bizForm.address} onChange={(e)=>setBizForm({...bizForm, address:e.target.value})} />

              {/* COORDS + MAP */}
              <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100/50">
                 <div className="flex items-end gap-3 mb-3">
                    <div className="flex-1">
                      <NeuInput 
                        icon={Navigation} 
                        label="Hassas Konum (Lat, Lng)" 
                        placeholder="Örn: 40.1234, 30.5678" 
                        value={bizForm.coordsInput}
                        onChange={(e)=>handleCoordsChange(e.target.value)}
                        rightElement={
                          <NeuButton onClick={openMap} className="w-10 h-10 !rounded-xl !p-0 !min-w-0 shadow-none border-0 bg-white text-orange-500">
                             <Map className="w-5 h-5"/>
                          </NeuButton>
                        }
                      />
                    </div>
                 </div>
                 <div className="flex gap-3 text-xs text-slate-500 leading-relaxed bg-white/60 p-4 rounded-xl border border-white">
                    <div className="shrink-0 pt-0.5"><Star className="w-4 h-4 text-orange-400 fill-orange-400"/></div>
                    <div>
                       <strong>Mükemmel Konum İçin:</strong> Yandaki harita ikonuna tıklayın, Google Maps&apos;te işletmenizin tam giriş kapısının üzerine <u>sağ tıklayın</u>. En üstte çıkan koordinata (Örn: 41.23, 29.55) tıklayınca kopyalanır. Gelip buraya yapıştırın.
                    </div>
                 </div>
              </div>

              {/* ROAD ALERT */}
              <div className="p-5 rounded-2xl bg-orange-100/50 border border-orange-200">
                 <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600"/>
                    <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest">Görünebilirlik Uyarısı</h4>
                 </div>
                 <p className="text-xs text-orange-800 font-bold mb-4">
                    Eğer işletmeniz Ana yol veya güzergah üzerinde ise aşağıdaki bilgileri girmeniz görünebilirliğiniz açısından hayati önem taşır.
                 </p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="group">
                       <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block pl-2">Otoyol İsmi</label>
                       <input className="w-full bg-white px-4 py-3 rounded-xl font-bold text-slate-700 shadow-sm border-transparent outline-none focus:ring-2 focus:ring-orange-300" placeholder="Örn: O-4, E80, D100" value={bizForm.roadName} onChange={(e)=>setBizForm({...bizForm, roadName:e.target.value})} />
                    </div>
                    <div className="group">
                       <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block pl-2">Yol Tarifi / İstikamet</label>
                       <input className="w-full bg-white px-4 py-3 rounded-xl font-bold text-slate-700 shadow-sm border-transparent outline-none focus:ring-2 focus:ring-orange-300" placeholder="ANKARA YÖNÜ, CADDE, MEYDAN" value={bizForm.roadDesc} onChange={(e)=>setBizForm({...bizForm, roadDesc:e.target.value})} />
                    </div>
                 </div>
              </div>

              <NeuTextArea label="Tanıtım Yazısı" placeholder="İşletmenizi anlatan kısa bir yazı..." value={bizForm.desc} onChange={(e)=>setBizForm({...bizForm, desc:e.target.value})} />
              <div className="pt-4 flex gap-4"><NeuButton onClick={()=>setStep(1)} className="flex-1 py-5">GERİ</NeuButton><NeuButton onClick={()=>setStep(3)} variant="solid" className="flex-1 py-5">DEVAM ET</NeuButton></div>
            </div>
          )}

          {/* STEP 3: CATS */}
          {step === 3 && (
            <div className="space-y-8">
               <h2 className={`text-xl font-black mb-6 flex items-center gap-2 ${TXT_DARK}`}><Store className={ACCENT_COLOR}/> KATEGORİ VE İMKANLAR</h2>
               
               <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-orange-400"/> Genel Tesis İmkanları</h4>
                  <div className="flex flex-wrap gap-3">
                     {features.filter(f => f.is_global).map(f => (
                       <button
                         key={f.id}
                         onClick={() => {
                           const s = new Set(selectedFeats)
                           if (s.has(f.id)) s.delete(f.id)
                           else s.add(f.id)
                           setSelectedFeats(s)
                         }}
                         className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${selectedFeats.has(f.id) ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                       >
                         {f.name}
                       </button>
                     ))}
                  </div>
               </div>

               <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {categories.map((cat) => {
                    const isSel = selectedCats.has(cat.id)
                    const catFeats = features.filter((f) => f.category_id === cat.id)
                    const brandList = brands[cat.id]

                    return (
                      <div key={cat.id} className={`p-6 rounded-3xl transition-all duration-300 border-2 ${isSel ? 'bg-white border-orange-100 shadow-md' : 'bg-[#eef0f4] border-transparent'}`}>
                         <div className="flex items-center justify-between" onClick={()=>toggleCat(cat.id, cat.name)}>
                            <span className={`font-black text-lg ${isSel ? 'text-slate-800' : 'text-slate-500'}`}>{cat.name}</span>
                            <NeuSwitch checked={isSel} onChange={()=>toggleCat(cat.id, cat.name)} />
                         </div>
                         {isSel && (
                           <div className="mt-6 pl-2 space-y-6 animate-in slide-in-from-top-4">
                              {brandList && (
                                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Store className="w-3 h-3"/> {cat.name} Markaları</label>
                                   {brandList.map((brandName, idx) => (
                                      <div key={idx} className="flex gap-2">
                                         <input className="flex-1 bg-white px-4 py-3 rounded-xl text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-200 placeholder:font-normal" placeholder={`Örn: ${cat.name} markası...`} value={brandName} onChange={(e)=>updateBrand(cat.id, idx, e.target.value)} />
                                         {brandList.length > 1 && <button onClick={()=>setBrands({...brands,[cat.id]:brands[cat.id].filter((_,i)=>i!==idx)})} className="w-10 h-10 flex items-center justify-center bg-red-100 text-red-500 rounded-xl hover:bg-red-200"><Trash2 className="w-5 h-5"/></button>}
                                         {idx === brandList.length - 1 && <button onClick={()=>setBrands({...brands,[cat.id]:[...brands[cat.id], '']})} className="w-10 h-10 flex items-center justify-center bg-green-100 text-green-500 rounded-xl hover:bg-green-200"><Plus className="w-5 h-5"/></button>}
                                      </div>
                                   ))}
                                </div>
                              )}
                              {catFeats.length > 0 && (
                                 <div className="flex flex-wrap gap-2">
                                    {catFeats.map(f => (
                                      <button
                                        key={f.id}
                                        onClick={() => {
                                          const s = new Set(selectedFeats)
                                          if (s.has(f.id)) s.delete(f.id)
                                          else s.add(f.id)
                                          setSelectedFeats(s)
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedFeats.has(f.id) ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                      >
                                        {f.name}
                                      </button>
                                    ))}
                                 </div>
                              )}
                           </div>
                         )}
                      </div>
                    )
                  })}
               </div>
               <div className="pt-6 flex gap-4"><NeuButton onClick={()=>setStep(2)} className="flex-1 py-5">GERİ</NeuButton><NeuButton onClick={()=>setStep(4)} variant="solid" className="flex-1 py-5">DEVAM ET</NeuButton></div>
            </div>
          )}

          {/* STEP 4: PHOTOS */}
          {step === 4 && (
             <div className="space-y-8">
                <h2 className={`text-xl font-black mb-6 flex items-center gap-2 ${TXT_DARK}`}><Upload className={ACCENT_COLOR}/> FOTOĞRAF GALERİSİ</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                   {photos.map((f, i) => (
                      <div key={i} className="relative group aspect-video rounded-2xl overflow-hidden shadow-lg border-2 border-white">
                         <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="Yüklenen işletme görseli" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button onClick={()=>setPhotos(photos.filter((_,x)=>x!==i))} className="p-2 bg-red-500 text-white rounded-full"><Trash2 className="w-4 h-4"/></button>
                            <button onClick={()=>setCoverIndex(i)} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${coverIndex===i ? 'bg-green-500 text-white' : 'bg-white text-slate-800'}`}>{coverIndex===i ? 'Kapak' : 'Kapak Yap'}</button>
                         </div>
                         {coverIndex===i && <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-sm">VİTRİN</div>}
                      </div>
                   ))}
                   {photos.length < 6 && (
                      <label className="border-3 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50/50 cursor-pointer aspect-video transition-all group">
                         <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><Upload className="w-6 h-6"/></div>
                         <span className="text-xs font-black uppercase tracking-wide">FOTOĞRAF YÜKLE</span>
                         <input type="file" multiple accept="image/*" className="hidden" onChange={(e)=>{if(e.target.files) setPhotos([...photos, ...Array.from(e.target.files)])}}/>
                      </label>
                   )}
                </div>
                <div className="pt-6 flex gap-4"><NeuButton onClick={()=>setStep(3)} className="flex-1 py-5">GERİ</NeuButton><NeuButton onClick={()=>setStep(5)} variant="solid" className="flex-1 py-5">SON KONTROL</NeuButton></div>
             </div>
          )}

          {/* STEP 5: APPROVAL */}
          {step === 5 && (
             <div className="space-y-8">
                <h2 className={`text-xl font-black mb-6 flex items-center gap-2 ${TXT_DARK}`}><CheckCircle className={ACCENT_COLOR}/> ONAY VE GÖNDERİM</h2>
                <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 shadow-inner space-y-3">
                   <div className="flex justify-between border-b border-orange-100 pb-2"><span className="text-sm font-bold text-slate-400">İŞLETME</span><span className="text-sm font-black text-slate-700">{bizForm.name}</span></div>
                   <div className="flex justify-between border-b border-orange-100 pb-2"><span className="text-sm font-bold text-slate-400">KATEGORİLER</span><span className="text-sm font-black text-slate-700 text-right">{Array.from(selectedCats).map(id => categories.find(c=>c.id===id)?.name).join(', ')}</span></div>
                   <div className="flex justify-between pt-1"><span className="text-sm font-bold text-slate-400">LOKASYON</span><span className="text-sm font-black text-slate-700 max-w-[200px] text-right truncate">{bizForm.address}</span></div>
                </div>
                <div className="space-y-3">
                   {finalRules.map((r) => (
                     <label key={r.k} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border-2 ${rules[r.k] ? 'bg-orange-50 border-orange-200' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${rules[r.k] ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>{rules[r.k] && <Check className="w-4 h-4 text-white"/>}</div>
                        <input type="checkbox" className="hidden" checked={rules[r.k]} onChange={(e)=>setRules({...rules, [r.k]: e.target.checked})}/>
                        <span className="text-sm font-bold text-slate-600 flex-1">{r.t}</span>
                        {r.legal ? (
                          <button
                            type="button"
                            onClick={(event) => { event.preventDefault(); event.stopPropagation(); setLegalModal({ title: r.legal!.title, version: r.legal!.version, body: r.legal!.body }) }}
                            className="text-xs font-black uppercase tracking-wide px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-orange-600"
                          >
                            Metni Oku
                          </button>
                        ) : null}
                     </label>
                   ))}
                </div>
                <div className="pt-6 flex gap-4"><NeuButton onClick={()=>setStep(4)} className="flex-1 py-5">DÜZENLE</NeuButton><NeuButton onClick={handleFinalSubmit} variant="solid" className="flex-1 py-5 shadow-xl shadow-green-200" disabled={loading}>{loading ? "GÖNDERİLİYOR..." : "BAŞVURUYU TAMAMLA"}</NeuButton></div>
             </div>
          )}

        </NeuCard>
      </div>
    </div>
  )
}
