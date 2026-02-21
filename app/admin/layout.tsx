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
  Route,
  Store,
  Users,
  X,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'

type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ size?: number }>
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
      { href: '/admin/molastop', label: 'MolaStop Kontrol', icon: Route },
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
    <div className="min-h-screen p-3 md:p-6 text-slate-700 bg-[radial-gradient(circle_at_6%_8%,rgba(255,145,0,0.18)_0,rgba(255,145,0,0)_33%),radial-gradient(circle_at_94%_4%,rgba(59,130,246,0.12)_0,rgba(59,130,246,0)_31%),linear-gradient(160deg,#e4e9f0_0%,#eef2f8_52%,#e0e5ec_100%)]">
      <div className="mx-auto max-w-[1460px] min-h-[calc(100vh-1.5rem)] md:min-h-[calc(100vh-3rem)] rounded-[30px] overflow-hidden bg-[#f2f5fb] shadow-[0_26px_70px_-34px_rgba(15,23,42,0.45),0_12px_22px_-14px_rgba(30,64,175,0.2),inset_0_1px_0_rgba(255,255,255,0.9)] flex flex-col lg:flex-row relative">
        <aside
          className={`fixed lg:static z-40 top-0 left-0 h-screen lg:h-auto w-[296px] lg:w-[296px] lg:flex-none p-4 bg-[linear-gradient(185deg,#f8faff_0%,#f1f5fe_45%,#edf3fc_100%)] shadow-[22px_0_38px_-28px_rgba(15,23,42,0.45),inset_-1px_0_0_rgba(148,163,184,0.26)] transition-transform duration-300 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-[105%] lg:translate-x-0'
          }`}
        >
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/70 bg-[linear-gradient(150deg,#ffffff_0%,#f2f6ff_100%)] shadow-[0_14px_24px_-18px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.95)]"
          >
            <span className="w-10 h-10 rounded-[14px] bg-[linear-gradient(145deg,#ffb347_0%,#ff9100_100%)] text-white inline-flex items-center justify-center shadow-[0_10px_16px_-9px_rgba(255,145,0,0.58),inset_0_1px_0_rgba(255,255,255,0.32)]">
              <MapPin size={18} />
            </span>
            <span>
              <p className="text-[20px] leading-none font-bold text-slate-800">MolaYeri</p>
              <p className="text-[12px] mt-1 text-slate-500">Yönetim Merkezi</p>
            </span>
          </Link>

          <nav className="mt-3 max-h-[calc(100vh-140px)] lg:max-h-none overflow-y-auto pr-1">
            {NAV_GROUPS.map((group) => (
              <Fragment key={group.title}>
                <p className="mt-5 mb-2 px-2 text-[10px] tracking-[0.2em] uppercase font-semibold text-slate-500">
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
                      className={`group relative flex items-center gap-3 px-3.5 py-3 mb-2 rounded-2xl text-[15px] font-semibold transition-all duration-200 ${
                        active
                          ? 'text-slate-900 bg-[linear-gradient(138deg,#ffffff_0%,#f8efe2_100%)] shadow-[0_16px_22px_-18px_rgba(249,115,22,0.62),inset_0_1px_0_rgba(255,255,255,0.96)]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 hover:shadow-[0_12px_18px_-16px_rgba(15,23,42,0.55)]'
                      }`}
                    >
                      <span
                        className={`absolute left-1 top-1/2 h-7 w-1.5 -translate-y-1/2 rounded-full transition-opacity ${
                          active ? 'bg-gradient-to-b from-amber-400 to-orange-500 opacity-100' : 'opacity-0 group-hover:opacity-60'
                        }`}
                      />
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all ${
                          active
                            ? 'bg-[linear-gradient(145deg,#ffb347_0%,#ff9100_100%)] text-white shadow-[0_12px_16px_-10px_rgba(249,115,22,0.62)]'
                            : 'bg-white/70 text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] group-hover:text-slate-700'
                        }`}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </Fragment>
            ))}

            <p className="mt-5 mb-2 px-2 text-[10px] tracking-[0.2em] uppercase font-semibold text-slate-500">Hesap</p>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-2xl text-[15px] font-semibold text-rose-700 bg-[linear-gradient(145deg,#fff2f2_0%,#ffe9e9_100%)] shadow-[0_14px_20px_-18px_rgba(190,18,60,0.62),inset_0_1px_0_rgba(255,255,255,0.95)]"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#fb7185_0%,#e11d48_100%)] text-white shadow-[0_12px_16px_-10px_rgba(225,29,72,0.7)]">
                <LogOut size={16} />
              </span>
              <span>Güvenli Çıkış</span>
            </button>

            <div className="mt-4 rounded-2xl p-3.5 bg-[linear-gradient(145deg,#ffffff_0%,#f2f6ff_100%)] shadow-[0_14px_20px_-18px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.92)]">
              <p className="text-[13px] font-semibold text-slate-700">Admin Modu</p>
              <p className="text-[12px] text-slate-500 mt-1">Kullanıcı, işletme ve içerik akışları tek panelde.</p>
            </div>
          </nav>
        </aside>

        <section className="min-w-0 flex flex-col lg:flex-1 bg-[linear-gradient(180deg,#f8faff_0%,#f3f6fc_100%)]">
          <header className="h-[68px] px-3 md:px-6 flex items-center justify-between gap-3 bg-[linear-gradient(180deg,#f8fbff_0%,#f2f6fd_100%)] border-b border-slate-200/70 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                className="lg:hidden w-9 h-9 rounded-xl bg-white text-slate-600 shadow-[0_10px_16px_-12px_rgba(15,23,42,0.55)] inline-flex items-center justify-center"
                onClick={() => setMobileOpen((value) => !value)}
                aria-label="Menüyü aç"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex items-center gap-2 text-[12px] font-semibold text-emerald-700 px-3 py-2 rounded-full bg-white shadow-[0_10px_16px_-13px_rgba(16,185,129,0.48)]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(47,189,142,0.22)]" />
                Sistem Aktif
              </span>

              <Link
                href="/admin/approvals"
                className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-slate-700 px-3 py-2 rounded-full bg-white shadow-[0_10px_16px_-13px_rgba(15,23,42,0.5)]"
              >
                <ClipboardCheck size={14} />
                Bekleyen Onaylar
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-rose-700 px-3 py-2 rounded-full bg-white shadow-[0_10px_16px_-13px_rgba(190,24,93,0.42)]"
              >
                <LogOut size={14} />
                Çıkış
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-3 md:p-5">
            <div className="w-full max-w-[1240px] mx-auto">{children}</div>
          </main>
        </section>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 bg-slate-900/38 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Menüyü kapat"
        />
      ) : null}
    </div>
  )
}
