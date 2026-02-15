'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Activity, ArrowUpRight, ClipboardCheck, Sparkles, Store, Users } from 'lucide-react'

type StatItem = {
  title: string
  value: number
  icon: ComponentType<{ size?: number }>
  href: string
  color: string
}

function StatCard({ item }: { item: StatItem }) {
  const Icon = item.icon

  return (
    <Link href={item.href} className="block group">
      <article className="bg-white shadow-sm rounded-3xl p-5 transition-all group-hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className={`w-11 h-11 rounded-xl ${item.color} text-white grid place-items-center`}>
            <Icon size={18} />
          </div>
          <ArrowUpRight size={16} className="text-slate-400 group-hover:text-blue-500" />
        </div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mt-5">{item.title}</p>
        <p className="text-3xl font-semibold text-slate-800 mt-1">{item.value}</p>
      </article>
    </Link>
  )
}

export default function DashboardPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  const [counts, setCounts] = useState({ users: 0, businesses: 0, pending: 0 })

  useEffect(() => {
    const getStats = async () => {
      const [usersRes, activeBusinessesRes, pendingRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).neq('status', 'pending'),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ])

      setCounts({
        users: usersRes.count || 0,
        businesses: activeBusinessesRes.count || 0,
        pending: pendingRes.count || 0,
      })
    }

    getStats()
  }, [supabase])

  const stats: StatItem[] = [
    {
      title: 'Toplam Kullanıcı',
      value: counts.users,
      icon: Users,
      href: '/admin/users',
      color: 'bg-blue-600',
    },
    {
      title: 'Aktif İşletme',
      value: counts.businesses,
      icon: Store,
      href: '/admin/businesses',
      color: 'bg-emerald-600',
    },
    {
      title: 'Onay Bekleyen',
      value: counts.pending,
      icon: ClipboardCheck,
      href: '/admin/approvals',
      color: 'bg-amber-600',
    },
  ]

  return (
    <div className="space-y-6">
      <section className="bg-white shadow-sm rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Operasyon Özeti</h2>
            <p className="text-sm text-slate-500 mt-1">Kritik metrikleri tek ekranda takip et, aksiyonları hızla başlat.</p>
          </div>

          <span className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-2 rounded-full">
            <Sparkles size={14} />
            Canlı yönetim modu
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((item) => (
          <StatCard key={item.title} item={item} />
        ))}
      </section>

      <section className="bg-white shadow-sm rounded-3xl p-6 text-center">
        <Activity size={34} className="text-slate-400 mx-auto" />
        <h3 className="text-lg font-semibold text-slate-700 mt-3">Akıllı Analitik Yakında</h3>
        <p className="text-sm text-slate-500 mt-1">
          Dönüşüm, kategori yoğunluğu ve onay performansı için gelişmiş raporlar bu alanda yayınlanacak.
        </p>
      </section>
    </div>
  )
}
