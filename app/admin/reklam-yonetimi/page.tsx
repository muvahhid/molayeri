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
import { ModuleTitle } from '../../merchant/_components/module-title'

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
  icon: typeof Megaphone | typeof BarChart3
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

// Ortak Donanım Kartı Kapsayıcısı
const HardwarePanel = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative bg-[#16181d] border border-[#2d313a] rounded-md shadow-lg ${className}`}>
    <div className="absolute top-2 left-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute bottom-2 left-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    {children}
  </div>
)

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
    <div className="space-y-6 text-[#e2e8f0]">
      <HardwarePanel className="p-5 md:p-6 border-b border-[#2d313a]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <ModuleTitle title="Reklam Yönetimi" />
            <p className="mt-2 text-[10px] font-mono tracking-widest uppercase text-[#64748b]">
              Reklam 1-2-3 alanlarını yönet, slot bazlı yerleşim kurallarını ayarla, performansı izle.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={refreshing || isAdmin !== true}
            className="inline-flex items-center gap-2 rounded px-4 py-3 border border-[#2d313a] bg-[#16181d] text-[#e2e8f0] text-[10px] font-mono uppercase tracking-widest hover:bg-[#1a1d24] disabled:opacity-50 transition-colors"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Yenile
          </button>
        </div>

        <div className="mt-6 inline-flex rounded border border-[#2d313a] p-1 bg-[#0a0c10] flex-wrap gap-1">
          {TAB_ITEMS.map((tab) => {
            const active = activeTab === tab.key
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded text-left transition-all ${
                  active
                    ? 'bg-[#153445] border border-[#226785] text-[#38bdf8]'
                    : 'bg-transparent border border-transparent text-[#64748b] hover:text-[#94a3b8]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>
                  <span className="block text-[11px] font-mono uppercase tracking-widest leading-none mb-1">{tab.label}</span>
                  <span className="block text-[9px] font-mono tracking-widest leading-none opacity-70">{tab.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </HardwarePanel>

      {initialLoading ? (
        <HardwarePanel className="p-10 flex flex-col items-center justify-center text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#38bdf8]" />
          <p className="mt-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Reklam yönetimi hazırlanıyor...</p>
        </HardwarePanel>
      ) : null}

      {!initialLoading && isAdmin !== true ? (
        <HardwarePanel className="p-5 border-rose-900/50 bg-rose-950/20 text-rose-400 text-[11px] font-mono uppercase tracking-widest">
          {error || 'Bu sayfaya erişim yetkiniz yok.'}
        </HardwarePanel>
      ) : null}

      {!initialLoading && isAdmin === true && activeSlot ? (
        <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <HardwarePanel className="p-5 space-y-5">
            <div className="flex items-center justify-between gap-3 border-b border-[#1e232b] pb-3">
              <div>
                <h2 className="text-[12px] font-mono uppercase tracking-widest text-[#e2e8f0]">{activeSlotLabel}</h2>
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b] mt-1">{editingId ? 'Kayıt Düzenleme' : 'Yeni Reklam Kaydı'}</p>
              </div>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded border border-[#2d313a] bg-transparent text-[9px] font-mono uppercase tracking-widest text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
                >
                  FORMU SIFIRLA
                </button>
              ) : null}
            </div>

            <form className="space-y-4" onSubmit={handleSave}>
              <label className="block">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] block mb-2">Başlık</span>
                <input
                  value={form.title}
                  onChange={(event) => setField('title', event.target.value)}
                  maxLength={90}
                  className="w-full rounded bg-[#0a0c10] border border-[#2d313a] px-4 py-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                  placeholder="Örn: Gece Yakıt Fırsatı"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] block mb-2">Alt Başlık (Opsiyonel)</span>
                <input
                  value={form.subtitle}
                  onChange={(event) => setField('subtitle', event.target.value)}
                  maxLength={140}
                  className="w-full rounded bg-[#0a0c10] border border-[#2d313a] px-4 py-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                  placeholder="Örn: MolaYeri anlaşmalı istasyonlarda geçerli"
                />
              </label>

              <div className="space-y-3 rounded border border-[#2d313a] bg-[#0a0c10] p-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Reklam Görseli</p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null
                        setPickedImage(file)
                      }}
                      className="block w-full text-[10px] font-mono text-[#64748b] file:mr-3 file:rounded file:border-0 file:bg-[#16181d] file:px-3 file:py-1.5 file:font-mono file:text-[#94a3b8] file:uppercase file:tracking-widest file:cursor-pointer hover:file:bg-[#1a1d24]"
                    />
                    <button
                      type="button"
                      onClick={handleUploadImage}
                      disabled={uploadingImage || !pickedImage}
                      className="inline-flex items-center justify-center gap-1.5 rounded border border-[#2d313a] bg-[#16181d] px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-[#94a3b8] disabled:opacity-50 hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors shrink-0"
                    >
                      {uploadingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />}
                      YÜKLE
                    </button>
                  </div>
                  <label className="block">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-[#475569] block mb-1.5">VEYA GÖRSEL URL</span>
                    <input
                      value={form.image_url}
                      onChange={(event) => setField('image_url', event.target.value)}
                      className="w-full rounded bg-[#16181d] border border-[#2d313a] px-3 py-2 text-xs font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                      placeholder="https://..."
                    />
                  </label>
                </div>
              </div>

              <label className="block">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] block mb-2">Hedef Link (Opsiyonel)</span>
                <input
                  value={form.target_url}
                  onChange={(event) => setField('target_url', event.target.value)}
                  className="w-full rounded bg-[#0a0c10] border border-[#2d313a] px-4 py-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                  placeholder="https://molayeri.app/..."
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] block mb-2">Sıra</span>
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(event) => setField('display_order', event.target.value)}
                    className="w-full rounded bg-[#0a0c10] border border-[#2d313a] px-4 py-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50"
                  />
                </label>

                <label className="flex items-center gap-3 mt-[26px] px-4 py-3 rounded border border-[#2d313a] bg-[#0a0c10] cursor-pointer hover:border-[#475569] transition-colors">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => setField('is_active', event.target.checked)}
                    className="h-4 w-4 rounded border-[#2d313a] bg-[#16181d] accent-[#38bdf8]"
                  />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0]">AKTİF</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] block mb-2">Başlangıç (Opsiyonel)</span>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(event) => setField('starts_at', event.target.value)}
                    className="w-full rounded bg-[#0a0c10] border border-[#2d313a] px-4 py-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 [color-scheme:dark]"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] block mb-2">Bitiş (Opsiyonel)</span>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(event) => setField('ends_at', event.target.value)}
                    className="w-full rounded bg-[#0a0c10] border border-[#2d313a] px-4 py-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 [color-scheme:dark]"
                  />
                </label>
              </div>

              {form.image_url ? (
                <div className="overflow-hidden rounded border border-[#2d313a] bg-[#0a0c10] mt-4 aspect-video">
                  <img src={form.image_url} alt="Reklam önizleme" className="w-full h-full object-cover mix-blend-lighten opacity-80" />
                </div>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] px-4 py-3.5 text-[11px] font-mono uppercase tracking-widest text-[#f8fafc] border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'GÜNCELLE' : 'KAYDET'}
              </button>
            </form>
          </HardwarePanel>

          <HardwarePanel className="p-0 overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[600px]">
            <div className="flex items-center justify-between gap-3 border-b border-[#2d313a] bg-[#0f1115] p-5">
              <h2 className="text-[12px] font-mono uppercase tracking-widest text-[#e2e8f0]">{activeSlotLabel} Kayıtları</h2>
              <span className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest bg-[#101419] border border-[#1e232b] text-[#64748b]">
                <Megaphone className="h-3 w-3 text-[#38bdf8]" /> {filteredAds.length} KAYIT
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0c0e12] custom-scrollbar">
              {filteredAds.length === 0 ? (
                <div className="rounded border border-dashed border-[#2d313a] bg-[#0a0c10] p-8 text-center flex flex-col items-center justify-center">
                  <ImagePlus className="mx-auto h-6 w-6 text-[#475569] mb-3" />
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">BU SLOTTA HENÜZ REKLAM KAYDI YOK.</p>
                </div>
              ) : null}

              {filteredAds.map((ad) => (
                <article key={ad.id} className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 hover:border-[#475569] transition-colors">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-32 aspect-video shrink-0 rounded border border-[#1e232b] bg-[#16181d] overflow-hidden">
                      <img src={ad.image_url} alt="Reklam" className="w-full h-full object-cover mix-blend-lighten opacity-80" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2 border-b border-[#1e232b] pb-2">
                        <p className="truncate text-[13px] font-medium uppercase tracking-wide text-[#e2e8f0]">{ad.title}</p>
                        <span
                          className={`shrink-0 inline-flex rounded border px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest ${
                            ad.is_active ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-400' : 'border-[#2d313a] bg-[#16181d] text-[#64748b]'
                          }`}
                        >
                          {ad.is_active ? 'AKTİF' : 'PASİF'}
                        </span>
                      </div>
                      {ad.subtitle ? <p className="mt-2 line-clamp-1 text-[10px] font-mono text-[#94a3b8] tracking-widest uppercase">{ad.subtitle}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[9px] font-mono text-[#64748b] uppercase tracking-widest">
                        <span>Sıra: <strong className="text-[#cbd5e1]">{ad.display_order}</strong></span>
                        <span>Gösterim: <strong className="text-[#cbd5e1]">{ad.impressions_count}</strong></span>
                        <span>Tıklama: <strong className="text-[#cbd5e1]">{ad.clicks_count}</strong></span>
                        <span>Oluşturma: {formatDate(ad.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1e232b] flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handlePickEdit(ad)}
                      className="rounded border border-[#2d313a] bg-[#16181d] px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a1d24] transition-colors"
                    >
                      DÜZENLE
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(ad)}
                      disabled={togglingId === ad.id}
                      className={`rounded border px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest disabled:opacity-50 transition-colors ${
                        ad.is_active ? 'border-amber-900/50 bg-amber-950/20 text-amber-400 hover:bg-amber-900/40' : 'border-emerald-900/50 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/40'
                      }`}
                    >
                      {togglingId === ad.id ? 'İŞLENİYOR...' : ad.is_active ? 'PASİFE AL' : 'AKTİFLEŞTİR'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(ad.id)}
                      disabled={deletingId === ad.id}
                      className="inline-flex items-center justify-center w-8 h-8 rounded border border-rose-900/50 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </HardwarePanel>
        </div>
      ) : null}

      {!initialLoading && isAdmin === true && activeTab === 'slot_rules' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <HardwarePanel className="p-5">
            <div className="flex items-center gap-2 border-b border-[#2d313a] pb-3 mb-4">
              <SlidersHorizontal className="h-4 w-4 text-[#38bdf8]" />
              <h2 className="text-[12px] font-mono uppercase tracking-widest text-[#e2e8f0]">Slot Yerleşim Kuralları</h2>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] mb-5">Her reklam alanı için aktif limit, rotasyon ve yayın durumunu ayrı yönetin.</p>

            <div className="space-y-4">
              {slotRules.map((rule) => (
                <article key={rule.slot_key} className="rounded border border-[#2d313a] bg-[#0a0c10] p-4">
                  <div className="flex items-center justify-between gap-2 border-b border-[#1e232b] pb-3">
                    <div>
                      <p className="text-[12px] font-medium text-[#e2e8f0] uppercase tracking-wide">{rule.slot_label}</p>
                      <p className="text-[9px] font-mono text-[#64748b] mt-1">{rule.slot_key}</p>
                    </div>
                    <label className="inline-flex items-center gap-2 rounded border border-[#2d313a] bg-[#16181d] px-3 py-1.5 cursor-pointer hover:border-[#475569] transition-colors">
                      <input
                        type="checkbox"
                        checked={rule.is_enabled}
                        onChange={(event) => updateSlotRule(rule.slot_key, { is_enabled: event.target.checked })}
                        className="h-3.5 w-3.5 rounded border-[#2d313a] bg-[#0a0c10] accent-[#38bdf8]"
                      />
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[#cbd5e1]">AKTİF</span>
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[#64748b] block mb-2">Maks. Aktif Reklam</span>
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
                        className="w-full rounded bg-[#16181d] border border-[#2d313a] px-3 py-2 text-xs font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[#64748b] block mb-2">Rotasyon (Saniye)</span>
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
                        className="w-full rounded bg-[#16181d] border border-[#2d313a] px-3 py-2 text-xs font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50"
                      />
                    </label>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1e232b] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest">
                      SON GÜNCELLEME: {formatDate(rule.updated_at)}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleSaveRule(rule.slot_key)}
                      disabled={savingRuleSlot === rule.slot_key}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] px-4 py-2 text-[9px] font-mono uppercase tracking-widest text-[#f8fafc] border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      {savingRuleSlot === rule.slot_key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      KURALI KAYDET
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </HardwarePanel>

          <HardwarePanel className="p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[#2d313a] bg-[#0f1115] flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              <h2 className="text-[12px] font-mono uppercase tracking-widest text-[#e2e8f0]">Performans Raporu</h2>
            </div>

            <div className="flex-1 overflow-x-auto bg-[#16181d]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#101419] border-b border-[#2d313a]">
                  <tr className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">
                    <th className="px-5 py-3">Slot / Ayarlar</th>
                    <th className="px-3 py-3">Toplam</th>
                    <th className="px-3 py-3">Canlı</th>
                    <th className="px-3 py-3">Planlı</th>
                    <th className="px-3 py-3">Biten</th>
                    <th className="px-3 py-3">Gösterim</th>
                    <th className="px-3 py-3">Tık</th>
                    <th className="px-5 py-3">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e232b]">
                  {slotPerformanceRows.map((row) => (
                    <tr key={row.slot_key} className="hover:bg-[#1a1d24] transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[11px] font-mono text-[#e2e8f0] uppercase tracking-widest">{row.slot_label}</p>
                        <p className="mt-1 text-[9px] font-mono text-[#64748b] uppercase tracking-widest">
                          Maks: {row.max_active_ads} • Rot: {row.rotation_seconds}sn • {row.is_enabled ? 'ON' : 'OFF'}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-[11px] font-mono text-[#cbd5e1]">{row.total_ads}</td>
                      <td className="px-3 py-3 text-[11px] font-mono text-emerald-400">{row.active_live}</td>
                      <td className="px-3 py-3 text-[11px] font-mono text-[#94a3b8]">{row.scheduled}</td>
                      <td className="px-3 py-3 text-[11px] font-mono text-[#64748b]">{row.ended}</td>
                      <td className="px-3 py-3 text-[11px] font-mono text-[#38bdf8]">{row.impressions}</td>
                      <td className="px-3 py-3 text-[11px] font-mono text-amber-400">{row.clicks}</td>
                      <td className="px-5 py-3 text-[11px] font-mono text-[#e2e8f0]">%{row.ctr_percent.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </HardwarePanel>
        </div>
      ) : null}

      {!initialLoading && isAdmin === true && (error || info) ? (
        <HardwarePanel className={`p-4 ${error ? 'border-rose-900/50 bg-rose-950/20 text-rose-400' : 'border-emerald-900/50 bg-emerald-950/20 text-emerald-400'}`}>
          <p className="text-[11px] font-mono uppercase tracking-widest">
            {error ? `[HATA] ${error}` : `[SİSTEM] ${info}`}
          </p>
        </HardwarePanel>
      ) : null}
    </div>
  )
}