'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { 
  CheckCircle, XCircle, MapPin, Phone, 
  Calendar, Loader2, User, Search, Eye, X, 
  Image as ImageIcon, ArrowUpDown, AlertTriangle, Layers
} from 'lucide-react'

// --- UI COMPONENTS ---
const NeuCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-2xl shadow-sm ${className}`}>
    {children}
  </div>
)

const NeuButton = ({ onClick, children, variant = "primary", className = "", disabled = false }: any) => {
  const baseStyle = "transition-all duration-200 active:scale-[0.98] rounded-xl font-bold flex items-center justify-center gap-2 select-none disabled:opacity-50 disabled:cursor-not-allowed"
  const convex = "shadow-sm active:shadow-sm"
  
  let colors = "bg-white text-slate-600 hover:text-slate-800"
  if (variant === "success") colors = "bg-white text-green-600 hover:text-green-700"
  if (variant === "danger") colors = "bg-white text-red-500 hover:text-red-600"
  if (variant === "solid-green") colors = "bg-green-500 text-white shadow-green-300 hover:bg-green-600"
  if (variant === "solid-red") colors = "bg-red-500 text-white shadow-red-300 hover:bg-red-600"

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variant.startsWith('solid') ? 'shadow-lg' : convex} ${colors} ${className}`}>
      {children}
    </button>
  )
}

const NeuInput = ({ icon: Icon, ...props }: any) => (
  <div className="relative flex items-center w-full">
    {Icon && <Icon className="absolute left-4 text-slate-400 w-4 h-4" />}
    <input 
      {...props}
      className={`w-full bg-white ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 rounded-xl text-slate-700 font-bold text-sm outline-none transition-all
      border border-transparent focus:border-blue-500/20
      shadow-sm`}
    />
  </div>
)

type Business = {
  id: string
  name: string
  description: string
  phone: string
  address_text: string
  type: string
  created_at: string
  owner_id: string
  image_url?: string | null
  gallery?: string[] | null
  lat?: number
  lng?: number
  owner_email?: string
  owner_name?: string
}

export default function ApprovalsPage() {
  const [pendingList, setPendingList] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('oldest')

  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [bizFeatures, setBizFeatures] = useState<string[]>([])
  const [ownerDetails, setOwnerDetails] = useState<any>(null)
  
  // Seçili büyük resim (Galeriden seçilebilsin diye state yaptık)
  const [activeImage, setActiveImage] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchPending()
  }, [])

  const fetchPending = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('status', 'pending')
    
    if (data) setPendingList(data)
    setLoading(false)
  }

  const openDetail = async (biz: Business) => {
    setSelectedBiz(biz)
    
    // Varsayılan resmi belirle (Önce image_url, yoksa galeri[0])
    if (biz.image_url) setActiveImage(biz.image_url)
    else if (biz.gallery && biz.gallery.length > 0) setActiveImage(biz.gallery[0])
    else setActiveImage(null)

    setDetailLoading(true)
    
    // Özellikler ve Sahip Bilgisi
    const [featRes, ownerRes] = await Promise.all([
      supabase.from('business_features').select('value, features ( name )').eq('business_id', biz.id),
      supabase.from('profiles').select('*').eq('id', biz.owner_id).single()
    ])

    if (featRes.data) {
      // @ts-ignore
      const names = featRes.data.map((item: any) => item.features?.name).filter(Boolean)
      setBizFeatures(names)
    } else {
      setBizFeatures([])
    }

    setOwnerDetails(ownerRes.data)
    setDetailLoading(false)
  }

  const handleDecision = async (id: string, decision: 'active' | 'rejected') => {
    if (!confirm(`İşletme ${decision === 'active' ? 'ONAYLANSIN' : 'REDDEDİLSİN'} mi?`)) return

    const { error } = await supabase.from('businesses').update({ status: decision }).eq('id', id)

    if (error) {
      alert('Hata: ' + error.message)
    } else {
      setPendingList(prev => prev.filter(b => b.id !== id))
      if (selectedBiz?.id === id) setSelectedBiz(null)
    }
  }

  const filteredList = pendingList
    .filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.type.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => sortOrder === 'newest' ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return (
    <div className="h-full flex flex-col font-sans text-slate-600">
      
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-700">Onay Merkezi</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Bekleyen <span className="text-orange-500 font-bold">{pendingList.length}</span> başvuru var.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
           <div className="w-64"><NeuInput icon={Search} placeholder="Ara..." value={searchTerm} onChange={(e: any) => setSearchTerm(e.target.value)} /></div>
           <NeuButton onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')} className="px-4"><ArrowUpDown className="w-4 h-4" /></NeuButton>
        </div>
      </div>

      <NeuCard className="flex-1 overflow-hidden flex flex-col relative p-6">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div> : 
           filteredList.length === 0 ? <div className="flex flex-col items-center justify-center h-64 opacity-50"><CheckCircle className="w-16 h-16 text-green-500 mb-4"/><h3 className="text-xl font-bold">Temiz!</h3></div> : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white z-10 text-slate-400 text-[10px] font-semibold uppercase tracking-widest border-b border-slate-300/50">
                <tr><th className="pb-4 pl-4">İşletme</th><th className="pb-4">Kategori</th><th className="pb-4">Tarih</th><th className="pb-4 text-right pr-4">İşlem</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-300/40">
                {filteredList.map(biz => (
                  <tr key={biz.id} onClick={() => openDetail(biz)} className="group cursor-pointer hover:bg-slate-200/50">
                    <td className="py-4 pl-4 font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{biz.name}</td>
                    <td className="py-4"><span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded uppercase">{biz.type}</span></td>
                    <td className="py-4 text-xs font-bold text-slate-500">{new Date(biz.created_at).toLocaleDateString('tr-TR')}</td>
                    <td className="py-4 text-right pr-4"><div className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full"><Eye className="w-3 h-3"/> İNCELE</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </NeuCard>

      {selectedBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-6xl h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/40">
            <div className="flex justify-between items-center p-6 border-b border-slate-300/50 bg-white">
              <div className="flex items-center gap-3"><h2 className="text-2xl font-semibold text-slate-700">{selectedBiz.name}</h2></div>
              <NeuButton onClick={() => setSelectedBiz(null)} className="w-10 h-10 rounded-full !p-0"><X className="w-5 h-5 text-slate-500"/></NeuButton>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-200/30">
              {detailLoading ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div> : (
                <div className="grid grid-cols-12 gap-8">
                  
                  {/* SOL KOLON (Medya & Özellikler) */}
                  <div className="col-span-12 lg:col-span-8 space-y-6">
                    
                    {/* Görsel Alanı */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm">
                       {activeImage ? (
                         <div className="relative group">
                            <img src={activeImage} className="w-full h-80 object-cover rounded-2xl mb-4 shadow-inner bg-slate-300" onError={(e:any) => {e.target.style.display='none'; alert('Resim yüklenemedi. Link bozuk olabilir.')}} />
                            <div className="text-[10px] text-slate-400 font-mono break-all opacity-30 mt-1">{activeImage}</div>
                         </div>
                       ) : (
                         <div className="w-full h-32 bg-slate-200 rounded-2xl mb-4 flex flex-col items-center justify-center text-slate-400 font-bold shadow-inner gap-2">
                           <ImageIcon className="w-8 h-8"/> <span>Görsel Yok</span>
                         </div>
                       )}

                       {/* Galeri Grid (Varsa) */}
                       {selectedBiz.gallery && selectedBiz.gallery.length > 0 && (
                         <div className="mt-4">
                            <h4 className="text-[10px] font-semibold text-slate-400 mb-2 uppercase flex items-center gap-1"><Layers className="w-3 h-3"/> DİĞER RESİMLER ({selectedBiz.gallery.length})</h4>
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                              {selectedBiz.gallery.map((img, idx) => (
                                <img 
                                  key={idx} 
                                  src={img} 
                                  onClick={() => setActiveImage(img)}
                                  className={`w-20 h-20 object-cover rounded-lg cursor-pointer transition-all border-2 ${activeImage === img ? 'border-blue-500 scale-95' : 'border-transparent hover:scale-105'}`}
                                />
                              ))}
                            </div>
                         </div>
                       )}

                       {/* DEBUG BİLGİSİ (Veri yoksa görünür) */}
                       {(!activeImage && (!selectedBiz.gallery || selectedBiz.gallery.length === 0)) && (
                         <div className="mt-4 p-3 bg-slate-200 rounded-xl text-[10px] font-mono text-slate-500 break-all">
                            <strong>DEBUG (Veri Kontrolü):</strong><br/>
                            image_url: {String(selectedBiz.image_url)}<br/>
                            gallery: {JSON.stringify(selectedBiz.gallery)}
                         </div>
                       )}

                       <h3 className="text-sm font-semibold text-slate-400 mb-2 mt-6 uppercase tracking-widest">AÇIKLAMA</h3>
                       <p className="text-slate-600 text-sm leading-relaxed">{selectedBiz.description || 'Açıklama girilmemiş.'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="bg-white p-6 rounded-2xl shadow-sm">
                          <h3 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2"><MapPin className="w-4 h-4"/> ADRES</h3>
                          <p className="text-sm font-bold text-slate-700 mb-2">{selectedBiz.address_text}</p>
                          <a href={`http://googleusercontent.com/maps.google.com/4{selectedBiz.lat},${selectedBiz.lng}`} target="_blank" className="text-xs font-bold text-blue-500 hover:underline">Haritada Gör ↗</a>
                       </div>
                       <div className="bg-white p-6 rounded-2xl shadow-sm">
                          <h3 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2"><Phone className="w-4 h-4"/> İLETİŞİM</h3>
                          <p className="text-lg font-semibold text-slate-700">{selectedBiz.phone}</p>
                       </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm">
                       <h3 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-widest">SEÇİLEN ÖZELLİKLER</h3>
                       <div className="flex flex-wrap gap-2">
                          {bizFeatures.length > 0 ? bizFeatures.map((f, i) => <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg border border-blue-100">{f}</span>) : <span className="text-sm text-slate-400 italic">Hiçbir özellik seçilmemiş.</span>}
                       </div>
                    </div>
                  </div>

                  {/* SAĞ KOLON (Profil & Onay) */}
                  <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-300/50">
                       <h3 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2"><User className="w-4 h-4"/> BAŞVURAN</h3>
                       {ownerDetails ? (
                         <div className="text-center">
                            <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden">
                               {ownerDetails.avatar_url ? <img src={ownerDetails.avatar_url} className="w-full h-full object-cover"/> : <User className="w-8 h-8 text-slate-400"/>}
                            </div>
                            <div className="font-semibold text-slate-700">{ownerDetails.full_name || 'İsimsiz'}</div>
                            <div className="text-xs font-bold text-blue-500">{ownerDetails.email}</div>
                         </div>
                       ) : <div className="text-center text-slate-400 italic">Kullanıcı bilgisi yok.</div>}
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-white sticky top-0">
                       <h3 className="text-xs font-semibold text-slate-400 mb-6 uppercase tracking-widest text-center">KARARINIZ NEDİR?</h3>
                       <div className="space-y-3">
                          <button onClick={() => handleDecision(selectedBiz.id, 'active')} className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-semibold shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5"/> ONAYLA</button>
                          <button onClick={() => handleDecision(selectedBiz.id, 'rejected')} className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-semibold shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-2"><XCircle className="w-5 h-5"/> REDDET</button>
                       </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
