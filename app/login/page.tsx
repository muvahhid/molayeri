'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Apple, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { fetchUserRoleById, getDashboardPathForRole } from '@/lib/auth-role'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
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
      const role = await fetchUserRoleById(
        supabase,
        user.id,
        (user.user_metadata as Record<string, unknown> | undefined)?.role as string | undefined
      )
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
    }
  }

  const handleAppleLogin = async () => {
    setError(null)
    setOauthLoading(true)
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/login`
      : undefined

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
      setOauthLoading(false)
      return
    }

    if (data?.url && typeof window !== 'undefined') {
      window.location.assign(data.url)
      return
    }

    setOauthLoading(false)
  }

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-hero">
          <span className="auth-hero-badge">
            <ShieldCheck size={26} />
          </span>
          <h1>Kontrol Sende</h1>
          <p>
            Admin ve işletmeci için tek giriş. Operasyon, içerik ve iletişim akışlarını tek panelden yönet.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <label className="auth-label">E-posta</label>
          <div className="auth-field-wrap">
            <Mail size={16} className="auth-field-icon" />
            <input
              type="email"
              className="auth-field"
              placeholder="mail@molayeri.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <label className="auth-label mt-4">Şifre</label>
          <div className="auth-field-wrap">
            <Lock size={16} className="auth-field-icon" />
            <input
              type="password"
              className="auth-field"
              placeholder="Şifreniz"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error ? <div className="auth-error">{error}</div> : null}

          <button type="submit" disabled={loading || oauthLoading || resolvingSession} className="auth-submit">
            {loading || resolvingSession ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Giriş yapılıyor
              </>
            ) : (
              'Panel’e Giriş Yap'
            )}
          </button>

          <button
            type="button"
            disabled={loading || oauthLoading || resolvingSession}
            className="auth-submit auth-submit-apple"
            onClick={handleAppleLogin}
          >
            {oauthLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Apple yönlendiriliyor
              </>
            ) : (
              <>
                <Apple size={16} />
                Apple ile Giriş Yap
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  )
}
