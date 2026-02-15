'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  Check,
  Clock3,
  EyeOff,
  Gauge,
  Globe2,
  Loader2,
  LockKeyhole,
  MapPin,
  Save,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { ModuleTitle } from '../_components/module-title'

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

type BusinessOption = {
  id: string
  name: string
  type: string | null
  is_open: boolean | null
}

type MerchantSettingsPayload = {
  notifications: {
    messages: boolean
    reviews: boolean
    campaigns: boolean
    convoys: boolean
    systemAlerts: boolean
  }
  radar: {
    defaultRangeKm: number
    defaultMessage: string
    smartAudience: boolean
  }
  operations: {
    defaultBusinessId: string | null
    autoRefreshSeconds: number
    archiveAfterDays: number
    compactLists: boolean
  }
  security: {
    requireCriticalActionConfirm: boolean
    maskCustomerIdentity: boolean
    hideCouponValuesOnList: boolean
  }
  display: {
    showInlineTips: boolean
    reducedMotion: boolean
    language: 'tr' | 'en'
    timezone: string
  }
}

type NoticeTone = 'success' | 'error' | 'info'

const SETTINGS_STORAGE_KEY = 'merchant_settings_v1'
const RADAR_MESSAGE_LIMIT = 120

const DEFAULT_SETTINGS: MerchantSettingsPayload = {
  notifications: {
    messages: true,
    reviews: true,
    campaigns: true,
    convoys: true,
    systemAlerts: true,
  },
  radar: {
    defaultRangeKm: 10,
    defaultMessage: "MolaYeri'nde avantajlı kampanyamız var, sizi bekliyoruz.",
    smartAudience: true,
  },
  operations: {
    defaultBusinessId: null,
    autoRefreshSeconds: 30,
    archiveAfterDays: 5,
    compactLists: false,
  },
  security: {
    requireCriticalActionConfirm: true,
    maskCustomerIdentity: false,
    hideCouponValuesOnList: false,
  },
  display: {
    showInlineTips: true,
    reducedMotion: false,
    language: 'tr',
    timezone: 'Europe/Istanbul',
  },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function sanitizeSettings(input: unknown, fallbackBusinessId: string | null): MerchantSettingsPayload {
  const root = asObject(input)
  const notifications = asObject(root.notifications)
  const radar = asObject(root.radar)
  const operations = asObject(root.operations)
  const security = asObject(root.security)
  const display = asObject(root.display)

  const languageRaw = asString(display.language, DEFAULT_SETTINGS.display.language)
  const language = languageRaw === 'en' ? 'en' : 'tr'
  const timezone = asString(display.timezone, DEFAULT_SETTINGS.display.timezone).trim() || 'Europe/Istanbul'

  const defaultBusinessRaw = asString(operations.defaultBusinessId, '').trim()
  const resolvedDefaultBusiness = defaultBusinessRaw || fallbackBusinessId || null

  return {
    notifications: {
      messages: asBoolean(notifications.messages, DEFAULT_SETTINGS.notifications.messages),
      reviews: asBoolean(notifications.reviews, DEFAULT_SETTINGS.notifications.reviews),
      campaigns: asBoolean(notifications.campaigns, DEFAULT_SETTINGS.notifications.campaigns),
      convoys: asBoolean(notifications.convoys, DEFAULT_SETTINGS.notifications.convoys),
      systemAlerts: asBoolean(notifications.systemAlerts, DEFAULT_SETTINGS.notifications.systemAlerts),
    },
    radar: {
      defaultRangeKm: clamp(asNumber(radar.defaultRangeKm, DEFAULT_SETTINGS.radar.defaultRangeKm), 1, 50),
      defaultMessage: asString(radar.defaultMessage, DEFAULT_SETTINGS.radar.defaultMessage).slice(0, RADAR_MESSAGE_LIMIT),
      smartAudience: asBoolean(radar.smartAudience, DEFAULT_SETTINGS.radar.smartAudience),
    },
    operations: {
      defaultBusinessId: resolvedDefaultBusiness,
      autoRefreshSeconds: clamp(asNumber(operations.autoRefreshSeconds, DEFAULT_SETTINGS.operations.autoRefreshSeconds), 15, 300),
      archiveAfterDays: clamp(asNumber(operations.archiveAfterDays, DEFAULT_SETTINGS.operations.archiveAfterDays), 3, 30),
      compactLists: asBoolean(operations.compactLists, DEFAULT_SETTINGS.operations.compactLists),
    },
    security: {
      requireCriticalActionConfirm: asBoolean(
        security.requireCriticalActionConfirm,
        DEFAULT_SETTINGS.security.requireCriticalActionConfirm
      ),
      maskCustomerIdentity: asBoolean(security.maskCustomerIdentity, DEFAULT_SETTINGS.security.maskCustomerIdentity),
      hideCouponValuesOnList: asBoolean(security.hideCouponValuesOnList, DEFAULT_SETTINGS.security.hideCouponValuesOnList),
    },
    display: {
      showInlineTips: asBoolean(display.showInlineTips, DEFAULT_SETTINGS.display.showInlineTips),
      reducedMotion: asBoolean(display.reducedMotion, DEFAULT_SETTINGS.display.reducedMotion),
      language,
      timezone,
    },
  }
}

function SectionCard({
  icon,
  title,
  caption,
  children,
}: {
  icon: React.ReactNode
  title: string
  caption: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[26px] border border-white/70 bg-[linear-gradient(145deg,#ffffff_0%,#f2f7ff_100%)] p-4 md:p-5 shadow-[0_20px_26px_-24px_rgba(15,23,42,0.7)]">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-[#eef4ff] border border-white shadow-[inset_4px_4px_10px_rgba(148,163,184,0.16),inset_-4px_-4px_12px_rgba(255,255,255,0.95)] flex items-center justify-center text-blue-600">
          {icon}
        </div>
        <div>
          <p className="text-[13px] font-extrabold text-slate-800">{title}</p>
          <p className="text-[11px] text-slate-500">{caption}</p>
        </div>
      </div>
      <div className="mt-3.5 space-y-2.5">{children}</div>
    </section>
  )
}

function FieldStatusBadge({ live }: { live: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] ${
        live ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      {live ? 'Canlı' : 'Yakında'}
    </span>
  )
}

function ToggleRow({
  title,
  hint,
  checked,
  onChange,
  live = true,
  disabled = false,
}: {
  title: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
  live?: boolean
  disabled?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white px-3.5 py-3 flex items-center justify-between gap-3 shadow-[0_12px_16px_-16px_rgba(15,23,42,0.55)] ${
        disabled ? 'opacity-65' : ''
      }`}
    >
      <div>
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-bold text-slate-800">{title}</p>
          <FieldStatusBadge live={live} />
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex min-w-[54px] justify-center rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wide ${
            checked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {checked ? 'AÇIK' : 'KAPALI'}
        </span>
        <button
          type="button"
          onClick={() => {
            if (disabled) return
            onChange(!checked)
          }}
          disabled={disabled}
          className={`relative inline-flex h-8 w-[58px] shrink-0 items-center rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            checked
              ? 'border-emerald-400 bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] shadow-[0_12px_18px_-12px_rgba(5,150,105,0.85)] focus-visible:ring-emerald-400'
              : 'border-slate-300 bg-[linear-gradient(135deg,#e5e7eb_0%,#cbd5e1_100%)] shadow-[inset_2px_2px_6px_rgba(148,163,184,0.5)] focus-visible:ring-slate-400'
          } ${disabled ? 'cursor-not-allowed' : ''}`}
          aria-pressed={checked}
        >
          <span
            className={`pointer-events-none absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-200 ${
              checked
                ? 'translate-x-[28px] bg-white text-emerald-600 shadow-[0_8px_12px_-8px_rgba(5,150,105,0.9)]'
                : 'translate-x-0 bg-white text-slate-500 shadow-[0_8px_12px_-8px_rgba(15,23,42,0.55)]'
            }`}
          >
            {checked ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          </span>
        </button>
      </div>
    </div>
  )
}

export default function MerchantSettingsPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [userId, setUserId] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [businesses, setBusinesses] = useState<BusinessOption[]>([])
  const [settings, setSettings] = useState<MerchantSettingsPayload>(DEFAULT_SETTINGS)

  const [savedSignature, setSavedSignature] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(null)

  const composedSignature = useMemo(
    () =>
      JSON.stringify({
        fullName,
        email,
        avatarUrl,
        settings,
      }),
    [fullName, email, avatarUrl, settings]
  )

  const isDirty = composedSignature !== savedSignature
  const radarRemainingChars = RADAR_MESSAGE_LIMIT - settings.radar.defaultMessage.length

  const showNotice = (tone: NoticeTone, text: string) => {
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current)
    }
    setNotice({ tone, text })
    noticeTimeoutRef.current = setTimeout(() => setNotice(null), 2800)
  }

  const initializePage = async () => {
    setLoading(true)

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) {
      setLoading(false)
      return
    }

    setUserId(user.id)

    const [profileRes, businessesRes] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,avatar_url').eq('id', user.id).maybeSingle(),
      supabase
        .from('businesses')
        .select('id,name,type,is_open')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true }),
    ])

    const businessRows = ((businessesRes.data || []) as BusinessOption[]).map((row) => ({
      id: row.id,
      name: row.name || 'İşletme',
      type: row.type || null,
      is_open: row.is_open ?? null,
    }))

    const fallbackBusinessId = businessRows[0]?.id || null
    const profile = (profileRes.data ?? null) as ProfileRow | null

    const normalizedProfileName = (profile?.full_name || '').trim()
    const normalizedEmail = (profile?.email || user.email || '').trim()
    const normalizedAvatar = (profile?.avatar_url || '').trim() || null

    if (!profile) {
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email || '',
        full_name: '',
        updated_at: new Date().toISOString(),
      })
    }

    let rawSettings: unknown = asObject(user.user_metadata).merchant_settings
    if (!rawSettings && typeof window !== 'undefined') {
      try {
        const localRaw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
        rawSettings = localRaw ? JSON.parse(localRaw) : null
      } catch {
        rawSettings = null
      }
    }

    const normalizedSettings = sanitizeSettings(rawSettings, fallbackBusinessId)
    if (
      normalizedSettings.operations.defaultBusinessId &&
      !businessRows.some((biz) => biz.id === normalizedSettings.operations.defaultBusinessId)
    ) {
      normalizedSettings.operations.defaultBusinessId = fallbackBusinessId
    }

    setBusinesses(businessRows)
    setFullName(normalizedProfileName)
    setEmail(normalizedEmail)
    setAvatarUrl(normalizedAvatar)
    setSettings(normalizedSettings)

    const signature = JSON.stringify({
      fullName: normalizedProfileName,
      email: normalizedEmail,
      avatarUrl: normalizedAvatar,
      settings: normalizedSettings,
    })
    setSavedSignature(signature)
    setLastSavedAt(new Date().toISOString())
    setLoading(false)
  }

  const saveAll = async () => {
    if (!userId) return
    setSaving(true)

    const safeSettings = sanitizeSettings(settings, businesses[0]?.id || null)
    try {
      const [profileWrite, authWrite] = await Promise.all([
        supabase.from('profiles').upsert({
          id: userId,
          full_name: fullName.trim(),
          email: email.trim(),
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        }),
        supabase.auth.updateUser({
          data: {
            merchant_settings: safeSettings,
          },
        }),
      ])

      if (profileWrite.error || authWrite.error) {
        throw profileWrite.error || authWrite.error
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(safeSettings))
      }

      setSettings(safeSettings)
      setSavedSignature(
        JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          avatarUrl,
          settings: safeSettings,
        })
      )
      setLastSavedAt(new Date().toISOString())
      showNotice('success', 'Ayarlar kaydedildi.')
    } catch (error) {
      console.error('Ayarlar kaydedilemedi', error)
      showNotice('error', 'Kaydetme sırasında hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  const uploadAvatar = async (file: File) => {
    if (!userId) return
    setUploading(true)

    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `avatars/${userId}_${Date.now()}.${ext}`

      const { error } = await supabase.storage.from('business_logos').upload(path, file)
      if (error) throw error

      const { data } = supabase.storage.from('business_logos').getPublicUrl(path)
      const publicUrl = data.publicUrl

      const write = await supabase.from('profiles').upsert({
        id: userId,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      if (write.error) throw write.error

      setAvatarUrl(publicUrl)
      showNotice('success', 'Profil görseli güncellendi.')
    } catch (error) {
      console.error('Avatar yüklenemedi', error)
      showNotice('error', 'Profil görseli yüklenemedi.')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    void initializePage()
    return () => {
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-white/70 bg-[linear-gradient(145deg,#ffffff_0%,#f2f7ff_100%)] p-4 md:p-5 shadow-[0_22px_30px_-26px_rgba(15,23,42,0.72)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <ModuleTitle title="Ayarlar" />
            <p className="mt-1 text-xs text-slate-500">Profil, operasyon ve güvenlik tercihlerini tek merkezden yönet.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-white/70 bg-white px-3 py-2 shadow-[0_10px_16px_-16px_rgba(15,23,42,0.72)]">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Durum</p>
              <p className="text-xs font-bold text-slate-800">{isDirty ? 'Kaydedilmemiş değişiklik var' : 'Senkron'}</p>
            </div>

            <button
              type="button"
              onClick={saveAll}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_14px_24px_-16px_rgba(5,150,105,0.8)] transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Tüm Ayarları Kaydet
            </button>
          </div>
        </div>

        {notice ? (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${
              notice.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : notice.tone === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}
          >
            {notice.text}
          </div>
        ) : null}

        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] text-slate-600 flex flex-wrap items-center gap-2">
          <FieldStatusBadge live />
          <span>Hemen çalışan ayar</span>
          <FieldStatusBadge live={false} />
          <span>Arayüzde hazır, davranış bağlantısı sonraki adımda</span>
        </div>
      </section>

      {loading ? (
        <div className="h-56 flex items-center justify-center rounded-[26px] border border-white/70 bg-[linear-gradient(145deg,#ffffff_0%,#f2f7ff_100%)] shadow-[0_20px_26px_-24px_rgba(15,23,42,0.7)]">
          <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.22fr)_minmax(360px,0.78fr)] gap-4">
          <div className="space-y-4">
            <SectionCard icon={<UserRound className="w-4 h-4" />} title="Profil ve Hesap" caption="Temel kimlik ve iletişim bilgileri">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[0_10px_14px_-14px_rgba(15,23,42,0.35)]">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    ) : avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="Profil" className="w-full h-full object-cover" />
                    ) : (
                      <UserRound className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Profil Görseli Yükle
                    </button>
                    <p className="text-[11px] text-slate-500">Kare görsel önerilir.</p>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      void uploadAvatar(file)
                      event.target.value = ''
                    }}
                  />
                </div>
              </div>

              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Ad Soyad
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Ad ve soyad"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800"
                />
              </label>

              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                İletişim E-postası
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="iletisim@isletme.com"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800"
                />
              </label>
            </SectionCard>

            <SectionCard icon={<Bell className="w-4 h-4" />} title="Bildirim Merkezi" caption="Hangi olaylarda bildirim alacağını belirle">
              <ToggleRow
                title="Mesaj Bildirimleri"
                hint="Yeni müşteri mesajı ve sohbet güncellemeleri"
                checked={settings.notifications.messages}
                live={false}
                disabled
                onChange={(value) =>
                  setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, messages: value } }))
                }
              />
              <ToggleRow
                title="Yorum Bildirimleri"
                hint="Yeni yorum ve yanıt gerektiren geri bildirimler"
                checked={settings.notifications.reviews}
                live={false}
                disabled
                onChange={(value) =>
                  setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, reviews: value } }))
                }
              />
              <ToggleRow
                title="Kampanya Sonuçları"
                hint="Gönderim performansı ve yayın dönüşleri"
                checked={settings.notifications.campaigns}
                live={false}
                disabled
                onChange={(value) =>
                  setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, campaigns: value } }))
                }
              />
              <ToggleRow
                title="Konvoy Teklifleri"
                hint="Yeni teklif, görüşme ve durum değişimleri"
                checked={settings.notifications.convoys}
                live={false}
                disabled
                onChange={(value) =>
                  setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, convoys: value } }))
                }
              />
              <ToggleRow
                title="Sistem Uyarıları"
                hint="Kritik hata, bağlantı ve güncelleme duyuruları"
                checked={settings.notifications.systemAlerts}
                live={false}
                disabled
                onChange={(value) =>
                  setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, systemAlerts: value } }))
                }
              />
            </SectionCard>

            <SectionCard icon={<Gauge className="w-4 h-4" />} title="Operasyon Akışı" caption="Panelin çalışma davranışını özelleştir">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                <span className="flex items-center gap-2">
                  Varsayılan İşletme
                  <FieldStatusBadge live />
                </span>
                <select
                  value={settings.operations.defaultBusinessId || ''}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      operations: {
                        ...prev.operations,
                        defaultBusinessId: event.target.value || null,
                      },
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800"
                >
                  {businesses.length === 0 ? <option value="">İşletme bulunamadı</option> : null}
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    Otomatik Yenileme
                    <FieldStatusBadge live={false} />
                  </span>
                  <select
                    value={settings.operations.autoRefreshSeconds}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        operations: {
                          ...prev.operations,
                          autoRefreshSeconds: clamp(Number(event.target.value) || 30, 15, 300),
                        },
                      }))
                    }
                    disabled
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-500 cursor-not-allowed"
                  >
                    <option value={15}>15 saniye</option>
                    <option value={30}>30 saniye</option>
                    <option value={45}>45 saniye</option>
                    <option value={60}>60 saniye</option>
                    <option value={120}>120 saniye</option>
                  </select>
                </label>

                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    Otomatik Arşiv
                    <FieldStatusBadge live={false} />
                  </span>
                  <select
                    value={settings.operations.archiveAfterDays}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        operations: {
                          ...prev.operations,
                          archiveAfterDays: clamp(Number(event.target.value) || 5, 3, 30),
                        },
                      }))
                    }
                    disabled
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-500 cursor-not-allowed"
                  >
                    <option value={3}>3 gün</option>
                    <option value={5}>5 gün</option>
                    <option value={7}>7 gün</option>
                    <option value={10}>10 gün</option>
                    <option value={15}>15 gün</option>
                  </select>
                </label>
              </div>

              <ToggleRow
                title="Kompakt Liste Modu"
                hint="Mesaj, konvoy ve işletme listelerini daha sık göster"
                checked={settings.operations.compactLists}
                live={false}
                disabled
                onChange={(value) =>
                  setSettings((prev) => ({ ...prev, operations: { ...prev.operations, compactLists: value } }))
                }
              />
            </SectionCard>
          </div>

          <div className="space-y-4">
            <SectionCard icon={<MapPin className="w-4 h-4" />} title="Radar Varsayılanları" caption="Kampanya gönderiminde başlangıç değerleri">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                <span className="flex items-center gap-2">
                  Varsayılan Mesafe: {settings.radar.defaultRangeKm} km
                  <FieldStatusBadge live />
                </span>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={settings.radar.defaultRangeKm}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      radar: {
                        ...prev.radar,
                        defaultRangeKm: clamp(Number(event.target.value) || 10, 1, 50),
                      },
                    }))
                  }
                  className="mt-2 w-full"
                />
              </label>

              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                <span className="flex items-center gap-2">
                  Varsayılan Radar Mesajı
                  <FieldStatusBadge live />
                </span>
                <textarea
                  value={settings.radar.defaultMessage}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      radar: {
                        ...prev.radar,
                        defaultMessage: event.target.value.slice(0, RADAR_MESSAGE_LIMIT),
                      },
                    }))
                  }
                  className="mt-1.5 w-full min-h-[96px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800"
                  placeholder="Örn: Konvoy üyelerine özel avantajlarımız aktif."
                />
                <div className="mt-1 text-[11px] text-slate-500">{radarRemainingChars} karakter kaldı</div>
              </label>

              <ToggleRow
                title="Akıllı Hedef Kitle"
                hint="Kategori + izin + aktiflik kontrolünü varsayılan açık tut"
                checked={settings.radar.smartAudience}
                live={false}
                disabled
                onChange={(value) => setSettings((prev) => ({ ...prev, radar: { ...prev.radar, smartAudience: value } }))}
              />
            </SectionCard>

            <SectionCard icon={<ShieldCheck className="w-4 h-4" />} title="Güvenlik ve Gizlilik" caption="Kritik işlemler ve veri görünürlüğü">
              <ToggleRow
                title="Kritik İşlemlerde Ek Onay"
                hint="Silme, iptal ve yüksek etkili işlemlerde ikinci onay"
                checked={settings.security.requireCriticalActionConfirm}
                live={false}
                disabled
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    security: { ...prev.security, requireCriticalActionConfirm: value },
                  }))
                }
              />
              <ToggleRow
                title="Müşteri Kimliğini Maskele"
                hint="Listelerde ad/telefon bilgisini kısmi göster"
                checked={settings.security.maskCustomerIdentity}
                live={false}
                disabled
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    security: { ...prev.security, maskCustomerIdentity: value },
                  }))
                }
              />
              <ToggleRow
                title="Kupon Tutarlarını Gizle"
                hint="Liste ekranlarında kupon parasal değerini sakla"
                checked={settings.security.hideCouponValuesOnList}
                live={false}
                disabled
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    security: { ...prev.security, hideCouponValuesOnList: value },
                  }))
                }
              />
            </SectionCard>

            <SectionCard icon={<Sparkles className="w-4 h-4" />} title="Arayüz Tercihleri" caption="Panel deneyimini kişiselleştir">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    Dil
                    <FieldStatusBadge live={false} />
                  </span>
                  <select
                    value={settings.display.language}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        display: { ...prev.display, language: event.target.value === 'en' ? 'en' : 'tr' },
                      }))
                    }
                    disabled
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-500 cursor-not-allowed"
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">English</option>
                  </select>
                </label>

                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    Saat Dilimi
                    <FieldStatusBadge live={false} />
                  </span>
                  <select
                    value={settings.display.timezone}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        display: { ...prev.display, timezone: event.target.value || 'Europe/Istanbul' },
                      }))
                    }
                    disabled
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-500 cursor-not-allowed"
                  >
                    <option value="Europe/Istanbul">Europe/Istanbul</option>
                    <option value="UTC">UTC</option>
                    <option value="Europe/Berlin">Europe/Berlin</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </label>
              </div>

              <ToggleRow
                title="İpucu Metinlerini Göster"
                hint="Modüllerde açıklama ve rehber metinleri açık tut"
                checked={settings.display.showInlineTips}
                live={false}
                disabled
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    display: { ...prev.display, showInlineTips: value },
                  }))
                }
              />
              <ToggleRow
                title="Hareketleri Azalt"
                hint="Daha sade geçiş animasyonları kullan"
                checked={settings.display.reducedMotion}
                live={false}
                disabled
                onChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    display: { ...prev.display, reducedMotion: value },
                  }))
                }
              />
            </SectionCard>

            <section className="rounded-[26px] border border-white/70 bg-[linear-gradient(145deg,#ffffff_0%,#f2f7ff_100%)] p-4 md:p-5 shadow-[0_20px_26px_-24px_rgba(15,23,42,0.7)]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#fef3f2] border border-white flex items-center justify-center text-rose-600">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[13px] font-extrabold text-slate-800">Bakım Araçları</p>
                  <p className="text-[11px] text-slate-500">Yerel ayar önbelleğini temizle veya varsayılana dön.</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const fallbackBusinessId = businesses[0]?.id || null
                    const reset = sanitizeSettings(DEFAULT_SETTINGS, fallbackBusinessId)
                    setSettings(reset)
                    showNotice('info', 'Ayarlar varsayılan değerlere getirildi. Kaydetmeyi unutma.')
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700"
                >
                  <LockKeyhole className="w-3.5 h-3.5" />
                  Varsayılanı Yükle
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.localStorage.removeItem(SETTINGS_STORAGE_KEY)
                    }
                    showNotice('info', 'Yerel ayar önbelleği temizlendi.')
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700"
                >
                  <Clock3 className="w-3.5 h-3.5" />
                  Yerel Önbelleği Temizle
                </button>
              </div>

              {lastSavedAt ? (
                <p className="mt-2.5 text-[11px] text-slate-500">
                  Son kayıt: {new Date(lastSavedAt).toLocaleString('tr-TR')}
                </p>
              ) : null}

              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-3.5 h-3.5 text-slate-500" />
                  Dil: <span className="font-semibold text-slate-700">{settings.display.language === 'tr' ? 'Türkçe' : 'English'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  Saat dilimi: <span className="font-semibold text-slate-700">{settings.display.timezone}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
