'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { 
  Search, Edit3, Save, Trash2, Plus, Layers, 
  X, Loader2, Tag, Hash
} from 'lucide-react'

// --- NEUMORPHIC UI COMPONENTS ---
const NeuCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-[#E0E5EC] rounded-[30px] shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)] ${className}`}>
    {children}
  </div>
)

const NeuButton = ({ onClick, children, variant = "primary", className = "", disabled = false }: any) => {
  const baseStyle = "transition-all duration-200 active:scale-[0.98] rounded-xl font-bold flex items-center justify-center gap-2 select-none disabled:opacity-50 disabled:cursor-not-allowed"
  const convex = "shadow-[6px_6px_10px_rgb(163,177,198,0.6),-6px_-6px_10px_rgba(255,255,255,0.5)] active:shadow-[inset_4px_4px_8px_rgb(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]"
  
  let colors = "bg-[#E0E5EC] text-slate-600 hover:text-slate-800"
  if (variant === "primary") colors = "bg-[#E0E5EC] text-blue-600 hover:text-blue-700"
  if (variant === "danger") colors = "bg-[#E0E5EC] text-red-500 hover:text-red-600"
  if (variant === "success") colors = "bg-[#E0E5EC] text-green-600 hover:text-green-700"
  if (variant === "solid-blue") colors = "bg-blue-600 text-white shadow-blue-300" 

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variant === 'solid-blue' ? 'shadow-lg hover:bg-blue-700' : convex} ${colors} ${className}`}>
      {children}
    </button>
  )
}

const NeuInput = ({ label, icon: Icon, ...props }: any) => (
  <div className="group w-full">
    {label && <label className="text-[10px] font-black text-slate-400 ml-3 mb-2 block tracking-widest">{label}</label>}
    <div className="relative flex items-center">
      {Icon && <Icon className="absolute left-4 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-blue-500" />}
      <input 
        {...props}
        className={`w-full bg-[#E0E5EC] ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 rounded-xl text-slate-700 font-bold text-sm outline-none transition-all
        border border-transparent focus:border-blue-500/20
        shadow-[inset_5px_5px_10px_#a3b1c6,inset_-5px_-5px_10px_#ffffff]
        focus:shadow-[inset_6px_6px_12px_#a3b1c6,inset_-6px_-6px_12px_#ffffff]`}
      />
    </div>
  </div>
)

// --- TYPE ---
type Category = {
  id: string
  name: string
  slug: string
  created_at: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [formData, setFormData] = useState({ name: '', slug: '' })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    if (!error && data) setCategories(data)
    setLoading(false)
  }

  // --- SLUG OLUŞTURUCU ---
  // "Yeme & İçme" -> "yeme_icme"
  const generateSlug = (text: string) => {
    const trMap: any = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' }
    return text
      .split('')
      .map(char => trMap[char] || char)
      .join('')
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') // Alfanümerik olmayanları sil
      .replace(/\s+/g, '_')        // Boşlukları _ yap
      .replace(/-+/g, '_')         // Tireleri _ yap
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    // Eğer düzenleme modunda değilsek veya slug'a elle müdahale edilmediyse otomatik oluştur
    if (!editingCat) {
      setFormData({ name: val, slug: generateSlug(val) })
    } else {
      setFormData({ ...formData, name: val })
    }
  }

  const openAddModal = () => {
    setEditingCat(null)
    setFormData({ name: '', slug: '' })
    setIsModalOpen(true)
  }

  const openEditModal = (cat: Category) => {
    setEditingCat(cat)
    setFormData({ name: cat.name, slug: cat.slug })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.slug) return alert('İsim ve Slug zorunludur!')

    let error
    if (editingCat) {
      // GÜNCELLE
      const res = await supabase.from('categories').update(formData).eq('id', editingCat.id)
      error = res.error
    } else {
      // EKLE
      const res = await supabase.from('categories').insert(formData)
      error = res.error
    }

    if (error) {
      alert('Hata: ' + error.message)
    } else {
      setIsModalOpen(false)
      fetchCategories() // Listeyi yenile
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('DİKKAT: Bu kategoriyi silerseniz, bu kategoriye bağlı işletmeler boşta kalabilir. Emin misiniz?')) return

    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) alert('Hata: ' + error.message)
    else fetchCategories()
  }

  const filtered = categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="h-full flex flex-col font-sans text-slate-600">
      
      {/* BAŞLIK */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-700">Kategori Yönetimi</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Uygulamadaki tüm kategorileri buradan yönet.</p>
        </div>
        <NeuButton onClick={openAddModal} variant="solid-blue" className="px-6 py-3">
          <Plus className="w-5 h-5" /> YENİ EKLE
        </NeuButton>
      </div>

      {/* ARAMA */}
      <div className="mb-8">
         <NeuInput 
           placeholder="Kategori ara..." 
           icon={Search}
           value={searchTerm}
           onChange={(e: any) => setSearchTerm(e.target.value)}
         />
      </div>

      {/* LİSTE (GRID) */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
            {filtered.map(cat => (
              <NeuCard key={cat.id} className="p-6 group hover:scale-[1.02] transition-transform">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center text-blue-500 shadow-inner">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(cat)} className="p-2 bg-white rounded-lg text-blue-500 shadow hover:bg-blue-50"><Edit3 className="w-4 h-4"/></button>
                    <button onClick={() => handleDelete(cat.id)} className="p-2 bg-white rounded-lg text-red-500 shadow hover:bg-red-50"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
                
                <h3 className="text-xl font-black text-slate-700 mb-1">{cat.name}</h3>
                <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded w-fit">
                   <Hash className="w-3 h-3" /> {cat.slug}
                </div>
              </NeuCard>
            ))}
            
            {/* Ekleme Kartı (Alternatif Buton) */}
            <button onClick={openAddModal} className="border-4 border-dashed border-slate-300 rounded-[30px] flex flex-col items-center justify-center p-6 text-slate-400 hover:text-blue-500 hover:border-blue-400 hover:bg-blue-50/50 transition-all group min-h-[160px]">
               <div className="w-12 h-12 rounded-full bg-slate-200 group-hover:bg-blue-200 flex items-center justify-center mb-2 transition-colors">
                 <Plus className="w-6 h-6" />
               </div>
               <span className="font-bold">Yeni Kategori Ekle</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-[#E0E5EC] w-full max-w-lg rounded-[40px] shadow-2xl p-8 animate-in fade-in zoom-in duration-300 border border-white/50">
            
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-700">
                {editingCat ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}
              </h2>
              <NeuButton onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full !p-0">
                <X className="w-5 h-5" />
              </NeuButton>
            </div>

            <div className="space-y-6">
              <NeuInput 
                label="KATEGORİ ADI" 
                icon={Tag} 
                value={formData.name} 
                onChange={handleNameChange}
                placeholder="Örn: Akaryakıt"
              />
              
              <div className="group">
                <label className="text-[10px] font-black text-slate-400 ml-3 mb-2 block tracking-widest">SİSTEM KODU (SLUG)</label>
                <div className="relative flex items-center">
                  <Hash className="absolute left-4 text-slate-400 w-4 h-4" />
                  <input 
                    value={formData.slug}
                    onChange={e => setFormData({...formData, slug: e.target.value})}
                    className="w-full bg-slate-200 pl-10 pr-4 py-3 rounded-xl text-slate-600 font-mono text-sm font-bold outline-none shadow-inner"
                    placeholder="otomatik_olusturulur"
                  />
                </div>
                <p className="text-[10px] text-slate-400 ml-3 mt-1">Bu kod veritabanında kullanılır. Türkçe karakter ve boşluk içermez.</p>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <NeuButton onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-500">İptal</NeuButton>
                <NeuButton onClick={handleSave} variant="solid-blue" className="px-8 py-3">
                  <Save className="w-4 h-4" /> KAYDET
                </NeuButton>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
