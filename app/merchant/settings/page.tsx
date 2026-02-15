'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Save, Upload } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { ModuleTitle } from '../_components/module-title'

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

export default function MerchantSettingsPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [userId, setUserId] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [notifMessages, setNotifMessages] = useState(true)
  const [notifReviews, setNotifReviews] = useState(false)
  const [notifCampaigns, setNotifCampaigns] = useState(true)
  const [biometricLogin, setBiometricLogin] = useState(false)
  const [defaultRange, setDefaultRange] = useState(10)
  const [defaultMessage, setDefaultMessage] = useState("Mola Yeri'nde %10 indirim sizi bekliyor!")

  const initializeProfile = async () => {
    setLoading(true)
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) {
      setLoading(false)
      return
    }

    setUserId(user.id)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    const profile = profileData as ProfileRow | null

    if (!profile) {
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        full_name: '',
        updated_at: new Date().toISOString(),
      })

      setFullName('')
      setEmail(user.email || '')
      setAvatarUrl(null)
    } else {
      setFullName(profile.full_name || '')
      setEmail(profile.email || user.email || '')
      setAvatarUrl(profile.avatar_url || null)
    }

    setLoading(false)
  }

  const saveProfile = async () => {
    if (!userId) {
      return
    }

    setSaving(true)
    await supabase.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      email,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
  }

  const uploadAvatar = async (file: File) => {
    if (!userId) {
      return
    }

    setUploading(true)

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `avatars/${userId}_${Date.now()}.${ext}`

    const { error } = await supabase.storage.from('business_logos').upload(path, file)

    if (!error) {
      const { data } = supabase.storage.from('business_logos').getPublicUrl(path)
      await supabase.from('profiles').upsert({
        id: userId,
        avatar_url: data.publicUrl,
        updated_at: new Date().toISOString(),
      })
      setAvatarUrl(data.publicUrl)
    }

    setUploading(false)
  }

  useEffect(() => {
    initializeProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <ModuleTitle title="Ayarlar" />
        <p className="text-sm text-slate-500 mt-1">Profil ve işletmeci tercihleri.</p>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-[28px] p-5 md:p-6 bg-[linear-gradient(145deg,#ffffff_0%,#f3f7ff_100%)] shadow-[0_20px_28px_-22px_rgba(15,23,42,0.55)] space-y-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Profil</div>

            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-200 flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-slate-500">Fotoğraf yok</span>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  Fotoğraf Değiştir
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      uploadAvatar(file)
                      event.target.value = ''
                    }
                  }}
                />
              </div>
            </div>

            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Ad Soyad
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl bg-white text-slate-700 font-bold shadow-sm"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
              E-posta
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl bg-white text-slate-700 font-bold shadow-sm"
              />
            </label>

            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Bilgileri Kaydet
            </button>
          </div>

          <div className="rounded-[28px] p-5 md:p-6 bg-[linear-gradient(145deg,#ffffff_0%,#f3f7ff_100%)] shadow-[0_20px_28px_-22px_rgba(15,23,42,0.55)] space-y-5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Radar Otomasyonu</div>

            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Varsayılan Mesaj
              <textarea
                value={defaultMessage}
                onChange={(event) => setDefaultMessage(event.target.value)}
                className="mt-2 w-full min-h-20 px-4 py-3 rounded-xl bg-white text-slate-700 font-bold shadow-sm"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Varsayılan Menzil: {defaultRange} km
              <input
                type="range"
                min={1}
                max={50}
                value={defaultRange}
                onChange={(event) => setDefaultRange(Number(event.target.value))}
                className="mt-2 w-full"
              />
            </label>

            <div className="space-y-2 text-sm font-bold text-slate-600">
              <label className="flex items-center justify-between rounded-xl px-3 py-2 shadow-sm">
                <span>Yeni Mesaj Bildirimleri</span>
                <input type="checkbox" checked={notifMessages} onChange={(event) => setNotifMessages(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded-xl px-3 py-2 shadow-sm">
                <span>Yeni Yorum Bildirimleri</span>
                <input type="checkbox" checked={notifReviews} onChange={(event) => setNotifReviews(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded-xl px-3 py-2 shadow-sm">
                <span>Kampanya Bildirimleri</span>
                <input type="checkbox" checked={notifCampaigns} onChange={(event) => setNotifCampaigns(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded-xl px-3 py-2 shadow-sm">
                <span>Biyometrik Giriş</span>
                <input type="checkbox" checked={biometricLogin} onChange={(event) => setBiometricLogin(event.target.checked)} />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
