'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import {
  ClipboardList,
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
  icon: ComponentType<{ size?: number }>
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
  { href: '/merchant/convoys', label: 'Konvoy Yönetimi', icon: Route },
  { href: '/merchant/radar', label: 'Müşteri Radarı', icon: Radio },
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
    <div className="min-h-screen p-3 md:p-6 text-slate-700 bg-[radial-gradient(circle_at_6%_8%,rgba(255,145,0,0.18)_0,rgba(255,145,0,0)_33%),radial-gradient(circle_at_94%_4%,rgba(59,130,246,0.12)_0,rgba(59,130,246,0)_31%),linear-gradient(160deg,#e4e9f0_0%,#eef2f8_52%,#e0e5ec_100%)]">
      <div className="mx-auto max-w-[1460px] min-h-[calc(100vh-1.5rem)] md:min-h-[calc(100vh-3rem)] rounded-[30px] overflow-hidden bg-[#f2f5fb] shadow-[0_26px_70px_-34px_rgba(15,23,42,0.45),0_12px_22px_-14px_rgba(30,64,175,0.2),inset_0_1px_0_rgba(255,255,255,0.9)] flex flex-col lg:flex-row relative">
        <aside
          className={`fixed lg:static z-40 top-0 left-0 h-screen lg:h-auto w-[296px] lg:w-[296px] lg:flex-none p-4 bg-[linear-gradient(185deg,#f8faff_0%,#f1f5fe_45%,#edf3fc_100%)] shadow-[22px_0_38px_-28px_rgba(15,23,42,0.45),inset_-1px_0_0_rgba(148,163,184,0.26)] transition-transform duration-300 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-[105%] lg:translate-x-0'
          }`}
        >
          <div className="p-3.5 rounded-2xl border border-white/70 bg-[linear-gradient(150deg,#ffffff_0%,#f2f6ff_100%)] shadow-[0_14px_24px_-18px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.95)]">
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-2xl shrink-0 grid place-items-center text-sm font-bold text-slate-700 bg-[linear-gradient(145deg,#f7faff_0%,#ebf1fd_100%)] border border-white/80 shadow-[0_10px_16px_-12px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.95)] bg-cover bg-center"
                style={profileAvatarUrl ? { backgroundImage: `url("${profileAvatarUrl}")` } : undefined}
              >
                {profileAvatarUrl ? null : <UserCircle2 size={24} className="text-slate-500" />}
              </div>
              <div className="min-w-0">
                <p className="text-[15px] leading-none font-bold text-slate-800 truncate">{profileName}</p>
                <p className="text-[12px] mt-1 text-slate-500 truncate">{profileEmail || 'İşletmeci'}</p>
              </div>
            </div>
          </div>

          <Link
            href="/merchant/dashboard"
            className="mt-3 flex items-center gap-3 p-3.5 rounded-2xl border border-white/70 bg-[linear-gradient(150deg,#ffffff_0%,#f2f6ff_100%)] shadow-[0_14px_24px_-18px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.95)]"
          >
            <span className="w-10 h-10 rounded-[14px] bg-[linear-gradient(145deg,#ffb347_0%,#ff9100_100%)] text-white inline-flex items-center justify-center shadow-[0_10px_16px_-9px_rgba(255,145,0,0.58),inset_0_1px_0_rgba(255,255,255,0.32)]">
              <MapPin size={18} />
            </span>
            <span>
              <p className="text-[20px] leading-none font-bold text-slate-800">Molayeri App</p>
              <p className="text-[12px] mt-1 text-slate-500">İşletmeci Operasyonları</p>
            </span>
          </Link>

          <nav className="mt-3 max-h-[calc(100vh-220px)] lg:max-h-none overflow-y-auto pr-1">
            <p className="mt-5 mb-2 px-2 text-[10px] tracking-[0.2em] uppercase font-semibold text-slate-500">Yönetim</p>
            {NAV_ITEMS.map((item) => {
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

            <p className="mt-5 mb-2 px-2 text-[10px] tracking-[0.2em] uppercase font-semibold text-slate-500">Hızlı Aksiyon</p>
            <Link
              href="/merchant/businesses/new"
              onClick={() => setMobileOpen(false)}
              className={`group relative flex items-center gap-3 px-3.5 py-3 mb-2 rounded-2xl text-[15px] font-semibold transition-all duration-200 ${
                pathname.startsWith('/merchant/businesses/new')
                  ? 'text-slate-900 bg-[linear-gradient(138deg,#ffffff_0%,#f8efe2_100%)] shadow-[0_16px_22px_-18px_rgba(249,115,22,0.62),inset_0_1px_0_rgba(255,255,255,0.96)]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 hover:shadow-[0_12px_18px_-16px_rgba(15,23,42,0.55)]'
              }`}
            >
              <span
                className={`absolute left-1 top-1/2 h-7 w-1.5 -translate-y-1/2 rounded-full transition-opacity ${
                  pathname.startsWith('/merchant/businesses/new')
                    ? 'bg-gradient-to-b from-amber-400 to-orange-500 opacity-100'
                    : 'opacity-0 group-hover:opacity-60'
                }`}
              />
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all ${
                  pathname.startsWith('/merchant/businesses/new')
                    ? 'bg-[linear-gradient(145deg,#ffb347_0%,#ff9100_100%)] text-white shadow-[0_12px_16px_-10px_rgba(249,115,22,0.62)]'
                    : 'bg-white/70 text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] group-hover:text-slate-700'
                }`}
              >
                <PlusSquare size={16} />
              </span>
              <span>İşletme Ekle</span>
            </Link>

            <p className="mt-5 mb-2 px-2 text-[10px] tracking-[0.2em] uppercase font-semibold text-slate-500">Hesap</p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-2xl text-[15px] font-semibold text-rose-700 bg-[linear-gradient(145deg,#fff2f2_0%,#ffe9e9_100%)] shadow-[0_14px_20px_-18px_rgba(190,18,60,0.62),inset_0_1px_0_rgba(255,255,255,0.95)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#fb7185_0%,#e11d48_100%)] text-white shadow-[0_12px_16px_-10px_rgba(225,29,72,0.7)]">
                {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              </span>
              <span>{loggingOut ? 'Çıkış Yapılıyor...' : 'Güvenli Çıkış'}</span>
            </button>

            <div className="mt-4 rounded-2xl p-3.5 bg-[linear-gradient(145deg,#ffffff_0%,#f2f6ff_100%)] shadow-[0_14px_20px_-18px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.92)]">
              <p className="text-[13px] font-semibold text-slate-700">İşletmeci Modu</p>
              <p className="text-[12px] text-slate-500 mt-1">Şube, menü, kampanya ve mesaj akışını canlı yönet.</p>
            </div>
          </nav>
        </aside>

        <section className="min-w-0 flex flex-col lg:flex-1 bg-[linear-gradient(180deg,#f8faff_0%,#f3f6fc_100%)]">
          <header className="lg:hidden h-[68px] px-3 md:px-6 flex items-center bg-[linear-gradient(180deg,#f8fbff_0%,#f2f6fd_100%)] border-b border-slate-200/70 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.45)]">
            <button
              type="button"
              className="w-9 h-9 rounded-xl bg-white text-slate-600 shadow-[0_10px_16px_-12px_rgba(15,23,42,0.55)] inline-flex items-center justify-center"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Menüyü aç"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
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
