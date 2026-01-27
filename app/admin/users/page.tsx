'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { 
  Search, Filter, Edit3, Save, Trash2, Shield, ShieldAlert,
  User, Mail, Calendar, CheckCircle, XCircle, Ban, Loader2,
  ChevronRight, ChevronLeft, Lock, BadgeCheck, SlidersHorizontal, X
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
  if (variant === "warning") colors = "bg-[#E0E5EC] text-orange-500 hover:text-orange-600"
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

const NeuSelect = ({ label, children, ...props }: any) => (
  <div className="group w-full">
    {label && <label className="text-[10px] font-black text-slate-400 ml-3 mb-2 block tracking-widest">{label}</label>}
    <div className="relative">
      <select 
        {...props}
        className="w-full bg-[#E0E5EC] pl-4 pr-10 py-3 rounded-xl text-slate-700 font-bold text-sm outline-none appearance-none cursor-pointer
        shadow-[inset_5px_5px_10px_#a3b1c6,inset_-5px_-5px_10px_#ffffff]"
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
type Profile = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  role: string // admin, isletmeci, pending_business, user
  status?: string // active, banned
  created_at: string
}

const PAGE_SIZE = 10;

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [editForm, setEditForm] = useState<Partial<Profile>>({})
  const [activeTab, setActiveTab] = useState('profil')
  const [modalLoading, setModalLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchUsers()
  }, [page, filterRole, filterStatus])

  const fetchUsers = async () => {
    setLoading(true)
    
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filterRole !== 'all') query = query.eq('role', filterRole)
    if (filterStatus !== 'all') query = query.eq('status', filterStatus)
    
    if (searchTerm.trim() !== '') {
      // Güvenli arama mantığı
      query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    }

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      // HATAYI GÜVENLİ BİR ŞEKİLDE YAZDIR
      console.log('Veri hatası:', error.message)
      alert(`Veri çekilemedi: ${error.message}`)
    } else {
      setUsers(data as Profile[])
      setTotalCount(count || 0)
    }
    setLoading(false)
  }

  const handleSearch = () => {
    setPage(1)
    fetchUsers()
  }

  const handleOpenDetail = (user: Profile) => {
    setSelectedUser(user)
    setEditForm(user)
    setActiveTab('profil')
  }

  const handleSaveUser = async () => {
    if (!selectedUser) return
    if (!confirm('Kullanıcı bilgileri güncellenecek. Emin misiniz?')) return

    setModalLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name,
        role: editForm.role,
        status: editForm.status
      })
      .eq('id', selectedUser.id)

    if (error) {
      alert('Hata: ' + error.message)
    } else {
      alert('Kullanıcı güncellendi.')
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...editForm } as Profile : u))
      setSelectedUser(null)
    }
    setModalLoading(false)
  }

  const handleBanUser = async () => {
    const newStatus = editForm.status === 'banned' ? 'active' : 'banned'
    const actionName = newStatus === 'banned' ? 'YASAKLAMAK' : 'YASAĞI KALDIRMAK'
    
    if(!confirm(`Bu kullanıcıyı ${actionName} üzeresiniz. Onaylıyor musunuz?`)) return
    
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', selectedUser!.id)

    if(!error) {
        alert('Durum güncellendi.')
        setUsers(prev => prev.map(u => u.id === selectedUser!.id ? { ...u, status: newStatus } : u))
        setSelectedUser(prev => prev ? {...prev, status: newStatus} : null)
        setEditForm(prev => ({...prev, status: newStatus}))
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <span className="px-2 py-1 rounded bg-purple-100 text-purple-600 text-[10px] font-black uppercase flex items-center gap-1 w-fit border border-purple-200"><Shield className="w-3 h-3"/> ADMIN</span>
      case 'isletmeci': return <span className="px-2 py-1 rounded bg-blue-100 text-blue-600 text-[10px] font-black uppercase flex items-center gap-1 w-fit border border-blue-200"><BadgeCheck className="w-3 h-3"/> İŞLETMECİ</span>
      case 'pending_business': return <span className="px-2 py-1 rounded bg-orange-100 text-orange-600 text-[10px] font-black uppercase flex items-center gap-1 w-fit border border-orange-200">ONAY BEKLİYOR</span>
      default: return <span className="px-2 py-1 rounded bg-slate-200 text-slate-500 text-[10px] font-black uppercase flex items-center gap-1 w-fit">KULLANICI</span>
    }
  }

  return (
    <div className="h-full flex flex-col font-sans text-slate-600">
      
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-700">Kullanıcı Yönetimi</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Platformda kayıtlı <span className="text-blue-600 font-bold">{totalCount}</span> hesap var.</p>
        </div>
        <NeuButton onClick={fetchUsers} className="px-4 py-2 text-xs">
          <SlidersHorizontal className="w-4 h-4" /> Listeyi Yenile
        </NeuButton>
      </div>

      <div className="bg-[#E0E5EC] p-6 rounded-[30px] shadow-[inset_6px_6px_12px_#a3b1c6,inset_-6px_-6px_12px_#ffffff] mb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          
          <div className="md:col-span-5">
             <div className="flex gap-2">
               <NeuInput 
                 placeholder="İsim veya E-posta ara..." 
                 icon={Search}
                 value={searchTerm}
                 onChange={(e: any) => setSearchTerm(e.target.value)}
                 onKeyDown={(e: any) => e.key === 'Enter' && handleSearch()}
               />
               <NeuButton onClick={handleSearch} variant="solid-blue" className="px-4">Ara</NeuButton>
             </div>
          </div>

          <div className="md:col-span-3">
             <NeuSelect label="ROL" value={filterRole} onChange={(e: any) => { setFilterRole(e.target.value); setPage(1); }}>
               <option value="all">Tüm Roller</option>
               <option value="user">Standart Kullanıcı</option>
               <option value="isletmeci">İşletmeci</option>
               <option value="admin">Admin</option>
               <option value="pending_business">Onay Bekleyen</option>
             </NeuSelect>
          </div>

          <div className="md:col-span-4">
             <NeuSelect label="HESAP DURUMU" value={filterStatus} onChange={(e: any) => { setFilterStatus(e.target.value); setPage(1); }}>
               <option value="all">Tümü</option>
               <option value="active">Aktif Hesaplar</option>
               <option value="banned">Yasaklılar (Banned)</option>
             </NeuSelect>
          </div>

        </div>
      </div>

      <NeuCard className="flex-1 overflow-hidden p-6 flex flex-col relative">
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {loading ? ( <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div> ) : 
           users.length === 0 ? ( <div className="text-center pt-20 text-slate-400 font-bold">Kriterlere uygun kullanıcı bulunamadı.</div> ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#E0E5EC] z-10 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-300/50">
                <tr>
                  <th className="pb-4 pl-4">Kullanıcı</th>
                  <th className="pb-4">Rol & Yetki</th>
                  <th className="pb-4">Durum</th>
                  <th className="pb-4">Kayıt Tarihi</th>
                  <th className="pb-4 text-right pr-4">Yönet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/40">
                {users.map(user => (
                  <tr key={user.id} className="group transition-colors hover:bg-slate-200/40">
                    <td className="py-4 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 shadow-inner overflow-hidden">
                           {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <User className="w-5 h-5"/>}
                        </div>
                        <div>
                           <div className="font-black text-slate-700">{user.full_name || 'İsimsiz'}</div>
                           <div className="text-xs text-slate-500 font-mono">{user.email || 'E-posta yok'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">{getRoleBadge(user.role)}</td>
                    <td className="py-4">
                      {user.status === 'banned' ? (
                        <span className="flex items-center gap-1 text-xs font-black text-red-500 bg-red-50 px-2 py-1 rounded w-fit"><Ban className="w-3 h-3"/> YASAKLI</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-black text-green-600"><CheckCircle className="w-3 h-3"/> AKTİF</span>
                      )}
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-500">
                      {new Date(user.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="py-4 text-right pr-4">
                        <NeuButton onClick={() => handleOpenDetail(user)} className="px-4 py-2 text-xs ml-auto">
                          <Edit3 className="w-4 h-4"/> Düzenle
                        </NeuButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-300/50 flex justify-between items-center">
          <div className="text-xs font-bold text-slate-400">
            Toplam {Math.ceil(totalCount / PAGE_SIZE)} sayfa
          </div>
          <div className="flex items-center gap-4">
            <NeuButton onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-xs">
              <ChevronLeft className="w-4 h-4" /> Önceki
            </NeuButton>
            <span className="font-black text-slate-700 bg-slate-200 px-4 py-2 rounded-lg shadow-inner text-xs">Sayfa {page}</span>
            <NeuButton onClick={() => setPage(p => p + 1)} disabled={page * PAGE_SIZE >= totalCount} className="px-4 py-2 text-xs">
              Sonraki <ChevronRight className="w-4 h-4" />
            </NeuButton>
          </div>
        </div>
      </NeuCard>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-[#E0E5EC] w-full max-w-4xl h-[85vh] flex flex-col rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            
            <div className="flex justify-between items-center p-6 bg-[#E0E5EC] z-20 shadow-sm border-b border-slate-300">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-slate-200 shadow-inner flex items-center justify-center overflow-hidden">
                    {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-slate-400"/>}
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-700">{selectedUser.full_name || 'İsimsiz Kullanıcı'}</h2>
                    <div className="text-xs font-bold text-slate-400 tracking-wider">ID: {selectedUser.id}</div>
                 </div>
              </div>
              <NeuButton onClick={() => setSelectedUser(null)} className="w-10 h-10 rounded-full !p-0">
                <X className="w-5 h-5 text-slate-500"/>
              </NeuButton>
            </div>

            <div className="px-8 flex gap-2 bg-[#E0E5EC] pt-4 border-b border-slate-300/50">
               {['profil', 'guvenlik'].map(tab => (
                 <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-t-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-slate-200 text-blue-600 shadow-inner' : 'text-slate-400 hover:bg-slate-200/50'}`}>
                    {tab === 'profil' ? 'Profil Bilgileri' : 'Güvenlik & Rol'}
                 </button>
               ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-200/30">
              {modalLoading ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div> : (
                 <div className="max-w-3xl mx-auto space-y-6">
                    
                    {activeTab === 'profil' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-6">
                              <NeuInput label="AD SOYAD" value={editForm.full_name || ''} onChange={(e: any) => setEditForm({...editForm, full_name: e.target.value})} icon={User} />
                              <NeuInput label="E-POSTA" value={editForm.email || ''} disabled={true} icon={Mail} />
                           </div>
                           <div className="space-y-6">
                              <div className="p-6 bg-[#E0E5EC] rounded-[30px] shadow-[inset_5px_5px_10px_#a3b1c6,inset_-5px_-5px_10px_#ffffff] text-center">
                                 <div className="text-xs font-black text-slate-400 mb-2">PROFİL DURUMU</div>
                                 <div className="flex justify-center">{getRoleBadge(editForm.role || 'user')}</div>
                                 <div className="mt-4 text-xs font-bold text-slate-500">
                                    Kayıt: {new Date(selectedUser.created_at).toLocaleDateString()}
                                 </div>
                              </div>
                           </div>
                        </div>
                    )}

                    {activeTab === 'guvenlik' && (
                        <div className="space-y-8">
                           <div className="p-6 bg-[#E0E5EC] rounded-[30px] shadow-[6px_6px_12px_#a3b1c6,-6px_-6px_12px_#ffffff]">
                              <div className="flex items-center gap-3 mb-4">
                                 <Shield className="w-6 h-6 text-blue-500" />
                                 <h3 className="font-black text-slate-700 text-lg">Yetki Seviyesi</h3>
                              </div>
                              <p className="text-sm text-slate-500 mb-6 font-medium">Kullanıcının platform üzerindeki yetkilerini buradan değiştirebilirsiniz.</p>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                 {['user', 'pending_business', 'isletmeci', 'admin'].map(role => (
                                    <div 
                                      key={role}
                                      onClick={() => setEditForm({...editForm, role})}
                                      className={`cursor-pointer p-4 rounded-xl text-center border-2 transition-all
                                        ${editForm.role === role 
                                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-black shadow-inner' 
                                          : 'border-transparent bg-slate-200 text-slate-500 hover:bg-slate-300 font-bold'}
                                      `}
                                    >
                                       {role.toUpperCase()}
                                    </div>
                                 ))}
                              </div>
                           </div>

                           <div className="p-6 bg-red-50 rounded-[30px] border border-red-100">
                              <div className="flex items-center gap-3 mb-4">
                                 <ShieldAlert className="w-6 h-6 text-red-500" />
                                 <h3 className="font-black text-red-600 text-lg">Tehlikeli Bölge</h3>
                              </div>
                              <div className="flex justify-between items-center">
                                 <p className="text-sm text-red-400 font-bold max-w-md">
                                    Bu kullanıcıyı yasaklarsanız, sisteme giriş yapamaz ve tüm işlemleri durdurulur.
                                 </p>
                                 <NeuButton onClick={handleBanUser} variant="danger" className="px-6 py-3 text-xs">
                                    {editForm.status === 'banned' ? 'YASAĞI KALDIR' : 'KULLANICIYI YASAKLA'}
                                 </NeuButton>
                              </div>
                           </div>
                        </div>
                    )}
                 </div>
              )}
            </div>

            <div className="p-6 bg-[#E0E5EC] border-t border-slate-300/50 flex justify-end gap-4 z-20">
              <NeuButton onClick={() => setSelectedUser(null)} className="px-8 py-3 text-slate-500">VAZGEÇ</NeuButton>
              <NeuButton onClick={handleSaveUser} variant="solid-blue" className="px-8 py-3">KAYDET</NeuButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
