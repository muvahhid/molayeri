'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  BellRing,
  CircleAlert,
  Fuel,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Star,
  Store,
  ToggleLeft,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { inferMenuModules, type MerchantBusiness } from '../_lib/helpers'
import { ModuleTitle } from '../_components/module-title'
import {
  fetchBusinessCategoryNames,
  fetchOwnedBusinesses,
  requireCurrentUserId,
} from '../_lib/queries'

function formatCount(value: number): string {
  return new Intl.NumberFormat('tr-TR').format(value)
}

type FuelPriceValues = {
  benzin: string
  motorin: string
  lpg: string
}

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

type DayHours = {
  enabled: boolean
  open: string
  close: string
}

type WeeklyHours = Record<DayKey, DayHours>
type ServiceOverride = {
  forcedOpen: boolean
  untilTs: number | null
}

const HOURS_STORAGE_KEY = 'merchant_working_hours_v1'
const SERVICE_OVERRIDE_STORAGE_KEY = 'merchant_service_override_v1'

const DAY_DEFINITIONS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Pazartesi' },
  { key: 'tue', label: 'Salı' },
  { key: 'wed', label: 'Çarşamba' },
  { key: 'thu', label: 'Perşembe' },
  { key: 'fri', label: 'Cuma' },
  { key: 'sat', label: 'Cumartesi' },
  { key: 'sun', label: 'Pazar' },
]

function createEmptyFuelPrices(): FuelPriceValues {
  return {
    benzin: '',
    motorin: '',
    lpg: '',
  }
}

function createDefaultWorkingHours(): WeeklyHours {
  return {
    mon: { enabled: true, open: '08:00', close: '22:00' },
    tue: { enabled: true, open: '08:00', close: '22:00' },
    wed: { enabled: true, open: '08:00', close: '22:00' },
    thu: { enabled: true, open: '08:00', close: '22:00' },
    fri: { enabled: true, open: '08:00', close: '22:00' },
    sat: { enabled: true, open: '09:00', close: '23:00' },
    sun: { enabled: true, open: '09:00', close: '23:00' },
  }
}

function parseClockToMinutes(clock: string): number {
  const [h, m] = clock.split(':')
  const hh = Number(h)
  const mm = Number(m)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
    return 0
  }
  return hh * 60 + mm
}

function getDayKey(date: Date): DayKey {
  const day = date.getDay()
  if (day === 0) return 'sun'
  if (day === 1) return 'mon'
  if (day === 2) return 'tue'
  if (day === 3) return 'wed'
  if (day === 4) return 'thu'
  if (day === 5) return 'fri'
  return 'sat'
}

function previousDayKey(current: DayKey): DayKey {
  const order: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  const index = order.indexOf(current)
  return order[(index + order.length - 1) % order.length]
}

function isInsideTimeRange(nowMinute: number, openMinute: number, closeMinute: number): boolean {
  if (openMinute === closeMinute) {
    return true
  }
  if (openMinute < closeMinute) {
    return nowMinute >= openMinute && nowMinute < closeMinute
  }
  return nowMinute >= openMinute || nowMinute < closeMinute
}

function isOpenByWorkingHours(hours: WeeklyHours, now = new Date()): boolean {
  const currentKey = getDayKey(now)
  const current = hours[currentKey]
  const nowMinute = now.getHours() * 60 + now.getMinutes()

  if (current.enabled) {
    const openMinute = parseClockToMinutes(current.open)
    const closeMinute = parseClockToMinutes(current.close)
    if (isInsideTimeRange(nowMinute, openMinute, closeMinute)) {
      return true
    }
  }

  const prevKey = previousDayKey(currentKey)
  const prev = hours[prevKey]
  if (!prev.enabled) {
    return false
  }

  const prevOpenMinute = parseClockToMinutes(prev.open)
  const prevCloseMinute = parseClockToMinutes(prev.close)
  if (prevOpenMinute > prevCloseMinute && nowMinute < prevCloseMinute) {
    return true
  }

  return false
}

function findNextScheduleTransition(hours: WeeklyHours, now = new Date()): Date | null {
  const currentState = isOpenByWorkingHours(hours, now)
  const maxMinutes = 8 * 24 * 60

  for (let minuteOffset = 1; minuteOffset <= maxMinutes; minuteOffset += 1) {
    const candidate = new Date(now.getTime() + minuteOffset * 60_000)
    if (isOpenByWorkingHours(hours, candidate) !== currentState) {
      return candidate
    }
  }

  return null
}

function isFullDayHours(day: DayHours): boolean {
  return day.enabled && day.open === '00:00' && day.close === '00:00'
}

function readWorkingHoursMap(): Record<string, WeeklyHours> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(HOURS_STORAGE_KEY)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw) as Record<string, WeeklyHours>
    return parsed || {}
  } catch {
    return {}
  }
}

function readServiceOverrideMap(): Record<string, ServiceOverride> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(SERVICE_OVERRIDE_STORAGE_KEY)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw) as Record<string, ServiceOverride>
    return parsed || {}
  } catch {
    return {}
  }
}

function readWorkingHoursForBusiness(businessId: string): WeeklyHours {
  const map = readWorkingHoursMap()
  return map[businessId] || createDefaultWorkingHours()
}

function writeWorkingHoursForBusiness(businessId: string, hours: WeeklyHours) {
  if (typeof window === 'undefined') {
    return
  }
  const map = readWorkingHoursMap()
  map[businessId] = hours
  window.localStorage.setItem(HOURS_STORAGE_KEY, JSON.stringify(map))
}

function readServiceOverrideForBusiness(businessId: string): ServiceOverride | null {
  const map = readServiceOverrideMap()
  return map[businessId] || null
}

function writeServiceOverrideForBusiness(businessId: string, override: ServiceOverride) {
  if (typeof window === 'undefined') {
    return
  }
  const map = readServiceOverrideMap()
  map[businessId] = override
  window.localStorage.setItem(SERVICE_OVERRIDE_STORAGE_KEY, JSON.stringify(map))
}

function clearServiceOverrideForBusiness(businessId: string) {
  if (typeof window === 'undefined') {
    return
  }
  const map = readServiceOverrideMap()
  if (!map[businessId]) {
    return
  }
  delete map[businessId]
  window.localStorage.setItem(SERVICE_OVERRIDE_STORAGE_KEY, JSON.stringify(map))
}

function formatFuelPreview(value: string): string {
  const numericValue = Number(value.replace(',', '.'))
  if (Number.isNaN(numericValue) || numericValue <= 0) {
    return 'Güncel değil'
  }
  return `${numericValue.toFixed(2)} ₺`
}

type MetricItem = {
  title: string
  value: string
  icon: LucideIcon
  tone: string
}

export default function MerchantDashboardPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [loading, setLoading] = useState(true)
  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)

  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNegotiations, setUnreadNegotiations] = useState(0)
  const [averageScore, setAverageScore] = useState<string>('Yok')
  const [togglingOpen, setTogglingOpen] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [fuelModuleEnabled, setFuelModuleEnabled] = useState(false)
  const [fuelModuleLoading, setFuelModuleLoading] = useState(false)
  const [savingFuel, setSavingFuel] = useState(false)
  const [fuelNotice, setFuelNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [fuelPrices, setFuelPrices] = useState<FuelPriceValues>(createEmptyFuelPrices())
  const [hoursModalOpen, setHoursModalOpen] = useState(false)
  const [workingHours, setWorkingHours] = useState<WeeklyHours>(createDefaultWorkingHours())
  const [savingHours, setSavingHours] = useState(false)

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId) || null

  const resetFuelModuleState = () => {
    setFuelModuleEnabled(false)
    setFuelModuleLoading(false)
    setSavingFuel(false)
    setFuelNotice(null)
    setFuelPrices(createEmptyFuelPrices())
  }

  const loadFuelPrices = async (businessId: string) => {
    const { data, error } = await supabase
      .from('business_products')
      .select('name, price')
      .eq('business_id', businessId)

    if (error) {
      throw error
    }

    const nextValues = createEmptyFuelPrices()

    for (const row of (data || []) as { name: string; price: number | string | null }[]) {
      const name = (row.name || '').toUpperCase()
      const value = row.price == null ? '' : String(row.price)

      if (name.includes('BENZIN') || name.includes('BENZİN')) {
        nextValues.benzin = value
      }
      if (name.includes('MOTORIN') || name.includes('MOTORİN')) {
        nextValues.motorin = value
      }
      if (name.includes('LPG')) {
        nextValues.lpg = value
      }
    }

    setFuelPrices(nextValues)
  }

  const resolveFuelModule = async (business: MerchantBusiness | null) => {
    if (!business) {
      resetFuelModuleState()
      return
    }

    setFuelModuleLoading(true)
    setFuelNotice(null)

    try {
      const categoryNames = await fetchBusinessCategoryNames(supabase, business.id)
      const inferredModules = inferMenuModules({
        businessType: business.type,
        categoryNames,
      })

      const hasFuelModule = inferredModules.includes('fuel')
      setFuelModuleEnabled(hasFuelModule)

      if (!hasFuelModule) {
        setFuelPrices(createEmptyFuelPrices())
        return
      }

      await loadFuelPrices(business.id)
    } catch {
      setFuelModuleEnabled(false)
      setFuelPrices(createEmptyFuelPrices())
    } finally {
      setFuelModuleLoading(false)
    }
  }

  const saveSingleFuelPrice = async (businessId: string, name: string, value: string) => {
    const numericPrice = Number(value.replace(',', '.'))
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      return
    }

    const { data: existing, error: existingError } = await supabase
      .from('business_products')
      .select('id')
      .eq('business_id', businessId)
      .eq('name', name)
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    if (existing && (existing as { id?: string }).id) {
      const { error: updateError } = await supabase
        .from('business_products')
        .update({ price: numericPrice })
        .eq('id', (existing as { id: string }).id)

      if (updateError) {
        throw updateError
      }

      return
    }

    const { error: insertError } = await supabase.from('business_products').insert({
      business_id: businessId,
      name,
      price: numericPrice,
      image_url: null,
    })

    if (insertError) {
      throw insertError
    }
  }

  const handleSaveFuelPrices = async () => {
    if (!selectedBusiness || !fuelModuleEnabled) {
      return
    }

    setFuelNotice(null)
    setSavingFuel(true)

    try {
      await saveSingleFuelPrice(selectedBusiness.id, 'BENZİN (95)', fuelPrices.benzin)
      await saveSingleFuelPrice(selectedBusiness.id, 'MOTORİN', fuelPrices.motorin)
      await saveSingleFuelPrice(selectedBusiness.id, 'LPG / OTOGAZ', fuelPrices.lpg)
      setFuelNotice({ type: 'success', message: 'Yakıt fiyatları kaydedildi.' })
      await loadFuelPrices(selectedBusiness.id)
    } catch {
      setFuelNotice({ type: 'error', message: 'Yakıt fiyatları kaydedilemedi. Tekrar deneyin.' })
    } finally {
      setSavingFuel(false)
    }
  }

  const loadInitialData = async () => {
    setLoading(true)
    setPanelError(null)

    try {
      const currentUserId = await requireCurrentUserId(supabase)

      if (!currentUserId) {
        setUserId(null)
        setBusinesses([])
        setSelectedBusinessId('')
        setUnreadMessages(0)
        setUnreadNegotiations(0)
        setAverageScore('Yok')
        resetFuelModuleState()
        return
      }

      setUserId(currentUserId)

      const ownedBusinesses = await fetchOwnedBusinesses(supabase, currentUserId)
      setBusinesses(ownedBusinesses)

      const firstBusinessId = ownedBusinesses[0]?.id || ''
      setSelectedBusinessId((current) => current || firstBusinessId)
    } catch {
      setPanelError('Veriler yüklenemedi. Lütfen bağlantıyı kontrol edip tekrar deneyin.')
      setUserId(null)
      setBusinesses([])
      setSelectedBusinessId('')
      setUnreadMessages(0)
      setUnreadNegotiations(0)
      setAverageScore('Yok')
      resetFuelModuleState()
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = async () => {
    if (!userId || !selectedBusiness) {
      setUnreadMessages(0)
      setUnreadNegotiations(0)
      setAverageScore('Yok')
      return
    }

    try {
      const { data: authData } = await supabase.auth.getUser()
      const createdAt = authData.user?.created_at || new Date(0).toISOString()

      const [directRes, broadcastRes, readsRes, ratingRes] = await Promise.all([
        supabase.from('messages').select('id, is_read').eq('recipient_id', userId),
        supabase
          .from('messages')
          .select('id')
          .is('recipient_id', null)
          .neq('sender_id', userId)
          .gt('created_at', createdAt)
          .limit(100),
        supabase.from('message_reads').select('message_id').eq('user_id', userId),
        supabase.from('business_reviews').select('rating').eq('business_id', selectedBusiness.id),
      ])

      const readSet = new Set(
        (readsRes.data || []).map((row) => (row as { message_id: string }).message_id.toString())
      )

      let unreadDirect = 0
      for (const row of directRes.data || []) {
        const message = row as { id: string; is_read: boolean | null }
        if (!message.is_read && !readSet.has(message.id.toString())) {
          unreadDirect += 1
        }
      }

      let unreadBroadcast = 0
      for (const row of broadcastRes.data || []) {
        const message = row as { id: string }
        if (!readSet.has(message.id.toString())) {
          unreadBroadcast += 1
        }
      }

      setUnreadMessages(unreadDirect + unreadBroadcast)

      const ratings = (ratingRes.data || []) as { rating: number | null }[]
      const nonNullRatings = ratings
        .map((item) => Number(item.rating || 0))
        .filter((value) => Number.isFinite(value) && value > 0)

      if (nonNullRatings.length === 0) {
        setAverageScore('Yok')
      } else {
        const total = nonNullRatings.reduce((sum, value) => sum + value, 0)
        setAverageScore((total / nonNullRatings.length).toFixed(1))
      }

      const { data: offersData } = await supabase
        .from('convoy_offers')
        .select('id')
        .eq('business_id', selectedBusiness.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })

      const offerIds = (offersData || [])
        .map((row) => (row as { id: string }).id)
        .filter((id): id is string => Boolean(id))

      if (offerIds.length === 0) {
        setUnreadNegotiations(0)
      } else {
        const [messageRes, readRes] = await Promise.all([
          supabase
            .from('offer_messages')
            .select('offer_id, sender_id, created_at')
            .in('offer_id', offerIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('offer_message_reads')
            .select('offer_id, last_read_at')
            .eq('user_id', userId)
            .in('offer_id', offerIds),
        ])

        const latestByOffer: Record<string, { sender_id: string | null; created_at: string }> = {}
        for (const row of (messageRes.data || []) as {
          offer_id: string
          sender_id: string | null
          created_at: string
        }[]) {
          const offerId = row.offer_id?.toString()
          if (!offerId || latestByOffer[offerId]) continue
          latestByOffer[offerId] = { sender_id: row.sender_id, created_at: row.created_at }
        }

        const lastReadByOffer: Record<string, Date> = {}
        for (const row of (readRes.data || []) as { offer_id: string; last_read_at: string }[]) {
          const offerId = row.offer_id?.toString()
          const readAt = row.last_read_at ? new Date(row.last_read_at) : null
          if (!offerId || !readAt || Number.isNaN(readAt.getTime())) continue
          const old = lastReadByOffer[offerId]
          if (!old || readAt > old) {
            lastReadByOffer[offerId] = readAt
          }
        }

        let unreadCount = 0
        for (const offerId of offerIds) {
          const latest = latestByOffer[offerId]
          if (!latest) continue
          if (latest.sender_id === userId) continue

          const latestAt = new Date(latest.created_at)
          if (Number.isNaN(latestAt.getTime())) continue

          const readAt = lastReadByOffer[offerId]
          if (!readAt || latestAt > readAt) {
            unreadCount += 1
          }
        }

        setUnreadNegotiations(unreadCount)
      }
    } catch {
      setUnreadMessages(0)
      setUnreadNegotiations(0)
      setAverageScore('Yok')
      setPanelError((current) => current || 'Bazı veriler yüklenemedi. Sayfayı yenileyip tekrar deneyin.')
    }
  }

  const handleToggleBusinessOpen = async () => {
    if (!selectedBusiness) {
      return
    }

    const nextOpen = !(selectedBusiness.is_open ?? true)
    const manualHours = readWorkingHoursForBusiness(selectedBusiness.id)
    const nextTransition = findNextScheduleTransition(manualHours, new Date())
    writeServiceOverrideForBusiness(selectedBusiness.id, {
      forcedOpen: nextOpen,
      untilTs: nextTransition ? nextTransition.getTime() : null,
    })

    setNotice(null)
    setTogglingOpen(true)

    setBusinesses((current) =>
      current.map((item) => (item.id === selectedBusiness.id ? { ...item, is_open: nextOpen } : item))
    )

    try {
      const { error } = await supabase
        .from('businesses')
        .update({ is_open: nextOpen })
        .eq('id', selectedBusiness.id)

      if (error) {
        throw error
      }

      setNotice({
        type: 'success',
        message: nextOpen ? 'İşletme servis durumu açıldı.' : 'İşletme servis durumu kapatıldı.',
      })
    } catch {
      setBusinesses((current) =>
        current.map((item) =>
          item.id === selectedBusiness.id ? { ...item, is_open: !nextOpen } : item
        )
      )
      clearServiceOverrideForBusiness(selectedBusiness.id)
      setNotice({ type: 'error', message: 'Servis durumu güncellenemedi. Tekrar deneyin.' })
    } finally {
      setTogglingOpen(false)
    }
  }

  const syncBusinessOpenWithSchedule = async (business: MerchantBusiness) => {
    const hours = readWorkingHoursForBusiness(business.id)
    const now = new Date()
    const scheduleOpen = isOpenByWorkingHours(hours, now)
    const override = readServiceOverrideForBusiness(business.id)

    let targetOpen = scheduleOpen
    if (override) {
      if (override.untilTs == null || now.getTime() < override.untilTs) {
        targetOpen = override.forcedOpen
      } else {
        clearServiceOverrideForBusiness(business.id)
      }
    }

    const currentOpen = business.is_open ?? true
    if (targetOpen === currentOpen) {
      return
    }

    setBusinesses((current) =>
      current.map((item) => (item.id === business.id ? { ...item, is_open: targetOpen } : item))
    )

    const { error } = await supabase
      .from('businesses')
      .update({ is_open: targetOpen })
      .eq('id', business.id)

    if (error) {
      setBusinesses((current) =>
        current.map((item) => (item.id === business.id ? { ...item, is_open: currentOpen } : item))
      )
    }
  }

  const openWorkingHoursModal = () => {
    if (!selectedBusiness) {
      return
    }
    setWorkingHours(readWorkingHoursForBusiness(selectedBusiness.id))
    setHoursModalOpen(true)
  }

  const closeWorkingHoursModal = () => {
    setHoursModalOpen(false)
  }

  const updateDayEnabled = (day: DayKey, enabled: boolean) => {
    setWorkingHours((current) => ({
      ...current,
      [day]: { ...current[day], enabled },
    }))
  }

  const updateDayTime = (day: DayKey, field: 'open' | 'close', value: string) => {
    setWorkingHours((current) => ({
      ...current,
      [day]: { ...current[day], [field]: value },
    }))
  }

  const setDayTwentyFourHours = (day: DayKey) => {
    setWorkingHours((current) => ({
      ...current,
      [day]: { ...current[day], enabled: true, open: '00:00', close: '00:00' },
    }))
  }

  const saveWorkingHours = async () => {
    if (!selectedBusiness) {
      return
    }

    setSavingHours(true)
    setNotice(null)

    try {
      writeWorkingHoursForBusiness(selectedBusiness.id, workingHours)
      await syncBusinessOpenWithSchedule(selectedBusiness)
      setNotice({ type: 'success', message: 'Çalışma saatleri kaydedildi.' })
      setHoursModalOpen(false)
    } catch {
      setNotice({ type: 'error', message: 'Çalışma saatleri kaydedilemedi. Tekrar deneyin.' })
    } finally {
      setSavingHours(false)
    }
  }

  useEffect(() => {
    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedBusinessId) {
      return
    }

    refreshStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId, userId])

  useEffect(() => {
    resolveFuelModule(selectedBusiness)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId])

  useEffect(() => {
    if (!selectedBusiness) {
      setWorkingHours(createDefaultWorkingHours())
      return
    }
    setWorkingHours(readWorkingHoursForBusiness(selectedBusiness.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId])

  useEffect(() => {
    if (!selectedBusiness) {
      return
    }

    const runSync = async () => {
      await syncBusinessOpenWithSchedule(selectedBusiness)
    }

    void runSync()
    const intervalId = window.setInterval(() => {
      void runSync()
    }, 60_000)

    return () => {
      window.clearInterval(intervalId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId, businesses])

  const hasBusinesses = businesses.length > 0

  const selectedBusinessIsOpen = selectedBusiness ? (selectedBusiness.is_open ?? true) : false
  const selectedBusinessStatusLabel = selectedBusiness
    ? selectedBusinessIsOpen
      ? 'Servis Açık'
      : 'Servis Kapalı'
    : 'İşletme seçilmedi'

  const averageScoreLabel = averageScore === 'Yok' ? '—' : `${averageScore} / 5`

  const metrics: MetricItem[] = [
    {
      title: 'Toplam Şube',
      value: formatCount(businesses.length),
      icon: Store,
      tone: 'from-sky-500 to-indigo-500',
    },
    {
      title: 'Okunmamış Mesaj',
      value: formatCount(unreadMessages),
      icon: MessageSquare,
      tone: 'from-violet-500 to-indigo-500',
    },
    {
      title: 'Görüşme Bekleyen',
      value: formatCount(unreadNegotiations),
      icon: BellRing,
      tone: 'from-amber-500 to-orange-500',
    },
    {
      title: 'Ortalama Puan',
      value: averageScoreLabel,
      icon: Star,
      tone: 'from-fuchsia-500 to-rose-500',
    },
  ]

  if (loading) {
    return (
      <div className="h-[55vh] rounded-[28px] bg-[linear-gradient(145deg,#ffffff_0%,#f2f6ff_100%)] shadow-[0_20px_28px_-22px_rgba(15,23,42,0.55)] grid place-items-center">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] p-5 md:p-6 bg-[linear-gradient(145deg,#ffffff_0%,#f2f6ff_100%)] shadow-[0_20px_28px_-22px_rgba(15,23,42,0.55)]">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <ModuleTitle title="İşletmeci Ana Panel" />

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold ${
                selectedBusiness && selectedBusinessIsOpen
                  ? 'bg-emerald-50 text-emerald-700 shadow-[0_10px_16px_-14px_rgba(16,185,129,0.65)]'
                  : selectedBusiness
                    ? 'bg-rose-50 text-rose-700 shadow-[0_10px_16px_-14px_rgba(225,29,72,0.6)]'
                    : 'bg-slate-100 text-slate-600 shadow-[0_10px_16px_-14px_rgba(71,85,105,0.58)]'
              }`}
            >
              {selectedBusiness && selectedBusinessIsOpen ? <BadgeCheck className="w-4 h-4" /> : <CircleAlert className="w-4 h-4" />}
              {selectedBusinessStatusLabel}
            </span>

            <button
              type="button"
              onClick={loadInitialData}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-slate-700 bg-white shadow-[0_10px_16px_-14px_rgba(15,23,42,0.6)]"
            >
              <RefreshCcw className="w-4 h-4" />
              Yenile
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {metrics.map((item) => {
            const Icon = item.icon

            return (
              <article
                key={item.title}
                className="rounded-2xl p-4 bg-[linear-gradient(150deg,#ffffff_0%,#f7faff_100%)] shadow-[0_14px_20px_-18px_rgba(15,23,42,0.62)]"
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.tone} text-white shadow-[0_10px_14px_-10px_rgba(15,23,42,0.7)]`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <p className="text-xs text-slate-500">{item.title}</p>
                </div>
                <p className="text-xl font-bold text-slate-800 mt-3">{item.value}</p>
              </article>
            )
          })}
        </div>
      </section>

      {panelError ? (
        <section className="rounded-2xl px-4 py-3 bg-rose-50 text-rose-700 border border-rose-200 text-sm font-medium">
          {panelError}
        </section>
      ) : null}

      {notice ? (
        <section
          className={`rounded-2xl px-4 py-3 text-sm font-medium border ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {notice.message}
        </section>
      ) : null}

      <section className="rounded-[30px] p-5 md:p-6 bg-[#e8edf5] shadow-[inset_10px_10px_24px_rgba(148,163,184,0.24),inset_-10px_-10px_24px_rgba(255,255,255,0.88)]">
        {!hasBusinesses ? (
          <div className="rounded-2xl p-5 bg-slate-50 border border-slate-200/80">
            <p className="text-sm font-semibold text-slate-700">Henüz işletme kaydı bulunamadı. Yeni kayıt için sol menüdeki İşletme Ekle alanını kullanın.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <article className="rounded-[26px] p-5 h-full min-h-[620px] bg-[#edf2f9] border border-white/70 shadow-[10px_10px_24px_rgba(148,163,184,0.28),-10px_-10px_24px_rgba(255,255,255,0.9)] flex flex-col">
              <h4 className="text-2xl font-bold text-slate-800">İşletme Kontrolü</h4>

              <div className="mt-4 rounded-2xl p-2 bg-[#edf2f9] shadow-[inset_4px_4px_10px_rgba(148,163,184,0.26),inset_-4px_-4px_10px_rgba(255,255,255,0.9)]">
                <select
                  className="w-full px-4 py-3 rounded-xl bg-[#edf2f9] text-slate-800 font-semibold outline-none focus:ring-2 focus:ring-orange-300"
                  value={selectedBusinessId}
                  onChange={(event) => setSelectedBusinessId(event.target.value)}
                >
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="h-[96px] rounded-xl p-3 bg-[#edf2f9] shadow-[inset_4px_4px_10px_rgba(148,163,184,0.24),inset_-4px_-4px_10px_rgba(255,255,255,0.9)]">
                  <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">Durum</p>
                  <p className="mt-2 text-base font-bold text-slate-800">{selectedBusinessStatusLabel}</p>
                </div>
                <div className="h-[96px] rounded-xl p-3 bg-[#edf2f9] shadow-[inset_4px_4px_10px_rgba(148,163,184,0.24),inset_-4px_-4px_10px_rgba(255,255,255,0.9)]">
                  <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">Mesajlar</p>
                  <p className="mt-2 text-base font-bold text-slate-800">
                    {unreadMessages > 0 ? `${formatCount(unreadMessages)} yeni` : 'Yeni yok'}
                  </p>
                </div>
                <div className="h-[96px] rounded-xl p-3 bg-[#edf2f9] shadow-[inset_4px_4px_10px_rgba(148,163,184,0.24),inset_-4px_-4px_10px_rgba(255,255,255,0.9)]">
                  <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">Puan</p>
                  <p className="mt-2 text-base font-bold text-slate-800">{averageScoreLabel}</p>
                </div>
              </div>

              <div className="mt-auto pt-4">
                <button
                  type="button"
                  onClick={openWorkingHoursModal}
                  className="h-12 w-full inline-flex items-center justify-center px-4 rounded-xl text-sm font-semibold text-slate-700 bg-white/80 border border-white/70 shadow-[0_10px_14px_-12px_rgba(15,23,42,0.45)]"
                >
                  Çalışma Saatleri Düzenle
                </button>

                <div className="mt-3 h-[84px] rounded-2xl p-3 bg-[#edf2f9] shadow-[inset_5px_5px_12px_rgba(148,163,184,0.24),inset_-5px_-5px_12px_rgba(255,255,255,0.9)]">
                  <div className="flex items-center justify-between gap-2 h-full">
                    <p className="text-sm font-semibold text-slate-700">Servis Durumu</p>
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                        selectedBusinessIsOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {selectedBusinessIsOpen ? <BadgeCheck className="w-4 h-4" /> : <CircleAlert className="w-4 h-4" />}
                      {selectedBusinessIsOpen ? 'Açık' : 'Kapalı'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleBusinessOpen}
                  disabled={!selectedBusiness || togglingOpen}
                  className={`mt-3 h-14 w-full inline-flex items-center justify-center gap-2 px-4 rounded-xl border border-white/20 text-sm font-semibold text-white disabled:opacity-50 ${
                    selectedBusinessIsOpen
                      ? 'bg-[linear-gradient(145deg,#ef4444_0%,#be123c_100%)] hover:brightness-95 shadow-[0_14px_22px_-12px_rgba(190,24,93,0.92)]'
                      : 'bg-[linear-gradient(145deg,#22c55e_0%,#16a34a_100%)] hover:brightness-95 shadow-[0_14px_22px_-12px_rgba(22,163,74,0.82)]'
                  }`}
                >
                  {togglingOpen ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleLeft className="w-4 h-4" />}
                  {togglingOpen ? 'Güncelleniyor...' : selectedBusinessIsOpen ? 'SERVİSİ KAPAT' : 'SERVİSİ AÇ'}
                </button>
              </div>
            </article>

            <article
              className={`rounded-[26px] p-5 h-full min-h-[620px] flex flex-col border ${
                fuelModuleEnabled
                  ? 'bg-[#edf2f9] border-white/70 shadow-[10px_10px_24px_rgba(148,163,184,0.28),-10px_-10px_24px_rgba(255,255,255,0.9)]'
                  : 'bg-[#e1e6ef] border-slate-300/70 shadow-[inset_6px_6px_14px_rgba(148,163,184,0.35),inset_-6px_-6px_14px_rgba(255,255,255,0.55)]'
              }`}
            >
              <h4 className="text-2xl font-bold text-slate-800">Yakıt Fiyatları</h4>

              {fuelModuleLoading ? (
                <div className="flex-1 grid place-items-center">
                  <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                </div>
              ) : fuelModuleEnabled ? (
                <div className="mt-4 flex-1 flex flex-col">
                  {fuelNotice ? (
                    <div
                      className={`rounded-xl px-3 py-2 text-xs font-semibold border ${
                        fuelNotice.type === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {fuelNotice.message}
                    </div>
                  ) : null}

                  <div className="mt-3 space-y-2">
                    <label className="block h-[112px] rounded-xl p-3 bg-[#edf2f9] shadow-[inset_4px_4px_10px_rgba(148,163,184,0.24),inset_-4px_-4px_10px_rgba(255,255,255,0.9)]">
                      <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Benzin (95)</span>
                      <input
                        inputMode="decimal"
                        className="mt-2 w-full px-3 py-2 rounded-lg bg-[#edf2f9] text-sm font-semibold text-slate-700 shadow-[inset_3px_3px_8px_rgba(148,163,184,0.22),inset_-3px_-3px_8px_rgba(255,255,255,0.9)]"
                        value={fuelPrices.benzin}
                        onChange={(event) =>
                          setFuelPrices((current) => ({ ...current, benzin: event.target.value }))
                        }
                        placeholder="0.00"
                      />
                      <p className="mt-1 text-xs text-slate-500">{formatFuelPreview(fuelPrices.benzin)}</p>
                    </label>

                    <label className="block h-[112px] rounded-xl p-3 bg-[#edf2f9] shadow-[inset_4px_4px_10px_rgba(148,163,184,0.24),inset_-4px_-4px_10px_rgba(255,255,255,0.9)]">
                      <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Motorin</span>
                      <input
                        inputMode="decimal"
                        className="mt-2 w-full px-3 py-2 rounded-lg bg-[#edf2f9] text-sm font-semibold text-slate-700 shadow-[inset_3px_3px_8px_rgba(148,163,184,0.22),inset_-3px_-3px_8px_rgba(255,255,255,0.9)]"
                        value={fuelPrices.motorin}
                        onChange={(event) =>
                          setFuelPrices((current) => ({ ...current, motorin: event.target.value }))
                        }
                        placeholder="0.00"
                      />
                      <p className="mt-1 text-xs text-slate-500">{formatFuelPreview(fuelPrices.motorin)}</p>
                    </label>

                    <label className="block h-[112px] rounded-xl p-3 bg-[#edf2f9] shadow-[inset_4px_4px_10px_rgba(148,163,184,0.24),inset_-4px_-4px_10px_rgba(255,255,255,0.9)]">
                      <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">LPG / Otogaz</span>
                      <input
                        inputMode="decimal"
                        className="mt-2 w-full px-3 py-2 rounded-lg bg-[#edf2f9] text-sm font-semibold text-slate-700 shadow-[inset_3px_3px_8px_rgba(148,163,184,0.22),inset_-3px_-3px_8px_rgba(255,255,255,0.9)]"
                        value={fuelPrices.lpg}
                        onChange={(event) =>
                          setFuelPrices((current) => ({ ...current, lpg: event.target.value }))
                        }
                        placeholder="0.00"
                      />
                      <p className="mt-1 text-xs text-slate-500">{formatFuelPreview(fuelPrices.lpg)}</p>
                    </label>
                  </div>

                  <div className="mt-auto pt-4">
                    <button
                      type="button"
                      onClick={handleSaveFuelPrices}
                      disabled={!selectedBusiness || savingFuel}
                      className="h-14 w-full inline-flex items-center justify-center gap-2 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {savingFuel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fuel className="w-4 h-4" />}
                      {savingFuel ? 'Kaydediliyor...' : 'Fiyatları Kaydet'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex-1 rounded-2xl border border-dashed border-slate-400/60 bg-[#e8edf5] px-4 py-5 grid place-items-center text-center shadow-[inset_4px_4px_10px_rgba(148,163,184,0.3),inset_-4px_-4px_10px_rgba(255,255,255,0.75)]">
                  <div>
                    <Fuel className="w-7 h-7 text-slate-400 mx-auto" />
                    <p className="mt-3 text-sm font-semibold text-slate-600">Yakıt modülü pasif</p>
                  </div>
                </div>
              )}
            </article>
          </div>
        )}
      </section>

      {hoursModalOpen && selectedBusiness ? (
        <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl p-5 md:p-6 bg-[#e8edf5] border border-white/70 shadow-[12px_12px_28px_rgba(15,23,42,0.26),-10px_-10px_24px_rgba(255,255,255,0.86)]">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-2xl font-bold text-slate-800">Çalışma Saatleri</h4>
              <button
                type="button"
                onClick={closeWorkingHoursModal}
                className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-600 bg-white/80 border border-white/70"
              >
                Kapat
              </button>
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">24 Saat düğmesi günü tam gün açık yapar.</p>

            <div className="mt-4 space-y-2">
              {DAY_DEFINITIONS.map((day) => {
                const row = workingHours[day.key]
                const fullDay = isFullDayHours(row)
                return (
                  <div
                    key={day.key}
                    className="rounded-2xl p-3 bg-[#edf2f9] shadow-[inset_4px_4px_10px_rgba(148,163,184,0.24),inset_-4px_-4px_10px_rgba(255,255,255,0.88)]"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-[150px_110px_100px_1fr_1fr] gap-2 items-center">
                      <div className="text-sm font-semibold text-slate-700">{day.label}</div>
                      <button
                        type="button"
                        onClick={() => updateDayEnabled(day.key, !row.enabled)}
                        className={`h-10 rounded-xl text-xs font-semibold ${
                          row.enabled
                            ? 'bg-emerald-600 text-white shadow-[0_10px_14px_-12px_rgba(22,163,74,0.9)]'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {row.enabled ? 'Açık' : 'Kapalı'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDayTwentyFourHours(day.key)}
                        className={`h-10 rounded-xl text-xs font-semibold ${
                          fullDay
                            ? 'bg-sky-600 text-white shadow-[0_10px_14px_-12px_rgba(37,99,235,0.9)]'
                            : 'bg-white/80 text-slate-600 border border-white/70'
                        }`}
                      >
                        24 Saat
                      </button>
                      <input
                        type="time"
                        value={row.open}
                        disabled={!row.enabled}
                        onChange={(event) => updateDayTime(day.key, 'open', event.target.value)}
                        className="h-10 px-3 rounded-xl bg-[#edf2f9] text-sm font-semibold text-slate-700 outline-none disabled:opacity-50 shadow-[inset_3px_3px_8px_rgba(148,163,184,0.22),inset_-3px_-3px_8px_rgba(255,255,255,0.9)]"
                      />
                      <input
                        type="time"
                        value={row.close}
                        disabled={!row.enabled}
                        onChange={(event) => updateDayTime(day.key, 'close', event.target.value)}
                        className="h-10 px-3 rounded-xl bg-[#edf2f9] text-sm font-semibold text-slate-700 outline-none disabled:opacity-50 shadow-[inset_3px_3px_8px_rgba(148,163,184,0.22),inset_-3px_-3px_8px_rgba(255,255,255,0.9)]"
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={closeWorkingHoursModal}
                className="h-12 rounded-xl text-sm font-semibold text-slate-700 bg-white/80 border border-white/70"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={saveWorkingHours}
                disabled={savingHours}
                className="h-12 rounded-xl text-sm font-semibold text-white bg-[linear-gradient(145deg,#2563eb_0%,#1d4ed8_100%)] disabled:opacity-50"
              >
                {savingHours ? 'Kaydediliyor...' : 'Saatleri Kaydet'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
