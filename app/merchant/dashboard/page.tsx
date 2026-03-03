'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  BarChart3,
  BellRing,
  CircleAlert,
  Compass,
  GripVertical,
  Fuel,
  Loader2,
  MessageSquare,
  Radio,
  ReceiptText,
  RefreshCcw,
  Route,
  Send,
  Star,
  Store,
  Ticket,
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

function formatMoney(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toSafeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'))
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function firstPositiveFromKeys(row: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = toSafeNumber(row[key])
    if (value > 0) return value
  }
  return 0
}

function normalizeMetricKey(value: string): string {
  let s = value.toLowerCase()
  const map: Record<string, string> = {
    'ç': 'c',
    'ğ': 'g',
    'ı': 'i',
    'ö': 'o',
    'ş': 's',
    'ü': 'u',
  }
  for (const [from, to] of Object.entries(map)) {
    s = s.replaceAll(from, to)
  }
  return s.replace(/[^a-z0-9]+/g, '')
}

function metricValueFromBusinessRow(
  business: MerchantBusiness | null,
  keys: string[],
  fuzzyTokens: string[] = []
): number {
  if (!business) return 0

  const row = business as unknown as Record<string, unknown>
  const normalizedDirectKeys = new Set(keys.map(normalizeMetricKey).filter(Boolean))

  for (const key of keys) {
    const value = toSafeNumber(row[key])
    if (value > 0) return Math.trunc(value)
  }

  if (fuzzyTokens.length > 0) {
    const normalizedTokens = fuzzyTokens.map(normalizeMetricKey).filter(Boolean)
    for (const [key, raw] of Object.entries(row)) {
      const normalizedKey = normalizeMetricKey(key)
      if (!normalizedKey) continue
      if (normalizedDirectKeys.has(normalizedKey)) continue
      if (normalizedKey.includes('lat') || normalizedKey.includes('lng') || normalizedKey.includes('lon')) continue
      if (!normalizedTokens.some((token) => normalizedKey.includes(token))) continue

      const value = toSafeNumber(raw)
      if (value > 0) return Math.trunc(value)
    }
  }

  return 0
}

function negotiationStatusLabel(status: string | null): string {
  if (status === 'accepted') return 'Kabul'
  if (status === 'pending') return 'Bekliyor'
  if (status === 'rejected') return 'Reddedildi'
  if (status === 'completed') return 'Tamamlandı'
  return 'Bilinmiyor'
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

type DashboardMiniMessage = {
  id: string
  subject: string | null
  content: string | null
  created_at: string | null
  sender_id: string | null
  is_read: boolean | null
}

type DashboardNegotiationQueueItem = {
  id: string
  offer_title: string | null
  status: string | null
  created_at: string | null
  unread: boolean
}

type DashboardTargetCenter = {
  targetCount: number
  activeOfferCount: number
}

type DashboardCouponPerformance = {
  activeCount: number
  totalUsage: number
  totalBenefitTl: number
}

type DashboardOpsOverview = {
  unansweredReviews: number
  reportedReviews: number
  kasaTodayNet: number
  kasaTodayTx: number
}

type OptionalModuleKey =
  | 'fuel'
  | 'mini_messages'
  | 'negotiation_queue'
  | 'target_center'
  | 'coupon_performance'
  | 'ops_overview'

type AnalyticsPoint = {
  key: string
  label: string
  searchSeen: number
  visits: number
  molaAdds: number
}

const DASHBOARD_OPTIONAL_MODULES_STORAGE_KEY = 'merchant_dashboard_optional_modules_v1'
const OPTIONAL_MODULE_KEYS: OptionalModuleKey[] = [
  'fuel',
  'mini_messages',
  'negotiation_queue',
  'target_center',
  'coupon_performance',
  'ops_overview',
]

function toDayKey(value: Date): string {
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildLastNDaySlots(days: number): Array<{ key: string; label: string }> {
  const slots: Array<{ key: string; label: string }> = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const current = new Date(today.getTime() - offset * 24 * 60 * 60 * 1000)
    const key = toDayKey(current)
    const label = current.toLocaleDateString('tr-TR', { weekday: 'short' }).replace('.', '')
    slots.push({ key, label: label.toUpperCase() })
  }

  return slots
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
  const [quickModulesLoading, setQuickModulesLoading] = useState(false)
  const [miniMessages, setMiniMessages] = useState<DashboardMiniMessage[]>([])
  const [quickReplyMessageId, setQuickReplyMessageId] = useState('')
  const [quickReplyText, setQuickReplyText] = useState('')
  const [sendingQuickReply, setSendingQuickReply] = useState(false)
  const [negotiationQueue, setNegotiationQueue] = useState<DashboardNegotiationQueueItem[]>([])
  const [targetCenter, setTargetCenter] = useState<DashboardTargetCenter>({
    targetCount: 0,
    activeOfferCount: 0,
  })
  const [couponPerformance, setCouponPerformance] = useState<DashboardCouponPerformance>({
    activeCount: 0,
    totalUsage: 0,
    totalBenefitTl: 0,
  })
  const [opsOverview, setOpsOverview] = useState<DashboardOpsOverview>({
    unansweredReviews: 0,
    reportedReviews: 0,
    kasaTodayNet: 0,
    kasaTodayTx: 0,
  })
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsSeries, setAnalyticsSeries] = useState<AnalyticsPoint[]>([])
  const [enabledOptionalModules, setEnabledOptionalModules] = useState<OptionalModuleKey[]>(OPTIONAL_MODULE_KEYS)
  const [draggingModuleKey, setDraggingModuleKey] = useState<OptionalModuleKey | null>(null)
  const [dragOverModuleKey, setDragOverModuleKey] = useState<OptionalModuleKey | null>(null)

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId) || null
  const selectedQuickReplyMessage = miniMessages.find((message) => message.id === quickReplyMessageId) || null
  const selectedBusinessHasLocation =
    Number.isFinite(Number(selectedBusiness?.lat)) && Number.isFinite(Number(selectedBusiness?.lng))
  const hiddenOptionalModules = OPTIONAL_MODULE_KEYS.filter((key) => !enabledOptionalModules.includes(key))
  const optionalModuleLabelMap: Record<OptionalModuleKey, string> = {
    fuel: 'Yakıt Fiyatları',
    mini_messages: 'Mini Mesaj Merkezi',
    negotiation_queue: 'Konvoy Görüşme Kuyruğu',
    target_center: 'Hedefli Teklif Merkezi',
    coupon_performance: 'Kupon Performansı',
    ops_overview: 'Yorum + Kasa Özet',
  }

  const resetFuelModuleState = () => {
    setFuelModuleEnabled(false)
    setFuelModuleLoading(false)
    setSavingFuel(false)
    setFuelNotice(null)
    setFuelPrices(createEmptyFuelPrices())
  }

  const resetQuickModuleState = () => {
    setMiniMessages([])
    setQuickReplyMessageId('')
    setQuickReplyText('')
    setNegotiationQueue([])
    setTargetCenter({
      targetCount: 0,
      activeOfferCount: 0,
    })
    setCouponPerformance({
      activeCount: 0,
      totalUsage: 0,
      totalBenefitTl: 0,
    })
    setOpsOverview({
      unansweredReviews: 0,
      reportedReviews: 0,
      kasaTodayNet: 0,
      kasaTodayTx: 0,
    })
  }

  const normalizeOptionalModules = (input: unknown): OptionalModuleKey[] => {
    if (!Array.isArray(input)) {
      return OPTIONAL_MODULE_KEYS
    }

    const valid = input
      .filter((item): item is OptionalModuleKey => typeof item === 'string' && OPTIONAL_MODULE_KEYS.includes(item as OptionalModuleKey))

    const unique = Array.from(new Set(valid))
    const missing = OPTIONAL_MODULE_KEYS.filter((key) => !unique.includes(key))
    const combined = [...unique, ...missing]

    return combined.length > 0 ? combined : OPTIONAL_MODULE_KEYS
  }

  const addOptionalModule = (moduleKey: OptionalModuleKey) => {
    setEnabledOptionalModules((current) => {
      if (current.includes(moduleKey)) return current
      return [...current, moduleKey]
    })
  }

  const removeOptionalModule = (moduleKey: OptionalModuleKey) => {
    setEnabledOptionalModules((current) => current.filter((key) => key !== moduleKey))
  }

  const reorderOptionalModules = (source: OptionalModuleKey, target: OptionalModuleKey) => {
    if (source === target) return
    setEnabledOptionalModules((current) => {
      const sourceIndex = current.indexOf(source)
      const targetIndex = current.indexOf(target)
      if (sourceIndex < 0 || targetIndex < 0) return current

      const next = [...current]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
  }

  const loadQuickModules = async () => {
    if (!userId || !selectedBusiness) {
      resetQuickModuleState()
      setAnalyticsSeries([])
      setAnalyticsLoading(false)
      return
    }

    setQuickModulesLoading(true)
    setAnalyticsLoading(true)
    const businessId = selectedBusiness.id
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    sevenDaysAgo.setHours(0, 0, 0, 0)
    const sevenDaysAgoIso = sevenDaysAgo.toISOString()
    const todayKey = toDayKey(now)

    const fetchVisitTimelineRows = async () => {
      const primary = await supabase
        .from('user_coupons')
        .select('used_at, created_at')
        .eq('business_id', businessId)
        .eq('status', 'used')
        .gte('used_at', sevenDaysAgoIso)

      if (!primary.error) {
        return (primary.data || []) as Array<{ used_at?: string | null; created_at?: string | null }>
      }

      const fallback = await supabase
        .from('user_coupons')
        .select('used_at, created_at')
        .eq('business_id', businessId)
        .eq('status', 'used')
        .gte('created_at', sevenDaysAgoIso)

      if (fallback.error) {
        return []
      }

      return (fallback.data || []) as Array<{ used_at?: string | null; created_at?: string | null }>
    }

    const fetchMolaTargetTimelineRows = async (): Promise<Array<{ stop_added_at?: string | null; last_offer_at?: string | null }>> => {
      const v2 = await supabase.rpc('get_mola_targets_for_business_v2', {
        p_business_id: businessId,
      })
      if (!v2.error && Array.isArray(v2.data)) {
        return (v2.data || []) as Array<{ stop_added_at?: string | null; last_offer_at?: string | null }>
      }

      const v1 = await supabase.rpc('get_mola_targets_for_business', {
        p_business_id: businessId,
      })
      if (!v1.error && Array.isArray(v1.data)) {
        return (v1.data || []) as Array<{ stop_added_at?: string | null; last_offer_at?: string | null }>
      }

      return []
    }

    const fetchSearchTimelineRows = async (): Promise<Array<{ sent_at?: string | null; created_at?: string | null }>> => {
      const primary = await supabase
        .from('mola_business_offers')
        .select('sent_at')
        .eq('business_id', businessId)
        .gte('sent_at', sevenDaysAgoIso)

      if (!primary.error) {
        return (primary.data || []) as Array<{ sent_at?: string | null; created_at?: string | null }>
      }

      const fallback = await supabase
        .from('mola_business_offers')
        .select('created_at')
        .eq('business_id', businessId)
        .gte('created_at', sevenDaysAgoIso)

      if (fallback.error) {
        return []
      }

      return (fallback.data || []) as Array<{ sent_at?: string | null; created_at?: string | null }>
    }

    try {
      const [
        directMessagesRes,
        queueRes,
        reviewsRes,
        activeCouponsRes,
        usedCouponsRes,
        targetsCountRes,
        activeTargetOffersCountRes,
        molaTimelineRes,
        visitTimelineRows,
        searchTimelineRows,
      ] = await Promise.all([
        supabase
          .from('messages')
          .select('id, subject, content, created_at, sender_id, is_read')
          .eq('recipient_id', userId)
          .eq('message_type', 'direct')
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('convoy_offers')
          .select('id, offer_title, status, created_at')
          .eq('business_id', businessId)
          .in('status', ['pending', 'accepted'])
          .order('created_at', { ascending: false })
          .limit(6),
        supabase.from('business_reviews').select('reply, is_reported').eq('business_id', businessId),
        supabase.from('coupon_campaigns').select('id').eq('business_id', businessId).eq('is_active', true),
        supabase
          .from('user_coupons')
          .select('*, coupon_campaigns(discount_type, monetary_value)')
          .eq('business_id', businessId)
          .eq('status', 'used')
          .order('used_at', { ascending: false })
          .limit(250),
        supabase
          .from('user_mola_stops')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('status', 'active'),
        supabase
          .from('mola_business_offers')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .in('status', ['sent', 'active']),
        supabase
          .from('user_mola_stops')
          .select('created_at')
          .eq('business_id', businessId)
          .gte('created_at', sevenDaysAgoIso),
        fetchVisitTimelineRows(),
        fetchSearchTimelineRows(),
      ])

      const directMessages = (directMessagesRes.data || []) as DashboardMiniMessage[]
      setMiniMessages(directMessages)
      setQuickReplyMessageId((current) => {
        if (current && directMessages.some((message) => message.id === current)) {
          return current
        }
        return directMessages[0]?.id || ''
      })

      const queueItemsRaw = (queueRes.data || []) as Array<{
        id: string
        offer_title: string | null
        status: string | null
        created_at: string | null
      }>

      const offerIds = queueItemsRaw
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id))

      const unreadOfferIds = new Set<string>()
      if (offerIds.length > 0) {
        const [offerMessagesRes, offerReadsRes] = await Promise.all([
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
        for (const row of (offerMessagesRes.data || []) as Array<{
          offer_id: string
          sender_id: string | null
          created_at: string
        }>) {
          const offerId = row.offer_id?.toString()
          if (!offerId || latestByOffer[offerId]) continue
          latestByOffer[offerId] = { sender_id: row.sender_id, created_at: row.created_at }
        }

        const lastReadByOffer: Record<string, Date> = {}
        for (const row of (offerReadsRes.data || []) as Array<{ offer_id: string; last_read_at: string }>) {
          const offerId = row.offer_id?.toString()
          const readAt = row.last_read_at ? new Date(row.last_read_at) : null
          if (!offerId || !readAt || Number.isNaN(readAt.getTime())) continue
          const old = lastReadByOffer[offerId]
          if (!old || readAt > old) {
            lastReadByOffer[offerId] = readAt
          }
        }

        for (const offerId of offerIds) {
          const latest = latestByOffer[offerId]
          if (!latest) continue
          if (latest.sender_id === userId) continue

          const latestAt = new Date(latest.created_at)
          if (Number.isNaN(latestAt.getTime())) continue
          const readAt = lastReadByOffer[offerId]
          if (!readAt || latestAt > readAt) {
            unreadOfferIds.add(offerId)
          }
        }
      }

      setNegotiationQueue(
        queueItemsRaw.map((item) => ({
          ...item,
          unread: unreadOfferIds.has(item.id),
        }))
      )

      const reviewRows = (reviewsRes.data || []) as Array<{ reply?: string | null; is_reported?: boolean | null }>
      const unansweredReviews = reviewRows.filter((row) => !(row.reply || '').trim()).length
      const reportedReviews = reviewRows.filter((row) => row.is_reported === true).length

      const usedRows = (usedCouponsRes.data || []) as Array<{
        coupon_campaigns?: { discount_type?: string | null; monetary_value?: number | null } | { discount_type?: string | null; monetary_value?: number | null }[] | null
        [key: string]: unknown
      }>
      let totalBenefitTl = 0
      for (const row of usedRows) {
        const campaignRaw = row.coupon_campaigns
        const campaign = (Array.isArray(campaignRaw) ? campaignRaw[0] : campaignRaw) || null
        const discountType = (campaign?.discount_type || '').toString()

        if (discountType === 'percentage') {
          totalBenefitTl += firstPositiveFromKeys(row as Record<string, unknown>, [
            'discount_amount',
            'discount_tl',
            'discount_value_tl',
            'benefit_tl',
            'benefit_amount',
            'applied_discount_amount',
          ])
          continue
        }

        if (discountType === 'free') {
          totalBenefitTl += Math.max(0, toSafeNumber(campaign?.monetary_value))
        }
      }

      setCouponPerformance({
        activeCount: (activeCouponsRes.data || []).length,
        totalUsage: usedRows.length,
        totalBenefitTl,
      })

      const targetsCount = targetsCountRes.count || 0
      const activeOfferCount = activeTargetOffersCountRes.count || 0
      setTargetCenter({
        targetCount: targetsCount,
        activeOfferCount,
      })

      let kasaTodayNet = 0
      let kasaTodayTx = 0
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)

      const { data: kasaData, error: kasaError } = await supabase.rpc('get_merchant_kasa_summary_v1', {
        p_business_id: businessId,
        p_from: start.toISOString(),
        p_to: end.toISOString(),
      })

      if (!kasaError && kasaData && typeof kasaData === 'object') {
        const kasaMap = kasaData as Record<string, unknown>
        if (String(kasaMap.status || 'ok') === 'ok') {
          kasaTodayNet = toSafeNumber(kasaMap.merchant_net_amount)
          kasaTodayTx = Math.trunc(toSafeNumber(kasaMap.tx_count))
        }
      }

      setOpsOverview({
        unansweredReviews,
        reportedReviews,
        kasaTodayNet,
        kasaTodayTx,
      })

      const slots = buildLastNDaySlots(7)
      const slotMap = new Map<string, AnalyticsPoint>(
        slots.map((slot) => [
          slot.key,
          {
            key: slot.key,
            label: slot.label,
            searchSeen: 0,
            visits: 0,
            molaAdds: 0,
          },
        ])
      )

      const addTimelinePoint = (
        rawValue: string | null | undefined,
        metric: 'searchSeen' | 'visits' | 'molaAdds'
      ): boolean => {
        const raw = (rawValue || '').trim()
        if (!raw) return false
        const dt = new Date(raw)
        if (Number.isNaN(dt.getTime())) return false
        const key = toDayKey(dt)
        const slot = slotMap.get(key)
        if (!slot) return false
        slot[metric] += 1
        return true
      }

      const todaySlot = slotMap.get(todayKey)
      let molaApplied = 0
      let visitApplied = 0
      let searchApplied = 0

      for (const row of (molaTimelineRes.data || []) as Array<{ created_at?: string | null }>) {
        if (addTimelinePoint(row.created_at, 'molaAdds')) {
          molaApplied += 1
        }
      }

      for (const row of visitTimelineRows) {
        if (addTimelinePoint(row.used_at || row.created_at, 'visits')) {
          visitApplied += 1
        }
      }

      for (const row of searchTimelineRows) {
        if (addTimelinePoint(row.sent_at || row.created_at, 'searchSeen')) {
          searchApplied += 1
        }
      }

      if (molaApplied === 0 || searchApplied === 0) {
        const targetTimelineRows = await fetchMolaTargetTimelineRows()
        let targetMolaApplied = 0
        let targetSearchApplied = 0

        for (const row of targetTimelineRows) {
          if (molaApplied === 0 && addTimelinePoint(row.stop_added_at, 'molaAdds')) {
            targetMolaApplied += 1
          }
          if (searchApplied === 0 && addTimelinePoint(row.last_offer_at, 'searchSeen')) {
            targetSearchApplied += 1
          }
        }

        if (molaApplied === 0 && targetMolaApplied === 0 && targetTimelineRows.length > 0 && todaySlot) {
          todaySlot.molaAdds = Math.max(todaySlot.molaAdds, targetTimelineRows.length)
        }

        molaApplied += targetMolaApplied
        searchApplied += targetSearchApplied
      }

      if (visitApplied === 0 && todaySlot) {
        const usedCountRes = await supabase
          .from('user_coupons')
          .select('id', { head: true, count: 'exact' })
          .eq('business_id', businessId)
          .eq('status', 'used')

        const usedCount = usedCountRes.error ? 0 : usedCountRes.count || 0
        if (usedCount > 0) {
          todaySlot.visits = Math.max(todaySlot.visits, usedCount)
        }
      }

      if (searchApplied === 0 && todaySlot) {
        const businessSearchTotal = metricValueFromBusinessRow(
          selectedBusiness,
          [
            'view_count',
            'views_count',
            'views',
            'goruntulenme_count',
            'goruntulenme',
            'impression_count',
            'impressions_count',
            'show_count',
          ],
          ['view', 'goruntu', 'gosterim', 'impression']
        )
        if (businessSearchTotal > 0) {
          todaySlot.searchSeen = Math.max(todaySlot.searchSeen, businessSearchTotal)
        }
      }

      setAnalyticsSeries(slots.map((slot) => slotMap.get(slot.key) || { key: slot.key, label: slot.label, searchSeen: 0, visits: 0, molaAdds: 0 }))
    } catch {
      resetQuickModuleState()
      setPanelError((current) => current || 'Hızlı modül verileri yüklenemedi. Sayfayı yenileyin.')
    } finally {
      setQuickModulesLoading(false)
      setAnalyticsLoading(false)
    }
  }

  const handleSendQuickReply = async () => {
    if (!userId || !selectedQuickReplyMessage || !selectedQuickReplyMessage.sender_id || !quickReplyText.trim()) {
      return
    }

    setSendingQuickReply(true)
    setNotice(null)

    try {
      const subjectBase = (selectedQuickReplyMessage.subject || 'Mesaj').trim()
      const subject = subjectBase.startsWith('Ynt:') ? subjectBase : `Ynt: ${subjectBase}`

      const { error } = await supabase.from('messages').insert({
        sender_id: userId,
        recipient_id: selectedQuickReplyMessage.sender_id,
        subject,
        content: quickReplyText.trim(),
        message_type: 'direct',
      })

      if (error) {
        throw error
      }

      setQuickReplyText('')
      setNotice({ type: 'success', message: 'Hızlı yanıt gönderildi.' })
      await loadQuickModules()
    } catch {
      setNotice({ type: 'error', message: 'Hızlı yanıt gönderilemedi.' })
    } finally {
      setSendingQuickReply(false)
    }
  }

  const handleBusinessSelectionChange = (businessId: string) => {
    setSelectedBusinessId(businessId)
    setQuickReplyText('')
    setQuickReplyMessageId('')
    setPanelError(null)
    resetQuickModuleState()
    setAnalyticsSeries([])
    setFuelPrices(createEmptyFuelPrices())
  }

  const refreshSelectedBusinessData = () => {
    void refreshStats()
    void loadQuickModules()
    if (selectedBusiness) {
      void resolveFuelModule(selectedBusiness)
    }
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
        resetQuickModuleState()
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
      resetQuickModuleState()
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
    if (!userId || typeof window === 'undefined') {
      setEnabledOptionalModules(OPTIONAL_MODULE_KEYS)
      return
    }

    try {
      const raw = window.localStorage.getItem(`${DASHBOARD_OPTIONAL_MODULES_STORAGE_KEY}:${userId}`)
      if (!raw) {
        setEnabledOptionalModules(OPTIONAL_MODULE_KEYS)
        return
      }
      const parsed = JSON.parse(raw)
      setEnabledOptionalModules(normalizeOptionalModules(parsed))
    } catch {
      setEnabledOptionalModules(OPTIONAL_MODULE_KEYS)
    }
  }, [userId])

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return

    window.localStorage.setItem(
      `${DASHBOARD_OPTIONAL_MODULES_STORAGE_KEY}:${userId}`,
      JSON.stringify(enabledOptionalModules)
    )
  }, [userId, enabledOptionalModules])

  useEffect(() => {
    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedBusinessId) {
      return
    }

    refreshStats()
    loadQuickModules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId, userId])

  useEffect(() => {
    if (!selectedBusinessId || !userId) {
      return
    }

    const intervalId = window.setInterval(() => {
      refreshStats()
      loadQuickModules()
    }, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
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

  const analyticsTotals = useMemo(() => {
    return analyticsSeries.reduce(
      (acc, row) => {
        acc.searchSeen += row.searchSeen
        acc.visits += row.visits
        acc.molaAdds += row.molaAdds
        return acc
      },
      { searchSeen: 0, visits: 0, molaAdds: 0 }
    )
  }, [analyticsSeries])

  const analyticsMax = useMemo(() => {
    const max = Math.max(
      1,
      ...analyticsSeries.map((item) => Math.max(item.searchSeen, item.visits, item.molaAdds))
    )
    return max
  }, [analyticsSeries])

  const optionalModuleMetaMap: Record<OptionalModuleKey, { title: string; icon: LucideIcon }> = {
    fuel: { title: 'Yakıt Fiyatları', icon: Fuel },
    mini_messages: { title: 'Mini Mesaj Merkezi', icon: MessageSquare },
    negotiation_queue: { title: 'Konvoy Görüşme Kuyruğu', icon: Route },
    target_center: { title: 'Hedefli Teklif Merkezi', icon: Radio },
    coupon_performance: { title: 'Kupon Performansı', icon: Ticket },
    ops_overview: { title: 'Yorum + Kasa Özet', icon: ReceiptText },
  }

  const renderOptionalModuleBody = (moduleKey: OptionalModuleKey) => {
    if (moduleKey === 'fuel') {
      if (fuelModuleLoading) {
        return (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 text-[#64748b] animate-spin" />
          </div>
        )
      }

      if (!fuelModuleEnabled) {
        return (
          <div className="rounded border border-dashed border-[#2d313a] bg-[#0a0c10] px-4 py-6 text-center text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
            Bu işletmede yakıt modülü aktif değil.
          </div>
        )
      }

      return (
        <div className="space-y-4">
          <div className="space-y-3">
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
            className="w-full py-3 rounded font-mono text-[11px] tracking-widest uppercase flex items-center justify-center gap-2.5 disabled:opacity-50 bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110"
          >
            {savingFuel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
            {savingFuel ? 'Kaydediliyor...' : 'Fiyatları kaydet'}
          </button>
        </div>
      )
    }

    if (moduleKey === 'mini_messages') {
      if (quickModulesLoading) {
        return (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 text-[#64748b] animate-spin" />
          </div>
        )
      }

      if (miniMessages.length === 0) {
        return (
          <div className="rounded border border-dashed border-[#2d313a] bg-[#0a0c10] px-4 py-6 text-center text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
            Direkt mesaj bulunamadı.
          </div>
        )
      }

      return (
        <div className="space-y-4">
          <div className="space-y-2 max-h-[210px] overflow-y-auto custom-scrollbar pr-1">
            {miniMessages.map((message) => (
              <button
                key={message.id}
                type="button"
                onClick={() => setQuickReplyMessageId(message.id)}
                className={`w-full text-left rounded border px-3 py-2.5 transition-colors ${
                  quickReplyMessageId === message.id
                    ? 'border-[#226785] bg-[#153445]'
                    : 'border-[#2d313a] bg-[#0a0c10] hover:border-[#475569]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-mono text-[#e2e8f0] uppercase tracking-wide truncate">
                    {(message.subject || 'Başlıksız').slice(0, 42)}
                  </p>
                  <span className={`text-[9px] font-mono uppercase tracking-widest ${message.is_read ? 'text-[#64748b]' : 'text-amber-400'}`}>
                    {message.is_read ? 'OKUNDU' : 'YENİ'}
                  </span>
                </div>
                <p className="mt-1 text-[9px] font-mono text-[#64748b] uppercase tracking-widest">
                  {formatDateTime(message.created_at)}
                </p>
              </button>
            ))}
          </div>

          <textarea
            value={quickReplyText}
            maxLength={220}
            onChange={(event) => setQuickReplyText(event.target.value.slice(0, 220))}
            disabled={!selectedQuickReplyMessage?.sender_id}
            className="w-full min-h-[80px] rounded bg-[#0a0c10] border border-[#2d313a] px-3 py-2.5 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 disabled:opacity-50 resize-none custom-scrollbar placeholder:text-[#475569]"
            placeholder="Seçili mesaja hızlı yanıt yaz..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleSendQuickReply}
              disabled={sendingQuickReply || !selectedQuickReplyMessage?.sender_id || !quickReplyText.trim()}
              className="inline-flex items-center justify-center gap-2 rounded px-4 py-2.5 bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] text-[10px] font-mono uppercase tracking-widest border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {sendingQuickReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Yanıt Gönder
            </button>
            <Link
              href="/merchant/messages"
              className="inline-flex items-center justify-center rounded px-4 py-2.5 border border-[#2d313a] bg-[#16181d] text-[#94a3b8] text-[10px] font-mono uppercase tracking-widest hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
            >
              Mesaj Merkezine Git
            </Link>
          </div>
        </div>
      )
    }

    if (moduleKey === 'negotiation_queue') {
      if (quickModulesLoading) {
        return (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 text-[#64748b] animate-spin" />
          </div>
        )
      }

      if (negotiationQueue.length === 0) {
        return (
          <div className="rounded border border-dashed border-[#2d313a] bg-[#0a0c10] px-4 py-6 text-center text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
            Aktif görüşme kaydı yok.
          </div>
        )
      }

      return (
        <div className="space-y-2">
          {negotiationQueue.map((item) => (
            <Link
              key={item.id}
              href={`/merchant/negotiation/${item.id}`}
              className="block rounded border border-[#2d313a] bg-[#0a0c10] px-3 py-2.5 hover:border-[#475569] transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-mono text-[#e2e8f0] uppercase tracking-wide truncate">
                  {(item.offer_title || 'Başlıksız teklif').slice(0, 48)}
                </p>
                <span className={`text-[9px] font-mono uppercase tracking-widest ${item.unread ? 'text-amber-400' : 'text-[#64748b]'}`}>
                  {item.unread ? 'YENİ' : 'TAKİP'}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest">
                  {negotiationStatusLabel(item.status)}
                </span>
                <span className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest">
                  {formatDateTime(item.created_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )
    }

    if (moduleKey === 'target_center') {
      return (
        <div className="space-y-4">
          <div className={`rounded border px-3 py-2 text-[9px] font-mono uppercase tracking-widest ${
            selectedBusinessHasLocation
              ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400'
              : 'bg-amber-950/20 border-amber-900/50 text-amber-400'
          }`}>
            Konum Durumu: {selectedBusinessHasLocation ? 'Hazır' : 'Eksik'}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
              <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Mola Hedefi</p>
              <p className="mt-1 text-lg font-mono text-[#e2e8f0]">{formatCount(targetCenter.targetCount)}</p>
            </div>
            <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
              <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Aktif Teklif</p>
              <p className="mt-1 text-lg font-mono text-[#e2e8f0]">{formatCount(targetCenter.activeOfferCount)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Link
              href="/merchant/radar"
              className="inline-flex items-center justify-center gap-2 rounded px-3 py-2.5 border border-[#2d313a] bg-[#16181d] text-[#94a3b8] text-[10px] font-mono uppercase tracking-widest hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
            >
              <Radio className="w-3.5 h-3.5" /> Radar
            </Link>
            <Link
              href="/merchant/mola-targets"
              className="inline-flex items-center justify-center gap-2 rounded px-3 py-2.5 border border-[#2d313a] bg-[#16181d] text-[#94a3b8] text-[10px] font-mono uppercase tracking-widest hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
            >
              <Compass className="w-3.5 h-3.5" /> Mola Hedefleri
            </Link>
          </div>
        </div>
      )
    }

    if (moduleKey === 'coupon_performance') {
      return (
        <div className="space-y-3">
          <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
            <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Aktif Kupon</p>
            <p className="mt-1 text-lg font-mono text-[#e2e8f0]">{formatCount(couponPerformance.activeCount)}</p>
          </div>
          <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
            <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Kullanım (Toplam)</p>
            <p className="mt-1 text-lg font-mono text-[#e2e8f0]">{formatCount(couponPerformance.totalUsage)}</p>
          </div>
          <div className="rounded border border-[#166534] bg-[#14532d]/20 p-3">
            <p className="text-[9px] font-mono uppercase tracking-widest text-emerald-500/80">Toplam Fayda</p>
            <p className="mt-1 text-lg font-mono text-emerald-400">{formatMoney(couponPerformance.totalBenefitTl)}</p>
          </div>
          <Link
            href="/merchant/coupons"
            className="inline-flex w-full items-center justify-center rounded px-3 py-2.5 border border-[#2d313a] bg-[#16181d] text-[#94a3b8] text-[10px] font-mono uppercase tracking-widest hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
          >
            Kupon Yönetimine Git
          </Link>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
            <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Cevapsız</p>
            <p className="mt-1 text-lg font-mono text-amber-400">{formatCount(opsOverview.unansweredReviews)}</p>
          </div>
          <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
            <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Bildirilen</p>
            <p className="mt-1 text-lg font-mono text-rose-400">{formatCount(opsOverview.reportedReviews)}</p>
          </div>
        </div>
        <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Bugün Net Gelir</p>
          <p className="mt-1 text-lg font-mono text-[#e2e8f0]">{formatMoney(opsOverview.kasaTodayNet)}</p>
          <p className="mt-1 text-[9px] font-mono uppercase tracking-widest text-[#64748b]">
            İşlem: {formatCount(opsOverview.kasaTodayTx)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/merchant/reviews"
            className="inline-flex items-center justify-center rounded px-3 py-2.5 border border-[#2d313a] bg-[#16181d] text-[#94a3b8] text-[10px] font-mono uppercase tracking-widest hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
          >
            Yorumlar
          </Link>
          <Link
            href="/merchant/kasa"
            className="inline-flex items-center justify-center rounded px-3 py-2.5 border border-[#2d313a] bg-[#16181d] text-[#94a3b8] text-[10px] font-mono uppercase tracking-widest hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
          >
            Kasa
          </Link>
        </div>
      </div>
    )
  }

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
            <div className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
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
              onClick={() => {
                void loadInitialData()
                void refreshStats()
                void loadQuickModules()
              }}
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <HardwarePanel className="h-full">
                <div className="flex items-center gap-2 mb-6 border-b border-[#2d313a] pb-4">
                  <Terminal strokeWidth={1.5} className="w-4 h-4 text-[#38bdf8]" />
                  <h2 className="text-sm font-mono text-[#e2e8f0] tracking-widest uppercase">İşletme Kontrolü</h2>
                </div>

                <div className="space-y-6 h-full flex flex-col">
                  <div className="group">
                    <label className="text-[10px] font-mono text-[#64748b] uppercase tracking-[0.1em] mb-2 block">İşletme Seç</label>
                    <select
                      className="w-full bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm px-4 py-3 rounded outline-none focus:border-[#38bdf8]/50 appearance-none uppercase tracking-wide"
                      value={selectedBusinessId}
                      onChange={(e) => handleBusinessSelectionChange(e.target.value)}
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

                  <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 space-y-3 mt-auto">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Seçim Kapsamı</span>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[#38bdf8] border border-[#38bdf8]/30 bg-[#38bdf8]/10 px-2 py-0.5 rounded">
                        GLOBAL
                      </span>
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] leading-relaxed">
                      Seçilen işletme tüm dashboard modüllerinde ortak veri kaynağıdır.
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded border border-[#2d313a] bg-[#16181d] p-2.5">
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Konum</p>
                        <p className={`mt-1 text-[10px] font-mono uppercase tracking-widest ${selectedBusinessHasLocation ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {selectedBusinessHasLocation ? 'Hazır' : 'Eksik'}
                        </p>
                      </div>
                      <div className="rounded border border-[#2d313a] bg-[#16181d] p-2.5">
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Aktif Modül</p>
                        <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0]">
                          {formatCount(enabledOptionalModules.length)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Link
                        href="/merchant/businesses"
                        className="inline-flex items-center justify-center rounded px-3 py-2.5 border border-[#2d313a] bg-[#16181d] text-[#94a3b8] text-[9px] font-mono uppercase tracking-widest hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
                      >
                        Şubelerim
                      </Link>
                      <button
                        type="button"
                        onClick={refreshSelectedBusinessData}
                        className="inline-flex items-center justify-center rounded px-3 py-2.5 border border-[#2d313a] bg-[#16181d] text-[#94a3b8] text-[9px] font-mono uppercase tracking-widest hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
                      >
                        Bu İşletmeyi Yenile
                      </button>
                    </div>
                  </div>
                </div>
              </HardwarePanel>

              <HardwarePanel className="h-full">
                <div className="flex items-center justify-between mb-6 border-b border-[#2d313a] pb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 strokeWidth={1.5} className="w-4 h-4 text-[#38bdf8]" />
                    <h2 className="text-sm font-mono text-[#e2e8f0] tracking-widest uppercase">Canlı Ziyaret Grafiği</h2>
                  </div>
                  <span className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest">SON 7 GÜN</span>
                </div>

                {analyticsLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="w-5 h-5 text-[#64748b] animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4 h-full flex flex-col">
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Aramada Görüldü</p>
                        <p className="mt-1 text-lg font-mono text-[#e2e8f0]">{formatCount(analyticsTotals.searchSeen)}</p>
                      </div>
                      <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Ziyaret Etti</p>
                        <p className="mt-1 text-lg font-mono text-[#e2e8f0]">{formatCount(analyticsTotals.visits)}</p>
                      </div>
                      <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-3">
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Mola&#39;ya Ekledi</p>
                        <p className="mt-1 text-lg font-mono text-[#e2e8f0]">{formatCount(analyticsTotals.molaAdds)}</p>
                      </div>
                    </div>

                    <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 flex-1 flex flex-col justify-between">
                      <div className="h-[170px] flex items-end gap-2">
                        {analyticsSeries.map((point) => (
                          <div key={point.key} className="flex-1 min-w-0 flex flex-col items-center gap-2">
                            <div className="w-full h-[130px] flex items-end justify-center gap-1">
                              <div
                                className="w-1/3 rounded-t bg-[#38bdf8]/85"
                                style={{ height: `${Math.max(4, (point.searchSeen / analyticsMax) * 100)}%` }}
                                title={`Aramada Görüldü: ${point.searchSeen}`}
                              />
                              <div
                                className="w-1/3 rounded-t bg-emerald-500/85"
                                style={{ height: `${Math.max(4, (point.visits / analyticsMax) * 100)}%` }}
                                title={`Ziyaret Etti: ${point.visits}`}
                              />
                              <div
                                className="w-1/3 rounded-t bg-amber-400/85"
                                style={{ height: `${Math.max(4, (point.molaAdds / analyticsMax) * 100)}%` }}
                                title={`Mola'ya Ekledi: ${point.molaAdds}`}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest">{point.label}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-[9px] font-mono uppercase tracking-widest text-[#64748b]">
                        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-[#38bdf8]/85" /> Aramada Görüldü</span>
                        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-500/85" /> Ziyaret Etti</span>
                        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-amber-400/85" /> Mola&#39;ya Ekledi</span>
                      </div>
                    </div>
                  </div>
                )}
              </HardwarePanel>
            </div>

            <HardwarePanel>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5 border-b border-[#2d313a] pb-4">
                <div>
                  <h3 className="text-sm font-mono text-[#e2e8f0] tracking-widest uppercase">Modül Alanı</h3>
                  <p className="mt-2 text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    Sürükle bırak ile sırala. İstediğini kaldır, istediğini tekrar ekle.
                  </p>
                  <p className="mt-2 text-[10px] font-mono text-[#38bdf8] uppercase tracking-widest">
                    Aktif İşletme: {(selectedBusiness?.name || '-').toUpperCase()}
                  </p>
                </div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">
                  Aktif Modül: {enabledOptionalModules.length}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Kaldırılmış Modüller</p>
                {hiddenOptionalModules.length === 0 ? (
                  <div className="rounded border border-dashed border-[#2d313a] bg-[#0a0c10] px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                    Tüm modüller aktif.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {hiddenOptionalModules.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => addOptionalModule(key)}
                        className="inline-flex items-center gap-2 rounded border border-[#2d313a] bg-[#16181d] px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] hover:border-[#475569] transition-colors"
                      >
                        + {optionalModuleLabelMap[key]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </HardwarePanel>

            {enabledOptionalModules.length === 0 ? (
              <HardwarePanel>
                <div className="rounded border border-dashed border-[#2d313a] bg-[#0a0c10] px-4 py-8 text-center text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                  Aktif modül yok. Üstteki listeden modül ekleyebilirsin.
                </div>
              </HardwarePanel>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                {enabledOptionalModules.map((moduleKey) => {
                  const meta = optionalModuleMetaMap[moduleKey]
                  const Icon = meta.icon
                  const dragging = draggingModuleKey === moduleKey
                  const dragOver = dragOverModuleKey === moduleKey

                  return (
                    <div
                      key={moduleKey}
                      draggable
                      onDragStart={() => setDraggingModuleKey(moduleKey)}
                      onDragEnd={() => {
                        setDraggingModuleKey(null)
                        setDragOverModuleKey(null)
                      }}
                      onDragOver={(event) => {
                        event.preventDefault()
                        if (dragOverModuleKey !== moduleKey) {
                          setDragOverModuleKey(moduleKey)
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        if (draggingModuleKey) {
                          reorderOptionalModules(draggingModuleKey, moduleKey)
                        }
                        setDraggingModuleKey(null)
                        setDragOverModuleKey(null)
                      }}
                      className={`h-full ${dragging ? 'opacity-70' : ''}`}
                    >
                      <HardwarePanel className={`h-full ${dragOver ? 'ring-1 ring-[#38bdf8]/50' : ''}`}>
                        <div className="flex items-center justify-between mb-5 border-b border-[#2d313a] pb-4">
                          <div className="flex items-center gap-2">
                            <Icon strokeWidth={1.5} className="w-4 h-4 text-[#38bdf8]" />
                            <h2 className="text-sm font-mono text-[#e2e8f0] tracking-widest uppercase">{meta.title}</h2>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-[#64748b] px-2 py-1 rounded border border-[#2d313a] bg-[#0a0c10] cursor-move">
                              <GripVertical className="w-3 h-3" />
                              Sürükle
                            </span>
                            <button
                              type="button"
                              onClick={() => removeOptionalModule(moduleKey)}
                              className="text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded border border-rose-900/50 bg-rose-950/20 text-rose-300 hover:bg-rose-900/40 transition-colors"
                            >
                              Kaldır
                            </button>
                          </div>
                        </div>

                        {renderOptionalModuleBody(moduleKey)}
                      </HardwarePanel>
                    </div>
                  )
                })}
              </div>
            )}
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
