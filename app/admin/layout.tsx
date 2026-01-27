'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { 
  LayoutDashboard, Users, LogOut, MapPin, Store, 
  Layers, Tag, ChevronRight, ClipboardCheck, MessageSquare 
} from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItemClass = (path: string) => {
    const isActive = pathname.startsWith(path)
    const baseStyle = "group relative flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ease-out cursor-pointer font-bold text-sm select-none"
    
    if (isActive) {
      return `${baseStyle} text-blue-600 bg-[#E0E5EC] shadow-[inset_4px_4px_8px_#a3b1c6,inset_-4px_-4px_8px_#ffffff]`
    }
    return `${baseStyle} text-slate-500 hover:text-blue-500 hover:shadow-[5px_5px_10px_#a3b1c6,-5px_-5px_10px_#ffffff] hover:-translate-y-0.5`
  }

  return (
    <div className="h-screen bg-[#E0E5EC] flex font-sans text-slate-700 overflow-hidden selection:bg-blue-200">
      
      <aside className="w-72 bg-[#E0E5EC] flex flex-col z-50 shadow-[4px_0_24px_rgba(163,177,198,0.3)] relative">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-4 p-4 rounded-[20px] bg-[#E0E5EC] shadow-[8px_8px_16px_#a3b1c6,-8px_-8px_16px_#ffffff]">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-300">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight text-slate-700 leading-none">MolaYeri</h1>
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Yönetim Paneli</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-3 overflow-y-auto py-4 custom-scrollbar">
          <div className="text-[10px] font-black text-slate-400 pl-4 mb-2 tracking-widest uppercase opacity-60">Genel Bakış</div>
          
          <Link href="/admin/dashboard">
            <div className={menuItemClass('/admin/dashboard')}>
              <LayoutDashboard className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="flex-1">Ana Panel</span>
            </div>
          </Link>

          <Link href="/admin/approvals">
            <div className={menuItemClass('/admin/approvals')}>
              <ClipboardCheck className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="flex-1">Onay Merkezi</span>
            </div>
          </Link>

          <Link href="/admin/messages">
            <div className={menuItemClass('/admin/messages')}>
              <MessageSquare className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="flex-1">Mesajlar</span>
            </div>
          </Link>

          <div className="text-[10px] font-black text-slate-400 pl-4 mt-6 mb-2 tracking-widest uppercase opacity-60">İşletme Yönetimi</div>

          <Link href="/admin/businesses">
            <div className={menuItemClass('/admin/businesses')}>
              <Store className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="flex-1">İşletmeler</span>
            </div>
          </Link>

          <Link href="/admin/categories">
            <div className={menuItemClass('/admin/categories')}>
              <Layers className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="flex-1">Kategoriler</span>
            </div>
          </Link>

          <Link href="/admin/features">
            <div className={menuItemClass('/admin/features')}>
              <Tag className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="flex-1">Özellikler</span>
            </div>
          </Link>

          <div className="text-[10px] font-black text-slate-400 pl-4 mt-6 mb-2 tracking-widest uppercase opacity-60">Sistem & Kullanıcılar</div>

          <Link href="/admin/users">
            <div className={menuItemClass('/admin/users')}>
              <Users className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="flex-1">Kullanıcılar</span>
            </div>
          </Link>
        </nav>

        <div className="p-6">
          <button onClick={handleLogout} className="w-full group flex items-center justify-center gap-3 px-5 py-4 rounded-2xl font-bold text-red-500 transition-all shadow-[6px_6px_12px_#a3b1c6,-6px_-6px_12px_#ffffff] hover:text-red-600 hover:shadow-[inset_4px_4px_8px_#a3b1c6,inset_-4px_-4px_8px_#ffffff] active:scale-95">
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span>Güvenli Çıkış</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 relative overflow-hidden flex flex-col">
        <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-[#a3b1c6]/10 to-transparent z-10 pointer-events-none" />
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
           {children}
        </div>
      </main>
    </div>
  )
}
