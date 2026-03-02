'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Fragment, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import {
  CircleDollarSign,
  ClipboardCheck,
  Flag,
  Layers,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Megaphone,
  MessageSquare,
  Store,
  Users,
  X,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'

type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
}

type NavSection = {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavSection[] = [
  {
    title: 'Genel Bakış',
    items: [
      { href: '/admin/dashboard', label: 'Ana Panel', icon: LayoutDashboard },
      { href: '/admin/approvals', label: 'Onay Merkezi', icon: ClipboardCheck },
      { href: '/admin/messages', label: 'Mesajlar', icon: MessageSquare },
      { href: '/admin/reviews', label: 'Yorum Şikayetleri', icon: Flag },
    ],
  },
  {
    title: 'İşletme Yönetimi',
    items: [
      { href: '/admin/businesses', label: 'İşletmeler', icon: Store },
      { href: '/admin/kasa', label: 'Kasa', icon: CircleDollarSign },
      { href: '/admin/reklam-yonetimi', label: 'Reklam Yönetimi', icon: Megaphone },
      { href: '/admin/categories', label: 'Kategori & Özellik', icon: Layers },
    ],
  },
  {
    title: 'Sistem',
    items: [{ href: '/admin/users', label: 'Kullanıcılar', icon: Users }],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => getBrowserSupabase(), [])
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06080b] p-3 text-[#e2e8f0] md:p-6 font-sans selection:bg-[#38bdf8]/30">
      
      {/* Background Tech Grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Main App Container */}
      <div className="relative mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1460px] flex-col overflow-hidden rounded-xl border border-[#23272f] bg-[#0c0e12] shadow-2xl md:min-h-[calc(100vh-3rem)] lg:flex-row">
        
        {/* SIDEBAR */}
        <aside
          className={`fixed left-0 top-0 z-40 h-screen w-[280px] border-r border-[#23272f] bg-[#0a0c10] p-4 transition-transform duration-300 lg:static lg:h-auto lg:w-[280px] lg:flex-none flex flex-col ${
            mobileOpen ? 'translate-x-0' : '-translate-x-[105%] lg:translate-x-0'
          }`}
        >
          {/* App Header Link */}
          <Link
            href="/admin/dashboard"
            className="group flex items-center gap-3 rounded-md border border-[#2d313a] bg-[#16181d] hover:bg-[#1a1d24] transition-colors p-3 shadow-sm mb-2"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#101419] border border-[#23272f] text-amber-500 group-hover:border-amber-500/50 transition-colors">
              <MapPin size={18} strokeWidth={1.5} />
            </span>
            <span>
              <p className="text-[14px] font-medium leading-none text-[#e2e8f0] tracking-wide">MolaYeri</p>
              <p className="mt-1.5 text-[10px] font-mono text-[#64748b] uppercase tracking-widest">Yönetim Merkezi</p>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="mt-2 flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-1">
            {NAV_GROUPS.map((group) => (
              <Fragment key={group.title}>
                <p className="mb-1 mt-5 px-3 text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-[#475569]">
                  {group.title}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-all duration-200 border ${
                        active
                          ? 'bg-[#153445] border-[#226785] text-[#38bdf8] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                          : 'bg-transparent border-transparent text-[#94a3b8] hover:border-[#2d313a] hover:bg-[#12141a] hover:text-[#e2e8f0]'
                      }`}
                    >
                      <Icon size={16} strokeWidth={1.5} className={active ? 'text-[#38bdf8]' : 'text-[#64748b] group-hover:text-[#94a3b8]'} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </Fragment>
            ))}

            <p className="mb-1 mt-6 px-3 text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-[#475569]">
              Hesap
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="group flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-200 bg-transparent border-transparent text-rose-400 hover:border-rose-900/50 hover:bg-rose-950/20"
            >
              <LogOut size={16} className="text-rose-500 group-hover:text-rose-400" strokeWidth={1.5} />
              <span>Güvenli Çıkış</span>
            </button>

            {/* Footer Status Box */}
            <div className="mt-8 mb-2 rounded border border-[#2d313a] bg-[#12141a] p-3 text-center">
              <p className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0]">Admin Modu</p>
              <p className="mt-1.5 text-[10px] font-mono text-[#64748b] leading-relaxed">Kullanıcı, işletme ve içerik akışları tek panelde.</p>
            </div>
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <section className="min-w-0 flex flex-col bg-[#0c0e12] lg:flex-1 relative">
          
          {/* Header */}
          <header className="flex h-[60px] items-center justify-between border-b border-[#23272f] bg-[#0f1115] px-4 md:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded border border-[#2d313a] bg-[#16181d] text-[#e2e8f0] hover:bg-[#1a1d24] transition-colors"
                onClick={() => setMobileOpen((value) => !value)}
                aria-label="Menüyü aç"
              >
                {mobileOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:inline-flex items-center gap-2 rounded border border-[#166534] bg-[#14532d]/40 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                Sistem Aktif
              </div>

              <Link
                href="/admin/approvals"
                className="inline-flex items-center gap-1.5 rounded border border-[#2d313a] bg-[#16181d] px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0] hover:bg-[#1a1d24] transition-colors"
              >
                <ClipboardCheck size={14} strokeWidth={1.5} className="text-[#38bdf8]" />
                Bekleyen Onaylar
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="hidden md:inline-flex items-center gap-1.5 rounded border border-rose-900/50 bg-rose-950/20 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-rose-400 hover:bg-rose-900/40 transition-colors"
              >
                <LogOut size={14} strokeWidth={1.5} />
                Çıkış
              </button>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="w-full max-w-[1240px] mx-auto">
              {children}
            </div>
          </main>
        </section>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[#050608]/80 backdrop-blur-sm lg:hidden cursor-default"
          onClick={() => setMobileOpen(false)}
          aria-label="Menüyü kapat"
        />
      ) : null}
    </div>
  )
}
