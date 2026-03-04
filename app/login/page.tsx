'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2, Lock, Mail, ShieldCheck, Terminal, Server, Activity, Database } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { fetchUserRoleById, getDashboardPathForRole } from '@/lib/auth-role'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<null | 'apple' | 'google'>(null)
  const [resolvingSession, setResolvingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  const redirectByRole = useCallback(
    async (user: User) => {
      const role = await fetchUserRoleById(supabase, user.id)
      router.refresh()
      router.push(getDashboardPathForRole(role))
    },
    [router, supabase]
  )

  useEffect(() => {
    let active = true

    const resolveInitialSession = async () => {
      const { data } = await supabase.auth.getUser()
      if (!active) return
      if (data.user) {
        await redirectByRole(data.user)
      }
      if (active) {
        setResolvingSession(false)
      }
    }

    void resolveInitialSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void redirectByRole(session.user)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [redirectByRole, supabase])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const normalizedEmail = email.trim().toLowerCase()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (signInError) {
      setError('Giriş başarısız. E-posta veya şifreyi kontrol edin.')
      setLoading(false)
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    if (userData.user) {
      await redirectByRole(userData.user)
      return
    }

    setError('Oturum doğrulanamadı. Lütfen tekrar deneyin.')
    setLoading(false)
  }

  const handleAppleLogin = async () => {
    setError(null)
    setOauthLoading('apple')
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo,
        queryParams: {
          scope: 'name email',
        },
      },
    })

    if (oauthError) {
      setError(`Apple girişi başlatılamadı: ${oauthError.message}`)
      setOauthLoading(null)
      return
    }

    if (data?.url && typeof window !== 'undefined') {
      window.location.assign(data.url)
      return
    }

    setOauthLoading(null)
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setOauthLoading('google')
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })

    if (oauthError) {
      setError(`Google girişi başlatılamadı: ${oauthError.message}`)
      setOauthLoading(null)
      return
    }

    if (data?.url && typeof window !== 'undefined') {
      window.location.assign(data.url)
      return
    }

    setOauthLoading(null)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06080b] px-4 py-8 flex items-center justify-center font-sans selection:bg-[#38bdf8]/30">
      
      {/* Background Tech Grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Main Hardware Container */}
      <section className="relative z-10 w-full max-w-5xl rounded-xl border border-[#23272f] bg-[#0c0e12] shadow-2xl overflow-hidden">
        
        {/* TELEMETRY HEADER BAR */}
        <header className="flex flex-col items-start justify-between gap-4 border-b border-[#23272f] bg-[#0f1115] px-6 py-4 md:flex-row md:items-center md:gap-0">
          <div className="flex items-center gap-4">
            <div className="h-2.5 w-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_4px_rgba(56,189,248,0.45)]" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#64748b]">SISTEM</span>
              <span className="text-xs font-mono tracking-widest text-[#e2e8f0]">MOLAYERI.APP</span>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center gap-1.5">
             <div className="flex gap-1.5">
                <div className="w-1.5 h-3.5 bg-[#38bdf8]/70" />
                <div className="w-1.5 h-3.5 bg-[#38bdf8]/50" />
                <div className="w-1.5 h-3.5 bg-[#38bdf8]/30" />
                <div className="w-1.5 h-3.5 bg-[#38bdf8]/15" />
             </div>
             <span className="text-[9px] font-mono tracking-[0.3em] text-[#38bdf8]/50">GUVENLI HAT AKTIF</span>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748b]">
            <Activity strokeWidth={1.5} className="w-3.5 h-3.5" /> ROL GECIDI: AKTIF
          </div>
        </header>

        {/* Content Layout */}
        <div className="grid gap-0 md:grid-cols-[1.1fr_1fr] divide-y md:divide-y-0 md:divide-x divide-[#23272f]">
          
          {/* ASIDE PANEL (System Specs Readout) */}
          <aside className="bg-[#0c0e12] p-8 md:p-12 relative overflow-hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {/* Corner Decorative Elements */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-[#2d313a]" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-[#2d313a]" />
            
            <div className="mb-8 flex items-center gap-3 border-b border-[#23272f] pb-4">
               <div className="flex items-center justify-center w-10 h-10 rounded-md bg-[#1d2128] border border-[#333842]">
                 <ShieldCheck strokeWidth={1.5} className="h-5 w-5 text-[#38bdf8]" />
               </div>
               <div>
                  <div className="text-[10px] text-[#64748b] uppercase tracking-[0.14em] leading-none mb-1.5 font-medium">ANA MODUL</div>
                  <h2 className="text-xl font-medium text-[#e2e8f0] tracking-wide leading-none">Kontrol Merkezi</h2>
               </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#94a3b8] mb-10 font-normal">
              Admin ve işletmeci için tahsis edilmiş ana kontrol noktası. Operasyon, içerik ve iletişim akışlarını tek bir terminal üzerinden güvenle yönetin.
            </p>

            {/* Hardware-styled List */}
            <div className="space-y-4">
              <div className="relative p-4 rounded-md bg-[#0a0c10] border border-[#1e232b]">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#38bdf8]/20" />
                <div className="flex items-center gap-3 mb-1">
                  <Server strokeWidth={1.5} className="w-4 h-4 text-[#64748b]" />
                  <strong className="text-[11px] uppercase tracking-[0.08em] text-[#e2e8f0] font-semibold">Tek Kokpit Mimarisi</strong>
                </div>
                <span className="block text-[11px] text-[#64748b] pl-7 font-normal">İşletmeci ve admin için ortak giriş altyapısı ve veri tüneli.</span>
              </div>
              
              <div className="relative p-4 rounded-md bg-[#0a0c10] border border-[#1e232b]">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#38bdf8]/20" />
                <div className="flex items-center gap-3 mb-1">
                  <Database strokeWidth={1.5} className="w-4 h-4 text-[#64748b]" />
                  <strong className="text-[11px] uppercase tracking-[0.08em] text-[#e2e8f0] font-semibold">Yüksek Güvenlik Modülü</strong>
                </div>
                <span className="block text-[11px] text-[#64748b] pl-7 font-normal">Rol tabanlı yönlendirme ve kriptografik oturum kontrolü.</span>
              </div>

              <div className="relative p-4 rounded-md bg-[#0a0c10] border border-[#1e232b]">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#38bdf8]/20" />
                <div className="flex items-center gap-3 mb-1">
                  <Activity strokeWidth={1.5} className="w-4 h-4 text-[#64748b]" />
                  <strong className="text-[11px] uppercase tracking-[0.08em] text-[#e2e8f0] font-semibold">Canlı Operasyon Ağı</strong>
                </div>
                <span className="block text-[11px] text-[#64748b] pl-7 font-normal">Kampanya, konvoy ve mesaj akışını aynı merkezden konfigüre et.</span>
              </div>
            </div>
          </aside>

          {/* FORM SECTION (Auth Gate Panel) */}
          <div className="p-8 md:p-12 relative bg-[#12141a]">
            {/* Inner Card representing a distinct physical panel */}
            <form
              className="relative rounded-xl border border-[#2d313a] bg-[#16181d] shadow-2xl p-6 md:p-8"
              onSubmit={handleLogin}
            >
              {/* Physical Screws / Corner Dots */}
              <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
              <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
              <div className="absolute bottom-3 left-3 w-1.5 h-1.5 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
              <div className="absolute bottom-3 right-3 w-1.5 h-1.5 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />

              {/* Top Indication Line */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-[2px] bg-[#38bdf8]/75" />

              <div className="mb-6 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748b] border-b border-[#2d313a] pb-4">
                <div className="flex items-center gap-2">
                  <Terminal strokeWidth={1.5} className="w-3.5 h-3.5" />
                  <span>GIRIS DOGRULAMA</span>
                </div>
                <span className="text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-0.5 rounded border border-[#38bdf8]/30">KIMLIK BEKLENIYOR</span>
              </div>

              {/* INPUTS */}
              <div className="mb-6 group">
                <div className="flex justify-between items-end mb-2">
                   <label className="text-[10px] font-mono text-[#64748b] uppercase tracking-[0.1em]">E-posta Kimliği</label>
                   <span className="text-[9px] font-mono text-[#38bdf8]/50 hidden group-focus-within:inline-block">YAZILIYOR...</span>
                </div>
                <div className="relative flex items-center">
                  <Mail strokeWidth={1.5} className="absolute left-4 w-4 h-4 text-[#475569] group-focus-within:text-[#38bdf8] transition-colors pointer-events-none" />
                  <input
                    type="email"
                    className="w-full bg-[#0a0c10] pl-12 pr-4 py-3.5 rounded-md text-[#e2e8f0] font-mono text-sm outline-none transition-all border border-[#2d313a] focus:border-[#38bdf8]/60 focus:bg-[#0f1115] placeholder:text-[#475569]"
                    placeholder="mail@molayeri.app"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-8 group">
                <div className="flex justify-between items-end mb-2">
                   <label className="text-[10px] font-mono text-[#64748b] uppercase tracking-[0.1em]">Güvenlik Anahtarı (Şifre)</label>
                   <span className="text-[9px] font-mono text-amber-500/50 hidden group-focus-within:inline-block">GIZLI</span>
                </div>
                <div className="relative flex items-center">
                  <Lock strokeWidth={1.5} className="absolute left-4 w-4 h-4 text-[#475569] group-focus-within:text-amber-500 transition-colors pointer-events-none" />
                  <input
                    type="password"
                    className="w-full bg-[#0a0c10] pl-12 pr-4 py-3.5 rounded-md text-[#e2e8f0] font-mono text-sm outline-none transition-all border border-[#2d313a] focus:border-amber-500/60 focus:bg-[#0f1115] placeholder:text-[#475569]"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="mb-6 rounded-md px-4 py-3 text-[11px] font-mono text-rose-400 bg-rose-950/20 border border-rose-900/50 flex gap-2 items-center">
                  <span className="text-rose-500">[ERR]</span> {error}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || !!oauthLoading || resolvingSession}
                  className="w-full relative overflow-hidden transition-all duration-150 rounded-md flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase text-[12px] font-medium tracking-widest select-none py-4 bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110"
                >
                  {loading || resolvingSession ? (
                    <><Loader2 size={16} className="animate-spin text-[#38bdf8]" /> [OTURUM DOGRULANIYOR...]</>
                  ) : (
                    'PANELE GIR'
                  )}
                </button>

                <div className="flex items-center gap-4 my-6">
                  <div className="h-px bg-[#2d313a] flex-1" />
                  <span className="text-[9px] font-mono text-[#475569] uppercase tracking-widest">VEYA</span>
                  <div className="h-px bg-[#2d313a] flex-1" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={loading || !!oauthLoading || resolvingSession}
                    className="w-full relative transition-all duration-150 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase text-[11px] tracking-wider select-none py-3.5 bg-transparent text-[#94a3b8] border border-[#2d313a] hover:text-[#e2e8f0] hover:border-[#475569] hover:bg-[#1a1d24]"
                    onClick={handleAppleLogin}
                  >
                    {oauthLoading === 'apple' ? (
                      <Loader2 size={14} className="animate-spin text-[#38bdf8]" />
                    ) : (
                      <img
                        src="/icons/apple-logo.svg"
                        alt="Apple"
                        className="h-3.5 w-auto object-contain opacity-80"
                        draggable={false}
                      />
                    )}
                    APPLE
                  </button>

                  <button
                    type="button"
                    disabled={loading || !!oauthLoading || resolvingSession}
                    className="w-full relative transition-all duration-150 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase text-[11px] tracking-wider select-none py-3.5 bg-transparent text-[#94a3b8] border border-[#2d313a] hover:text-[#e2e8f0] hover:border-[#475569] hover:bg-[#1a1d24]"
                    onClick={handleGoogleLogin}
                  >
                    {oauthLoading === 'google' ? (
                      <Loader2 size={14} className="animate-spin text-[#38bdf8]" />
                    ) : (
                      <img
                        src="https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/google.png"
                        alt="Google"
                        className="h-3.5 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                        draggable={false}
                      />
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
