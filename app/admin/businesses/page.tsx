'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { 
  Search, Filter, Edit3, Save, Trash2, Power,
  MapPin, Phone, CheckCircle, XCircle, PauseCircle, Loader2, 
  Image as ImageIcon, User, Wifi, X, ChevronRight, ChevronLeft,
  ArrowUpDown, SlidersHorizontal, Calendar, Globe
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

// --- TİPLER ---
type Business = {
  id: string
  owner_id: string
  name: string
  description: string
  phone: string
  address_text: string
  type: string
  status: string
  lat: number
  lng: number
  image_url?: string
  road_name?: string
  road_note?: string
  created_at: string
}
type Category = { id: string; name: string; slug: string }
type Feature = { id: string; name: string; is_global: boolean }
type Profile = { id: string; email: string; full_name?: string; role: string }

const PAGE_SIZE = 10;

export default function AllBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [allFeatures, setAllFeatures] = useState<Feature[]>([])
  
  // Veri Yönetimi State'leri
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  
  // Filtreler
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')

  // Detay Modal State
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null)
  const [editForm, setEditForm] = useState<Partial<Business>>({})
  const [activeTab, setActiveTab] = useState('genel')
  const [modalLoading, setModalLoading] = useState(false)
  const [bizFeatures, setBizFeatures] = useState<string[]>([])
  const [bizOwner, setBizOwner] = useState<Profile | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchAuxData()
  }, [])

  useEffect(() => {
    fetchBusinesses()
  }, [page, filterCategory, filterStatus, sortOrder])

  const fetchAuxData = async () => {
    const { data: cats } = await supabase.from('categories').select('*')
    if (cats) setCategories(cats)
    const { data: feats } = await supabase.from('features').select('*')
    if (feats) setAllFeatures(feats)
  }

  const fetchBusinesses = async () => {
    setLoading(true)
    
    let query = supabase
      .from('businesses')
      .select('*', { count: 'exact' })
      .neq('status', 'pending')

    if (filterCategory !== 'all') query = query.eq('type', filterCategory)
    if (filterStatus !== 'all') query = query.eq('status', filterStatus)
    if (searchTerm.trim() !== '') query = query.ilike('name', `%${searchTerm}%`)

    if (sortOrder === 'newest') query = query.order('created_at', { ascending: false })
    if (sortOrder === 'oldest') query = query.order('created_at', { ascending: true })
    if (sortOrder === 'name_asc') query = query.order('name', { ascending: true })
    if (sortOrder === 'name_desc') query = query.order('name', { ascending: false })

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error(error)
      // Hata durumunda boş liste
    } else {
      setBusinesses(data as Business[])
      setTotalCount(count || 0)
    }
    setLoading(false)
  }

  const handleSearch = () => {
    setPage(1)
    fetchBusinesses()
  }

  const handleOpenDetail = async (biz: Business) => {
    setSelectedBiz(biz)
    setEditForm(biz)
    setActiveTab('genel')
    setModalLoading(true)

    const [featsRes, ownerRes] = await Promise.all([
      supabase.from('business_features').select('feature_name').eq('business_id', biz.id),
      supabase.from('profiles').select('*').eq('id', biz.owner_id).single()
    ])

    setBizFeatures(featsRes.data ? featsRes.data.map(f => f.feature_name) : [])
    setBizOwner(ownerRes.data ? ownerRes.data as Profile : null)
    setModalLoading(false)
  }

  const handleSaveAll = async () => {
    if (!selectedBiz) return
    if (!confirm('Değişiklikleri kaydediyor musunuz?')) return

    const { error } = await supabase.from('businesses').update({
        name: editForm.name,
        description: editForm.description,
        phone: editForm.phone,
        type: editForm.type,
        status: editForm.status,
        lat: editForm.lat,
        lng: editForm.lng,
        road_name: editForm.road_name,
        road_note: editForm.road_note,
        image_url: editForm.image_url
    }).eq('id', selectedBiz.id)

    if (error) { alert('Hata: ' + error.message); return }

    await supabase.from('business_features').delete().eq('business_id', selectedBiz.id)
    if (bizFeatures.length > 0) {
      await supabase.from('business_features').insert(bizFeatures.map(f => ({ business_id: selectedBiz.id, feature_name: f })))
    }

    alert('Güncellendi!')
    setBusinesses(prev => prev.map(b => b.id === selectedBiz.id ? { ...b, ...editForm } as Business : b))
    setSelectedBiz(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('DİKKAT! Bu işlem geri alınamaz. Silinsin mi?')) return
    await supabase.from('businesses').delete().eq('id', id)
    fetchBusinesses()
  }

  const toggleFeature = (featName: string) => {
    setBizFeatures(prev => prev.includes(featName) ? prev.filter(f => f !== featName) : [...prev, featName])
  }

  const getCategoryName = (slug: string) => categories.find(c => c.slug === slug)?.name || slug

  return (
    <div className="h-full flex flex-col font-sans text-slate-600">
      
      {/* BAŞLIK VE İSTATİSTİK */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-700">İşletme Yönetimi</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Veritabanında toplam <span className="text-blue-600 font-bold">{totalCount}</span> kayıt bulundu.</p>
        </div>
        <NeuButton onClick={fetchBusinesses} className="px-4 py-2 text-xs">
          <SlidersHorizontal className="w-4 h-4" /> Listeyi Yenile
        </NeuButton>
      </div>

      {/* --- OPERASYONEL FİLTRE BAR --- */}
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          
          <div className="md:col-span-4">
             <div className="flex gap-2 w-full">
               <NeuInput 
                 placeholder="İsim, Şehir veya Adres ara..." 
                 icon={Search}
                 value={searchTerm}
                 onChange={(e: any) => setSearchTerm(e.target.value)}
                 onKeyDown={(e: any) => e.key === 'Enter' && handleSearch()}
               />
               <NeuButton onClick={handleSearch} variant="solid-blue" className="px-4">Ara</NeuButton>
             </div>
          </div>

          <div className="md:col-span-3">
             <NeuSelect label="KATEGORİ" value={filterCategory} onChange={(e: any) => { setFilterCategory(e.target.value); setPage(1); }}>
               <option value="all">Tümü</option>
               {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
             </NeuSelect>
          </div>

          <div className="md:col-span-2">
             <NeuSelect label="DURUM" value={filterStatus} onChange={(e: any) => { setFilterStatus(e.target.value); setPage(1); }}>
               <option value="all">Tümü</option>
               <option value="active">Aktif</option>
               <option value="passive">Pasif</option>
               <option value="rejected">Reddedildi</option>
             </NeuSelect>
          </div>

          <div className="md:col-span-3">
             <NeuSelect label="SIRALAMA" value={sortOrder} onChange={(e: any) => { setSortOrder(e.target.value); setPage(1); }}>
               <option value="newest">En Yeni Eklenen</option>
               <option value="oldest">En Eski Eklenen</option>
               <option value="name_asc">İsim (A-Z)</option>
               <option value="name_desc">İsim (Z-A)</option>
             </NeuSelect>
          </div>

        </div>
      </div>

      {/* --- LİSTE VE PAGINATION --- */}
      <NeuCard className="flex-1 overflow-hidden p-6 flex flex-col relative">
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {loading ? ( <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div> ) : 
           businesses.length === 0 ? ( <div className="text-center pt-20 text-slate-400 font-bold">Kriterlere uygun kayıt bulunamadı.</div> ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white z-10 text-slate-400 text-[10px] font-semibold uppercase tracking-widest border-b border-slate-300/50">
                <tr>
                  <th className="pb-4 pl-4">İşletme</th>
                  <th className="pb-4">Kategori & Konum</th>
                  <th className="pb-4">Durum</th>
                  <th className="pb-4">Eklenme Tarihi</th>
                  <th className="pb-4 text-right pr-4">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/40">
                {businesses.map(biz => (
                  <tr key={biz.id} className="group transition-colors hover:bg-slate-200/40">
                    <td className="py-4 pl-4">
                      <div className="font-semibold text-slate-700">{biz.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{biz.phone}</div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded w-fit uppercase">
                          {getCategoryName(biz.type)}
                        </span>
                        <div className="text-xs text-slate-400 font-bold flex items-center gap-1">
                           <MapPin className="w-3 h-3"/> {biz.road_name || 'Yol Yok'}
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      {biz.status === 'active' && <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><CheckCircle className="w-4 h-4"/> AKTİF</span>}
                      {biz.status === 'passive' && <span className="flex items-center gap-1 text-xs font-semibold text-orange-500"><PauseCircle className="w-4 h-4"/> PASİF</span>}
                      {biz.status === 'rejected' && <span className="flex items-center gap-1 text-xs font-semibold text-red-500"><XCircle className="w-4 h-4"/> RED</span>}
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-500">
                      {new Date(biz.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="py-4 text-right pr-4">
                      <div className="flex justify-end gap-2">
                        <NeuButton onClick={() => handleOpenDetail(biz)} className="p-2 h-10 w-10">
                          <Edit3 className="w-4 h-4"/>
                        </NeuButton>
                        <NeuButton onClick={() => handleDelete(biz.id)} variant="danger" className="p-2 h-10 w-10">
                          <Trash2 className="w-4 h-4"/>
                        </NeuButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* --- PAGINATION CONTROLS --- */}
        <div className="mt-4 pt-4 border-t border-slate-300/50 flex justify-between items-center">
          <div className="text-xs font-bold text-slate-400">
            Toplam {Math.ceil(totalCount / PAGE_SIZE)} sayfa ({totalCount} kayıt)
          </div>
          <div className="flex items-center gap-4">
            <NeuButton 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              className="px-4 py-2 text-xs"
            >
              <ChevronLeft className="w-4 h-4" /> Önceki
            </NeuButton>
            
            <span className="font-semibold text-slate-700 bg-slate-200 px-4 py-2 rounded-lg shadow-inner text-xs">
              Sayfa {page}
            </span>

            <NeuButton 
              onClick={() => setPage(p => p + 1)} 
              disabled={page * PAGE_SIZE >= totalCount}
              className="px-4 py-2 text-xs"
            >
              Sonraki <ChevronRight className="w-4 h-4" />
            </NeuButton>
          </div>
        </div>
      </NeuCard>

      {/* --- DETAY MODALI --- */}
      {selectedBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-6xl h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 bg-white z-20 shadow-sm relative border-b border-slate-300">
              <div>
                <h2 className="text-2xl font-semibold text-slate-700">{selectedBiz.name}</h2>
                <div className="text-xs font-bold text-slate-400 tracking-wider mt-1">SİSTEM ID: {selectedBiz.id}</div>
              </div>
              <NeuButton onClick={() => setSelectedBiz(null)} className="w-10 h-10 rounded-full !p-0">
                <X className="w-5 h-5 text-slate-500"/>
              </NeuButton>
            </div>

            {/* Modal Tabs */}
            <div className="px-8 flex gap-2 bg-white pt-4 border-b border-slate-300/50">
               {['genel', 'konum', 'ozellikler', 'sahip'].map(tab => (
                 <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-t-xl text-xs font-semibold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-slate-200 text-blue-600 shadow-inner' : 'text-slate-400 hover:bg-slate-200/50'}`}>{tab}</button>
               ))}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-200/30">
              {modalLoading ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div> : (
                <div className="max-w-5xl mx-auto space-y-6">
                  {activeTab === 'genel' && (
                    <div className="grid grid-cols-12 gap-6">
                       <div className="col-span-8 space-y-6">
                          <NeuInput label="İŞLETME ADI" value={editForm.name} onChange={(e: any) => setEditForm({...editForm, name: e.target.value})} icon={CheckCircle} />
                          <div className="grid grid-cols-2 gap-6">
                             <NeuSelect label="KATEGORİ" value={editForm.type} onChange={(e: any) => setEditForm({...editForm, type: e.target.value})}>
                               {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                             </NeuSelect>
                             <NeuSelect label="DURUM" value={editForm.status} onChange={(e: any) => setEditForm({...editForm, status: e.target.value})}>
                               <option value="active">AKTİF</option> <option value="passive">PASİF</option> <option value="rejected">REDDEDİLDİ</option>
                             </NeuSelect>
                          </div>
                          <div className="group w-full"><label className="text-[10px] font-semibold text-slate-400 ml-3 mb-2 block">AÇIKLAMA</label><textarea value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full h-32 bg-white p-4 rounded-xl text-slate-700 text-sm outline-none shadow-sm" /></div>
                       </div>
                       <div className="col-span-4 space-y-6">
                          <NeuInput label="TELEFON" value={editForm.phone} onChange={(e: any) => setEditForm({...editForm, phone: e.target.value})} icon={Phone} />
                          <NeuInput label="RESİM URL" value={editForm.image_url || ''} onChange={(e: any) => setEditForm({...editForm, image_url: e.target.value})} icon={ImageIcon} />
                          {editForm.image_url && <img src={editForm.image_url} className="w-full h-32 object-cover rounded-xl shadow-md" />}
                       </div>
                    </div>
                  )}
                  {activeTab === 'konum' && (
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                           <NeuInput label="ENLEM" type="number" value={editForm.lat} onChange={(e: any) => setEditForm({...editForm, lat: parseFloat(e.target.value)})} icon={Globe} />
                           <NeuInput label="BOYLAM" type="number" value={editForm.lng} onChange={(e: any) => setEditForm({...editForm, lng: parseFloat(e.target.value)})} icon={Globe} />
                           <NeuInput label="YOL ADI" value={editForm.road_name || ''} onChange={(e: any) => setEditForm({...editForm, road_name: e.target.value})} icon={MapPin} />
                           <NeuInput label="YOL NOTU" value={editForm.road_note || ''} onChange={(e: any) => setEditForm({...editForm, road_note: e.target.value})} icon={MapPin} />
                           <div className="group w-full"><label className="text-[10px] font-semibold text-slate-400 ml-3 mb-2 block">ADRES METNİ</label><textarea value={editForm.address_text || ''} onChange={e => setEditForm({...editForm, address_text: e.target.value})} className="w-full h-24 bg-white p-4 rounded-xl text-slate-700 text-sm outline-none shadow-sm" /></div>
                        </div>
                        <div className="h-full bg-slate-300 rounded-2xl flex items-center justify-center relative overflow-hidden group shadow-inner">
                             <div className="absolute inset-0 opacity-10 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center" />
                             <div className="z-10 text-center">
                                <MapPin className="w-12 h-12 text-red-500 mx-auto mb-2 drop-shadow-lg" />
                                <div className="font-semibold text-slate-600 mb-2">{editForm.lat}, {editForm.lng}</div>
                                <a href={`https://www.google.com/maps/search/?api=1&query=${editForm.lat},${editForm.lng}`} target="_blank" className="px-4 py-2 bg-white rounded-full text-xs font-bold text-blue-600 shadow hover:scale-105 transition-transform block">Haritada Aç</a>
                             </div>
                        </div>
                     </div>
                  )}
                  {activeTab === 'ozellikler' && (
                     <div className="grid grid-cols-4 gap-4">
                        {allFeatures.map(f => (
                           <div key={f.id} onClick={() => toggleFeature(f.name)} className={`p-4 rounded-xl cursor-pointer flex items-center gap-2 font-bold text-xs transition-all select-none ${bizFeatures.includes(f.name) ? 'bg-blue-500 text-white shadow-lg' : 'bg-white text-slate-500 shadow-sm hover:text-slate-700'}`}>
                              {bizFeatures.includes(f.name) ? <CheckCircle className="w-4 h-4"/> : <Wifi className="w-4 h-4 opacity-50"/>} {f.name}
                           </div>
                        ))}
                     </div>
                  )}
                  {activeTab === 'sahip' && bizOwner && (
                     <div className="flex justify-center p-10">
                        <NeuCard className="p-10 text-center max-w-md w-full">
                           <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center text-slate-400 shadow-inner"><User className="w-8 h-8"/></div>
                           <div className="text-2xl font-semibold text-slate-700">{bizOwner.full_name || 'İsimsiz'}</div>
                           <div className="text-blue-500 font-bold mb-4">{bizOwner.email}</div>
                           <div className="text-xs font-mono bg-slate-200 p-2 rounded text-slate-500">{bizOwner.id}</div>
                        </NeuCard>
                     </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-white border-t border-slate-300/50 flex justify-end gap-4 z-20 shadow-sm">
              <NeuButton onClick={() => setSelectedBiz(null)} className="px-8 py-3 text-slate-500">VAZGEÇ</NeuButton>
              <NeuButton onClick={handleSaveAll} variant="solid-blue" className="px-8 py-3">KAYDET</NeuButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
