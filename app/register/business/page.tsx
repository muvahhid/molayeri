'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { 
  Apple, CheckCircle, Loader2, MapPin, Store, User, Phone, Lock, Mail, 
  Upload, Trash2, Search, Star, Plus, Map, 
  AlertTriangle, Navigation, Check, ChevronRight
} from 'lucide-react'

// --- FIRE ORANGE NEUMORPHIC THEME ---
const BG_MAIN = "bg-[#eef0f4]"
const TXT_DARK = "text-slate-700"
const TXT_MUTED = "text-slate-400"
const ACCENT_COLOR = "text-orange-500"

// Gölgeler
const SHADOW_OUT = "shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff]"
const SHADOW_IN = "shadow-[inset_6px_6px_12px_#d1d5db,inset_-6px_-6px_12px_#ffffff]"
const SHADOW_BTN = "shadow-[6px_6px_12px_#d1d5db,-6px_-6px_12px_#ffffff]"

// --- UI COMPONENTS ---

const NeuCard = ({ children, className = "" }: any) => (
  <div className={`${BG_MAIN} rounded-[40px] ${SHADOW_OUT} border border-white/60 p-8 ${className}`}>
    {children}
  </div>
)

const NeuInput = ({ icon: Icon, label, rightElement, ...props }: any) => (
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

const NeuTextArea = ({ label, ...props }: any) => (
  <div className="mb-6 group">
    {label && <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-4">{label}</label>}
    <textarea 
      {...props}
      className={`w-full ${BG_MAIN} px-6 py-5 rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all resize-none
      ${SHADOW_IN} border border-transparent focus:ring-2 focus:ring-orange-400/20 placeholder:text-slate-400/60 min-h-[120px]`}
    />
  </div>
)

const NeuSwitch = ({ checked, onChange }: any) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(!checked); }} 
    className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-all duration-300 ease-in-out ${checked ? 'bg-orange-500 shadow-inner' : `${BG_MAIN} ${SHADOW_IN}`}`}
  >
    <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
  </div>
)

const NeuButton = ({ onClick, children, variant = "primary", className = "", disabled=false }: any) => {
  const base = "relative overflow-hidden transition-all duration-200 rounded-2xl font-black flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] uppercase tracking-wide text-sm select-none"
  const primary = `${BG_MAIN} text-slate-600 ${SHADOW_BTN} border border-white/60 hover:text-orange-600 hover:-translate-y-0.5 active:${SHADOW_IN}`
  const solid = `bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-[6px_6px_20px_rgba(249,115,22,0.4),-6px_-6px_20px_rgba(255,255,255,0.8)] border border-orange-400/20 hover:brightness-110 hover:-translate-y-0.5`

  let style = primary
  if (variant === 'solid') style = solid

  return <button onClick={onClick} disabled={disabled} className={`${base} ${style} ${className}`}>{children}</button>
}

// --- SUCCESS MODAL ---
const SuccessModal = ({ isOpen, onClose }: any) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#eef0f4] rounded-[40px] p-10 max-w-md w-full text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-300 border border-white relative overflow-hidden">
        <div className="w-24 h-24 bg-[#eef0f4] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff] text-green-500">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-2">Başvurunuz Alındı!</h2>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed text-sm">
          İşletme kaydınız başarıyla oluşturuldu ve onay havuzuna gönderildi. Onaylandıktan sonra <span className="text-orange-600 font-bold">uygulamadan giriş yapabilir</span> ve işletmenizi yönetmeye başlayabilirsiniz.
        </p>
        <NeuButton onClick={onClose} variant="solid" className="w-full py-5">Harika, Anladım</NeuButton>
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
  
  // DATA STATES
  const [userForm, setUserForm] = useState({ name: '', surname: '', email: '', phone: '', password: '' })
  const [bizForm, setBizForm] = useState({ 
    name: '', phone: '', desc: '', address: '', 
    coordsInput: '', lat: '', lng: '',
    roadName: '', roadDesc: '' 
  })
  
  const [placeQuery, setPlaceQuery] = useState('')
  const [predictions, setPredictions] = useState<any[]>([])
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [detectedRoadType, setDetectedRoadType] = useState<string | null>(null)

  const [categories, setCategories] = useState<any[]>([])
  const [features, setFeatures] = useState<any[]>([]) 
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set())
  const [selectedFeats, setSelectedFeats] = useState<Set<string>>(new Set())
  const [brands, setBrands] = useState<Record<string, string[]>>({}) 

  const [photos, setPhotos] = useState<File[]>([])
  const [coverIndex, setCoverIndex] = useState(0)
  const [rules, setRules] = useState({ r1: false, r2: false, r3: false })

  useEffect(() => {
    checkUser()
    fetchData()
  }, [])

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser()
    if (data.user) setStep(2)
  }

  const fetchData = async () => {
    const [cRes, fRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('features').select('*').order('name')
    ])
    if (cRes.data) setCategories(cRes.data)
    if (fRes.data) setFeatures(fRes.data)
  }

  const normalizeTrPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('0') && digits.length === 11) return digits
    if (digits.startsWith('90') && digits.length === 12) return `0${digits.slice(2)}`
    if (digits.startsWith('5') && digits.length === 10) return `0${digits}`
    return digits
  }

  const isValidTrPhone = (raw: string) => /^05\d{9}$/.test(normalizeTrPhone(raw))

  const isStrongPassword = (raw: string) => {
    const value = raw.trim()
    if (value.length < 8) return false
    if (!/[A-Z]/.test(value)) return false
    if (!/[0-9]/.test(value)) return false
    return true
  }

  const passwordRuleText = 'Şifre en az 8 karakter olmalı, 1 büyük harf ve 1 rakam içermeli.'

  const syncOwnProfile = async (userId: string, email: string, fullName: string, phone: string) => {
    const payload: Record<string, unknown> = {
      id: userId,
      email,
      full_name: fullName,
      phone,
    }
    try {
      await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
    } catch (error: any) {
      const msg = String(error?.message || '').toLowerCase()
      if (msg.includes('column') && msg.includes('phone')) {
        delete payload.phone
        await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
      }
    }
  }

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

  const handleSignUp = async () => {
    setAccountError(null)

    const name = userForm.name.trim()
    const surname = userForm.surname.trim()
    const email = userForm.email.trim().toLowerCase()
    const password = userForm.password.trim()
    const normalizedPhone = normalizeTrPhone(userForm.phone)
    const fullName = `${name} ${surname}`.trim()

    if (!email || !password || !name) {
      setAccountError('Lütfen zorunlu alanları doldurun.')
      return
    }
    if (!isValidTrPhone(normalizedPhone)) {
      setAccountError('Geçerli bir telefon girin. Örn: 05XX XXX XX XX')
      return
    }
    if (!isStrongPassword(password)) {
      setAccountError(passwordRuleText)
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone: normalizedPhone, role: 'isletmeci_aday' } }
    })
    setLoading(false)
    if (error) {
      setAccountError(`Kayıt başarısız: ${error.message}`)
      return
    }
    if (data.user) {
      if (data.session) {
        await syncOwnProfile(data.user.id, email, fullName, normalizedPhone)
      }
      setStep(2)
    }
  }

  const handleAppleContinue = async () => {
    setAccountError(null)
    setLoading(true)
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/register/business` : undefined
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo,
        queryParams: { scope: 'name email' },
      },
    })
    if (error) {
      setAccountError(`Apple girişi başlatılamadı: ${error.message}`)
      setLoading(false)
      return
    }

    if (data?.url && typeof window !== 'undefined') {
      window.location.assign(data.url)
      return
    }

    setLoading(false)
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
        type: determinedType
      }).select().single()
      if (error) throw error
      const bizId = biz.id

      // 2. Yan Tablolar
      const catInserts = Array.from(selectedCats).map(c => ({ business_id: bizId, category_id: c }))
      if(catInserts.length) await supabase.from('business_categories').insert(catInserts)

      const featInserts = Array.from(selectedFeats).map(f => ({ business_id: bizId, feature_id: f, value: 'true' }))
      if(featInserts.length) await supabase.from('business_features').insert(featInserts)

      const storeInserts: any[] = []
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
      const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', userId).single()
      
      if (currentProfile?.role !== 'admin' && currentProfile?.role !== 'isletmeci') {
         await supabase.from('profiles').update({ role: 'pending_business' }).eq('id', userId)
      }
      
      setShowSuccess(true)

    } catch (e:any) { alert(e.message) } finally { setLoading(false) }
  }

  const steps = [{n:1,t:'HESAP'},{n:2,t:'KONUM'},{n:3,t:'DETAY'},{n:4,t:'GÖRSEL'},{n:5,t:'ONAY'}]

  return (
    <div className={`min-h-screen flex flex-col items-center py-12 px-4 ${BG_MAIN} text-slate-600 font-sans`}>
      <SuccessModal isOpen={showSuccess} onClose={() => router.push('/')} />

      <div className="w-full max-w-3xl">
        
        {/* HEADER */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500 text-white shadow-xl shadow-orange-200 mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">İşletme Başvurusu</h1>
          <p className="text-slate-500 font-medium mt-2">MolaYeri kalitesine katılın.</p>
        </div>

        {/* STEPPER */}
        <div className="mb-12 relative px-4">
          <div className="absolute top-1/2 left-0 w-full h-2 bg-slate-200 rounded-full -translate-y-1/2 -z-10 shadow-inner"></div>
          <div className="absolute top-1/2 left-0 h-2 bg-orange-500 rounded-full -translate-y-1/2 -z-10 transition-all duration-500 ease-out" style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}></div>
          <div className="flex justify-between">
            {steps.map((s) => (
              <div key={s.n} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-4 border-[#eef0f4] ${step >= s.n ? 'bg-orange-500 text-white shadow-lg shadow-orange-300 scale-110' : 'bg-slate-300 text-slate-500'}`}>
                  {step > s.n ? <Check className="w-5 h-5"/> : s.n}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${step >= s.n ? 'text-orange-600' : 'text-slate-400'}`}>{s.t}</span>
              </div>
            ))}
          </div>
        </div>

        <NeuCard className="animate-in fade-in slide-in-from-bottom-8 duration-500">
          
          {/* STEP 1: ACCOUNT */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className={`text-xl font-black mb-6 flex items-center gap-2 ${TXT_DARK}`}><User className={ACCENT_COLOR}/> HESAP BİLGİLERİ</h2>
              <div className="grid grid-cols-2 gap-6">
                 <NeuInput icon={User} label="İsim" placeholder="Adınız" value={userForm.name} onChange={(e:any)=>setUserForm({...userForm, name:e.target.value})} />
                 <NeuInput icon={User} label="Soyisim" placeholder="Soyadınız" value={userForm.surname} onChange={(e:any)=>setUserForm({...userForm, surname:e.target.value})} />
              </div>
              <NeuInput icon={Mail} label="E-Posta" placeholder="E-posta Adresiniz" value={userForm.email} onChange={(e:any)=>setUserForm({...userForm, email:e.target.value})} />
              <NeuInput icon={Phone} label="Telefon" placeholder="05XX XXX XX XX" value={userForm.phone} onChange={(e:any)=>setUserForm({...userForm, phone:e.target.value})} />
              <NeuInput icon={Lock} label="Şifre" type="password" placeholder="Güçlü bir şifre belirleyin" value={userForm.password} onChange={(e:any)=>setUserForm({...userForm, password:e.target.value})} />
              <p className="text-xs font-bold text-slate-500 mt-1">{passwordRuleText}</p>
              {accountError ? (
                <div className="rounded-2xl px-4 py-3 text-sm font-semibold text-red-700 bg-red-100 border border-red-200">
                  {accountError}
                </div>
              ) : null}
              <div className="pt-2 space-y-3">
                <NeuButton onClick={handleSignUp} variant="solid" className="w-full py-5 text-lg" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> İŞLENİYOR</> : 'HESABI OLUŞTUR'}
                </NeuButton>
                <NeuButton onClick={handleAppleContinue} className="w-full py-4" disabled={loading}>
                  <Apple className="w-4 h-4" />
                  Apple ile Devam Et
                </NeuButton>
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className={`text-xl font-black mb-6 flex items-center gap-2 ${TXT_DARK}`}><MapPin className={ACCENT_COLOR}/> KONUM VE DETAYLAR</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <NeuInput icon={Store} label="İşletme Adı" placeholder="Tabela Adı" value={bizForm.name} onChange={(e:any)=>setBizForm({...bizForm, name:e.target.value})} />
                 <NeuInput icon={Phone} label="İşletme Telefonu" placeholder="İletişim Numarası" value={bizForm.phone} onChange={(e:any)=>setBizForm({...bizForm, phone:e.target.value})} />
              </div>

              {/* SEARCH */}
              <div className="relative z-20">
                 <NeuInput icon={Search} label="Konum Ara" placeholder="Google Maps'te Ara..." value={placeQuery} onChange={(e:any)=>searchPlaces(e.target.value)} />
                 {predictions.length > 0 && (
                   <div className="absolute top-[85px] left-0 w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 max-h-60 overflow-y-auto">
                     {predictions.map(p => (
                       <div key={p.place_id} onClick={()=>selectPlace(p.place_id, p.description)} className="p-4 hover:bg-orange-50 cursor-pointer text-sm font-bold text-slate-600 border-b border-slate-50 flex items-center gap-3">
                         <MapPin className="w-4 h-4 text-orange-400"/> {p.description}
                       </div>
                     ))}
                   </div>
                 )}
              </div>

              <NeuInput icon={MapPin} label="Açık Adres" placeholder="Mahalle, Cadde, No..." value={bizForm.address} onChange={(e:any)=>setBizForm({...bizForm, address:e.target.value})} />

              {/* COORDS + MAP */}
              <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100/50">
                 <div className="flex items-end gap-3 mb-3">
                    <div className="flex-1">
                      <NeuInput 
                        icon={Navigation} 
                        label="Hassas Konum (Lat, Lng)" 
                        placeholder="Örn: 40.1234, 30.5678" 
                        value={bizForm.coordsInput}
                        onChange={(e:any)=>handleCoordsChange(e.target.value)}
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
                       <strong>Mükemmel Konum İçin:</strong> Yandaki harita ikonuna tıklayın, Google Maps'te işletmenizin tam giriş kapısının üzerine <u>sağ tıklayın</u>. En üstte çıkan koordinata (Örn: 41.23, 29.55) tıklayınca kopyalanır. Gelip buraya yapıştırın.
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

              <NeuTextArea label="Tanıtım Yazısı" placeholder="İşletmenizi anlatan kısa bir yazı..." value={bizForm.desc} onChange={(e:any)=>setBizForm({...bizForm, desc:e.target.value})} />
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
                       <button key={f.id} onClick={()=>{const s=new Set(selectedFeats); s.has(f.id)?s.delete(f.id):s.add(f.id); setSelectedFeats(s)}} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${selectedFeats.has(f.id) ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}>{f.name}</button>
                     ))}
                  </div>
               </div>

               <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {categories.map(cat => {
                    const isSel = selectedCats.has(cat.id)
                    const catFeats = features.filter(f => f.category_id === cat.id)
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
                                      <button key={f.id} onClick={()=>{const s=new Set(selectedFeats); s.has(f.id)?s.delete(f.id):s.add(f.id); setSelectedFeats(s)}} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedFeats.has(f.id) ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>{f.name}</button>
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
                         <img src={URL.createObjectURL(f)} className="w-full h-full object-cover"/>
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
                   {[{k:'r1',t:'Girdiğim bilgilerin doğruluğunu beyan ederim.'},{k:'r2',t:'İşletme kurallarını ve sözleşmeyi okudum.'},{k:'r3',t:'KVKK metnini onaylıyorum.'}].map(r => (
                     <label key={r.k} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border-2 ${(rules as any)[r.k] ? 'bg-orange-50 border-orange-200' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${(rules as any)[r.k] ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>{(rules as any)[r.k] && <Check className="w-4 h-4 text-white"/>}</div>
                        <input type="checkbox" className="hidden" checked={(rules as any)[r.k]} onChange={(e)=>setRules({...rules, [r.k]: e.target.checked})}/>
                        <span className="text-sm font-bold text-slate-600">{r.t}</span>
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
