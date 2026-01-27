'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { 
  Users, Store, ClipboardCheck, Activity, 
  ArrowUpRight, TrendingUp 
} from 'lucide-react'
import Link from 'next/link'

// Basit İstatistik Kartı Bileşeni
const StatCard = ({ title, value, icon: Icon, colorClass, link }: any) => (
  <Link href={link}>
    <div className="group cursor-pointer bg-[#E0E5EC] p-8 rounded-[30px] shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)] transition-all hover:-translate-y-1 hover:shadow-[12px_12px_20px_rgb(163,177,198,0.7),-12px_-12px_20px_rgba(255,255,255,0.6)]">
      <div className="flex justify-between items-start">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${colorClass}`}>
          <Icon className="w-7 h-7" />
        </div>
        <div className="p-2 bg-slate-200 rounded-full text-slate-400 group-hover:text-blue-500 transition-colors">
           <ArrowUpRight className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-6">
        <h3 className="text-4xl font-black text-slate-700">{value}</h3>
        <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wide">{title}</p>
      </div>
    </div>
  </Link>
)

export default function DashboardPage() {
  const [counts, setCounts] = useState({ users: 0, businesses: 0, pending: 0 })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function getStats() {
      // Paralel sorgular (Hızlı çalışması için)
      const [u, b, p] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).neq('status', 'pending'),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ])
      
      setCounts({
        users: u.count || 0,
        businesses: b.count || 0,
        pending: p.count || 0
      })
    }
    getStats()
  }, [])

  return (
    <div className="h-full font-sans text-slate-600">
      
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-700">Genel Bakış</h1>
        <p className="text-slate-500 font-medium mt-1">Sistemin anlık durum özeti.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <StatCard 
          title="Toplam Kullanıcı" 
          value={counts.users} 
          icon={Users} 
          colorClass="bg-blue-500 shadow-blue-300"
          link="/admin/users"
        />

        <StatCard 
          title="Aktif İşletme" 
          value={counts.businesses} 
          icon={Store} 
          colorClass="bg-purple-500 shadow-purple-300"
          link="/admin/businesses"
        />

        <StatCard 
          title="Onay Bekleyen" 
          value={counts.pending} 
          icon={ClipboardCheck} 
          colorClass="bg-orange-500 shadow-orange-300"
          link="/admin/approvals"
        />

      </div>

      {/* Gelecekte buraya grafikler gelecek */}
      <div className="mt-12 opacity-50 text-center py-20 border-2 border-dashed border-slate-300 rounded-[30px]">
         <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
         <h3 className="text-lg font-bold text-slate-500">Analitik Grafikler Yakında</h3>
         <p className="text-sm">Kullanıcı artış hızı ve kategori dağılımları burada olacak.</p>
      </div>

    </div>
  )
}
