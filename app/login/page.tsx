'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Supabase İstemcisi (Tarayıcı Tarafı)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Giriş başarısız. Bilgilerinizi kontrol edin.')
      setLoading(false)
    } else {
      // Başarılı ise Admin Paneline yönlendir
      // Router refresh gerekiyor ki Middleware çerezi algılasın
      router.refresh()
      router.push('/admin/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-[#E0E5EC] flex items-center justify-center p-4 font-sans text-slate-600">
      
      {/* Neumorphic Kart */}
      <div className="w-full max-w-md bg-[#E0E5EC] p-10 rounded-[40px] shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff]">
        
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto bg-[#E0E5EC] rounded-full shadow-[10px_10px_20px_#bebebe,-10px_-10px_20px_#ffffff] flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-700 tracking-tight">Yönetici Girişi</h1>
          <p className="text-sm text-slate-400 mt-2 font-medium">MolaYeri Admin Paneli</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          
          {/* Email Input (Inner Shadow - İçe Göçük) */}
          <div className="group">
            <div className="relative flex items-center">
              <Mail className="absolute left-4 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="E-posta Adresi"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#E0E5EC] text-slate-700 pl-12 pr-4 py-4 rounded-xl outline-none transition-all
                           shadow-[inset_6px_6px_12px_#b8b9be,inset_-6px_-6px_12px_#ffffff]
                           focus:shadow-[inset_8px_8px_16px_#b8b9be,inset_-8px_-8px_16px_#ffffff]
                           placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          {/* Password Input (Inner Shadow) */}
          <div className="group">
            <div className="relative flex items-center">
              <Lock className="absolute left-4 w-5 h-5 text-slate-400" />
              <input
                type="password"
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#E0E5EC] text-slate-700 pl-12 pr-4 py-4 rounded-xl outline-none transition-all
                           shadow-[inset_6px_6px_12px_#b8b9be,inset_-6px_-6px_12px_#ffffff]
                           focus:shadow-[inset_8px_8px_16px_#b8b9be,inset_-8px_-8px_16px_#ffffff]
                           placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-100/50 border border-red-200 text-red-600 text-sm font-bold text-center">
              {error}
            </div>
          )}

          {/* Login Button (Outer Shadow - Dışa Çıkık) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-[#E0E5EC] text-blue-600 font-black text-lg tracking-wide transition-all
                       shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]
                       hover:shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff]
                       hover:text-blue-500
                       active:shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff]
                       active:scale-[0.98]
                       flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                GİRİŞ YAP <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
