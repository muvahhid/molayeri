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
  Terminal,
  Activity,
  Server
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { inferMenuModules, type MerchantBusiness } from '../_lib/helpers'
import { fetchBusinessCategoryNames, fetchOwnedBusinesses, requireCurrentUserId } from '../_lib/queries'

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
}

// --- UI Kapsayıcı Bileşenler ---
const HardwarePanel = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative bg-[#16181d] border border-[#2d313a] rounded-lg shadow-2xl ${className}`}>
    {/* Vida Detayları */}
    <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute bottom-3 left-3 w-1.5 h-1.5 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute bottom-3 right-3 w-1.5 h-1.5 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="p-6 relative z-10">
      {children}
    </div>
  </div>
)

export default function MerchantDashboardPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [loading, setLoading] = useState(true)
  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)

  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNegotiations, setUnreadNegotiations] = useState(0)
  const [averageScore, setAverageScore] = useState<string>('Puan Yok')
  const [togglingOpen, setTogglingOpen] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [fuelModuleEnabled, setFuelModuleEnabled] = useState(false)
  const [fuelModuleLoading, setFuelModuleLoading] = useState(false)
  const [savingFuel, setSavingFuel] = useState(false)
  const [, setFuelNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
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
        setAverageScore('Puan Yok')
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
      setAverageScore('Puan Yok')
      resetFuelModuleState()
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = async () => {
    if (!userId || !selectedBusiness) {
      setUnreadMessages(0)
      setUnreadNegotiations(0)
      setAverageScore('Puan Yok')
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
          .in('message_type', ['broadcast_all', 'broadcast_business'])
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
        setAverageScore('Puan Yok')
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
      setAverageScore('Puan Yok')
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
        message: nextOpen ? 'Servis durumu açıldı.' : 'Servis durumu kapatıldı.',
      })
    } catch {
      setBusinesses((current) =>
        current.map((item) =>
          item.id === selectedBusiness.id ? { ...item, is_open: !nextOpen } : item
        )
      )
      clearServiceOverrideForBusiness(selectedBusiness.id)
      setNotice({ type: 'error', message: 'Servis durumu güncellenemedi.' })
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

  const averageScoreLabel = averageScore === 'Puan Yok' ? '—' : `${averageScore} / 5`

  const metrics: MetricItem[] = [
    { title: 'Toplam Şube', value: formatCount(businesses.length), icon: Store },
    { title: 'Okunmamış Mesaj', value: formatCount(unreadMessages), icon: MessageSquare },
    { title: 'Görüşme Bekleyen', value: formatCount(unreadNegotiations), icon: BellRing },
    { title: 'Ortalama Puan', value: averageScoreLabel, icon: Star },
  ]

  if (loading) {
    return (
      <div className="flex h-[55vh] items-center justify-center bg-[#06080b]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#38bdf8] animate-spin" />
          <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest">Veriler yükleniyor...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06080b] selection:bg-[#38bdf8]/30 text-[#e2e8f0] font-sans relative overflow-x-hidden">
      
      {/* Arka Plan Izgarası */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 space-y-6">
        
        {/* Üst Bilgi Çubuğu (Header) */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#2d313a] pb-4 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.8)] animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#64748b]">Sistem</span>
              <span className="text-sm font-mono tracking-widest text-[#e2e8f0]">İşletmeci Paneli</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className={`px-3 py-1.5 border rounded flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase transition-colors ${
              selectedBusiness && selectedBusinessIsOpen 
                ? 'bg-[#153445] border-[#226785] text-[#38bdf8]' 
                : selectedBusiness 
                  ? 'bg-rose-950/30 border-rose-900/50 text-rose-400' 
                  : 'bg-[#16181d] border-[#2d313a] text-[#64748b]'
            }`}>
              {selectedBusiness && selectedBusinessIsOpen ? <BadgeCheck className="w-3.5 h-3.5" /> : <CircleAlert className="w-3.5 h-3.5" />}
              DURUM: {selectedBusinessStatusLabel}
            </span>

            <button
              onClick={loadInitialData}
              className="px-4 py-1.5 border border-[#2d313a] rounded bg-[#16181d] text-[10px] font-mono tracking-widest text-[#94a3b8] uppercase hover:bg-[#1a1d24] hover:text-[#e2e8f0] hover:border-[#475569] transition-all flex items-center gap-2"
            >
              <RefreshCcw className="w-3.5 h-3.5" /> YENİLE
            </button>
          </div>
        </header>

        {/* Uyarı & Hata Panelleri */}
        {panelError && (
          <div className="rounded border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-[11px] font-mono text-rose-400 uppercase tracking-wide flex items-center gap-3">
            <Server strokeWidth={1.5} className="w-4 h-4" /> Hata: {panelError}
          </div>
        )}

        {notice && (
          <div className={`rounded border px-4 py-3 text-[11px] font-mono uppercase tracking-wide flex items-center gap-3 ${
            notice.type === 'success' ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-400' : 'border-rose-900/50 bg-rose-950/20 text-rose-400'
          }`}>
            <Terminal strokeWidth={1.5} className="w-4 h-4" /> {notice.message}
          </div>
        )}

        {/* Metrikler */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((item, idx) => (
            <div key={idx} className="bg-[#0a0c10] border border-[#2d313a] rounded p-4 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
              <div className="flex items-center gap-3 mb-3">
                <item.icon className="w-4 h-4 text-[#64748b]" strokeWidth={1.5} />
                <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-[0.1em]">{item.title}</span>
              </div>
              <p className="text-xl font-medium text-[#e2e8f0] font-mono">{item.value}</p>
            </div>
          ))}
        </div>

        {!hasBusinesses ? (
           <HardwarePanel>
             <p className="text-sm font-mono text-[#94a3b8] text-center tracking-wide py-10">
               Kayıt bulunamadı. Lütfen menüden yeni bir işletme ekleyin.
             </p>
           </HardwarePanel>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* SOL PANEL: KONTROL */}
            <HardwarePanel>
              <div className="flex items-center gap-2 mb-6 border-b border-[#2d313a] pb-4">
                <Terminal strokeWidth={1.5} className="w-4 h-4 text-[#38bdf8]" />
                <h2 className="text-sm font-mono text-[#e2e8f0] tracking-widest uppercase">İşletme Kontrolü</h2>
              </div>

              <div className="space-y-6">
                <div className="group">
                   <label className="text-[10px] font-mono text-[#64748b] uppercase tracking-[0.1em] mb-2 block">İşletme Seç</label>
                   <select
                     className="w-full bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm px-4 py-3 rounded outline-none focus:border-[#38bdf8]/50 appearance-none uppercase tracking-wide"
                     value={selectedBusinessId}
                     onChange={(e) => setSelectedBusinessId(e.target.value)}
                   >
                     {businesses.map((b) => (
                       <option key={b.id} value={b.id}>{b.name}</option>
                     ))}
                   </select>
                </div>

                <div className="bg-[#0a0c10] border border-[#2d313a] rounded p-4 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest mb-1">Servis Durumu</span>
                    <span className={`text-xs font-mono tracking-widest ${selectedBusinessIsOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedBusinessIsOpen ? 'Servis açık' : 'Servis kapalı'}
                    </span>
                  </div>
                  <button
                    onClick={openWorkingHoursModal}
                    className="px-4 py-2 bg-transparent border border-[#2d313a] text-[#94a3b8] text-[10px] font-mono tracking-widest uppercase rounded hover:text-[#e2e8f0] hover:border-[#475569] hover:bg-[#1a1d24] transition-all"
                  >
                    Saatleri Düzenle
                  </button>
                </div>

                <button
                  onClick={handleToggleBusinessOpen}
                  disabled={!selectedBusiness || togglingOpen}
                  className={`w-full py-4 rounded font-mono text-[12px] tracking-widest uppercase transition-all flex items-center justify-center gap-3 disabled:opacity-50 border ${
                    selectedBusinessIsOpen
                      ? 'bg-[linear-gradient(180deg,#7f1d1d_0%,#450a0a_100%)] border-rose-900/50 text-rose-200 hover:brightness-110'
                      : 'bg-[linear-gradient(180deg,#14532d_0%,#052e16_100%)] border-emerald-900/50 text-emerald-200 hover:brightness-110'
                  }`}
                >
                  {togglingOpen ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  {togglingOpen ? 'Güncelleniyor...' : selectedBusinessIsOpen ? 'Servisi kapat' : 'Servisi aç'}
                </button>
              </div>
            </HardwarePanel>

            {/* SAĞ PANEL: YAKIT MODÜLÜ */}
            <HardwarePanel>
              <div className="flex items-center justify-between mb-6 border-b border-[#2d313a] pb-4">
                <div className="flex items-center gap-2">
                  <Fuel strokeWidth={1.5} className="w-4 h-4 text-[#38bdf8]" />
                  <h2 className="text-sm font-mono text-[#e2e8f0] tracking-widest uppercase">Yakıt Fiyatları</h2>
                </div>
                {fuelModuleEnabled && <span className="text-[9px] font-mono text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-0.5 rounded border border-[#38bdf8]/30">Aktif</span>}
              </div>

              {fuelModuleLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 text-[#64748b] animate-spin" />
                </div>
              ) : fuelModuleEnabled ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="group relative">
                      <label className="text-[10px] font-mono text-[#64748b] uppercase tracking-[0.1em] mb-1.5 block">Benzin (95)</label>
                      <input
                        inputMode="decimal"
                        className="w-full bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm px-4 py-3 rounded outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                        value={fuelPrices.benzin}
                        onChange={(e) => setFuelPrices({ ...fuelPrices, benzin: e.target.value })}
                        placeholder="0.00"
                      />
                      <span className="absolute right-4 top-9 text-[10px] font-mono text-[#64748b] pointer-events-none">{formatFuelPreview(fuelPrices.benzin)}</span>
                    </div>

                    <div className="group relative">
                      <label className="text-[10px] font-mono text-[#64748b] uppercase tracking-[0.1em] mb-1.5 block">Motorin</label>
                      <input
                        inputMode="decimal"
                        className="w-full bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm px-4 py-3 rounded outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                        value={fuelPrices.motorin}
                        onChange={(e) => setFuelPrices({ ...fuelPrices, motorin: e.target.value })}
                        placeholder="0.00"
                      />
                      <span className="absolute right-4 top-9 text-[10px] font-mono text-[#64748b] pointer-events-none">{formatFuelPreview(fuelPrices.motorin)}</span>
                    </div>

                    <div className="group relative">
                      <label className="text-[10px] font-mono text-[#64748b] uppercase tracking-[0.1em] mb-1.5 block">LPG</label>
                      <input
                        inputMode="decimal"
                        className="w-full bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm px-4 py-3 rounded outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                        value={fuelPrices.lpg}
                        onChange={(e) => setFuelPrices({ ...fuelPrices, lpg: e.target.value })}
                        placeholder="0.00"
                      />
                      <span className="absolute right-4 top-9 text-[10px] font-mono text-[#64748b] pointer-events-none">{formatFuelPreview(fuelPrices.lpg)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveFuelPrices}
                    disabled={!selectedBusiness || savingFuel}
                    className="w-full py-4 rounded font-mono text-[12px] tracking-widest uppercase flex items-center justify-center gap-3 disabled:opacity-50 bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110"
                  >
                    {savingFuel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                    {savingFuel ? 'Kaydediliyor...' : 'Fiyatları kaydet'}
                  </button>
                </div>
              ) : (
                <div className="py-12 border border-dashed border-[#2d313a] rounded flex flex-col items-center justify-center text-center bg-[#0a0c10]">
                  <Fuel className="w-6 h-6 text-[#475569] mb-3" strokeWidth={1.5} />
                  <p className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    Bu işletmede yakıt modülü aktif değil
                  </p>
                </div>
              )}
            </HardwarePanel>
          </div>
        )}
      </div>

      {/* MODAL: ÇALIŞMA SAATLERİ */}
      {hoursModalOpen && selectedBusiness && (
        <div className="fixed inset-0 z-[60] bg-[#050608]/90 backdrop-blur-sm p-4 flex items-center justify-center">
          <HardwarePanel className="w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#2d313a] pb-4 mb-4">
              <h4 className="text-sm font-mono text-[#e2e8f0] tracking-widest uppercase">Çalışma Saatleri</h4>
              <button onClick={closeWorkingHoursModal} className="text-[10px] font-mono text-[#64748b] hover:text-[#e2e8f0] uppercase tracking-widest border border-[#2d313a] px-3 py-1 rounded bg-[#0a0c10]">
                Kapat
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-2 mb-6">
              {DAY_DEFINITIONS.map((day) => {
                const row = workingHours[day.key]
                const fullDay = isFullDayHours(row)
                return (
                  <div key={day.key} className="bg-[#0a0c10] border border-[#2d313a] rounded p-3 grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr_1fr_1fr] gap-3 items-center">
                    <div className="text-xs font-mono text-[#cbd5e1] uppercase tracking-wide">{day.label}</div>
                    
                    <button
                      onClick={() => updateDayEnabled(day.key, !row.enabled)}
                      className={`py-2 rounded border text-[10px] font-mono tracking-widest uppercase transition-colors ${
                        row.enabled ? 'bg-[#153445] border-[#226785] text-[#38bdf8]' : 'bg-[#16181d] border-[#2d313a] text-[#64748b] hover:border-[#475569]'
                      }`}
                    >
                      {row.enabled ? 'Açık' : 'Kapalı'}
                    </button>
                    
                    <button
                      onClick={() => setDayTwentyFourHours(day.key)}
                      className={`py-2 rounded border text-[10px] font-mono tracking-widest uppercase transition-colors ${
                        fullDay ? 'bg-[#153445] border-[#226785] text-[#38bdf8]' : 'bg-[#16181d] border-[#2d313a] text-[#64748b] hover:border-[#475569]'
                      }`}
                    >
                      24 Saat
                    </button>
                    
                    <input
                      type="time"
                      value={row.open}
                      disabled={!row.enabled}
                      onChange={(e) => updateDayTime(day.key, 'open', e.target.value)}
                      className="bg-[#16181d] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono px-3 py-2 rounded outline-none focus:border-[#38bdf8]/50 disabled:opacity-50 [color-scheme:dark]"
                    />
                    
                    <input
                      type="time"
                      value={row.close}
                      disabled={!row.enabled}
                      onChange={(e) => updateDayTime(day.key, 'close', e.target.value)}
                      className="bg-[#16181d] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono px-3 py-2 rounded outline-none focus:border-[#38bdf8]/50 disabled:opacity-50 [color-scheme:dark]"
                    />
                  </div>
                )
              })}
            </div>

            <button
              onClick={saveWorkingHours}
              disabled={savingHours}
              className="w-full py-4 rounded font-mono text-[12px] tracking-widest uppercase flex items-center justify-center gap-3 disabled:opacity-50 bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 shrink-0"
            >
              {savingHours ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
              {savingHours ? 'Kaydediliyor...' : 'Saatleri kaydet'}
            </button>
          </HardwarePanel>
        </div>
      )}
    </div>
  )
}
