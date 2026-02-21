'use client'

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  ImagePlus,
  Loader2,
  Megaphone,
  RefreshCcw,
  Save,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'

type TabKey = 'reklam1' | 'reklam2' | 'reklam3' | 'slot_rules'
type SlotKey = 'uzun_yol_featured' | 'reklam_2' | 'reklam_3'

type FeaturedAd = {
  id: string
  slot_key: SlotKey
  title: string
  subtitle: string | null
  image_url: string
  target_url: string | null
  is_active: boolean
  display_order: number
  starts_at: string | null
  ends_at: string | null
  impressions_count: number
  clicks_count: number
  created_at: string
}

type AdFormState = {
  title: string
  subtitle: string
  image_url: string
  target_url: string
  display_order: string
  starts_at: string
  ends_at: string
  is_active: boolean
}

type SlotRule = {
  slot_key: SlotKey
  slot_label: string
  max_active_ads: number
  rotation_seconds: number
  is_enabled: boolean
  updated_at: string | null
}

type SlotPerformanceRow = {
  slot_key: SlotKey
  slot_label: string
  total_ads: number
  active_live: number
  scheduled: number
  ended: number
  impressions: number
  clicks: number
  ctr_percent: number
  max_active_ads: number
  rotation_seconds: number
  is_enabled: boolean
}

const SLOT_TAB_DEFS: Array<{
  key: Exclude<TabKey, 'slot_rules'>
  slotKey: SlotKey
  label: string
  hint: string
}> = [
  {
    key: 'reklam1',
    slotKey: 'uzun_yol_featured',
    label: 'Özel Reklam Alanı',
    hint: 'Uzun Yol üst reklamı',
  },
  {
    key: 'reklam2',
    slotKey: 'reklam_2',
    label: 'Reklam 2',
    hint: 'İkinci reklam alanı',
  },
  {
    key: 'reklam3',
    slotKey: 'reklam_3',
    label: 'Reklam 3',
    hint: 'Üçüncü reklam alanı',
  },
]

const TAB_ITEMS: Array<{
  key: TabKey
  label: string
  hint: string
  icon: typeof Megaphone
}> = [
  {
    key: 'reklam1',
    label: 'Özel Reklam Alanı',
    hint: 'Uzun Yol üst reklamı',
    icon: Megaphone,
  },
  {
    key: 'reklam2',
    label: 'Reklam 2',
    hint: 'Yeni reklam alanı',
    icon: Megaphone,
  },
  {
    key: 'reklam3',
    label: 'Reklam 3',
    hint: 'Yeni reklam alanı',
    icon: Megaphone,
  },
  {
    key: 'slot_rules',
    label: 'Slot & Performans',
    hint: 'Yerleşim kuralları + rapor',
    icon: BarChart3,
  },
]

const EMPTY_FORM: AdFormState = {
  title: '',
  subtitle: '',
  image_url: '',
  target_url: '',
  display_order: '100',
  starts_at: '',
  ends_at: '',
  is_active: true,
}

const DEFAULT_SLOT_RULES: SlotRule[] = [
  {
    slot_key: 'uzun_yol_featured',
    slot_label: 'Özel Reklam Alanı',
    max_active_ads: 1,
    rotation_seconds: 45,
    is_enabled: true,
    updated_at: null,
  },
  {
    slot_key: 'reklam_2',
    slot_label: 'Reklam 2',
    max_active_ads: 1,
    rotation_seconds: 45,
    is_enabled: true,
    updated_at: null,
  },
  {
    slot_key: 'reklam_3',
    slot_label: 'Reklam 3',
    max_active_ads: 1,
    rotation_seconds: 45,
    is_enabled: true,
    updated_at: null,
  },
]

const SLOT_LABEL_MAP: Record<SlotKey, string> = {
  uzun_yol_featured: 'Özel Reklam Alanı',
  reklam_2: 'Reklam 2',
  reklam_3: 'Reklam 3',
}

function parseSlotKey(value: unknown): SlotKey {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'reklam_2') return 'reklam_2'
  if (raw === 'reklam_3') return 'reklam_3'
  return 'uzun_yol_featured'
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toInputDateTime(value: string | null): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function toIsoDateTime(value: string): string | null {
  if (!value.trim()) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function normalizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
}

function tabKeyFromSlot(slotKey: SlotKey): Exclude<TabKey, 'slot_rules'> {
  if (slotKey === 'reklam_2') return 'reklam2'
  if (slotKey === 'reklam_3') return 'reklam3'
  return 'reklam1'
}

function toInt(value: unknown, fallback = 0): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.trunc(n)
}

function toErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'string' && err.trim()) return err
  if (err instanceof Error && err.message.trim()) return err.message
  if (err && typeof err === 'object') {
    const maybe = err as Record<string, unknown>
    const message = typeof maybe.message === 'string' ? maybe.message.trim() : ''
    const details = typeof maybe.details === 'string' ? maybe.details.trim() : ''
    const hint = typeof maybe.hint === 'string' ? maybe.hint.trim() : ''
    if (message && details) return `${message} • ${details}`
    if (message) return message
    if (details) return details
    if (hint) return hint
  }
  return fallback
}

export default function AdminReklamYonetimiPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [activeTab, setActiveTab] = useState<TabKey>('reklam1')
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savingRuleSlot, setSavingRuleSlot] = useState<SlotKey | null>(null)

  const [ads, setAds] = useState<FeaturedAd[]>([])
  const [slotRules, setSlotRules] = useState<SlotRule[]>(DEFAULT_SLOT_RULES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AdFormState>(EMPTY_FORM)
  const [pickedImage, setPickedImage] = useState<File | null>(null)

  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [schemaReady, setSchemaReady] = useState(true)

  const activeSlot = useMemo<SlotKey | null>(() => {
    const tab = SLOT_TAB_DEFS.find((item) => item.key === activeTab)
    return tab?.slotKey || null
  }, [activeTab])

  const activeSlotLabel = useMemo(() => {
    if (!activeSlot) return ''
    return SLOT_LABEL_MAP[activeSlot]
  }, [activeSlot])

  const filteredAds = useMemo(() => {
    if (!activeSlot) return []
    return ads.filter((ad) => ad.slot_key === activeSlot)
  }, [ads, activeSlot])

  const resolveIsAdmin = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase.rpc('is_platform_admin_v1', {
          p_user_id: userId,
        })
        if (!error) {
          if (typeof data === 'boolean') return data
          if (Array.isArray(data) && data.length > 0) {
            const first = data[0]
            if (typeof first === 'boolean') return first
            if (first && typeof first === 'object') {
              const row = first as Record<string, unknown>
              const maybeBool = row.is_platform_admin_v1
              if (typeof maybeBool === 'boolean') return maybeBool
            }
          }
        }
      } catch {}

      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) throw profileError

      const role = String(
        (profileRow as { role?: string | null } | null)?.role || ''
      ).toLowerCase()
      return role === 'admin'
    },
    [supabase]
  )

  const loadAds = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('long_haul_featured_ads')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(500)

    if (loadError) {
      const loadMessage = toErrorMessage(loadError, 'Reklam tablosu okunamadi.')
      if (loadMessage.includes('long_haul_featured_ads')) {
        setSchemaReady(false)
        setAds([])
        setError('DB kurulum eksik: long_haul_featured_ads tablosu bulunamadi. 20260219164000 ve 20260219193000 migrationlarini calistir.')
        return
      }
      throw loadError
    }

    const parsed = ((data || []) as Array<Record<string, unknown>>)
      .map((item) => {
        const slotKey = parseSlotKey(item.slot_key)
        const imageUrl = String(item.image_url || '').trim()
        if (!imageUrl) return null

        return {
          id: String(item.id || ''),
          slot_key: slotKey,
          title: String(item.title || ''),
          subtitle: item.subtitle ? String(item.subtitle) : null,
          image_url: imageUrl,
          target_url: item.target_url ? String(item.target_url) : null,
          is_active: Boolean(item.is_active),
          display_order: toInt(item.display_order, 100),
          starts_at: item.starts_at ? String(item.starts_at) : null,
          ends_at: item.ends_at ? String(item.ends_at) : null,
          impressions_count: toInt(item.impressions_count, 0),
          clicks_count: toInt(item.clicks_count, 0),
          created_at: String(item.created_at || ''),
        } satisfies FeaturedAd
      })
      .filter((item): item is FeaturedAd => Boolean(item && item.id))

    setSchemaReady(true)
    setAds(parsed)
  }, [supabase])

  const loadSlotRules = useCallback(async () => {
    try {
      const { data, error: ruleError } = await supabase.from('ad_slot_rules').select('*').limit(30)
      if (ruleError) throw ruleError

      const mapped = ((data || []) as Array<Record<string, unknown>>)
        .map((item) => {
          const slotKey = parseSlotKey(item.slot_key)
          return {
            slot_key: slotKey,
            slot_label: String(item.slot_label || SLOT_LABEL_MAP[slotKey]),
            max_active_ads: Math.max(1, toInt(item.max_active_ads, 1)),
            rotation_seconds: Math.max(5, toInt(item.rotation_seconds, 45)),
            is_enabled: Boolean(item.is_enabled),
            updated_at: item.updated_at ? String(item.updated_at) : null,
          } satisfies SlotRule
        })
        .filter((item, index, array) => array.findIndex((x) => x.slot_key === item.slot_key) === index)

      const finalRules = DEFAULT_SLOT_RULES.map((fallbackRule) => {
        const existing = mapped.find((row) => row.slot_key === fallbackRule.slot_key)
        return existing || fallbackRule
      })

      setSlotRules(finalRules)
    } catch {
      setSlotRules(DEFAULT_SLOT_RULES)
      setInfo('Slot kural tablosu hazır değilse varsayılan kurallar gösterilir.')
    }
  }, [supabase])

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    setError('')
    try {
      await Promise.all([loadAds(), loadSlotRules()])
    } catch (err) {
      setError(toErrorMessage(err, 'Veriler yenilenemedi.'))
    } finally {
      setRefreshing(false)
    }
  }, [loadAds, loadSlotRules])

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      setInitialLoading(true)
      setError('')
      setInfo('')

      try {
        const { data: authData } = await supabase.auth.getUser()
        const user = authData.user

        if (!user) {
          if (!active) return
          setIsAdmin(false)
          setError('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
          return
        }

        const adminOk = await resolveIsAdmin(user.id)
        if (!adminOk) {
          if (!active) return
          setIsAdmin(false)
          setError('Bu sayfaya sadece admin erişebilir.')
          return
        }

        if (!active) return
        setIsAdmin(true)
        try {
          await Promise.all([loadAds(), loadSlotRules()])
        } catch (dataErr) {
          if (!active) return
          setAds([])
          setSlotRules(DEFAULT_SLOT_RULES)
          setError(
            toErrorMessage(
              dataErr,
              'Reklam verileri yüklenemedi. Migration eksik olabilir.'
            )
          )
        }
      } catch (err) {
        if (!active) return
        setIsAdmin(false)
        setError(toErrorMessage(err, 'Sayfa hazırlanamadı.'))
      } finally {
        if (active) setInitialLoading(false)
      }
    }

    void bootstrap()

    return () => {
      active = false
    }
  }, [loadAds, loadSlotRules, resolveIsAdmin, supabase])

  const slotPerformanceRows = useMemo<SlotPerformanceRow[]>(() => {
    const now = new Date()

    return DEFAULT_SLOT_RULES.map((slotDef) => {
      const slotAds = ads.filter((ad) => ad.slot_key === slotDef.slot_key)
      const rule = slotRules.find((item) => item.slot_key === slotDef.slot_key) || slotDef

      let activeLive = 0
      let scheduled = 0
      let ended = 0
      let impressions = 0
      let clicks = 0

      for (const ad of slotAds) {
        impressions += ad.impressions_count
        clicks += ad.clicks_count

        const startsAt = ad.starts_at ? new Date(ad.starts_at) : null
        const endsAt = ad.ends_at ? new Date(ad.ends_at) : null

        const started = !startsAt || startsAt.getTime() <= now.getTime()
        const notEnded = !endsAt || endsAt.getTime() >= now.getTime()

        if (ad.is_active && started && notEnded) {
          activeLive += 1
        } else if (startsAt && startsAt.getTime() > now.getTime()) {
          scheduled += 1
        } else if (endsAt && endsAt.getTime() < now.getTime()) {
          ended += 1
        }
      }

      return {
        slot_key: slotDef.slot_key,
        slot_label: SLOT_LABEL_MAP[slotDef.slot_key],
        total_ads: slotAds.length,
        active_live: activeLive,
        scheduled,
        ended,
        impressions,
        clicks,
        ctr_percent: impressions > 0 ? (clicks / impressions) * 100 : 0,
        max_active_ads: Math.max(1, rule.max_active_ads),
        rotation_seconds: Math.max(5, rule.rotation_seconds),
        is_enabled: Boolean(rule.is_enabled),
      }
    })
  }, [ads, slotRules])

  const resetForm = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setPickedImage(null)
  }

  const setField = <K extends keyof AdFormState>(key: K, value: AdFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handlePickEdit = (ad: FeaturedAd) => {
    setEditingId(ad.id)
    setForm({
      title: ad.title,
      subtitle: ad.subtitle || '',
      image_url: ad.image_url,
      target_url: ad.target_url || '',
      display_order: String(ad.display_order || 100),
      starts_at: toInputDateTime(ad.starts_at),
      ends_at: toInputDateTime(ad.ends_at),
      is_active: ad.is_active,
    })
    setPickedImage(null)
    setInfo('')
    setError('')
    setActiveTab(tabKeyFromSlot(ad.slot_key))
  }

  const handleUploadImage = async () => {
    if (!pickedImage) {
      setError('Önce bir görsel dosyası seçin.')
      return
    }

    setUploadingImage(true)
    setError('')
    setInfo('')

    try {
      const suffix = normalizeFileName(pickedImage.name)
      const path = `admin-featured-ads/${Date.now()}-${suffix}`

      const { error: uploadError } = await supabase.storage.from('business-photos').upload(path, pickedImage, {
        upsert: false,
      })

      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage.from('business-photos').getPublicUrl(path)
      const url = publicData.publicUrl || ''

      if (!url) throw new Error('Görsel URL üretilemedi.')

      setField('image_url', url)
      setInfo('Görsel başarıyla yüklendi.')
    } catch (err) {
      setError(toErrorMessage(err, 'Görsel yüklenemedi.'))
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!activeSlot) {
      setError('Bu sekmede reklam kaydı yapılamaz.')
      return
    }

    setSaving(true)
    setError('')
    setInfo('')

    try {
      const title = form.title.trim().slice(0, 90)
      const subtitle = form.subtitle.trim().slice(0, 140)
      const imageUrl = form.image_url.trim()
      const targetUrl = form.target_url.trim()
      const displayOrder = Number(form.display_order)

      if (!title) {
        setError('Başlık zorunlu.')
        return
      }
      if (!imageUrl) {
        setError('Görsel zorunlu. URL gir veya dosya yükle.')
        return
      }
      if (!Number.isFinite(displayOrder)) {
        setError('Görüntüleme sırası sayı olmalı.')
        return
      }

      const startsAtIso = toIsoDateTime(form.starts_at)
      const endsAtIso = toIsoDateTime(form.ends_at)
      if (startsAtIso && endsAtIso && new Date(startsAtIso).getTime() > new Date(endsAtIso).getTime()) {
        setError('Başlangıç tarihi bitiş tarihinden sonra olamaz.')
        return
      }

      const payload = {
        slot_key: activeSlot,
        title,
        subtitle: subtitle || null,
        image_url: imageUrl,
        target_url: targetUrl || null,
        display_order: Math.trunc(displayOrder),
        starts_at: startsAtIso,
        ends_at: endsAtIso,
        is_active: form.is_active,
      }

      if (editingId) {
        const { error: updateError } = await supabase.from('long_haul_featured_ads').update(payload).eq('id', editingId)
        if (updateError) throw updateError
        setInfo('Reklam güncellendi.')
      } else {
        const { error: insertError } = await supabase.from('long_haul_featured_ads').insert(payload)
        if (insertError) throw insertError
        setInfo('Reklam eklendi.')
      }

      resetForm()
      await loadAds()
    } catch (err) {
      setError(toErrorMessage(err, 'Reklam kaydedilemedi.'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (ad: FeaturedAd) => {
    if (!schemaReady) {
      setError('DB kurulum eksik: once migrationlari calistir.')
      return
    }
    setTogglingId(ad.id)
    setError('')
    setInfo('')
    try {
      const { error: toggleError } = await supabase
        .from('long_haul_featured_ads')
        .update({ is_active: !ad.is_active })
        .eq('id', ad.id)
      if (toggleError) throw toggleError
      setInfo(ad.is_active ? 'Reklam pasife alındı.' : 'Reklam aktifleştirildi.')
      await loadAds()
    } catch (err) {
      setError(toErrorMessage(err, 'Reklam durumu değiştirilemedi.'))
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (adId: string) => {
    if (!schemaReady) {
      setError('DB kurulum eksik: once migrationlari calistir.')
      return
    }
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Bu reklamı silmek istediğine emin misin?')
      if (!confirmed) return
    }

    setDeletingId(adId)
    setError('')
    setInfo('')

    try {
      const { error: deleteError } = await supabase.from('long_haul_featured_ads').delete().eq('id', adId)
      if (deleteError) throw deleteError
      setInfo('Reklam silindi.')
      if (editingId === adId) resetForm()
      await loadAds()
    } catch (err) {
      setError(toErrorMessage(err, 'Reklam silinemedi.'))
    } finally {
      setDeletingId(null)
    }
  }

  const updateSlotRule = (slotKey: SlotKey, patch: Partial<SlotRule>) => {
    setSlotRules((current) =>
      current.map((rule) => {
        if (rule.slot_key !== slotKey) return rule
        return {
          ...rule,
          ...patch,
        }
      })
    )
  }

  const handleSaveRule = async (slotKey: SlotKey) => {
    const rule = slotRules.find((item) => item.slot_key === slotKey)
    if (!rule) return

    const maxActive = Math.max(1, toInt(rule.max_active_ads, 1))
    const rotationSeconds = Math.max(5, toInt(rule.rotation_seconds, 45))

    setSavingRuleSlot(slotKey)
    setError('')
    setInfo('')

    try {
      const payload = {
        slot_key: slotKey,
        slot_label: SLOT_LABEL_MAP[slotKey],
        max_active_ads: maxActive,
        rotation_seconds: rotationSeconds,
        is_enabled: rule.is_enabled,
      }

      const { error: upsertError } = await supabase.from('ad_slot_rules').upsert(payload, { onConflict: 'slot_key' })
      if (upsertError) throw upsertError

      setInfo(`${SLOT_LABEL_MAP[slotKey]} slot kuralı kaydedildi.`)
      await loadSlotRules()
    } catch (err) {
      setError(toErrorMessage(err, 'Slot kuralı kaydedilemedi.'))
    } finally {
      setSavingRuleSlot(null)
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] p-5 md:p-6 bg-[linear-gradient(145deg,#ffffff_0%,#f5f8ff_100%)] shadow-[0_20px_28px_-22px_rgba(15,23,42,0.55)] border border-white/75">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-blue-600">Admin Modülü</p>
            <h1 className="mt-1 text-xl font-bold text-slate-800">Reklam Yönetimi</h1>
            <p className="mt-1 text-sm text-slate-500">
              Reklam 1-2-3 alanlarını yönet, slot bazlı yerleşim kurallarını ayarla, performansı izle.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={refreshing || isAdmin !== true}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 shadow-[0_12px_20px_-16px_rgba(15,23,42,0.55)] disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Yenile
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-2xl p-1.5 bg-[#e8edf6] border border-slate-200/80 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.2),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
          {TAB_ITEMS.map((tab) => {
            const active = activeTab === tab.key
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-left transition-all ${
                  active
                    ? 'bg-white text-slate-900 shadow-[0_10px_14px_-12px_rgba(15,23,42,0.8)]'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>
                  <span className="block text-sm font-bold leading-tight">{tab.label}</span>
                  <span className="block text-[11px] font-medium opacity-80 leading-tight">{tab.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {initialLoading ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-8 text-center shadow-[0_16px_26px_-24px_rgba(15,23,42,0.45)]">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" />
          <p className="mt-3 text-sm text-slate-600">Reklam yönetimi hazırlanıyor...</p>
        </div>
      ) : null}

      {!initialLoading && isAdmin !== true ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm font-semibold">
          {error || 'Bu sayfaya erişim yetkin yok.'}
        </div>
      ) : null}

      {!initialLoading && isAdmin === true && activeSlot ? (
        <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-2xl bg-white/90 border border-slate-200/80 p-4 shadow-[0_16px_26px_-24px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-800">{activeSlotLabel}</h2>
                <p className="text-xs font-medium text-slate-500">{editingId ? 'Kayıt düzenleme' : 'Yeni reklam kaydı'}</p>
              </div>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Formu Sıfırla
                </button>
              ) : null}
            </div>

            <form className="mt-3 space-y-3" onSubmit={handleSave}>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Başlık</span>
                <input
                  value={form.title}
                  onChange={(event) => setField('title', event.target.value)}
                  maxLength={90}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-300"
                  placeholder="Örn: Gece Yakıt Fırsatı"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Alt Başlık (opsiyonel)</span>
                <input
                  value={form.subtitle}
                  onChange={(event) => setField('subtitle', event.target.value)}
                  maxLength={140}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-300"
                  placeholder="Örn: MolaYeri anlaşmalı istasyonlarda geçerli"
                />
              </label>

              <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                <p className="text-xs font-semibold text-slate-600">Reklam Görseli</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null
                      setPickedImage(file)
                    }}
                    className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-white file:px-2.5 file:py-1.5 file:font-semibold file:text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={handleUploadImage}
                    disabled={uploadingImage || !pickedImage}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
                  >
                    {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                    Görsel Yükle
                  </button>
                </div>

                <label className="block">
                  <span className="text-[11px] font-medium text-slate-500">veya Görsel URL</span>
                  <input
                    value={form.image_url}
                    onChange={(event) => setField('image_url', event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-300"
                    placeholder="https://..."
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Hedef Link (opsiyonel)</span>
                <input
                  value={form.target_url}
                  onChange={(event) => setField('target_url', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-300"
                  placeholder="https://molayeri.app/..."
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Görüntüleme Sırası</span>
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(event) => setField('display_order', event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-300"
                  />
                </label>

                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 mt-[21px]">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => setField('is_active', event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm font-semibold text-slate-700">Aktif</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Başlangıç (opsiyonel)</span>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(event) => setField('starts_at', event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-300"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Bitiş (opsiyonel)</span>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(event) => setField('ends_at', event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-300"
                  />
                </label>
              </div>

              {form.image_url ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img src={form.image_url} alt="Reklam önizleme" className="h-28 w-full object-cover" />
                </div>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(145deg,#ffb347_0%,#ff9100_100%)] px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_18px_-12px_rgba(249,115,22,0.7)] disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Reklamı Güncelle' : 'Reklamı Kaydet'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl bg-white/90 border border-slate-200/80 p-4 shadow-[0_16px_26px_-24px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-800">{activeSlotLabel} Kayıtları</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                <Megaphone className="h-3.5 w-3.5" /> {filteredAds.length}
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {filteredAds.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center">
                  <ImagePlus className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-2 text-sm font-semibold text-slate-600">Bu slotta henüz reklam kaydı yok.</p>
                </div>
              ) : null}

              {filteredAds.map((ad) => (
                <article key={ad.id} className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-[0_10px_18px_-18px_rgba(15,23,42,0.8)]">
                  <div className="flex gap-3">
                    <img src={ad.image_url} alt={ad.title || 'Reklam görseli'} className="h-16 w-24 rounded-lg object-cover bg-slate-100" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-bold text-slate-800">{ad.title}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            ad.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {ad.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      {ad.subtitle ? <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">{ad.subtitle}</p> : null}
                      <p className="mt-1 text-[11px] text-slate-500">
                        Sıra: <strong>{ad.display_order}</strong> • Gösterim: <strong>{ad.impressions_count}</strong> • Tıklama:{' '}
                        <strong>{ad.clicks_count}</strong>
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">Oluşturma: {formatDate(ad.created_at)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePickEdit(ad)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white"
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(ad)}
                      disabled={togglingId === ad.id}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white disabled:opacity-60"
                    >
                      {togglingId === ad.id ? 'Güncelleniyor...' : ad.is_active ? 'Pasife Al' : 'Aktifleştir'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(ad.id)}
                      disabled={deletingId === ad.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingId === ad.id ? 'Siliniyor...' : 'Sil'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {!initialLoading && isAdmin === true && activeTab === 'slot_rules' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="rounded-2xl bg-white/90 border border-slate-200/80 p-4 shadow-[0_16px_26px_-24px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-sky-600" />
              <h2 className="text-base font-bold text-slate-800">Slot Bazlı Yerleşim Kuralları</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Her reklam alanı için aktif limit, rotasyon ve yayın durumunu ayrı yönet.</p>

            <div className="mt-3 space-y-3">
              {slotRules.map((rule) => (
                <article key={rule.slot_key} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{rule.slot_label}</p>
                      <p className="text-[11px] text-slate-500">{rule.slot_key}</p>
                    </div>
                    <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                      <input
                        type="checkbox"
                        checked={rule.is_enabled}
                        onChange={(event) => updateSlotRule(rule.slot_key, { is_enabled: event.target.checked })}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-[11px] font-semibold text-slate-700">Aktif</span>
                    </label>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[11px] font-semibold text-slate-600">Maks. Aktif Reklam</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={rule.max_active_ads}
                        onChange={(event) =>
                          updateSlotRule(rule.slot_key, {
                            max_active_ads: Math.max(1, toInt(event.target.value, 1)),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-300"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold text-slate-600">Rotasyon (sn)</span>
                      <input
                        type="number"
                        min={5}
                        max={3600}
                        value={rule.rotation_seconds}
                        onChange={(event) =>
                          updateSlotRule(rule.slot_key, {
                            rotation_seconds: Math.max(5, toInt(event.target.value, 45)),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-300"
                      />
                    </label>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-500">Son güncelleme: {formatDate(rule.updated_at)}</p>
                    <button
                      type="button"
                      onClick={() => void handleSaveRule(rule.slot_key)}
                      disabled={savingRuleSlot === rule.slot_key}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {savingRuleSlot === rule.slot_key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Kaydet
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white/90 border border-slate-200/80 p-4 shadow-[0_16px_26px_-24px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-800">Performans Raporu</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Slot bazında yayın adedi, canlı aktif kayıt, gösterim, tıklama ve CTR özeti.</p>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3 font-semibold">Slot</th>
                    <th className="py-2 pr-3 font-semibold">Toplam</th>
                    <th className="py-2 pr-3 font-semibold">Canlı</th>
                    <th className="py-2 pr-3 font-semibold">Planlı</th>
                    <th className="py-2 pr-3 font-semibold">Biten</th>
                    <th className="py-2 pr-3 font-semibold">Gösterim</th>
                    <th className="py-2 pr-3 font-semibold">Tıklama</th>
                    <th className="py-2 pr-3 font-semibold">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {slotPerformanceRows.map((row) => (
                    <tr key={row.slot_key} className="border-b border-slate-100 text-slate-700">
                      <td className="py-2 pr-3">
                        <p className="font-semibold">{row.slot_label}</p>
                        <p className="text-[11px] text-slate-500">
                          max {row.max_active_ads} • {row.rotation_seconds}sn • {row.is_enabled ? 'aktif' : 'pasif'}
                        </p>
                      </td>
                      <td className="py-2 pr-3 font-semibold">{row.total_ads}</td>
                      <td className="py-2 pr-3 font-semibold text-emerald-700">{row.active_live}</td>
                      <td className="py-2 pr-3">{row.scheduled}</td>
                      <td className="py-2 pr-3">{row.ended}</td>
                      <td className="py-2 pr-3">{row.impressions}</td>
                      <td className="py-2 pr-3">{row.clicks}</td>
                      <td className="py-2 pr-3">%{row.ctr_percent.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {!initialLoading && isAdmin === true && (error || info) ? (
        <section
          className={`rounded-xl px-4 py-3 text-sm font-semibold ${
            error ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {error || info}
        </section>
      ) : null}
    </div>
  )
}
