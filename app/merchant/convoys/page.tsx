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
import { ModuleTitle } from '../_components/module-title'
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
      return 'bg-emerald-100 text-emerald-700'
    case 'rejected':
      return 'bg-rose-100 text-rose-700'
    case 'expired':
      return 'bg-amber-100 text-amber-700'
    case 'cancelled':
      return 'bg-slate-200 text-slate-600'
    case 'completed':
      return 'bg-indigo-100 text-indigo-700'
    default:
      return 'bg-blue-100 text-blue-700'
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

function MerchantConvoysPageContent() {
  const supabase = useMemo(() => getBrowserSupabase(), [])
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [filtersExpanded, setFiltersExpanded] = useState(false)
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
    <div className="space-y-5">
      <div className="rounded-[28px] p-4 md:p-4 bg-[linear-gradient(145deg,#ffffff_0%,#f2f7ff_100%)] border border-white/70 shadow-[0_20px_24px_-24px_rgba(15,23,42,0.72)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <ModuleTitle title="Konvoy Yönetimi" />
            <p className="text-xs text-slate-500 mt-1">Konvoy takibi ve teklif akışı</p>
          </div>

          <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.2),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Radar className="w-4 h-4 text-emerald-600" />}
            <span className="text-xs font-semibold">{refreshing ? 'Canlı senkron...' : 'Canlı senkron aktif'}</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 xl:grid-cols-[minmax(260px,1fr)_auto_auto] gap-2 items-end">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
            İşletme
            <select
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white text-slate-700 font-bold shadow-sm border border-slate-200"
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
            className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-sm inline-flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            Konumu Güncelle
          </button>

          <button
            type="button"
            onClick={() => {
              void fetchData(true)
            }}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 inline-flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>

        <div className="mt-2.5 grid grid-cols-2 xl:grid-cols-4 gap-2">
          <div className="rounded-xl p-2.5 bg-white border border-slate-100 shadow-[0_10px_14px_-16px_rgba(15,23,42,0.7)]">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Aktif</p>
            <p className="mt-0.5 text-lg font-bold text-slate-800">{activeConvoys.length}</p>
            <p className="text-[11px] text-slate-500">Canlı: {liveTrackedCount}</p>
          </div>

          <div className="rounded-xl p-2.5 bg-white border border-slate-100 shadow-[0_10px_14px_-16px_rgba(15,23,42,0.7)]">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Planlanan</p>
            <p className="mt-0.5 text-lg font-bold text-slate-800">{plannedConvoys.length}</p>
            <p className="text-[11px] text-slate-500">Yaklaşan rota</p>
          </div>

          <div className="rounded-xl p-2.5 bg-white border border-slate-100 shadow-[0_10px_14px_-16px_rgba(15,23,42,0.7)]">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Bekleyen Teklif</p>
            <p className="mt-0.5 text-lg font-bold text-slate-800">{pendingOfferCount}</p>
            <p className="text-[11px] text-slate-500">Açık: {activeOfferCount}</p>
          </div>

          <div className="rounded-xl p-2.5 bg-white border border-slate-100 shadow-[0_10px_14px_-16px_rgba(15,23,42,0.7)]">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">En Yakın</p>
            <p className="mt-0.5 text-lg font-bold text-slate-800">
              {nearestActiveDistance != null ? `${nearestActiveDistance.toFixed(1)} km` : '-'}
            </p>
            <p className="text-[11px] text-slate-500">Mesafeli: {activeWithDistanceCount}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] p-4 md:p-4 bg-[linear-gradient(145deg,#ffffff_0%,#f2f7ff_100%)] border border-white/70 shadow-[0_20px_24px_-24px_rgba(15,23,42,0.72)]">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.2),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold">Operasyon Akışı ve Filtreler</span>
          </div>

          <button
            type="button"
            onClick={() => setFiltersExpanded((current) => !current)}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 shadow-sm flex items-center justify-center"
          >
            {filtersExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {filtersExpanded ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1.1fr_220px_auto] gap-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Konvoy / Teklif Ara
                <div className="relative mt-1.5">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700"
                    placeholder="Konvoy adı, kaptan veya teklif..."
                  />
                </div>
              </label>

              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Konum Filtresi
                <div className="relative mt-1.5">
                  <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700"
                    placeholder="Başlangıç / varış lokasyonu..."
                  />
                </div>
              </label>

              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Sıralama
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700"
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
                className="self-end px-3 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700"
              >
                Filtreleri Sıfırla
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTab('active')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${
                  selectedTab === 'active'
                    ? 'bg-[#ff8f3f] text-white shadow-[0_14px_24px_-20px_rgba(255,143,63,0.9)]'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                <Radar className="w-4 h-4" />
                Aktif ({activeConvoys.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab('planned')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${
                  selectedTab === 'planned'
                    ? 'bg-[#4F83CC] text-white shadow-[0_14px_24px_-20px_rgba(79,131,204,0.9)]'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                <Clock3 className="w-4 h-4" />
                Planlanan ({plannedConvoys.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab('offers')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${
                  selectedTab === 'offers'
                    ? 'bg-[#00A86B] text-white shadow-[0_14px_24px_-20px_rgba(0,168,107,0.9)]'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                <Route className="w-4 h-4" />
                Teklif/Görüşme ({negotiations.length})
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
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold ${
                      selected
                        ? 'bg-slate-800 text-white'
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>

            {selectedTab === 'offers' ? (
              <div className="rounded-xl border border-slate-200 bg-white/80 p-2.5 space-y-2">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                  <Filter className="w-4 h-4" />
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
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold ${
                          selected
                            ? 'bg-slate-800 text-white'
                            : 'bg-white border border-slate-200 text-slate-600'
                        }`}
                      >
                        {status.label}
                      </button>
                    )
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowOfferArchive(false)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold ${
                      !showOfferArchive ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    Aktif Teklifler ({activeOfferCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOfferArchive(true)}
                    disabled={archivedOfferCount === 0}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold inline-flex items-center gap-1 ${
                      showOfferArchive ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'
                    } disabled:opacity-50`}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Arşiv ({archivedOfferCount})
                  </button>
                  {negotiations.length > OFFER_ARCHIVE_LIMIT ? (
                    <span className="text-[11px] text-slate-500">
                      {`20+ kayıtta 5 günü geçenler otomatik arşive alınır.`}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white/80 p-2.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                    <Radar className="w-3.5 h-3.5 text-blue-500" />
                    Menzil Filtresi
                  </div>
                  <div className="text-[11px] font-semibold text-blue-600">{distanceTargetKm} km</div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={distanceTargetKm}
                  onChange={(event) => setDistanceTargetKm(Number(event.target.value))}
                  className="w-full"
                />

                <div className="flex flex-wrap gap-2">
                  {DISTANCE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDistanceTargetKm(preset)}
                      className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700"
                    >
                      {preset} km
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAppliedDistanceKm(distanceTargetKm)}
                    disabled={!hasDistanceOrigin || isLiveSchemaMissing}
                    className="px-3 py-2 rounded-lg text-[11px] font-semibold text-white bg-blue-600 disabled:opacity-50"
                  >
                    Menzili Uygula
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppliedDistanceKm(null)}
                    className="px-3 py-2 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-200"
                  >
                    Menzili Kaldır
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void resolveMerchantDistanceOrigin(true)
                    }}
                    className="px-3 py-2 rounded-lg text-[11px] font-semibold text-blue-700 bg-blue-100"
                  >
                    Konumu Yenile
                  </button>
                </div>

                <div className={`text-[11px] ${isLiveSchemaMissing || !hasDistanceOrigin ? 'text-rose-600' : 'text-slate-600'}`}>
                  {isLiveSchemaMissing
                    ? "Canlı konum alanları DB'de yok. 'supabase_convoy_live_position_safe.sql' çalıştırılmalı."
                    : hasDistanceOrigin
                      ? appliedDistanceKm == null
                        ? `Menzil kapalı. Kaynak: cihaz konumu${formatClock(merchantLiveUpdatedAt) ? ` (${formatClock(merchantLiveUpdatedAt)})` : ''}.`
                        : `Aktif filtre: 0-${appliedDistanceKm} km. Uygun konvoy: ${activeWithinAppliedCount}.`
                      : locationAttempted
                        ? 'Cihaz konumu alınamadı. Yanlış yüksek km önlemek için mesafe hesaplaması beklemede.'
                        : 'Cihaz konumu bekleniyor. Mesafe hesaplaması başlayacak.'}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white/85 p-2.5 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-700">Akış:</span> 1) Filtrele 2) Konvoyu seç 3) Teklifi gönder 4) Görüşmeyi takip et
            </div>
          </div>
        ) : (
          <div className="mt-3 text-xs text-slate-500">Filtre paneli kapalı. Görünür kayıt: {totalVisibleCount}</div>
        )}
      </div>

      <div className="rounded-[30px] p-5 md:p-6 bg-[linear-gradient(145deg,#ffffff_0%,#f2f7ff_100%)] border border-white/70 shadow-[0_22px_28px_-24px_rgba(15,23,42,0.72)] min-h-[360px]">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{listTitle}</h3>
            <p className="text-xs text-slate-500 mt-1">{listDescription}</p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600">
            <Users className="w-4 h-4" />
            Filtre Sonucu: {totalVisibleCount} / {sourceCount}
          </div>
        </div>

        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          </div>
        ) : totalVisibleCount === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-sm font-semibold text-slate-500 text-center px-4">
            {selectedTab === 'active' && hasDistanceOrigin && appliedDistanceKm != null
              ? `Seçilen menzilde (0-${appliedDistanceKm} km) aktif konvoy bulunamadı.`
              : 'Filtrelere uygun kayıt bulunamadı.'}
          </div>
        ) : selectedTab === 'offers' ? (
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
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
                  className="w-full text-left rounded-2xl p-4 bg-white border border-slate-200 shadow-[0_14px_26px_-24px_rgba(15,23,42,0.82)] hover:border-slate-300"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center bg-slate-100"
                      style={{ color }}
                    >
                      <Route className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-base font-semibold text-slate-800 line-clamp-1">{item.convoy?.name || 'Konvoy'}</p>
                          <p className="text-xs font-semibold text-slate-500">Kaptan: {item.captain?.full_name || 'Kaptan'}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5" />
                      </div>

                      <div className="mt-2 inline-flex items-center gap-1 text-xs text-slate-600 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {item.convoy?.start_location || '-'} → {item.convoy?.end_location || '-'}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">{convoyCategory}</span>
                        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">{formatDateTime(item.convoy?.start_time || null)}</span>
                        <span className={`px-2 py-1 rounded-full font-semibold ${offerStatusClasses(status)}`}>
                          {offerStatusLabel(status)}
                        </span>
                      </div>

                      <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                        <p className="text-xs font-semibold text-slate-700 line-clamp-1">{item.offer_title || 'Teklif başlığı yok'}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.offer_details || 'Teklif detayı yok'}</p>
                      </div>

                      {coupon ? (
                        <div className="mt-2 text-[11px] font-semibold text-emerald-700">
                          Kupon: {coupon.title || 'Kupon'} • {couponBenefitText(coupon)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
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
                  className="w-full text-left rounded-2xl p-4 bg-white border border-slate-200 shadow-[0_14px_26px_-24px_rgba(15,23,42,0.82)] hover:border-slate-300"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center bg-slate-100" style={{ color: convoyColor }}>
                      {categoryIcon(convoyCategory)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-base font-semibold text-slate-800 line-clamp-1">{convoy.name || 'Konvoy'}</p>
                          <p className="text-xs font-semibold text-slate-500">Kaptan: {convoy.profiles?.full_name || 'Kaptan'}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5" />
                      </div>

                      <div className="mt-2 inline-flex items-center gap-1 text-xs text-slate-600 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {convoy.start_location || '-'} → {convoy.end_location || '-'}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">{convoyCategory}</span>
                        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">{formatDateTime(convoy.start_time)}</span>

                        {selectedTab === 'active' ? (
                          distance != null ? (
                            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">{distance.toFixed(1)} km</span>
                          ) : (
                            <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-500">Canlı konum yok</span>
                          )
                        ) : null}

                        {selectedTab === 'active' && trend ? (
                          <span
                            className="px-2 py-1 rounded-full"
                            style={{ backgroundColor: `${trendColor(trend)}22`, color: trendColor(trend) }}
                          >
                            {trendLabel(trend)}
                          </span>
                        ) : null}

                        {leaderUpdatedAt ? (
                          <span
                            className="px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: isLikelyLive(leaderUpdatedAt) ? '#00A86B22' : '#64748B22',
                              color: isLikelyLive(leaderUpdatedAt) ? '#00A86B' : '#64748B',
                            }}
                          >
                            {formatRelativeAgo(leaderUpdatedAt)}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                          <span>Doluluk: {confirmedCount}/{Math.max(1, capacityCount || 1)}</span>
                          <span>Bekleyen: {pendingCount}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${occupancyPercent}%`,
                              background: `linear-gradient(90deg, ${convoyColor} 0%, #334155 100%)`,
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
      </div>

      {activeDetail ? (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-[32px] p-5 md:p-6 bg-[linear-gradient(145deg,#ffffff_0%,#f3f8ff_100%)] border border-white/80 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{activeDetail.convoy.name || 'Konvoy'}</h2>
                <div className="text-sm text-slate-500 mt-1">Kaptan: {activeDetail.convoy.profiles?.full_name || 'Bilinmiyor'}</div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetail(null)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200"
              >
                Kapat
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
              <section className="rounded-2xl p-4 bg-white border border-slate-200 shadow-[0_16px_24px_-24px_rgba(15,23,42,0.9)] space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Operasyon Özeti</h3>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="inline-flex items-center gap-1.5 font-semibold">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    {activeDetail.convoy.start_location || '-'} → {activeDetail.convoy.end_location || '-'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Başlangıç: {formatDateTime(activeDetail.convoy.start_time)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">Mesafe</p>
                    <p className="text-lg font-bold text-slate-800 mt-1">
                      {activeDetail.leaderDistanceKm != null ? `${activeDetail.leaderDistanceKm.toFixed(1)} km` : '-'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">Trend</p>
                    <p className="text-lg font-bold mt-1" style={{ color: trendColor(activeDetail.distanceTrend) }}>
                      {trendLabel(activeDetail.distanceTrend)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  Son canlı güncelleme:{' '}
                  <span className="font-semibold text-slate-700">
                    {activeDetail.leaderLastUpdatedAt
                      ? `${formatDateTime(activeDetail.leaderLastUpdatedAt)} (${formatRelativeAgo(activeDetail.leaderLastUpdatedAt)})`
                      : 'Bilinmiyor'}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="font-semibold text-slate-700 mb-1">Hazır Teklif Şablonları</div>
                  <div className="flex flex-wrap gap-2">
                    {offerTemplates.map((template) => (
                      <button
                        key={template.title}
                        type="button"
                        onClick={() => {
                          setOfferTitle(template.title)
                          setOfferDetails(template.details)
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700"
                      >
                        {template.title}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl p-4 bg-white border border-slate-200 shadow-[0_16px_24px_-24px_rgba(15,23,42,0.9)] space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Teklif Oluştur</h3>

                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Teklif Başlığı
                  <input
                    value={offerTitle}
                    onChange={(event) => setOfferTitle(event.target.value)}
                    maxLength={80}
                    className="mt-2 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700"
                    placeholder="Örn: Konvoy Katılımcılarına Özel"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Teklif Detayı
                  <textarea
                    value={offerDetails}
                    onChange={(event) => setOfferDetails(event.target.value)}
                    maxLength={420}
                    className="mt-2 w-full min-h-[140px] px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700"
                    placeholder="Konvoy ekibi için sağlayacağınız avantajları açıkça yazın."
                  />
                  <div className="mt-1 text-[11px] text-slate-500 text-right">{offerDetails.length}/420</div>
                </label>

                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Kupon (Opsiyonel)
                  <select
                    value={selectedCouponId}
                    onChange={(event) => setSelectedCouponId(event.target.value)}
                    className="mt-2 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700"
                  >
                    <option value="__none__">Kupon ekleme</option>
                    {activeCoupons.map((coupon) => (
                      <option key={coupon.id} value={coupon.id}>
                        {couponLabel(coupon)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-xl p-3 bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800 mb-1">Teklif Önizleme</div>
                  <div className="text-orange-600 font-bold">{offerTitle.trim() || 'Başlık bekleniyor...'}</div>
                  <div className="mt-1 leading-relaxed">{offerDetails.trim() || 'Detay bekleniyor...'}</div>
                  {selectedCoupon ? (
                    <div className="mt-2 text-emerald-700 font-semibold">Kupon: {couponLabel(selectedCoupon)}</div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={sendOffer}
                  disabled={sendingOffer || !offerTitle.trim() || !offerDetails.trim()}
                  className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-2 justify-center">
                    {sendingOffer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Teklifi Gönder
                  </span>
                </button>
              </section>
            </div>
          </div>
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
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <MerchantConvoysPageContent />
    </Suspense>
  )
}
