'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { fetchUserRoleById, getDashboardPathForRole } from '@/lib/auth-role'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError('Giriş başarısız. E-posta veya şifreyi kontrol edin.')
      setLoading(false)
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    const role = user
      ? await fetchUserRoleById(
          supabase,
          user.id,
          (user.user_metadata as Record<string, unknown> | undefined)?.role as string | undefined
        )
      : 'user'

    router.refresh()
    router.push(getDashboardPathForRole(role))
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

          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Giriş yapılıyor
              </>
            ) : (
              'Panel’e Giriş Yap'
            )}
          </button>
        </form>
      </section>
    </div>
  )
}
