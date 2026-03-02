'use client'

import { useState, useEffect, useCallback } from 'react'
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { PanelTitle } from '../../_components/panel-title'
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

// --- UI COMPONENTS ---

type Category = { id: string; name: string; [key: string]: unknown }
type Feature = { id: string; name: string; category_id?: string | null; is_global?: boolean | null; [key: string]: unknown }
type PlacePrediction = { place_id: string; description: string; types?: string[] }
type RuleKey = 'r1' | 'r2' | 'r3'
type RuleState = Record<RuleKey, boolean>
type LegalModalState = { title: string; version: string; body: string } | null

type HardwarePanelProps = {
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

type SectionHeaderProps = {
  icon: LucideIcon
  title: string
}

const isAbortLikeError = (value: unknown) => {
  const raw = value instanceof Error ? `${value.name} ${value.message}` : String(value ?? '')
  const message = raw.toLowerCase()
  return message.includes('aborterror') || message.includes('aborted') || message.includes('operation was aborted')
}

// Ortak Donanım Kartı Kapsayıcısı
const HardwarePanel = ({ children, className = "" }: HardwarePanelProps) => (
  <div className={`relative bg-[#16181d] border border-[#2d313a] rounded-md shadow-lg ${className}`}>
    <div className="absolute top-2 left-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute bottom-2 left-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="p-6 md:p-8 relative z-10">
      {children}
    </div>
  </div>
)

const SectionHeader = ({ icon: Icon, title }: SectionHeaderProps) => (
  <div className="flex items-center gap-3 mb-6 border-b border-[#2d313a] pb-4">
    <div className="w-8 h-8 rounded border border-[#2d313a] bg-[#0a0c10] flex items-center justify-center text-[#38bdf8] shrink-0">
      <Icon strokeWidth={1.5} className="w-4 h-4" />
    </div>
    <h2 className="text-[14px] font-medium text-[#e2e8f0] uppercase tracking-wide">{title}</h2>
  </div>
)

const NeuInput = ({ icon: Icon, label, rightElement, ...props }: NeuInputProps) => (
  <div className="mb-5 group">
    {label && <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest mb-2">{label}</label>}
    <div className="relative flex items-center">
      {Icon && <Icon strokeWidth={1.5} className="absolute left-3 w-4 h-4 text-[#475569] group-focus-within:text-[#38bdf8] transition-colors pointer-events-none"/>}
      <input 
        {...props}
        className={`w-full bg-[#0a0c10] ${Icon ? 'pl-10' : 'pl-4'} ${rightElement ? 'pr-14' : 'pr-4'} py-3 rounded text-[#e2e8f0] font-mono text-sm outline-none transition-all
        border border-[#2d313a] focus:border-[#38bdf8]/50 placeholder:text-[#475569]`}
      />
      {rightElement && <div className="absolute right-1.5">{rightElement}</div>}
    </div>
  </div>
)

const NeuTextArea = ({ label, ...props }: NeuTextAreaProps) => (
  <div className="mb-5 group">
    {label && <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest mb-2">{label}</label>}
    <textarea 
      {...props}
      className={`w-full bg-[#0a0c10] px-4 py-3 rounded text-[#e2e8f0] font-mono text-sm outline-none transition-all resize-none custom-scrollbar
      border border-[#2d313a] focus:border-[#38bdf8]/50 placeholder:text-[#475569] min-h-[100px]`}
    />
  </div>
)

const NeuSwitch = ({ checked, onChange }: NeuSwitchProps) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(!checked); }} 
    className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors duration-300 border ${checked ? 'bg-[#153445] border-[#226785]' : 'bg-[#0a0c10] border-[#2d313a]'}`}
  >
    <div className={`absolute top-[1px] left-[1px] w-[16px] h-[16px] rounded-full transition-transform duration-300 ${checked ? 'translate-x-[18px] bg-[#38bdf8]' : 'translate-x-0 bg-[#64748b]'}`} />
  </div>
)

const NeuButton = ({ onClick, children, variant = "primary", className = "", disabled=false, type = 'button' }: NeuButtonProps) => {
  const base = "relative overflow-hidden transition-all duration-150 rounded font-mono uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed select-none"
  const primary = "bg-transparent text-[#94a3b8] border border-[#2d313a] hover:text-[#e2e8f0] hover:bg-[#1a1d24]"
  const solid = "bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110"

  let style = primary
  if (variant === 'solid') style = solid

  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${style} ${className}`}>{children}</button>
}

// --- SUCCESS MODAL ---
const SuccessModal = ({ isOpen, onClose }: SuccessModalProps) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050608]/90 backdrop-blur-sm animate-in fade-in duration-300">
      <HardwarePanel className="max-w-md w-full text-center p-8">
        <div className="w-16 h-16 bg-[#0a0c10] rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-400 border border-[#2d313a]">
          <CheckCircle className="w-8 h-8" strokeWidth={1.5} />
        </div>
        <h2 className="text-[18px] font-medium text-[#e2e8f0] uppercase tracking-wide mb-2">İşletme Kaydedildi</h2>
        <p className="text-[11px] font-mono text-[#94a3b8] mb-8 leading-relaxed uppercase tracking-widest">
          Yeni işletme kaydınız tamamlandı. Panel ana sayfasına otomatik yönlendiriliyorsunuz.
        </p>
        <NeuButton onClick={onClose} variant="solid" className="w-full py-3.5">Harika, Anladım</NeuButton>
      </HardwarePanel>
    </div>
  )
}

const LegalModal = ({ state, onClose }: LegalModalProps) => {
  if (!state) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#050608]/90 backdrop-blur-sm">
      <HardwarePanel className="w-full max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-[#2d313a] bg-[#0f1115]">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748b]">{state.version}</p>
          <h3 className="text-[14px] font-medium tracking-wide text-[#e2e8f0] mt-1 uppercase">{state.title}</h3>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#0c0e12] p-5 text-[12px] font-sans text-[#cbd5e1] leading-relaxed whitespace-pre-wrap custom-scrollbar">
          {state.body}
        </div>
        <div className="px-6 py-4 border-t border-[#2d313a] bg-[#0f1115] flex justify-end">
          <NeuButton onClick={onClose} variant="solid" className="px-6 py-2.5">
            Kapat
          </NeuButton>
        </div>
      </HardwarePanel>
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
  const [wizardError, setWizardError] = useState<string | null>(null)
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
    } catch (e) {
      if (!isAbortLikeError(e)) console.error(e)
    }
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
    } catch (e) {
      if (!isAbortLikeError(e)) console.error(e)
    }
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


  const parseCoordsFromForm = () => {
    const latRaw = bizForm.lat.trim()
    const lngRaw = bizForm.lng.trim()

    if (latRaw && lngRaw) {
      const lat = Number(latRaw)
      const lng = Number(lngRaw)
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
    }

    const parts = bizForm.coordsInput.split(',')
    if (parts.length !== 2) return null

    const lat = Number(parts[0].trim())
    const lng = Number(parts[1].trim())
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

    return { lat, lng }
  }

  const validateStep2 = () => {
    if (!bizForm.name.trim()) return 'İşletme adı zorunludur.'
    if (!bizForm.phone.trim()) return 'İşletme telefonu zorunludur.'
    if (!bizForm.address.trim()) return 'Açık adres zorunludur.'

    const coords = parseCoordsFromForm()
    if (!coords) return 'Geçerli bir enlem-boylam girin. Örn: 41.015, 28.979'
    if (coords.lat < -90 || coords.lat > 90 || coords.lng < -180 || coords.lng > 180) {
      return 'Konum değerleri geçerli aralıkta olmalıdır.'
    }

    return null
  }

  const validateStep3 = () => {
    if (selectedCats.size === 0) return 'En az 1 kategori seçmelisiniz.'
    return null
  }

  const validateStep4 = () => {
    if (photos.length < 3) return 'En az 3 fotoğraf yüklemelisiniz.'
    return null
  }

  const handleStep2Continue = () => {
    const error = validateStep2()
    if (error) {
      setWizardError(error)
      return
    }
    setWizardError(null)
    setStep(3)
  }

  const handleStep3Continue = () => {
    const error = validateStep3()
    if (error) {
      setWizardError(error)
      return
    }
    setWizardError(null)
    setStep(4)
  }

  const handleStep4Continue = () => {
    const error = validateStep4()
    if (error) {
      setWizardError(error)
      return
    }
    setWizardError(null)
    setStep(5)
  }

  const handleFinalSubmit = async () => {
    const step2Error = validateStep2()
    if (step2Error) {
      setWizardError(step2Error)
      setStep(2)
      return
    }

    const step3Error = validateStep3()
    if (step3Error) {
      setWizardError(step3Error)
      setStep(3)
      return
    }

    const step4Error = validateStep4()
    if (step4Error) {
      setWizardError(step4Error)
      setStep(4)
      return
    }

    if (!rules.r1 || !rules.r2 || !rules.r3) return alert('Lütfen kuralları onaylayın.')

    setWizardError(null)
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

  return (
    <div className="relative min-h-screen bg-[#06080b] flex flex-col items-center py-8 px-4 font-sans selection:bg-[#38bdf8]/30 overflow-hidden">
      
      {/* Background Tech Grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <SuccessModal isOpen={showSuccess} onClose={() => router.push('/merchant/dashboard')} />
      <LegalModal state={legalModal} onClose={() => setLegalModal(null)} />

      <div className="relative z-10 w-full max-w-4xl border border-[#2d313a] rounded-md bg-[#0c0e12] shadow-2xl overflow-hidden">
        
        {/* TELEMETRY HEADER BAR */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-[#2d313a] bg-[#0f1115]">
          <div className="flex items-center gap-4">
             <div className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
             <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-[0.2em] text-[#64748b]">Platform</span>
                <span className="text-xs font-mono tracking-widest text-[#e2e8f0]">MOLAYERI CONTROL</span>
             </div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#38bdf8] border border-[#38bdf8]/30 px-2 py-1 rounded bg-[#38bdf8]/10 hidden md:block">BUSINESS_ONBOARDING</div>
        </header>

        <div className="p-6 md:p-10">
        
          {/* TITLE */}
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded border border-[#2d313a] bg-[#0a0c10] flex items-center justify-center text-[#38bdf8] mb-4">
              <Store strokeWidth={1.5} className="w-5 h-5" />
            </div>
            <PanelTitle title="Yeni İşletme Kaydı" className="justify-center" />
          </div>

          {/* STEPPER */}
          <div className="mb-12">
            <div className="grid grid-cols-5 gap-2 md:gap-4">
              {steps.map((s, index) => {
                const isDone = step > s.n
                const isActive = step === s.n
                const isReach = step >= s.n
                return (
                  <div
                    key={s.n}
                    className={`rounded p-3 transition-all duration-300 border ${
                      isActive ? 'bg-[#153445]/30 border-[#226785]' :
                      isReach ? 'bg-[#0a0c10] border-[#2d313a]' :
                      'bg-transparent border-[#1e232b]'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-1 md:gap-0">
                      <span className={`text-[9px] md:text-[10px] font-mono tracking-[0.1em] ${isReach ? 'text-[#38bdf8]' : 'text-[#475569]'}`}>
                        S0{index + 1}
                      </span>
                      {isDone ? (
                        <Check strokeWidth={3} className="w-3.5 h-3.5 text-[#38bdf8]" />
                      ) : (
                        <span className={`text-[10px] font-mono ${isActive ? 'text-[#e2e8f0]' : 'text-[#475569]'}`}>{index + 1}</span>
                      )}
                    </div>
                    <div className={`mt-2 text-[9px] md:text-[10px] font-mono uppercase tracking-[0.15em] ${isReach ? 'text-[#cbd5e1]' : 'text-[#475569]'}`}>
                      {s.t}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <HardwarePanel className="animate-in fade-in zoom-in-95 duration-300 p-0 overflow-hidden">
            <div className="p-6 md:p-8">
              
              {/* STEP 1: ACCOUNT COMPLIANCE */}
              {step === 1 && (
                <div className="space-y-6">
                  <SectionHeader icon={Store} title="Hesap Uyum Onayı" />
                  <div className="rounded p-4 text-[11px] font-mono text-[#94a3b8] leading-relaxed uppercase tracking-widest bg-[#0a0c10] border border-[#2d313a]">
                    {currentUserDisplayName
                      ? `${currentUserDisplayName} hesabı ile devam ediliyor.`
                      : 'Aktif kullanıcı hesabı ile devam ediliyor.'}{' '}
                    İşletme kaydına geçmeden önce üyelik sözleşmesi ve KVKK onayı zorunludur.
                  </div>
                  <div className="space-y-3">
                    <label className={`flex items-start gap-4 p-4 rounded border cursor-pointer transition-all ${accountTermsAccepted ? 'bg-[#153445]/20 border-[#226785]' : 'bg-[#0a0c10] border-[#2d313a] hover:border-[#475569]'}`}>
                       <div className={`mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${accountTermsAccepted ? 'bg-[#38bdf8] border-[#38bdf8]' : 'border-[#475569]'}`}>
                         {accountTermsAccepted && <Check strokeWidth={3} className="w-3 h-3 text-[#0a0c10]"/>}
                       </div>
                       <input type="checkbox" className="hidden" checked={accountTermsAccepted} onChange={(e)=>setAccountTermsAccepted(e.target.checked)} />
                       <span className="text-[11px] font-mono text-[#cbd5e1] flex-1 uppercase tracking-wider leading-relaxed">Kullanıcı üyelik sözleşmesini okudum ve kabul ediyorum.</span>
                       <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setLegalModal({ title: 'Kullanıcı Üyelik Sözleşmesi', version: USER_MEMBERSHIP_TERMS_VERSION, body: USER_MEMBERSHIP_TERMS_TEXT }) }} className="px-3 py-1.5 rounded bg-[#16181d] border border-[#2d313a] text-[9px] font-mono text-[#94a3b8] hover:text-[#e2e8f0] uppercase tracking-widest shrink-0">
                         Metni Oku
                       </button>
                    </label>
                    <label className={`flex items-start gap-4 p-4 rounded border cursor-pointer transition-all ${accountKvkkAccepted ? 'bg-[#153445]/20 border-[#226785]' : 'bg-[#0a0c10] border-[#2d313a] hover:border-[#475569]'}`}>
                       <div className={`mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${accountKvkkAccepted ? 'bg-[#38bdf8] border-[#38bdf8]' : 'border-[#475569]'}`}>
                         {accountKvkkAccepted && <Check strokeWidth={3} className="w-3 h-3 text-[#0a0c10]"/>}
                       </div>
                       <input type="checkbox" className="hidden" checked={accountKvkkAccepted} onChange={(e)=>setAccountKvkkAccepted(e.target.checked)} />
                       <span className="text-[11px] font-mono text-[#cbd5e1] flex-1 uppercase tracking-wider leading-relaxed">KVKK aydınlatma metnini okudum ve onaylıyorum.</span>
                       <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setLegalModal({ title: 'KVKK Aydınlatma Metni', version: KVKK_TERMS_VERSION, body: KVKK_TERMS_TEXT }) }} className="px-3 py-1.5 rounded bg-[#16181d] border border-[#2d313a] text-[9px] font-mono text-[#94a3b8] hover:text-[#e2e8f0] uppercase tracking-widest shrink-0">
                         Metni Oku
                       </button>
                    </label>
                  </div>
                  {accountError ? (
                    <div className="rounded px-4 py-3 text-[11px] font-mono text-rose-400 uppercase tracking-widest bg-rose-950/20 border border-rose-900/50">
                      [HATA] {accountError}
                    </div>
                  ) : null}
                  <div className="pt-4 flex gap-4 border-t border-[#1e232b]">
                    <NeuButton onClick={() => router.push('/merchant/dashboard')} className="flex-1 py-3.5">
                      PANELE DÖN
                    </NeuButton>
                    <NeuButton onClick={handleAccountComplianceContinue} variant="solid" className="flex-1 py-3.5" disabled={loading}>
                      {loading ? 'KAYDEDİLİYOR...' : 'ONAYLA VE DEVAM ET'}
                    </NeuButton>
                  </div>
                </div>
              )}
              
              {/* STEP 2: LOCATION */}
              {step === 2 && (
                <div className="space-y-6">
                  <SectionHeader icon={MapPin} title="Konum ve Detaylar" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <NeuInput icon={Store} label="İşletme Adı" placeholder="Tabela Adı" value={bizForm.name} onChange={(e)=>setBizForm({...bizForm, name:e.target.value})} />
                     <NeuInput icon={Phone} label="İşletme Telefonu" placeholder="İletişim Numarası" value={bizForm.phone} onChange={(e)=>setBizForm({...bizForm, phone:e.target.value})} />
                  </div>

                  {/* SEARCH */}
                  <div className="relative z-20">
                     <NeuInput icon={Search} label="Konum Ara" placeholder="Google Maps&#39;te Ara..." value={placeQuery} onChange={(e)=>searchPlaces(e.target.value)} />
                     {predictions.length > 0 && (
                       <div className="absolute top-[80px] left-0 w-full bg-[#16181d] rounded shadow-[0_20px_40px_rgba(0,0,0,0.8)] border border-[#2d313a] max-h-60 overflow-y-auto custom-scrollbar">
                         {predictions.map((p) => (
                           <div key={p.place_id} onClick={()=>selectPlace(p.place_id, p.description)} className="p-4 hover:bg-[#1d2128] cursor-pointer text-[12px] font-mono text-[#cbd5e1] border-b border-[#2d313a]/50 flex items-center gap-3 transition-colors">
                             <MapPin strokeWidth={1.5} className="w-4 h-4 text-[#38bdf8]"/> {p.description}
                           </div>
                         ))}
                       </div>
                     )}
                  </div>

                  <NeuInput icon={MapPin} label="Açık Adres" placeholder="Mahalle, Cadde, No..." value={bizForm.address} onChange={(e)=>setBizForm({...bizForm, address:e.target.value})} />

                  {/* COORDS + MAP */}
                  <div className="bg-[#0a0c10] p-5 rounded border border-[#2d313a]">
                     <div className="flex items-end gap-3 mb-2">
                        <div className="flex-1">
                          <NeuInput 
                            icon={Navigation} 
                            label="Hassas Konum (Lat, Lng)" 
                            placeholder="Örn: 40.1234, 30.5678" 
                            value={bizForm.coordsInput}
                            onChange={(e)=>handleCoordsChange(e.target.value)}
                            rightElement={
                              <button type="button" onClick={openMap} className="w-8 h-8 flex items-center justify-center rounded bg-[#16181d] border border-[#2d313a] text-[#38bdf8] hover:bg-[#1a1d24] transition-colors">
                                 <Map strokeWidth={1.5} className="w-4 h-4"/>
                              </button>
                            }
                          />
                        </div>
                     </div>
                     <div className="flex gap-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b] leading-relaxed">
                        <div className="shrink-0 pt-0.5"><Star strokeWidth={1.5} className="w-3.5 h-3.5 text-[#38bdf8]"/></div>
                        <div>
                           [İpucu] Yandaki harita ikonuna tıklayıp, Maps&#39;te işletmenizin girişine sağ tıklayın. İlk çıkan koordinatı kopyalayıp yapıştırın.
                        </div>
                     </div>
                  </div>

                  {/* ROAD ALERT */}
                  <div className="p-5 rounded bg-amber-950/10 border border-amber-900/30">
                     <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle strokeWidth={1.5} className="w-4 h-4 text-amber-500"/>
                        <h4 className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-widest">Görünebilirlik Uyarısı</h4>
                     </div>
                     <p className="text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] mb-5 leading-relaxed">
                        İşletmeniz ana yol veya güzergah üzerinde ise aşağıdaki bilgileri girmeniz sistem görünürlüğü için kritik önem taşır.
                     </p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="group">
                           <label className="text-[9px] font-mono font-bold text-[#64748b] uppercase tracking-[0.1em] mb-1.5 block">Otoyol İsmi</label>
                           <input className="w-full bg-[#0a0c10] px-4 py-3 rounded text-[12px] font-mono text-[#e2e8f0] border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]" placeholder="Örn: O-4, E80, D100" value={bizForm.roadName} onChange={(e)=>setBizForm({...bizForm, roadName:e.target.value})} />
                        </div>
                        <div className="group">
                           <label className="text-[9px] font-mono font-bold text-[#64748b] uppercase tracking-[0.1em] mb-1.5 block">Yol Tarifi / İstikamet</label>
                           <input className="w-full bg-[#0a0c10] px-4 py-3 rounded text-[12px] font-mono text-[#e2e8f0] border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]" placeholder="ANKARA YÖNÜ, CADDE" value={bizForm.roadDesc} onChange={(e)=>setBizForm({...bizForm, roadDesc:e.target.value})} />
                        </div>
                     </div>
                  </div>

                  <NeuTextArea label="Tanıtım Yazısı" placeholder="İşletmenizi anlatan kısa bir yazı..." value={bizForm.desc} onChange={(e)=>setBizForm({...bizForm, desc:e.target.value})} />
                  
                  {wizardError ? (
                    <div className="rounded px-4 py-3 text-[11px] font-mono text-rose-400 uppercase tracking-widest bg-rose-950/20 border border-rose-900/50">
                      [HATA] {wizardError}
                    </div>
                  ) : null}
                  
                  <div className="pt-4 flex gap-4 border-t border-[#1e232b]">
                    <NeuButton onClick={() => { setWizardError(null); setStep(1) }} className="flex-1 py-3.5">GERİ</NeuButton>
                    <NeuButton onClick={handleStep2Continue} variant="solid" className="flex-1 py-3.5">DEVAM ET</NeuButton>
                  </div>
                </div>
              )}

              {/* STEP 3: CATS */}
              {step === 3 && (
                <div className="space-y-6">
                   <SectionHeader icon={Store} title="Kategori ve İmkanlar" />
                   
                   <div className="p-5 rounded bg-[#0a0c10] border border-[#2d313a]">
                      <h4 className="text-[10px] font-mono font-semibold text-[#94a3b8] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Star strokeWidth={1.5} className="w-3.5 h-3.5 text-[#64748b]"/> Genel Tesis İmkanları
                      </h4>
                      <div className="flex flex-wrap gap-2">
                         {features.filter(f => f.is_global).map(f => (
                           <button
                             key={f.id}
                             onClick={() => {
                               const s = new Set(selectedFeats)
                               if (s.has(f.id)) s.delete(f.id)
                               else s.add(f.id)
                               setSelectedFeats(s)
                             }}
                             className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-widest transition-colors border ${selectedFeats.has(f.id) ? 'bg-[#153445] border-[#226785] text-[#38bdf8]' : 'bg-[#16181d] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#94a3b8]'}`}
                           >
                             {f.name}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {categories.map((cat) => {
                        const isSel = selectedCats.has(cat.id)
                        const catFeats = features.filter((f) => f.category_id === cat.id)
                        const brandList = brands[cat.id]

                        return (
                          <div key={cat.id} className={`p-5 rounded transition-all duration-300 border ${isSel ? 'bg-[#101419] border-[#22576b]' : 'bg-[#0a0c10] border-[#2d313a]'}`}>
                             <div className="flex items-center justify-between cursor-pointer" onClick={()=>toggleCat(cat.id, cat.name)}>
                                <span className={`font-mono text-[13px] uppercase tracking-wide ${isSel ? 'text-[#e2e8f0]' : 'text-[#64748b]'}`}>{cat.name}</span>
                                <NeuSwitch checked={isSel} onChange={()=>toggleCat(cat.id, cat.name)} />
                             </div>
                             {isSel && (
                               <div className="mt-5 pt-5 border-t border-[#1e232b] space-y-5 animate-in slide-in-from-top-2">
                                  {brandList && (
                                    <div className="space-y-3 p-4 bg-[#07090c] rounded border border-[#1e232b]">
                                       <label className="text-[9px] font-mono text-[#475569] uppercase tracking-[0.2em] flex items-center gap-2">
                                         <Store strokeWidth={1.5} className="w-3 h-3 text-[#38bdf8]/50"/> {cat.name} Markaları
                                       </label>
                                       {brandList.map((brandName, idx) => (
                                          <div key={idx} className="flex gap-2">
                                             <input className="flex-1 bg-[#16181d] px-3 py-2 rounded text-[12px] font-mono text-[#cbd5e1] border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]" placeholder={`Örn: ${cat.name} markası...`} value={brandName} onChange={(e)=>updateBrand(cat.id, idx, e.target.value)} />
                                             {brandList.length > 1 && <button onClick={()=>setBrands({...brands,[cat.id]:brands[cat.id].filter((_,i)=>i!==idx)})} className="w-9 h-9 flex items-center justify-center bg-[#1a0f14] text-rose-400 rounded border border-rose-900/50 hover:bg-[#2a131a] transition-colors"><Trash2 strokeWidth={1.5} className="w-4 h-4"/></button>}
                                             {idx === brandList.length - 1 && <button onClick={()=>setBrands({...brands,[cat.id]:[...brands[cat.id], '']})} className="w-9 h-9 flex items-center justify-center bg-[#0b1b24] text-[#38bdf8] rounded border border-[#18384b] hover:bg-[#102a38] transition-colors"><Plus strokeWidth={1.5} className="w-4 h-4"/></button>}
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
                                            className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wide transition-colors border ${selectedFeats.has(f.id) ? 'bg-[#38bdf8]/10 border-[#38bdf8]/40 text-[#38bdf8]' : 'bg-[#16181d] border-[#2d313a] text-[#64748b] hover:border-[#475569]'}`}
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
                   {wizardError ? (
                     <div className="rounded px-4 py-3 text-[11px] font-mono text-rose-400 uppercase tracking-widest bg-rose-950/20 border border-rose-900/50">
                       [HATA] {wizardError}
                     </div>
                   ) : null}
                   <div className="pt-4 flex gap-4 border-t border-[#1e232b]">
                     <NeuButton onClick={() => { setWizardError(null); setStep(2) }} className="flex-1 py-3.5">GERİ</NeuButton>
                     <NeuButton onClick={handleStep3Continue} variant="solid" className="flex-1 py-3.5">DEVAM ET</NeuButton>
                   </div>
                </div>
              )}

              {/* STEP 4: PHOTOS */}
              {step === 4 && (
                 <div className="space-y-6">
                    <SectionHeader icon={Upload} title="Fotoğraf Galerisi" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       {photos.map((f, i) => (
                          <div key={i} className="relative group aspect-video rounded overflow-hidden border border-[#2d313a] bg-[#0a0c10]">
                             <img src={URL.createObjectURL(f)} className="w-full h-full object-cover opacity-80 mix-blend-lighten" alt="Yüklenen işletme görseli" />
                             <div className="absolute inset-0 bg-[#0a0c10]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                <button onClick={()=>setPhotos(photos.filter((_,x)=>x!==i))} className="p-2 bg-rose-950/80 text-rose-400 rounded border border-rose-900/50 hover:bg-rose-900 transition-colors"><Trash2 strokeWidth={1.5} className="w-4 h-4"/></button>
                                <button onClick={()=>setCoverIndex(i)} className={`px-3 py-1.5 rounded font-mono text-[9px] uppercase tracking-widest border transition-colors ${coverIndex===i ? 'bg-[#38bdf8]/20 text-[#38bdf8] border-[#38bdf8]/50' : 'bg-[#16181d] border-[#2d313a] text-[#94a3b8] hover:text-[#e2e8f0]'}`}>{coverIndex===i ? 'Kapak' : 'Kapak Yap'}</button>
                             </div>
                             {coverIndex===i && <div className="absolute top-2 left-2 bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30 text-[9px] font-mono tracking-widest px-2 py-0.5 rounded shadow-sm">VİTRİN</div>}
                          </div>
                       ))}
                       {photos.length < 6 && (
                          <label className="border border-dashed border-[#333842] rounded flex flex-col items-center justify-center bg-[#0a0c10] text-[#64748b] hover:border-[#38bdf8]/50 hover:text-[#38bdf8] hover:bg-[#101920] cursor-pointer aspect-video transition-all group">
                             <Upload strokeWidth={1.5} className="w-5 h-5 mb-2 group-hover:-translate-y-1 transition-transform"/>
                             <span className="text-[9px] font-mono uppercase tracking-[0.2em]">FOTO YÜKLE</span>
                             <input type="file" multiple accept="image/*" className="hidden" onChange={(e)=>{if(e.target.files) setPhotos([...photos, ...Array.from(e.target.files)])}}/>
                          </label>
                       )}
                    </div>
                    {wizardError ? (
                      <div className="rounded px-4 py-3 text-[11px] font-mono text-rose-400 uppercase tracking-widest bg-rose-950/20 border border-rose-900/50">
                        [HATA] {wizardError}
                      </div>
                    ) : null}
                    <div className="pt-4 flex gap-4 border-t border-[#1e232b]">
                      <NeuButton onClick={() => { setWizardError(null); setStep(3) }} className="flex-1 py-3.5">GERİ</NeuButton>
                      <NeuButton onClick={handleStep4Continue} variant="solid" className="flex-1 py-3.5">SON KONTROL</NeuButton>
                    </div>
                 </div>
              )}

              {/* STEP 5: APPROVAL */}
              {step === 5 && (
                 <div className="space-y-6">
                    <SectionHeader icon={CheckCircle} title="Onay ve Gönderim" />
                    
                    <div className="bg-[#0a0c10] p-5 rounded border border-[#2d313a] space-y-2 font-mono text-[11px] tracking-wide">
                       <div className="flex justify-between border-b border-[#1e232b] pb-2">
                         <span className="text-[#64748b]">[İŞLETME]</span>
                         <span className="text-[#38bdf8]">{bizForm.name.toUpperCase()}</span>
                       </div>
                       <div className="flex justify-between border-b border-[#1e232b] py-2">
                         <span className="text-[#64748b]">[KATEGORİLER]</span>
                         <span className="text-[#cbd5e1] text-right max-w-[60%]">{Array.from(selectedCats).map(id => categories.find(c=>c.id===id)?.name).join(', ').toUpperCase()}</span>
                       </div>
                       <div className="flex justify-between pt-2">
                         <span className="text-[#64748b]">[LOKASYON]</span>
                         <span className="text-[#cbd5e1] text-right truncate max-w-[60%]">{bizForm.address.toUpperCase()}</span>
                       </div>
                    </div>
                    
                    <div className="space-y-3">
                       {finalRules.map((r) => (
                         <label key={r.k} className={`flex items-start gap-4 p-4 rounded border cursor-pointer transition-all ${rules[r.k] ? 'bg-[#153445]/20 border-[#226785]' : 'bg-[#0a0c10] border-[#2d313a] hover:border-[#475569]'}`}>
                            <div className={`mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${rules[r.k] ? 'bg-[#38bdf8] border-[#38bdf8]' : 'border-[#475569]'}`}>
                              {rules[r.k] && <Check strokeWidth={3} className="w-3 h-3 text-[#0a0c10]"/>}
                            </div>
                            <input type="checkbox" className="hidden" checked={rules[r.k]} onChange={(e)=>setRules({...rules, [r.k]: e.target.checked})}/>
                            <span className="text-[11px] font-mono text-[#cbd5e1] flex-1 uppercase tracking-wider leading-relaxed">{r.t}</span>
                            {r.legal ? (
                              <button
                                type="button"
                                onClick={(event) => { event.preventDefault(); event.stopPropagation(); setLegalModal({ title: r.legal!.title, version: r.legal!.version, body: r.legal!.body }) }}
                                className="px-3 py-1.5 rounded bg-[#16181d] border border-[#2d313a] text-[9px] font-mono text-[#94a3b8] hover:text-[#e2e8f0] uppercase tracking-widest shrink-0"
                              >
                                Metni Oku
                              </button>
                            ) : null}
                         </label>
                       ))}
                    </div>
                    
                    <div className="pt-4 flex gap-4 border-t border-[#1e232b]">
                      <NeuButton onClick={() => { setWizardError(null); setStep(4) }} className="flex-1 py-3.5">
                        DÜZENLE
                      </NeuButton>
                      <NeuButton onClick={handleFinalSubmit} variant="solid" className="flex-1 py-3.5" disabled={loading}>
                        {loading ? "GÖNDERİLİYOR..." : "BAŞVURUYU TAMAMLA"}
                      </NeuButton>
                    </div>
                 </div>
              )}

            </div>
          </HardwarePanel>
        </div>
      </div>
    </div>
  )
}