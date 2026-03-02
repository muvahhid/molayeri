'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import {
  ClipboardList,
  Compass,
  CircleDollarSign,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  PlusSquare,
  Radio,
  Route,
  Settings,
  Star,
  Store,
  Ticket,
  UserCircle2,
  Layers,
  X,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'

type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
}

type ProfilePreview = {
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

function normalizeNameCandidate(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isPlaceholderName(value: string): boolean {
  const normalized = value
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')

  return (
    normalized === '' ||
    normalized === 'isimsiz' ||
    normalized === 'isimsiz kullanici' ||
    normalized === 'bilinmeyen' ||
    normalized === 'kullanici' ||
    normalized === 'user' ||
    normalized === 'unknown'
  )
}

function prettifyFromEmail(value: string): string {
  return value
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const NAV_ITEMS: NavItem[] = [
  { href: '/merchant/dashboard', label: 'Ana Panel', icon: LayoutDashboard },
  { href: '/merchant/businesses', label: 'Şubelerim', icon: Store },
  { href: '/merchant/menu', label: 'Menü ve İçerik', icon: Layers },
  { href: '/merchant/campaigns', label: 'Kampanyalar', icon: ClipboardList },
  { href: '/merchant/coupons', label: 'Kupon Yönetimi', icon: Ticket },
  { href: '/merchant/kasa', label: 'Kasa', icon: CircleDollarSign },
  { href: '/merchant/convoys', label: 'Konvoy Yönetimi', icon: Route },
  { href: '/merchant/radar', label: 'Müşteri Radarı', icon: Radio },
  { href: '/merchant/mola-targets', label: 'Mola Hedefleri', icon: Compass },
  { href: '/merchant/messages', label: 'Mesajlar', icon: MessageSquare },
  { href: '/merchant/reviews', label: 'Yorumlar', icon: Star },
  { href: '/merchant/settings', label: 'Ayarlar', icon: Settings },
]

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => getBrowserSupabase(), [])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileName, setProfileName] = useState('İşletmeci')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  useEffect(() => {
    let active = true

    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser()
      if (!active || !data.user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', data.user.id)
        .maybeSingle()

      const profile = (profileData ?? null) as ProfilePreview | null
      const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>
      const firstName = normalizeNameCandidate(metadata.first_name)
      const lastName = normalizeNameCandidate(metadata.last_name)
      const emailBase = prettifyFromEmail((data.user.email || '').split('@')[0] || '')
      const nameCandidates = [
        normalizeNameCandidate(profile?.full_name),
        normalizeNameCandidate(metadata.full_name),
        normalizeNameCandidate(metadata.name),
        `${firstName} ${lastName}`.trim(),
        emailBase,
      ]

      const fullName = nameCandidates.find((candidate) => !isPlaceholderName(candidate)) || 'İşletmeci'

      const metadataAvatar = typeof metadata.avatar_url === 'string' ? metadata.avatar_url.trim() : ''
      const avatar = (profile?.avatar_url || '').trim() || metadataAvatar

      setProfileName(fullName)
      setProfileEmail((profile?.email || '').trim() || data.user.email || '')
      setProfileAvatarUrl(avatar || null)
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [supabase])

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
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
          {/* Profile Widget */}
          <div className="rounded-md border border-[#2d313a] bg-[#16181d] p-3 shadow-sm mb-3">
            <div className="flex items-center gap-3">
              <div
                className="grid h-10 w-10 shrink-0 place-items-center rounded bg-[#0a0c10] border border-[#2d313a] bg-cover bg-center text-sm font-bold text-[#e2e8f0]"
                style={profileAvatarUrl ? { backgroundImage: `url("${profileAvatarUrl}")` } : undefined}
              >
                {profileAvatarUrl ? null : <UserCircle2 size={20} className="text-[#64748b]" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-none text-[#e2e8f0]">{profileName}</p>
                <p className="mt-1 truncate text-[11px] font-mono text-[#64748b]">{profileEmail || 'İşletmeci'}</p>
              </div>
            </div>
          </div>

          {/* App Header Link */}
          <Link
            href="/merchant/dashboard"
            className="group flex items-center gap-3 rounded-md border border-[#2d313a] bg-[#16181d] hover:bg-[#1a1d24] transition-colors p-3 shadow-sm"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#101419] border border-[#23272f] text-[#38bdf8] group-hover:border-[#38bdf8]/50 transition-colors">
              <MapPin size={18} strokeWidth={1.5} />
            </span>
            <span>
              <p className="text-[14px] font-medium leading-none text-[#e2e8f0] tracking-wide">Molayeri App</p>
              <p className="mt-1 text-[10px] font-mono text-[#64748b] uppercase tracking-widest">İşletmeci</p>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="mt-4 flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-1">
            
            <p className="mb-1 mt-4 px-3 text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-[#475569]">
              Yönetim
            </p>
            {NAV_ITEMS.map((item) => {
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

            <p className="mb-1 mt-6 px-3 text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-[#475569]">
              Hızlı Aksiyon
            </p>
            <Link
              href="/merchant/businesses/new"
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-all duration-200 border ${
                pathname.startsWith('/merchant/businesses/new')
                  ? 'bg-[#153445] border-[#226785] text-[#38bdf8] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                  : 'bg-transparent border-transparent text-[#94a3b8] hover:border-[#2d313a] hover:bg-[#12141a] hover:text-[#e2e8f0]'
              }`}
            >
              <PlusSquare size={16} strokeWidth={1.5} className={pathname.startsWith('/merchant/businesses/new') ? 'text-[#38bdf8]' : 'text-[#64748b] group-hover:text-[#94a3b8]'} />
              <span>İşletme Ekle</span>
            </Link>

            <p className="mb-1 mt-6 px-3 text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-[#475569]">
              Hesap
            </p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="group flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-200 bg-transparent border-transparent text-rose-400 hover:border-rose-900/50 hover:bg-rose-950/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut ? (
                <Loader2 size={16} className="animate-spin text-rose-500" strokeWidth={1.5} />
              ) : (
                <LogOut size={16} className="text-rose-500 group-hover:text-rose-400" strokeWidth={1.5} />
              )}
              <span>{loggingOut ? 'Çıkış Yapılıyor...' : 'Güvenli Çıkış'}</span>
            </button>

            {/* Footer Status Box */}
            <div className="mt-8 mb-2 rounded border border-[#2d313a] bg-[#12141a] p-3 text-center">
              <p className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0]">İşletmeci Modu</p>
              <p className="mt-1.5 text-[10px] font-mono text-[#64748b] leading-relaxed">Şube, menü, kampanya ve mesaj akışını canlı yönet.</p>
            </div>
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <section className="min-w-0 flex flex-col bg-[#0c0e12] lg:flex-1 relative">
          
          {/* Mobile Header */}
          <header className="flex h-[60px] items-center border-b border-[#23272f] bg-[#0a0c10] px-4 lg:hidden">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#2d313a] bg-[#16181d] text-[#e2e8f0] hover:bg-[#1a1d24] transition-colors"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Menüyü aç"
            >
              {mobileOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
            </button>
            <span className="ml-4 text-sm font-medium text-[#e2e8f0] tracking-wide">Molayeri İşletmeci</span>
          </header>

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
