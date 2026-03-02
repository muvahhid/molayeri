'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Archive,
  Bike,
  Car,
  ChevronDown,
  ChevronRight,
  Clock3,
  Filter,
  Gauge,
  Loader2,
  MapPin,
  Radar,
  RefreshCw,
  Route,
  Search,
  Send,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import type { MerchantBusiness } from '../_lib/helpers'
import { fetchOwnedBusinesses, requireCurrentUserId } from '../_lib/queries'
import { PanelTitle } from '../_components/panel-title'
import {
  distanceKmBetween,
  getConvoyHeadcountBulk,
  toNumber,
  type ConvoyHeadcountStats,
} from '../_lib/convoy'

type ConvoyRow = {
  id: string
  name: string | null
  description: string | null
  category: string | null
  status: string | null
  start_location: string | null
  end_location: string | null
  start_time: string | null
  leader_id: string | null
  max_headcount?: number | null
  max_vehicles?: number | null
  leader_party_size?: number | null
  leader_live_lat?: number | null
  leader_live_lng?: number | null
  leader_live_updated_at?: string | null
  created_at?: string | null
  profiles?: {
    full_name: string | null
  } | null
}

type NegotiationRow = {
  id: string
  status: string | null
  offer_title: string | null
  offer_details: string | null
  coupon_campaign_id: string | null
  convoy_id?: string | null
  created_at?: string | null
  convoy?: {
    name: string | null
    category: string | null
    start_location: string | null
    end_location: string | null
    start_time: string | null
    status: string | null
  } | null
  captain?: {
    full_name: string | null
  } | null
}

type CouponRow = {
  id: string
  title: string | null
  code: string | null
  discount_type: string | null
  discount_value: number | null
  monetary_value: number | null
  valid_until?: string | null
}

type LeaderLocationRow = {
  convoy_id: string | null
  user_id: string | null
  role: string | null
  current_lat: number | string | null
  current_lng: number | string | null
  last_updated: string | null
}

type DistanceTrend = 'unknown' | 'approaching' | 'passed' | 'away' | 'stable'
type ListTab = 'active' | 'planned' | 'offers'
type SortMode = 'smart' | 'closest' | 'start_time' | 'headcount' | 'recent'
type OfferStatusFilter = 'all' | 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'completed'

type ActiveDetailState = {
  convoy: ConvoyRow
  leaderDistanceKm: number | null
  distanceTrend: DistanceTrend
  leaderLastUpdatedAt: string | null
}

const CATEGORY_FILTERS = ['Hepsi', 'Binek', 'Motosiklet', 'Bisiklet', 'Karavan', 'Kamp'] as const
const OFFER_STATUS_FILTERS: { value: OfferStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'accepted', label: 'Kabul' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'expired', label: 'Süresi Doldu' },
  { value: 'cancelled', label: 'İptal' },
  { value: 'completed', label: 'Tamamlandı' },
]
const DISTANCE_PRESETS = [10, 25, 40, 60, 80] as const
const OFFER_ARCHIVE_LIMIT = 20
const OFFER_ARCHIVE_AGE_MS = 5 * 24 * 60 * 60 * 1000

function normalizeVehicleCategory(raw: unknown): string {
  const value = String(raw || '').trim().toLowerCase()

  if (value === 'karavan' || value === 'caravan') return 'Karavan'
  if (value === 'kamp' || value === 'camp') return 'Kamp'
  if (value === 'motor' || value === 'motosiklet') return 'Motosiklet'
  if (value === 'bisiklet') return 'Bisiklet'

  if (value === 'binek' || value === 'sedan' || value === 'suv' || value === 'ticari' || value === 'uzun') {
    return 'Binek'
  }

  return 'Binek'
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
}

function includesNormalized(haystack: string, normalizedNeedle: string): boolean {
  if (!normalizedNeedle) return true
  return normalizeSearchText(haystack).includes(normalizedNeedle)
}

function categoryColor(category: string): string {
  switch (category) {
    case 'Motosiklet':
      return '#4F83CC'
    case 'Bisiklet':
      return '#4CAF50'
    case 'Karavan':
      return '#8E8CD8'
    case 'Kamp':
      return '#66BB6A'
    default:
      return '#FF7043'
  }
}

function categoryIcon(category: string) {
  switch (category) {
    case 'Motosiklet':
      return <Gauge className="w-4 h-4" />
    case 'Bisiklet':
      return <Bike className="w-4 h-4" />
    default:
      return <Car className="w-4 h-4" />
  }
}

function formatDateTime(raw: unknown): string {
  if (!raw) {
    return '-'
  }

  const dt = new Date(String(raw))
  if (Number.isNaN(dt.getTime())) {
    return '-'
  }

  return dt.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatClock(raw: Date | null): string | null {
  if (!raw) {
    return null
  }

  return raw.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeAgo(raw: string | null): string {
  if (!raw) return 'Bilinmiyor'

  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return 'Bilinmiyor'

  const diffSec = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 1000))

  if (diffSec < 45) return 'Canlı'
  if (diffSec < 60) return 'Az önce'

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} dk önce`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} sa önce`

  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay} gün önce`
}

function isLikelyLive(raw: string | null): boolean {
  if (!raw) return false

  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return false

  return Date.now() - dt.getTime() <= 45_000
}

function trendLabel(trend: DistanceTrend): string {
  switch (trend) {
    case 'approaching':
      return 'YAKLAŞIYOR'
    case 'passed':
      return 'GEÇTİ'
    case 'away':
      return 'UZAKLAŞIYOR'
    case 'stable':
      return 'SABİT'
    default:
      return 'TAKİP'
  }
}

function trendColor(trend: DistanceTrend): string {
  switch (trend) {
    case 'approaching':
      return '#00A86B'
    case 'passed':
      return '#FF7043'
    case 'away':
      return '#7A8798'
    case 'stable':
      return '#5C6C84'
    default:
      return '#29B6F6'
  }
}

function couponBenefitText(coupon: CouponRow): string {
  if (coupon.discount_type === 'percentage') {
    return `%${Math.trunc(coupon.discount_value || 0)} indirim`
  }
  if (coupon.discount_type === 'free') {
    return `Hediye (${Math.trunc(coupon.monetary_value || 0)}₺)`
  }
  if (coupon.discount_type === 'item') {
    return 'Ürün hediyesi'
  }
  return 'Kupon'
}

function couponLabel(coupon: CouponRow): string {
  return `${coupon.title || 'Kupon'} - ${couponBenefitText(coupon)}`
}

function resolveConvoyCategory(item: ConvoyRow | NegotiationRow, isNegotiation: boolean): string {
  if (isNegotiation) {
    const negotiation = item as NegotiationRow
    return normalizeVehicleCategory(negotiation.convoy?.category)
  }

  const convoy = item as ConvoyRow
  if (convoy.category && convoy.category.trim()) {
    return normalizeVehicleCategory(convoy.category)
  }

  const desc = (convoy.description || '').toString()
  const match = desc.match(/Araç Tipi:\s*(Binek|Motor|Motosiklet|Bisiklet|Karavan|Kamp)/i)
  if (match) {
    return normalizeVehicleCategory(match[1])
  }

  return 'Binek'
}

function toTimestamp(raw: string | null | undefined): number {
  if (!raw) return 0
  const dt = new Date(raw)
  const ts = dt.getTime()
  return Number.isNaN(ts) ? 0 : ts
}

function normalizeOfferStatus(raw: unknown): OfferStatusFilter {
  const value = String(raw || '').trim().toLowerCase()

  if (value === 'accepted' || value === 'approved') return 'accepted'
  if (value === 'rejected' || value === 'declined') return 'rejected'
  if (value === 'expired') return 'expired'
  if (value === 'cancelled' || value === 'canceled') return 'cancelled'
  if (value === 'completed' || value === 'done' || value === 'closed') return 'completed'
  return 'pending'
}

function offerStatusLabel(status: OfferStatusFilter): string {
  switch (status) {
    case 'accepted':
      return 'Kabul'
    case 'rejected':
      return 'Reddedildi'
    case 'expired':
      return 'Süresi Doldu'
    case 'cancelled':
      return 'İptal'
    case 'completed':
      return 'Tamamlandı'
    case 'all':
      return 'Tümü'
    default:
      return 'Beklemede'
  }
}

function offerStatusClasses(status: OfferStatusFilter): string {
  switch (status) {
    case 'accepted':
      return 'border border-emerald-900/50 bg-emerald-950/30 text-emerald-400'
    case 'rejected':
      return 'border border-rose-900/50 bg-rose-950/30 text-rose-400'
    case 'expired':
      return 'border border-amber-900/50 bg-amber-950/30 text-amber-400'
    case 'cancelled':
      return 'border border-[#2d313a] bg-[#16181d] text-[#64748b]'
    case 'completed':
      return 'border border-indigo-900/50 bg-indigo-950/30 text-indigo-400'
    default:
      return 'border border-blue-900/50 bg-blue-950/30 text-blue-400'
  }
}

function tabLabel(tab: ListTab): string {
  if (tab === 'planned') return 'Planlanan Konvoylar'
  if (tab === 'offers') return 'Teklif ve Görüşmeler'
  return 'Aktif Konvoylar'
}

function tabDescription(tab: ListTab): string {
  if (tab === 'planned') return 'Yaklaşan konvoyları zaman ve kapasiteye göre yönetin.'
  if (tab === 'offers') return 'Gönderilen teklifleri durumlarına göre filtreleyip görüşmeye geçin.'
  return 'Canlı konum, yaklaşma trendi ve kapasiteyi tek ekranda izleyin.'
}

function sortOptionsForTab(tab: ListTab): { value: SortMode; label: string }[] {
  if (tab === 'offers') {
    return [
      { value: 'smart', label: 'Akıllı' },
      { value: 'recent', label: 'En Yeni' },
      { value: 'start_time', label: 'Konvoy Saati' },
    ]
  }

  if (tab === 'planned') {
    return [
      { value: 'smart', label: 'Akıllı' },
      { value: 'start_time', label: 'Başlangıç Saati' },
      { value: 'headcount', label: 'Katılımcı Sayısı' },
      { value: 'recent', label: 'En Yeni' },
    ]
  }

  return [
    { value: 'smart', label: 'Akıllı' },
    { value: 'closest', label: 'En Yakın' },
    { value: 'start_time', label: 'Başlangıç Saati' },
    { value: 'headcount', label: 'Katılımcı Sayısı' },
    { value: 'recent', label: 'En Yeni' },
  ]
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

function MerchantConvoysPageContent() {
  const supabase = useMemo(() => getBrowserSupabase(), [])
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [filtersExpanded, setFiltersExpanded] = useState(true)
  const [selectedTab, setSelectedTab] = useState<ListTab>('active')
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORY_FILTERS)[number]>('Hepsi')
  const [offerStatusFilter, setOfferStatusFilter] = useState<OfferStatusFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('smart')
  const [searchQuery, setSearchQuery] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [showOfferArchive, setShowOfferArchive] = useState(false)

  const [distanceTargetKm, setDistanceTargetKm] = useState(30)
  const [appliedDistanceKm, setAppliedDistanceKm] = useState<number | null>(null)

  const [isLiveSchemaMissing, setIsLiveSchemaMissing] = useState(false)
  const [merchantLiveLat, setMerchantLiveLat] = useState<number | null>(null)
  const [merchantLiveLng, setMerchantLiveLng] = useState<number | null>(null)
  const [merchantLiveUpdatedAt, setMerchantLiveUpdatedAt] = useState<Date | null>(null)
  const [locationAttempted, setLocationAttempted] = useState(false)

  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')

  const [activeConvoys, setActiveConvoys] = useState<ConvoyRow[]>([])
  const [plannedConvoys, setPlannedConvoys] = useState<ConvoyRow[]>([])
  const [negotiations, setNegotiations] = useState<NegotiationRow[]>([])

  const [activeCoupons, setActiveCoupons] = useState<CouponRow[]>([])
  const [couponById, setCouponById] = useState<Record<string, CouponRow>>({})

  const [headcountByConvoyId, setHeadcountByConvoyId] = useState<Record<string, ConvoyHeadcountStats>>({})
  const [leaderDistanceByConvoyId, setLeaderDistanceByConvoyId] = useState<Record<string, number>>({})
  const [leaderLastUpdatedByConvoyId, setLeaderLastUpdatedByConvoyId] = useState<Record<string, string>>({})
  const [minSeenDistanceByConvoyId, setMinSeenDistanceByConvoyId] = useState<Record<string, number>>({})
  const [distanceTrendByConvoyId, setDistanceTrendByConvoyId] = useState<Record<string, DistanceTrend>>({})

  const [activeDetail, setActiveDetail] = useState<ActiveDetailState | null>(null)
  const [offerTitle, setOfferTitle] = useState('')
  const [offerDetails, setOfferDetails] = useState('')
  const [selectedCouponId, setSelectedCouponId] = useState('__none__')
  const [sendingOffer, setSendingOffer] = useState(false)

  const originLat = merchantLiveLat
  const originLng = merchantLiveLng
  const hasDistanceOrigin = originLat != null && originLng != null

  const selectedCoupon = selectedCouponId === '__none__' ? null : couponById[selectedCouponId]

  const resolveMerchantDistanceOrigin = async (force = false) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationAttempted(true)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationAttempted(true)
        const nextLat = position.coords.latitude
        const nextLng = position.coords.longitude

        const changedEnough =
          merchantLiveLat == null ||
          merchantLiveLng == null ||
          Math.abs(nextLat - merchantLiveLat) > 0.00035 ||
          Math.abs(nextLng - merchantLiveLng) > 0.00035

        if (force || changedEnough) {
          setMerchantLiveLat(nextLat)
          setMerchantLiveLng(nextLng)
          setMerchantLiveUpdatedAt(new Date())
        } else {
          setMerchantLiveUpdatedAt(new Date())
        }
      },
      () => {
        setLocationAttempted(true)
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 20000 }
    )
  }

  const loadBusinesses = async () => {
    const userId = await requireCurrentUserId(supabase)
    if (!userId) {
      setLoading(false)
      return
    }

    const ownedBusinesses = await fetchOwnedBusinesses(supabase, userId)
    setBusinesses(ownedBusinesses)
    setSelectedBusinessId((current) => current || ownedBusinesses[0]?.id || '')

    if (ownedBusinesses.length === 0) {
      setLoading(false)
    }
  }

  const fetchData = async (showLoader = true) => {
    if (!selectedBusinessId) {
      return
    }

    if (showLoader) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      const [activeRes, plannedRes, negotiationRes, couponsRes] = await Promise.all([
        supabase
          .from('convoys')
          .select('*, profiles:leader_id(full_name)')
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('convoys')
          .select('*, profiles:leader_id(full_name)')
          .eq('status', 'pending')
          .order('start_time', { ascending: true }),
        supabase
          .from('convoy_offers')
          .select(
            '*, captain:profiles!captain_id(full_name), convoy:convoys(name, category, start_location, end_location, start_time, status)'
          )
          .eq('business_id', selectedBusinessId)
          .order('created_at', { ascending: false }),
        supabase
          .from('coupon_campaigns')
          .select('id, title, code, discount_type, discount_value, monetary_value, valid_until, is_active')
          .eq('business_id', selectedBusinessId)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
      ])

      if (activeRes.error) throw activeRes.error
      if (plannedRes.error) throw plannedRes.error
      if (negotiationRes.error) throw negotiationRes.error
      if (couponsRes.error) throw couponsRes.error

      const activeList = (activeRes.data || []) as ConvoyRow[]
      const plannedList = (plannedRes.data || []) as ConvoyRow[]
      const negotiationList = (negotiationRes.data || []) as NegotiationRow[]

      const hasLiveColumns =
        activeList.length === 0
          ? true
          : Object.prototype.hasOwnProperty.call(activeList[0], 'leader_live_lat') &&
            Object.prototype.hasOwnProperty.call(activeList[0], 'leader_live_lng') &&
            Object.prototype.hasOwnProperty.call(activeList[0], 'leader_live_updated_at')

      const nextLeaderLocationByConvoyId: Record<string, { lat: number; lng: number }> = {}
      const nextLeaderUpdatedByConvoyId: Record<string, string> = {}

      for (const convoy of activeList) {
        const convoyId = String(convoy.id || '')
        if (!convoyId) continue

        const liveLat = toNumber(convoy.leader_live_lat)
        const liveLng = toNumber(convoy.leader_live_lng)
        const liveAt = convoy.leader_live_updated_at ? String(convoy.leader_live_updated_at) : null

        if (liveLat == null || liveLng == null) continue

        nextLeaderLocationByConvoyId[convoyId] = { lat: liveLat, lng: liveLng }
        if (liveAt) {
          nextLeaderUpdatedByConvoyId[convoyId] = liveAt
        }
      }

      const activeConvoyIds = Array.from(
        new Set(activeList.map((item) => String(item.id || '')).filter(Boolean))
      )

      if (activeConvoyIds.length > 0) {
        const { data: leaderRowsData } = await supabase
          .from('convoy_members')
          .select('convoy_id, user_id, role, current_lat, current_lng, last_updated')
          .in('convoy_id', activeConvoyIds)

        const leaderRows = (leaderRowsData || []) as LeaderLocationRow[]
        const activeConvoyById: Record<string, ConvoyRow> = {}
        for (const convoy of activeList) {
          const convoyId = String(convoy.id || '')
          if (!convoyId) continue
          activeConvoyById[convoyId] = convoy
        }

        for (const row of leaderRows) {
          const convoyId = String(row.convoy_id || '')
          if (!convoyId) continue

          const convoy = activeConvoyById[convoyId]
          if (!convoy) continue

          const rowRole = String(row.role || '').toLowerCase()
          const rowUserId = String(row.user_id || '')
          const convoyLeaderId = String(convoy.leader_id || '')
          const isLeaderRow = rowRole === 'leader' || (rowUserId && convoyLeaderId && rowUserId === convoyLeaderId)
          if (!isLeaderRow) continue

          const memberLat = toNumber(row.current_lat)
          const memberLng = toNumber(row.current_lng)
          if (memberLat == null || memberLng == null) continue

          const rowUpdatedAt = row.last_updated ? String(row.last_updated) : null
          const currentUpdatedAt = nextLeaderUpdatedByConvoyId[convoyId] || null
          const rowUpdatedTs = toTimestamp(rowUpdatedAt)
          const currentUpdatedTs = toTimestamp(currentUpdatedAt)

          const shouldReplace = !nextLeaderLocationByConvoyId[convoyId] || rowUpdatedTs >= currentUpdatedTs
          if (shouldReplace) {
            nextLeaderLocationByConvoyId[convoyId] = { lat: memberLat, lng: memberLng }
            if (rowUpdatedAt) {
              nextLeaderUpdatedByConvoyId[convoyId] = rowUpdatedAt
            }
          }
        }
      }

      const distanceOriginLat = originLat
      const distanceOriginLng = originLng

      const nextLeaderDistanceByConvoyId: Record<string, number> = {}
      const nextMinSeenDistanceByConvoyId: Record<string, number> = {}
      const nextDistanceTrendByConvoyId: Record<string, DistanceTrend> = {}

      if (distanceOriginLat != null && distanceOriginLng != null) {
        for (const convoy of activeList) {
          const convoyId = String(convoy.id || '')
          if (!convoyId) continue

          const leaderLoc = nextLeaderLocationByConvoyId[convoyId]
          if (!leaderLoc) continue

          const distance = distanceKmBetween(
            distanceOriginLat,
            distanceOriginLng,
            leaderLoc.lat,
            leaderLoc.lng
          )
          nextLeaderDistanceByConvoyId[convoyId] = distance

          const prevDistance = leaderDistanceByConvoyId[convoyId]
          const prevMinSeen = minSeenDistanceByConvoyId[convoyId] ?? distance
          const minSeen = distance < prevMinSeen ? distance : prevMinSeen
          nextMinSeenDistanceByConvoyId[convoyId] = minSeen

          if (prevDistance == null) {
            nextDistanceTrendByConvoyId[convoyId] = 'unknown'
          } else {
            const delta = distance - prevDistance
            if (minSeen <= 2 && delta > 0.6) {
              nextDistanceTrendByConvoyId[convoyId] = 'passed'
            } else if (delta <= -0.45) {
              nextDistanceTrendByConvoyId[convoyId] = 'approaching'
            } else if (delta >= 0.45) {
              nextDistanceTrendByConvoyId[convoyId] = 'away'
            } else {
              nextDistanceTrendByConvoyId[convoyId] = 'stable'
            }
          }
        }
      }

      const convoyIds = Array.from(
        new Set([...activeList.map((item) => item.id), ...plannedList.map((item) => item.id)].filter(Boolean))
      )

      const headcountBulk = await getConvoyHeadcountBulk(supabase, convoyIds)

      const couponRows = ((couponsRes.data || []) as CouponRow[]).filter((coupon) => {
        if (!coupon.valid_until) return true
        const dt = new Date(coupon.valid_until)
        if (Number.isNaN(dt.getTime())) return true
        return dt.getTime() > Date.now()
      })

      const nextCouponById: Record<string, CouponRow> = {}
      for (const coupon of couponRows) {
        nextCouponById[coupon.id] = coupon
      }

      setActiveConvoys(activeList)
      setPlannedConvoys(plannedList)
      setNegotiations(negotiationList)
      setActiveCoupons(couponRows)
      setCouponById(nextCouponById)
      setHeadcountByConvoyId(headcountBulk)
      setLeaderDistanceByConvoyId(nextLeaderDistanceByConvoyId)
      setLeaderLastUpdatedByConvoyId(nextLeaderUpdatedByConvoyId)
      setMinSeenDistanceByConvoyId(nextMinSeenDistanceByConvoyId)
      setDistanceTrendByConvoyId(nextDistanceTrendByConvoyId)
      setIsLiveSchemaMissing(!hasLiveColumns)
    } catch (error) {
      console.error('Konvoy verisi yüklenemedi', error)
    } finally {
      if (showLoader) {
        setLoading(false)
      }
      setRefreshing(false)
    }
  }

  const sendOffer = async () => {
    if (!selectedBusinessId || !activeDetail || !offerTitle.trim() || !offerDetails.trim()) {
      return
    }

    const captainId = activeDetail.convoy.leader_id
    if (!captainId) {
      window.alert('Kaptan bilgisi bulunamadı.')
      return
    }

    setSendingOffer(true)

    const payload: Record<string, unknown> = {
      business_id: selectedBusinessId,
      convoy_id: activeDetail.convoy.id,
      captain_id: captainId,
      offer_title: offerTitle.trim(),
      offer_details: offerDetails.trim(),
      status: 'pending',
    }

    if (selectedCouponId !== '__none__') {
      payload.coupon_campaign_id = selectedCouponId
    }

    const { error } = await supabase.from('convoy_offers').insert(payload)

    setSendingOffer(false)

    if (error) {
      if (error.message.includes('coupon_campaign_id')) {
        window.alert('Kupon alanı DB tarafında eksik. Kuponsuz teklif gönderebilirsiniz.')
        return
      }
      window.alert(`Teklif gönderilemedi: ${error.message}`)
      return
    }

    window.alert('Teklif başarıyla gönderildi.')

    setActiveDetail(null)
    setOfferTitle('')
    setOfferDetails('')
    setSelectedCouponId('__none__')
    void fetchData(false)
  }

  const openNegotiation = (item: NegotiationRow) => {
    const targetName = encodeURIComponent(item.captain?.full_name || 'Kaptan')
    const subTitle = encodeURIComponent(item.convoy?.name || 'Konvoy')
    router.push(`/merchant/negotiation/${item.id}?target=${targetName}&sub=${subTitle}&isBusiness=1`)
  }

  const openConvoyDetail = (convoy: ConvoyRow) => {
    const convoyId = convoy.id
    const leaderDistanceKm = leaderDistanceByConvoyId[convoyId] ?? null
    const distanceTrend = distanceTrendByConvoyId[convoyId] ?? 'unknown'
    const leaderLastUpdatedAt = leaderLastUpdatedByConvoyId[convoyId] ?? null

    setOfferTitle('')
    setOfferDetails('')
    setSelectedCouponId('__none__')

    setActiveDetail({
      convoy,
      leaderDistanceKm,
      distanceTrend,
      leaderLastUpdatedAt,
    })
  }

  const normalizedSearch = useMemo(() => normalizeSearchText(searchQuery.trim()), [searchQuery])
  const normalizedLocation = useMemo(() => normalizeSearchText(locationQuery.trim()), [locationQuery])

  const sortOptions = useMemo(() => sortOptionsForTab(selectedTab), [selectedTab])

  useEffect(() => {
    if (!sortOptions.some((option) => option.value === sortMode)) {
      setSortMode(sortOptions[0].value)
    }
  }, [sortOptions, sortMode])

  const sortConvoyRows = useCallback((rows: ConvoyRow[], tab: 'active' | 'planned') => {
    const next = [...rows]

    next.sort((a, b) => {
      const compareByDistance = () => {
        const da = leaderDistanceByConvoyId[a.id]
        const db = leaderDistanceByConvoyId[b.id]

        if (da == null && db == null) return toTimestamp(a.start_time) - toTimestamp(b.start_time)
        if (da == null) return 1
        if (db == null) return -1
        if (Math.abs(da - db) > 0.0001) return da - db
        return toTimestamp(a.start_time) - toTimestamp(b.start_time)
      }

      const compareByHeadcount = () => {
        const aCount =
          headcountByConvoyId[a.id]?.confirmed_headcount ?? Math.max(1, Number(a.leader_party_size || 1))
        const bCount =
          headcountByConvoyId[b.id]?.confirmed_headcount ?? Math.max(1, Number(b.leader_party_size || 1))
        if (aCount !== bCount) return bCount - aCount
        return toTimestamp(a.start_time) - toTimestamp(b.start_time)
      }

      const compareByStartTime = () => toTimestamp(a.start_time) - toTimestamp(b.start_time)
      const compareByRecent = () => toTimestamp(b.created_at) - toTimestamp(a.created_at)

      if (sortMode === 'closest') return compareByDistance()
      if (sortMode === 'headcount') return compareByHeadcount()
      if (sortMode === 'start_time') return compareByStartTime()
      if (sortMode === 'recent') return compareByRecent()

      if (tab === 'active') {
        const hasDistance = leaderDistanceByConvoyId[a.id] != null || leaderDistanceByConvoyId[b.id] != null
        if (hasDistance) return compareByDistance()
      }

      return compareByStartTime()
    })

    return next
  }, [headcountByConvoyId, leaderDistanceByConvoyId, sortMode])

  const sortNegotiationRows = useCallback((rows: NegotiationRow[]) => {
    const next = [...rows]

    next.sort((a, b) => {
      const statusRank = (status: OfferStatusFilter) => {
        if (status === 'pending') return 0
        if (status === 'accepted') return 1
        if (status === 'rejected') return 2
        if (status === 'expired') return 3
        if (status === 'cancelled') return 4
        if (status === 'completed') return 5
        return 6
      }

      if (sortMode === 'start_time') {
        return toTimestamp(a.convoy?.start_time || null) - toTimestamp(b.convoy?.start_time || null)
      }

      if (sortMode === 'recent') {
        return toTimestamp(b.created_at || null) - toTimestamp(a.created_at || null)
      }

      const statusDiff = statusRank(normalizeOfferStatus(a.status)) - statusRank(normalizeOfferStatus(b.status))
      if (statusDiff !== 0) return statusDiff

      return toTimestamp(b.created_at || null) - toTimestamp(a.created_at || null)
    })

    return next
  }, [sortMode])

  const archivedOfferIdSet = useMemo(() => {
    const ids = new Set<string>()
    if (negotiations.length <= OFFER_ARCHIVE_LIMIT) {
      return ids
    }

    const now = Date.now()
    for (const item of negotiations) {
      const createdTs = toTimestamp(item.created_at || null)
      if (!createdTs) {
        continue
      }
      if (now - createdTs >= OFFER_ARCHIVE_AGE_MS) {
        ids.add(item.id)
      }
    }

    return ids
  }, [negotiations])

  const archivedOfferCount = archivedOfferIdSet.size
  const activeOfferCount = Math.max(0, negotiations.length - archivedOfferCount)

  const activeItems = useMemo(() => {
    let rows = [...activeConvoys]

    if (selectedCategory !== 'Hepsi') {
      rows = rows.filter((item) => resolveConvoyCategory(item, false) === selectedCategory)
    }

    if (normalizedSearch) {
      rows = rows.filter((item) => {
        const text = `${item.name || ''} ${item.description || ''} ${item.profiles?.full_name || ''}`
        return includesNormalized(text, normalizedSearch)
      })
    }

    if (normalizedLocation) {
      rows = rows.filter((item) => {
        const routeText = `${item.start_location || ''} ${item.end_location || ''}`
        return includesNormalized(routeText, normalizedLocation)
      })
    }

    if (appliedDistanceKm != null && hasDistanceOrigin) {
      rows = rows.filter((item) => {
        const distance = leaderDistanceByConvoyId[item.id]
        if (distance == null) return false
        return distance <= appliedDistanceKm
      })
    }

    return sortConvoyRows(rows, 'active')
  }, [
    activeConvoys,
    selectedCategory,
    normalizedSearch,
    normalizedLocation,
    appliedDistanceKm,
    hasDistanceOrigin,
    leaderDistanceByConvoyId,
    sortConvoyRows,
  ])

  const plannedItems = useMemo(() => {
    let rows = [...plannedConvoys]

    if (selectedCategory !== 'Hepsi') {
      rows = rows.filter((item) => resolveConvoyCategory(item, false) === selectedCategory)
    }

    if (normalizedSearch) {
      rows = rows.filter((item) => {
        const text = `${item.name || ''} ${item.description || ''} ${item.profiles?.full_name || ''}`
        return includesNormalized(text, normalizedSearch)
      })
    }

    if (normalizedLocation) {
      rows = rows.filter((item) => {
        const routeText = `${item.start_location || ''} ${item.end_location || ''}`
        return includesNormalized(routeText, normalizedLocation)
      })
    }

    return sortConvoyRows(rows, 'planned')
  }, [plannedConvoys, selectedCategory, normalizedSearch, normalizedLocation, sortConvoyRows])

  const negotiationItems = useMemo(() => {
    let rows = negotiations.filter((item) =>
      showOfferArchive ? archivedOfferIdSet.has(item.id) : !archivedOfferIdSet.has(item.id)
    )

    if (selectedCategory !== 'Hepsi') {
      rows = rows.filter((item) => resolveConvoyCategory(item, true) === selectedCategory)
    }

    if (offerStatusFilter !== 'all') {
      rows = rows.filter((item) => normalizeOfferStatus(item.status) === offerStatusFilter)
    }

    if (normalizedSearch) {
      rows = rows.filter((item) => {
        const text = `${item.offer_title || ''} ${item.offer_details || ''} ${item.captain?.full_name || ''} ${item.convoy?.name || ''}`
        return includesNormalized(text, normalizedSearch)
      })
    }

    if (normalizedLocation) {
      rows = rows.filter((item) => {
        const routeText = `${item.convoy?.start_location || ''} ${item.convoy?.end_location || ''}`
        return includesNormalized(routeText, normalizedLocation)
      })
    }

    return sortNegotiationRows(rows)
  }, [
    negotiations,
    selectedCategory,
    offerStatusFilter,
    normalizedSearch,
    normalizedLocation,
    sortNegotiationRows,
    showOfferArchive,
    archivedOfferIdSet,
  ])

  const pendingOfferCount = useMemo(
    () =>
      negotiations.filter(
        (item) => !archivedOfferIdSet.has(item.id) && normalizeOfferStatus(item.status) === 'pending'
      ).length,
    [negotiations, archivedOfferIdSet]
  )

  const nearestActiveDistance = useMemo(() => {
    let min: number | null = null
    for (const id of Object.keys(leaderDistanceByConvoyId)) {
      const distance = leaderDistanceByConvoyId[id]
      if (distance == null) continue
      if (min == null || distance < min) {
        min = distance
      }
    }
    return min
  }, [leaderDistanceByConvoyId])

  const liveTrackedCount = useMemo(
    () => activeConvoys.filter((item) => isLikelyLive(leaderLastUpdatedByConvoyId[item.id] || null)).length,
    [activeConvoys, leaderLastUpdatedByConvoyId]
  )

  const activeWithDistanceCount = useMemo(
    () => activeConvoys.filter((item) => leaderDistanceByConvoyId[item.id] != null).length,
    [activeConvoys, leaderDistanceByConvoyId]
  )

  const activeWithinAppliedCount = useMemo(() => {
    if (appliedDistanceKm == null) return activeConvoys.length
    return activeConvoys.filter((item) => {
      const distance = leaderDistanceByConvoyId[item.id]
      return distance != null && distance <= appliedDistanceKm
    }).length
  }, [activeConvoys, leaderDistanceByConvoyId, appliedDistanceKm])

  const totalVisibleCount =
    selectedTab === 'active' ? activeItems.length : selectedTab === 'planned' ? plannedItems.length : negotiationItems.length

  const listTitle =
    selectedTab === 'offers'
      ? showOfferArchive
        ? 'Teklif Arşivi'
        : 'Teklif ve Görüşmeler'
      : tabLabel(selectedTab)

  const listDescription =
    selectedTab === 'offers'
      ? showOfferArchive
        ? '20+ kayıt olduğunda 5 günü geçen teklifler arşivde tutulur.'
        : 'Aktif teklifler ve görüşmeler operasyon akışında tutulur.'
      : tabDescription(selectedTab)

  const sourceCount =
    selectedTab === 'active'
      ? activeConvoys.length
      : selectedTab === 'planned'
        ? plannedConvoys.length
        : showOfferArchive
          ? archivedOfferCount
          : activeOfferCount

  const clearFilters = () => {
    setSearchQuery('')
    setLocationQuery('')
    setSelectedCategory('Hepsi')
    setOfferStatusFilter('all')
    setAppliedDistanceKm(null)
    setSortMode('smart')
    setShowOfferArchive(false)
  }

  const offerTemplates = [
    {
      title: 'Konvoy Katılımcılarına Özel',
      details: 'Konvoy ekibine özel hızlı servis, dinlenme alanı ve kasada öncelik avantajı sağlıyoruz.',
    },
    {
      title: 'Yolda Mola Avantajı',
      details: 'Belirlenen saat aralığında gelen konvoy üyelerine menüde ekstra avantaj tanımlanacaktır.',
    },
    {
      title: 'Grup İndirimi Teklifi',
      details: 'Konvoy grubuna toplu kullanım için özel fiyatlama uygulanacaktır. Detaylar görüşmede netleşir.',
    },
  ]

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'planned') {
      setSelectedTab('planned')
    } else if (tab === 'negotiations' || tab === 'offers') {
      setSelectedTab('offers')
    } else if (tab === 'active') {
      setSelectedTab('active')
    }
  }, [searchParams])

  useEffect(() => {
    if (selectedTab !== 'offers' && showOfferArchive) {
      setShowOfferArchive(false)
    }
  }, [selectedTab, showOfferArchive])

  useEffect(() => {
    if (showOfferArchive && archivedOfferCount === 0) {
      setShowOfferArchive(false)
    }
  }, [showOfferArchive, archivedOfferCount])

  useEffect(() => {
    void resolveMerchantDistanceOrigin(true)
    void loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedBusinessId) return

    void fetchData(true)

    const interval = setInterval(() => {
      void resolveMerchantDistanceOrigin(false)
      void fetchData(false)
    }, 20_000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId])

  return (
    <div className="space-y-6">
      <div className="border-b border-[#2d313a] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <PanelTitle title="Konvoy Yönetimi" />
            <p className="text-[10px] font-mono text-[#64748b] tracking-widest uppercase mt-2">Konvoy takibi ve teklif akışı</p>
          </div>

          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border text-[10px] font-mono tracking-widest uppercase transition-colors ${
            refreshing ? 'border-[#226785] bg-[#153445] text-[#38bdf8]' : 'border-[#166534] bg-[#14532d]/40 text-emerald-400'
          }`}>
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radar className="w-3.5 h-3.5" />}
            <span>{refreshing ? 'CANLI SENKRON...' : 'CANLI SENKRON AKTİF'}</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(260px,1fr)_auto_auto] gap-3 items-end">
          <label className="text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
            İşletme
            <select
              className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
              value={selectedBusinessId}
              onChange={(event) => setSelectedBusinessId(event.target.value)}
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              void resolveMerchantDistanceOrigin(true)
            }}
            className="px-4 py-3 rounded text-[10px] font-mono uppercase tracking-widest bg-[#0a0c10] border border-[#2d313a] text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors inline-flex items-center gap-2"
          >
            <MapPin className="w-3.5 h-3.5" />
            Konumu Güncelle
          </button>

          <button
            type="button"
            onClick={() => {
              void fetchData(true)
            }}
            className="px-4 py-3 rounded text-[10px] font-mono uppercase tracking-widest bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] border border-[#2e8fac]/50 hover:brightness-110 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Yenile
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 xl:grid-cols-4 gap-4">
          <HardwarePanel className="p-4 flex flex-col items-start group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
            <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b]">Aktif</p>
            <p className="mt-2 text-xl font-mono text-[#e2e8f0]">{activeConvoys.length}</p>
            <p className="text-[10px] font-mono text-[#64748b] mt-1 tracking-widest">Canlı: {liveTrackedCount}</p>
          </HardwarePanel>

          <HardwarePanel className="p-4 flex flex-col items-start group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
            <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b]">Planlanan</p>
            <p className="mt-2 text-xl font-mono text-[#e2e8f0]">{plannedConvoys.length}</p>
            <p className="text-[10px] font-mono text-[#64748b] mt-1 tracking-widest uppercase">Yaklaşan Rota</p>
          </HardwarePanel>

          <HardwarePanel className="p-4 flex flex-col items-start group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
            <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b]">Bekleyen Teklif</p>
            <p className="mt-2 text-xl font-mono text-[#e2e8f0]">{pendingOfferCount}</p>
            <p className="text-[10px] font-mono text-[#64748b] mt-1 tracking-widest uppercase">Açık: {activeOfferCount}</p>
          </HardwarePanel>

          <HardwarePanel className="p-4 flex flex-col items-start group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
            <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b]">En Yakın</p>
            <p className="mt-2 text-xl font-mono text-[#e2e8f0]">
              {nearestActiveDistance != null ? `${nearestActiveDistance.toFixed(1)} km` : '-'}
            </p>
            <p className="text-[10px] font-mono text-[#64748b] mt-1 tracking-widest uppercase">Mesafeli: {activeWithDistanceCount}</p>
          </HardwarePanel>
        </div>
      </div>

      <HardwarePanel className="p-5 md:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 border-b border-[#2d313a] pb-4">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0]">
            <SlidersHorizontal className="w-4 h-4 text-[#38bdf8]" />
            <span>Operasyon Akışı ve Filtreler</span>
          </div>

          <button
            type="button"
            onClick={() => setFiltersExpanded((current) => !current)}
            className="w-8 h-8 rounded border border-[#2d313a] bg-[#16181d] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24] flex items-center justify-center transition-colors"
          >
            {filtersExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {filtersExpanded ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1.1fr_220px_auto] gap-3">
              <label className="text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Konvoy / Teklif Ara
                <div className="relative mt-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                    placeholder="Konvoy adı, kaptan..."
                  />
                </div>
              </label>

              <label className="text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Konum Filtresi
                <div className="relative mt-2">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <input
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                    placeholder="Başlangıç / varış..."
                  />
                </div>
              </label>

              <label className="text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Sıralama
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50 appearance-none"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={clearFilters}
                className="self-end px-4 py-3 rounded text-[10px] font-mono uppercase tracking-widest bg-[#0a0c10] border border-[#2d313a] text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
              >
                FİLTRELERİ SIFIRLA
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSelectedTab('active')}
                className={`px-4 py-3 rounded text-[11px] font-mono uppercase tracking-widest inline-flex items-center justify-center gap-2 border transition-colors ${
                  selectedTab === 'active'
                    ? 'bg-[#153445] text-[#38bdf8] border-[#226785]'
                    : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#94a3b8]'
                }`}
              >
                <Radar className="w-4 h-4" />
                AKTİF ({activeConvoys.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab('planned')}
                className={`px-4 py-3 rounded text-[11px] font-mono uppercase tracking-widest inline-flex items-center justify-center gap-2 border transition-colors ${
                  selectedTab === 'planned'
                    ? 'bg-[#153445] text-[#38bdf8] border-[#226785]'
                    : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#94a3b8]'
                }`}
              >
                <Clock3 className="w-4 h-4" />
                PLANLANAN ({plannedConvoys.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab('offers')}
                className={`px-4 py-3 rounded text-[11px] font-mono uppercase tracking-widest inline-flex items-center justify-center gap-2 border transition-colors ${
                  selectedTab === 'offers'
                    ? 'bg-[#153445] text-[#38bdf8] border-[#226785]'
                    : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#94a3b8]'
                }`}
              >
                <Route className="w-4 h-4" />
                TEKLİF / GÖRÜŞME ({negotiations.length})
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORY_FILTERS.map((category) => {
                const selected = selectedCategory === category
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1.5 rounded border text-[10px] font-mono uppercase tracking-widest transition-colors ${
                      selected
                        ? 'bg-[#e2e8f0] text-[#0a0c10] border-[#e2e8f0]'
                        : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#94a3b8]'
                    }`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>

            {selectedTab === 'offers' ? (
              <div className="rounded border border-[#2d313a] bg-[#101419] p-4 space-y-3">
                <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                  <Filter className="w-3.5 h-3.5" />
                  Teklif Durumu
                </div>
                <div className="flex flex-wrap gap-2">
                  {OFFER_STATUS_FILTERS.map((status) => {
                    const selected = offerStatusFilter === status.value
                    return (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => setOfferStatusFilter(status.value)}
                        className={`px-3 py-1.5 rounded border text-[10px] font-mono uppercase tracking-widest transition-colors ${
                          selected
                            ? 'bg-[#e2e8f0] text-[#0a0c10] border-[#e2e8f0]'
                            : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#94a3b8]'
                        }`}
                      >
                        {status.label}
                      </button>
                    )
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#1e232b]">
                  <button
                    type="button"
                    onClick={() => setShowOfferArchive(false)}
                    className={`px-3 py-1.5 rounded border text-[10px] font-mono uppercase tracking-widest transition-colors ${
                      !showOfferArchive ? 'bg-[#e2e8f0] text-[#0a0c10] border-[#e2e8f0]' : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569]'
                    }`}
                  >
                    AKTİF TEKLİFLER ({activeOfferCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOfferArchive(true)}
                    disabled={archivedOfferCount === 0}
                    className={`px-3 py-1.5 rounded border text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2 transition-colors ${
                      showOfferArchive ? 'bg-[#e2e8f0] text-[#0a0c10] border-[#e2e8f0]' : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569]'
                    } disabled:opacity-50`}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    ARŞİV ({archivedOfferCount})
                  </button>
                  {negotiations.length > OFFER_ARCHIVE_LIMIT ? (
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#475569]">
                      20+ KAYITTA 5 GÜNÜ GEÇENLER OTOMATİK ARŞİVE ALINIR.
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded border border-[#2d313a] bg-[#101419] p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#94a3b8]">
                    <Radar className="w-3.5 h-3.5 text-[#38bdf8]" />
                    Menzil Filtresi
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#38bdf8] border border-[#38bdf8]/30 px-2 py-1 rounded bg-[#38bdf8]/10">
                    {distanceTargetKm} KM
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={distanceTargetKm}
                  onChange={(event) => setDistanceTargetKm(Number(event.target.value))}
                  className="w-full accent-[#38bdf8]"
                />

                <div className="flex flex-wrap gap-2">
                  {DISTANCE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDistanceTargetKm(preset)}
                      className="px-2.5 py-1.5 rounded border border-[#2d313a] text-[10px] font-mono uppercase tracking-widest bg-[#0a0c10] text-[#64748b] hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
                    >
                      {preset} KM
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAppliedDistanceKm(distanceTargetKm)}
                    disabled={!hasDistanceOrigin || isLiveSchemaMissing}
                    className="px-4 py-2.5 rounded text-[10px] font-mono uppercase tracking-widest bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] border border-[#2e8fac]/50 hover:brightness-110 disabled:opacity-50"
                  >
                    MENZİLİ UYGULA
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppliedDistanceKm(null)}
                    className="px-4 py-2.5 rounded text-[10px] font-mono uppercase tracking-widest bg-[#0a0c10] border border-[#2d313a] text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
                  >
                    MENZİLİ KALDIR
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void resolveMerchantDistanceOrigin(true)
                    }}
                    className="px-4 py-2.5 rounded text-[10px] font-mono uppercase tracking-widest bg-[#153445] border border-[#226785] text-[#38bdf8] hover:brightness-110 transition-colors"
                  >
                    KONUMU YENİLE
                  </button>
                </div>

                <div className={`text-[10px] font-mono uppercase tracking-widest ${isLiveSchemaMissing || !hasDistanceOrigin ? 'text-rose-400' : 'text-[#64748b]'}`}>
                  {isLiveSchemaMissing
                    ? "[HATA] CANLI KONUM ALANLARI DB'DE YOK."
                    : hasDistanceOrigin
                      ? appliedDistanceKm == null
                        ? `MENZİL KAPALI. KAYNAK: CİHAZ KONUMU${formatClock(merchantLiveUpdatedAt) ? ` (${formatClock(merchantLiveUpdatedAt)})` : ''}.`
                        : `AKTİF FİLTRE: 0-${appliedDistanceKm} KM. UYGUN KONVOY: ${activeWithinAppliedCount}.`
                      : locationAttempted
                        ? '[HATA] CİHAZ KONUMU ALINAMADI. MESAFE HESAPLAMASI BEKLEMEDE.'
                        : 'CİHAZ KONUMU BEKLENİYOR...'}
                </div>
              </div>
            )}

            <div className="rounded border border-[#1e232b] bg-[#0a0c10] p-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
              <span className="text-[#94a3b8]">AKIŞ:</span> 1) FİLTRELE 2) KONVOYU SEÇ 3) TEKLİFİ GÖNDER 4) GÖRÜŞMEYİ TAKİP ET
            </div>
          </div>
        ) : (
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#475569]">FİLTRE PANELİ KAPALI. GÖRÜNÜR KAYIT: {totalVisibleCount}</div>
        )}
      </HardwarePanel>

      <HardwarePanel className="p-5 md:p-6 min-h-[360px]">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5 border-b border-[#2d313a] pb-4">
          <div>
            <h3 className="text-[14px] font-medium text-[#e2e8f0] uppercase tracking-wide">{listTitle}</h3>
            <p className="text-[10px] font-mono text-[#64748b] mt-1 tracking-widest uppercase">{listDescription}</p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[#2d313a] bg-[#0a0c10] text-[10px] font-mono uppercase tracking-widest text-[#94a3b8]">
            <Users className="w-3.5 h-3.5" />
            SONUÇ: {totalVisibleCount} / {sourceCount}
          </div>
        </div>

        {loading ? (
          <div className="h-[260px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#38bdf8]" />
          </div>
        ) : totalVisibleCount === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-[11px] font-mono uppercase tracking-widest text-[#475569] text-center border border-dashed border-[#2d313a] rounded bg-[#0a0c10]">
            {selectedTab === 'active' && hasDistanceOrigin && appliedDistanceKm != null
              ? `SEÇİLEN MENZİLDE (0-${appliedDistanceKm} KM) AKTİF KONVOY BULUNAMADI.`
              : 'FİLTRELERE UYGUN KAYIT BULUNAMADI.'}
          </div>
        ) : selectedTab === 'offers' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {negotiationItems.map((item) => {
              const convoyCategory = resolveConvoyCategory(item, true)
              const color = categoryColor(convoyCategory)
              const status = normalizeOfferStatus(item.status)
              const coupon = item.coupon_campaign_id ? couponById[String(item.coupon_campaign_id)] : null

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNegotiation(item)}
                  className="w-full text-left rounded border border-[#2d313a] bg-[#0a0c10] p-4 hover:border-[#475569] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded border flex items-center justify-center shrink-0"
                      style={{ borderColor: `${color}50`, color, backgroundColor: `${color}10` }}
                    >
                      <Route className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[13px] font-medium text-[#e2e8f0] line-clamp-1 uppercase tracking-wide">{item.convoy?.name || 'KONVOY'}</p>
                          <p className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest mt-1">KAPTAN: {item.captain?.full_name || 'BİLİNMİYOR'}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#475569] shrink-0" />
                      </div>

                      <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 text-[#64748b]" />
                        {item.convoy?.start_location || '-'} → {item.convoy?.end_location || '-'}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-mono uppercase tracking-widest">
                        <span className="px-2 py-1 rounded bg-[#16181d] border border-[#2d313a] text-[#64748b]">{convoyCategory}</span>
                        <span className="px-2 py-1 rounded bg-[#16181d] border border-[#2d313a] text-[#64748b]">{formatDateTime(item.convoy?.start_time || null)}</span>
                        <span className={`px-2 py-1 rounded ${offerStatusClasses(status)}`}>
                          {offerStatusLabel(status)}
                        </span>
                      </div>

                      <div className="mt-3 rounded border border-[#1e232b] bg-[#101419] p-3">
                        <p className="text-[11px] font-medium text-[#e2e8f0] uppercase tracking-wide line-clamp-1">{item.offer_title || 'BAŞLIK YOK'}</p>
                        <p className="text-[10px] font-mono text-[#64748b] mt-1.5 line-clamp-2 leading-relaxed">{item.offer_details || 'DETAY YOK'}</p>
                      </div>

                      {coupon ? (
                        <div className="mt-3 text-[10px] font-mono uppercase tracking-widest text-emerald-400 border border-emerald-900/50 bg-emerald-950/20 px-2 py-1 rounded inline-block">
                          KUPON: {coupon.title || 'KUPON'} • {couponBenefitText(coupon)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {(selectedTab === 'active' ? activeItems : plannedItems).map((convoy) => {
              const convoyCategory = resolveConvoyCategory(convoy, false)
              const convoyColor = categoryColor(convoyCategory)
              const convoyId = String(convoy.id || '')

              const headStats = headcountByConvoyId[convoyId]
              const confirmedCount = headStats?.confirmed_headcount ?? Math.max(1, Number(convoy.leader_party_size || 1))
              const pendingCount = headStats?.pending_headcount ?? 0
              const capacityCount =
                headStats?.max_headcount ?? Number(convoy.max_headcount || convoy.max_vehicles || confirmedCount)

              const occupancyPercent = Math.max(
                0,
                Math.min(100, Math.round((confirmedCount / Math.max(1, capacityCount || 1)) * 100))
              )

              const distance = selectedTab === 'active' ? leaderDistanceByConvoyId[convoyId] : null
              const trend = selectedTab === 'active' ? distanceTrendByConvoyId[convoyId] || 'unknown' : null
              const leaderUpdatedAt = selectedTab === 'active' ? leaderLastUpdatedByConvoyId[convoyId] || null : null

              return (
                <button
                  key={convoyId}
                  type="button"
                  onClick={() => openConvoyDetail(convoy)}
                  className="w-full text-left rounded border border-[#2d313a] bg-[#0a0c10] p-4 hover:border-[#475569] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded border flex items-center justify-center shrink-0" style={{ borderColor: `${convoyColor}50`, color: convoyColor, backgroundColor: `${convoyColor}10` }}>
                      {categoryIcon(convoyCategory)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[13px] font-medium text-[#e2e8f0] uppercase tracking-wide line-clamp-1">{convoy.name || 'KONVOY'}</p>
                          <p className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest mt-1">KAPTAN: {convoy.profiles?.full_name || 'BİLİNMİYOR'}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#475569] shrink-0 mt-0.5" />
                      </div>

                      <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 text-[#64748b]" />
                        {convoy.start_location || '-'} → {convoy.end_location || '-'}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-mono uppercase tracking-widest">
                        <span className="px-2 py-1 rounded bg-[#16181d] border border-[#2d313a] text-[#64748b]">{convoyCategory}</span>
                        <span className="px-2 py-1 rounded bg-[#16181d] border border-[#2d313a] text-[#64748b]">{formatDateTime(convoy.start_time)}</span>

                        {selectedTab === 'active' ? (
                          distance != null ? (
                            <span className="px-2 py-1 rounded bg-[#153445] border border-[#226785] text-[#38bdf8]">{distance.toFixed(1)} KM</span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-[#16181d] border border-[#2d313a] text-[#475569]">KONUM YOK</span>
                          )
                        ) : null}

                        {selectedTab === 'active' && trend ? (
                          <span
                            className="px-2 py-1 rounded border"
                            style={{ borderColor: `${trendColor(trend)}50`, backgroundColor: `${trendColor(trend)}15`, color: trendColor(trend) }}
                          >
                            {trendLabel(trend)}
                          </span>
                        ) : null}

                        {leaderUpdatedAt ? (
                          <span
                            className="px-2 py-1 rounded border"
                            style={{
                              borderColor: isLikelyLive(leaderUpdatedAt) ? '#166534' : '#2d313a',
                              backgroundColor: isLikelyLive(leaderUpdatedAt) ? '#14532d40' : '#16181d',
                              color: isLikelyLive(leaderUpdatedAt) ? '#34d399' : '#64748b',
                            }}
                          >
                            {formatRelativeAgo(leaderUpdatedAt)}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 rounded border border-[#1e232b] bg-[#101419] p-3">
                        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                          <span>DOLULUK: {confirmedCount}/{Math.max(1, capacityCount || 1)}</span>
                          <span>BEKLEYEN: {pendingCount}</span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-[#16181d] border border-[#2d313a] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${occupancyPercent}%`,
                              background: `linear-gradient(90deg, ${convoyColor} 0%, #1e232b 100%)`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </HardwarePanel>

      {activeDetail ? (
        <div className="fixed inset-0 z-50 bg-[#050608]/90 backdrop-blur-sm p-4 flex items-center justify-center">
          <HardwarePanel className="w-full max-w-5xl max-h-[94vh] flex flex-col p-0 overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#2d313a] bg-[#0f1115] flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[16px] font-medium text-[#e2e8f0] uppercase tracking-wide">{activeDetail.convoy.name || 'KONVOY'}</h2>
                <div className="text-[10px] font-mono text-[#64748b] mt-1.5 uppercase tracking-widest">KAPTAN: {activeDetail.convoy.profiles?.full_name || 'BİLİNMİYOR'}</div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetail(null)}
                className="px-4 py-2 rounded text-[10px] font-mono tracking-widest uppercase border border-[#2d313a] text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
              >
                KAPAT
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#0c0e12] custom-scrollbar">
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-6">
                
                <section className="space-y-4">
                  <h3 className="text-[11px] font-mono font-medium text-[#e2e8f0] uppercase tracking-widest border-b border-[#2d313a] pb-2">OPERASYON ÖZETİ</h3>

                  <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4">
                    <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#94a3b8]">
                      <MapPin className="w-4 h-4 text-[#64748b]" />
                      {activeDetail.convoy.start_location || '-'} → {activeDetail.convoy.end_location || '-'}
                    </div>
                    <div className="text-[10px] font-mono text-[#64748b] mt-2 uppercase tracking-widest">BAŞLANGIÇ: {formatDateTime(activeDetail.convoy.start_time)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4">
                      <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">MESAFE</p>
                      <p className="text-lg font-mono text-[#e2e8f0] mt-1">
                        {activeDetail.leaderDistanceKm != null ? `${activeDetail.leaderDistanceKm.toFixed(1)} KM` : '-'}
                      </p>
                    </div>
                    <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4">
                      <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">TREND</p>
                      <p className="text-[13px] font-mono uppercase tracking-widest mt-2" style={{ color: trendColor(activeDetail.distanceTrend) }}>
                        {trendLabel(activeDetail.distanceTrend)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                    SON CANLI GÜNCELLEME:{' '}
                    <span className="text-[#94a3b8]">
                      {activeDetail.leaderLastUpdatedAt
                        ? `${formatDateTime(activeDetail.leaderLastUpdatedAt)} (${formatRelativeAgo(activeDetail.leaderLastUpdatedAt)})`
                        : 'BİLİNMİYOR'}
                    </span>
                  </div>

                  <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] mb-3 border-b border-[#1e232b] pb-2">HAZIR TEKLİF ŞABLONLARI</div>
                    <div className="flex flex-wrap gap-2">
                      {offerTemplates.map((template) => (
                        <button
                          key={template.title}
                          type="button"
                          onClick={() => {
                            setOfferTitle(template.title)
                            setOfferDetails(template.details)
                          }}
                          className="px-3 py-2 rounded border border-[#2d313a] bg-[#16181d] text-[9px] font-mono uppercase tracking-widest text-[#64748b] hover:text-[#e2e8f0] hover:border-[#475569] transition-colors"
                        >
                          {template.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[11px] font-mono font-medium text-[#e2e8f0] uppercase tracking-widest border-b border-[#2d313a] pb-2">TEKLİF OLUŞTUR</h3>

                  <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    TEKLİF BAŞLIĞI
                    <input
                      value={offerTitle}
                      onChange={(event) => setOfferTitle(event.target.value)}
                      maxLength={80}
                      className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                      placeholder="Örn: Konvoy Katılımcılarına Özel"
                    />
                  </label>

                  <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    TEKLİF DETAYI
                    <textarea
                      value={offerDetails}
                      onChange={(event) => setOfferDetails(event.target.value)}
                      maxLength={420}
                      className="mt-2 w-full min-h-[140px] px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 custom-scrollbar resize-none placeholder:text-[#475569]"
                      placeholder="Konvoy ekibi için sağlayacağınız avantajları açıkça yazın."
                    />
                    <div className="mt-1.5 text-[9px] text-[#475569] text-right">{offerDetails.length}/420</div>
                  </label>

                  <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    KUPON BAĞLA (OPSİYONEL)
                    <select
                      value={selectedCouponId}
                      onChange={(event) => setSelectedCouponId(event.target.value)}
                      className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
                    >
                      <option value="__none__">KUPON EKLEME</option>
                      {activeCoupons.map((coupon) => (
                        <option key={coupon.id} value={coupon.id}>
                          {couponLabel(coupon)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded border border-[#1e232b] bg-[#101419] p-4">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] mb-2 border-b border-[#1e232b] pb-2">TEKLİF ÖNİZLEME</div>
                    <div className="text-[12px] font-mono uppercase tracking-wide text-[#38bdf8]">{offerTitle.trim() || 'BAŞLIK BEKLENİYOR...'}</div>
                    <div className="mt-2 text-[10px] font-mono text-[#94a3b8] leading-relaxed uppercase tracking-wider">{offerDetails.trim() || 'DETAY BEKLENİYOR...'}</div>
                    {selectedCoupon ? (
                      <div className="mt-3 inline-block px-2 py-1 rounded bg-emerald-950/20 border border-emerald-900/50 text-[9px] font-mono uppercase tracking-widest text-emerald-400">
                        KUPON: {couponLabel(selectedCoupon)}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={sendOffer}
                    disabled={sendingOffer || !offerTitle.trim() || !offerDetails.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] text-[11px] font-mono uppercase tracking-widest border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 disabled:opacity-50"
                  >
                    {sendingOffer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sendingOffer ? 'GÖNDERİLİYOR...' : 'TEKLİFİ GÖNDER'}
                  </button>
                </section>

              </div>
            </div>
          </HardwarePanel>
        </div>
      ) : null}
    </div>
  )
}

export default function MerchantConvoysPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[55vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#38bdf8] animate-spin" />
        </div>
      }
    >
      <MerchantConvoysPageContent />
    </Suspense>
  )
}