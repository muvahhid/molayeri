'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { 
  Search, Edit3, Save, Trash2, Plus, Tag, 
  X, Loader2, Globe, Layers, CheckCircle, ChevronRight
} from 'lucide-react'

// --- NEUMORPHIC UI COMPONENTS ---
const NeuCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-2xl shadow-sm ${className}`}>
    {children}
  </div>
)

const NeuButton = ({ onClick, children, variant = "primary", className = "", disabled = false }: any) => {
  const baseStyle = "transition-all duration-200 active:scale-[0.98] rounded-xl font-bold flex items-center justify-center gap-2 select-none disabled:opacity-50 disabled:cursor-not-allowed"
  const convex = "shadow-sm active:shadow-sm"
  
  let colors = "bg-white text-slate-600 hover:text-slate-800"
  if (variant === "primary") colors = "bg-white text-blue-600 hover:text-blue-700"
  if (variant === "danger") colors = "bg-white text-red-500 hover:text-red-600"
  if (variant === "solid-blue") colors = "bg-blue-600 text-white shadow-blue-300" 

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variant === 'solid-blue' ? 'shadow-lg hover:bg-blue-700' : convex} ${colors} ${className}`}>
      {children}
    </button>
  )
}

const NeuInput = ({ label, icon: Icon, ...props }: any) => (
  <div className="group w-full">
    {label && <label className="text-[10px] font-semibold text-slate-400 ml-3 mb-2 block tracking-widest">{label}</label>}
    <div className="relative flex items-center">
      {Icon && <Icon className="absolute left-4 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-blue-500" />}
      <input 
        {...props}
        className={`w-full bg-white ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 rounded-xl text-slate-700 font-bold text-sm outline-none transition-all
        border border-transparent focus:border-blue-500/20
        shadow-sm
        focus:shadow-sm`}
      />
    </div>
  </div>
)

const NeuSelect = ({ label, children, ...props }: any) => (
  <div className="group w-full">
    {label && <label className="text-[10px] font-semibold text-slate-400 ml-3 mb-2 block tracking-widest">{label}</label>}
    <div className="relative">
      <select 
        {...props}
        className="w-full bg-white pl-4 pr-10 py-3 rounded-xl text-slate-700 font-bold text-sm outline-none appearance-none cursor-pointer
        shadow-sm"
      >
        {children}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <ChevronRight className="w-4 h-4 rotate-90" />
      </div>
    </div>
  </div>
)

// --- TYPES ---
type Feature = {
  id: string
  name: string
  is_global: boolean
  category_id?: string | null
}
type Category = {
  id: string
  name: string
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  // ARAYÜZ MODU: 'global' veya 'category'
  const [viewMode, setViewMode] = useState<'global' | 'category'>('global')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  
  // Arama
  const [searchTerm, setSearchTerm] = useState('')

  // Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    
    // Kategorileri Çek
    const { data: cats } = await supabase.from('categories').select('id, name').order('name')
    if (cats) {
      setCategories(cats)
      // Varsayılan olarak ilk kategoriyi seçili yap (Eğer kategori moduna geçerse boş kalmasın)
      if (cats.length > 0) setSelectedCategoryId(cats[0].id)
    }

    // Özellikleri Çek
    const { data: feats } = await supabase.from('features').select('*').order('name')
    if (feats) setFeatures(feats)
    
    setLoading(false)
  }

  // --- CRUD ---

  const openModal = (feat?: Feature) => {
    if (feat) {
      // Düzenle
      setEditingId(feat.id)
      setFormName(feat.name)
    } else {
      // Yeni Ekle
      setEditingId(null)
      setFormName('')
    }
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) return alert('Özellik adı boş olamaz!')

    // Hazırlık: Nereye ekleyeceğiz?
    const isGlobalMode = viewMode === 'global'
    
    // Veritabanına gidecek obje
    const payload = {
      name: formName,
      is_global: isGlobalMode,
      category_id: isGlobalMode ? null : selectedCategoryId
    }

    let error;

    if (editingId) {
      // GÜNCELLEME (Update)
      // Not: Mod değiştirmiyoruz, sadece ismi güncelliyoruz. 
      const res = await supabase.from('features').update({ name: formName }).eq('id', editingId)
      error = res.error
    } else {
      // EKLEME (Insert)
      const res = await supabase.from('features').insert(payload).select().single()
      error = res.error
      if (res.data) {
        // State'i hemen güncelle (tekrar fetch etmemek için)
        setFeatures(prev => [...prev, res.data as Feature])
      }
    }

    if (error) {
      alert('Hata: ' + error.message)
    } else {
      // Güncelleme yaptıysak listeyi yerelde düzelt
      if (editingId) {
        setFeatures(prev => prev.map(f => f.id === editingId ? { ...f, name: formName } : f))
      }
      setIsModalOpen(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu özellik silinecek. Emin misiniz?')) return
    
    const { error } = await supabase.from('features').delete().eq('id', id)
    if (error) {
      alert('Hata: ' + error.message)
    } else {
      setFeatures(prev => prev.filter(f => f.id !== id))
    }
  }

  // --- FİLTRELEME ---
  const filteredFeatures = features.filter(f => {
    // 1. Arama
    if (searchTerm && !f.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    
    // 2. Mod Filtresi
    if (viewMode === 'global') {
      return f.is_global === true
    } else {
      // Kategori Modu: Global olmayan VE seçili kategoriye ait olanlar
      return f.is_global === false && f.category_id === selectedCategoryId
    }
  })

  return (
    <div className="h-full flex flex-col font-sans text-slate-600">
      
      {/* BAŞLIK */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-700">Özellik Yönetimi</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Global veya kategori bazlı işletme imkanlarını yönet.</p>
        </div>
      </div>

      {/* MOD SEÇİMİ (TABLAR) */}
      <div className="flex justify-center mb-8">
        <div className="bg-white p-1.5 rounded-2xl shadow-sm flex">
          <button 
            onClick={() => setViewMode('global')}
            className={`px-8 py-3 rounded-2xl font-semibold text-sm transition-all flex items-center gap-2
              ${viewMode === 'global' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'}
            `}
          >
            <Globe className="w-4 h-4" /> GLOBAL ÖZELLİKLER
          </button>
          <button 
             onClick={() => setViewMode('category')}
             className={`px-8 py-3 rounded-2xl font-semibold text-sm transition-all flex items-center gap-2
              ${viewMode === 'category' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'}
            `}
          >
            <Layers className="w-4 h-4" /> KATEGORİYE ÖZEL
          </button>
        </div>
      </div>

      {/* KONTROL PANELI (Filtre + Ekleme) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Sol: Kategori Seçimi (Sadece Kategori Modunda) */}
          <div className="flex-1 w-full flex gap-4 items-center">
            {viewMode === 'category' && (
              <div className="w-full md:w-64">
                <NeuSelect 
                  label="KATEGORİ SEÇİN"
                  value={selectedCategoryId}
                  onChange={(e: any) => setSelectedCategoryId(e.target.value)}
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </NeuSelect>
              </div>
            )}
            
            {/* Arama */}
            <div className="flex-1">
               <NeuInput 
                 placeholder="Özellik ara..." 
                 icon={Search}
                 value={searchTerm}
                 onChange={(e: any) => setSearchTerm(e.target.value)}
               />
            </div>
          </div>

          {/* Sağ: Ekleme Butonu */}
          <div>
            <NeuButton onClick={() => openModal()} variant="solid-blue" className="px-6 py-3">
              <Plus className="w-5 h-5" /> 
              {viewMode === 'global' ? 'YENİ GLOBAL EKLE' : 'BU KATEGORİYE EKLE'}
            </NeuButton>
          </div>

        </div>
      </div>

      {/* LİSTE */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
            {filteredFeatures.length === 0 ? (
              <div className="col-span-full text-center py-20 text-slate-400 font-bold">
                 {viewMode === 'global' 
                   ? 'Kayıtlı global özellik yok.' 
                   : 'Bu kategoriye ait özellik bulunamadı.'}
              </div>
            ) : (
              filteredFeatures.map(feat => (
                <NeuCard key={feat.id} className="p-6 relative group hover:scale-[1.01] transition-transform">
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${feat.is_global ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                      {feat.is_global ? <Globe className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(feat)} className="p-2 bg-white rounded-lg text-blue-500 shadow hover:bg-blue-50"><Edit3 className="w-4 h-4"/></button>
                      <button onClick={() => handleDelete(feat.id)} className="p-2 bg-white rounded-lg text-red-500 shadow hover:bg-red-50"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-slate-700 mb-2">{feat.name}</h3>
                  
                  <div className="text-xs font-bold text-slate-400">
                    {feat.is_global 
                      ? 'Tüm Kategorilerde Geçerli' 
                      : categories.find(c => c.id === feat.category_id)?.name || 'Kategori Bilinmiyor'}
                  </div>

                </NeuCard>
              ))
            )}
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in duration-300 border border-white/50">
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-slate-700">
                {editingId ? 'Özelliği Düzenle' : 'Yeni Özellik'}
              </h2>
              <NeuButton onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full !p-0">
                <X className="w-5 h-5" />
              </NeuButton>
            </div>

            <div className="space-y-6">
               <div className="p-4 bg-slate-200/50 rounded-2xl border border-slate-300/50 text-sm text-slate-600">
                  <span className="font-bold text-slate-700">İşlem Türü:</span>{' '}
                  {viewMode === 'global' ? 'Global Özellik Ekleme' : `Kategoriye Özel Ekleme`}
                  {viewMode === 'category' && (
                     <div className="font-semibold text-blue-600 mt-1">
                        👉 {categories.find(c => c.id === selectedCategoryId)?.name}
                     </div>
                  )}
               </div>

               <NeuInput 
                 label="ÖZELLİK ADI" 
                 icon={Tag} 
                 value={formName} 
                 onChange={(e:any) => setFormName(e.target.value)} 
                 placeholder="Örn: Wifi, Mescit..."
                 autoFocus
               />

               <div className="flex justify-end gap-4 pt-4">
                 <NeuButton onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-500">İptal</NeuButton>
                 <NeuButton onClick={handleSave} variant="solid-blue" className="px-8 py-3">
                   <Save className="w-4 h-4"/> KAYDET
                 </NeuButton>
               </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
