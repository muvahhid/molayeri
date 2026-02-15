'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  Store,
  UserCircle2,
  XCircle,
} from 'lucide-react'

type GenericRow = Record<string, unknown>

type BusinessRow = GenericRow & {
  id: string
  owner_id: string | null
  name: string | null
  description: string | null
  phone: string | null
  address_text: string | null
  type: string | null
  status: string | null
  created_at: string | null
  lat: number | null
  lng: number | null
  image_url?: string | null
  gallery?: string[] | null
  road_name?: string | null
  road_note?: string | null
  road_type?: string | null
  road_place_id?: string | null
}

type ProfileRow = GenericRow & {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  role: string | null
  status: string | null
  created_at: string | null
}

type PendingItem = {
  business: BusinessRow
  owner: ProfileRow | null
  categories: string[]
}

type FeatureEntry = {
  name: string
  value: string | null
}

type BusinessPhoto = {
  id: string
  url: string
  is_cover: boolean
  created_at: string | null
}

type BusinessStore = {
  id: string
  name: string | null
  floor_info: string | null
}

type DetailState = {
  business: BusinessRow
  owner: ProfileRow | null
  categories: string[]
  features: FeatureEntry[]
  photos: BusinessPhoto[]
  stores: BusinessStore[]
  stats: {
    campaignCount: number
    activeCampaignCount: number
    menuItemCount: number
    reviewCount: number
    reviewAverage: number | null
  }
}

type DecisionType = 'active' | 'rejected'

type LooseFeatureRow = {
  feature_id?: string | number | null
  feature_name?: string | null
  value?: string | null
}

const cardClass =
  'rounded-2xl border border-white/80 bg-white/95 shadow-[0_16px_24px_-20px_rgba(15,23,42,0.6)] backdrop-blur'

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function nullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function toTs(raw: string | null | undefined): number {
  if (!raw) return 0
  const ts = new Date(raw).getTime()
  return Number.isFinite(ts) ? ts : 0
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '-'
  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleDateString('tr-TR')
}

function formatDateTime(raw: string | null | undefined): string {
  if (!raw) return '-'
  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleString('tr-TR')
}

function formatWait(raw: string | null | undefined): string {
  const ts = toTs(raw)
  if (!ts) return '-'
  const diff = Math.max(0, Date.now() - ts)
  const totalMin = Math.floor(diff / (1000 * 60))
  if (totalMin < 60) return `${totalMin} dk`
  const totalHour = Math.floor(totalMin / 60)
  if (totalHour < 24) return `${totalHour} sa`
  const day = Math.floor(totalHour / 24)
  const hour = totalHour % 24
  return hour > 0 ? `${day} gün ${hour} sa` : `${day} gün`
}

function uniqueByKey<T>(items: T[], keyBuilder: (item: T) => string): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const item of items) {
    const key = keyBuilder(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

function asBusinessRow(raw: GenericRow): BusinessRow {
  return {
    ...raw,
    id: stringValue(raw.id),
    owner_id: stringValue(raw.owner_id) || null,
    name: stringValue(raw.name) || null,
    description: stringValue(raw.description) || null,
    phone: stringValue(raw.phone) || null,
    address_text: stringValue(raw.address_text) || null,
    type: stringValue(raw.type) || null,
    status: stringValue(raw.status) || null,
    created_at: stringValue(raw.created_at) || null,
    lat: nullableNumber(raw.lat),
    lng: nullableNumber(raw.lng),
    image_url: stringValue(raw.image_url) || null,
    gallery: Array.isArray(raw.gallery) ? (raw.gallery.filter((item) => typeof item === 'string') as string[]) : null,
    road_name: stringValue(raw.road_name) || null,
    road_note: stringValue(raw.road_note) || null,
    road_type: stringValue(raw.road_type) || null,
    road_place_id: stringValue(raw.road_place_id) || null,
  }
}

function asProfileRow(raw: GenericRow): ProfileRow {
  return {
    ...raw,
    id: stringValue(raw.id),
    full_name: stringValue(raw.full_name) || null,
    email: stringValue(raw.email) || null,
    avatar_url: stringValue(raw.avatar_url) || null,
    role: stringValue(raw.role) || null,
    status: stringValue(raw.status) || null,
    created_at: stringValue(raw.created_at) || null,
  }
}

function isObject(value: unknown): value is GenericRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '-'
  if (typeof value === 'string') return value.trim() || '-'
  if (Array.isArray(value)) return value.length > 0 ? JSON.stringify(value) : '-'
  if (isObject(value)) return JSON.stringify(value)
  return String(value)
}

function RawFieldTable({ title, record }: { title: string; record: GenericRow | null }) {
  const entries = useMemo(() => {
    if (!record) return [] as Array<{ key: string; value: string }>
    return Object.keys(record)
      .sort((a, b) => a.localeCompare(b, 'tr-TR'))
      .map((key) => ({ key, value: normalizeCellValue(record[key]) }))
  }, [record])

  if (entries.length === 0) {
    return (
      <div className={`${cardClass} p-4`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
        <p className="mt-2 text-sm text-slate-500">Alan bulunamadı.</p>
      </div>
    )
  }

  return (
    <div className={`${cardClass} p-4`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <div className="mt-3 max-h-[260px] overflow-y-auto rounded-xl border border-slate-200/70">
        <table className="w-full text-left">
          <tbody className="divide-y divide-slate-200/70">
            {entries.map((entry) => (
              <tr key={entry.key} className="align-top">
                <td className="w-[36%] px-3 py-2 text-[11px] font-bold text-slate-500">{entry.key}</td>
                <td className="px-3 py-2 text-[12px] text-slate-700 break-all">{entry.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InfoCell({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800 flex items-center gap-1.5">
        {icon}
        <span className="break-all">{value || '-'}</span>
      </p>
    </div>
  )
}

export default function ApprovalsPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  const [queueLoading, setQueueLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [detail, setDetail] = useState<DetailState | null>(null)
  const [activePhoto, setActivePhoto] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest')
  const [decisionLoading, setDecisionLoading] = useState<DecisionType | null>(null)

  const fetchPending = async (silent = false) => {
    if (!silent) {
      setQueueLoading(true)
    } else {
      setRefreshing(true)
    }

    const pendingRes = await supabase
      .from('businesses')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (pendingRes.error) {
      setPendingItems([])
      setQueueLoading(false)
      setRefreshing(false)
      return
    }

    const businessRows = ((pendingRes.data || []) as GenericRow[]).map(asBusinessRow)
    const businessIds = businessRows.map((row) => row.id).filter(Boolean)
    const ownerIds = Array.from(
      new Set(
        businessRows
          .map((row) => row.owner_id || '')
          .map((row) => row.trim())
          .filter((row) => row.length > 0)
      )
    )

    const ownerMap = new Map<string, ProfileRow>()
    if (ownerIds.length > 0) {
      const ownerRes = await supabase.from('profiles').select('*').in('id', ownerIds)
      if (!ownerRes.error) {
        for (const row of (ownerRes.data || []) as GenericRow[]) {
          const profile = asProfileRow(row)
          ownerMap.set(profile.id, profile)
        }
      }
    }

    const categoriesByBusiness = new Map<string, string[]>()
    if (businessIds.length > 0) {
      const relationRes = await supabase
        .from('business_categories')
        .select('business_id,category_id')
        .in('business_id', businessIds)

      if (!relationRes.error) {
        const relRows = (relationRes.data || []) as Array<{
          business_id?: string | null
          category_id?: string | null
        }>

        const categoryIds = Array.from(
          new Set(
            relRows
              .map((row) => row.category_id || '')
              .map((value) => value.trim())
              .filter((value) => value.length > 0)
          )
        )

        const categoryNameById = new Map<string, string>()
        if (categoryIds.length > 0) {
          const categoryRes = await supabase.from('categories').select('id,name').in('id', categoryIds)
          if (!categoryRes.error) {
            for (const row of (categoryRes.data || []) as Array<{ id?: string | null; name?: string | null }>) {
              const id = (row.id || '').trim()
              const name = (row.name || '').trim()
              if (id && name) {
                categoryNameById.set(id, name)
              }
            }
          }
        }

        for (const row of relRows) {
          const businessId = (row.business_id || '').trim()
          const categoryId = (row.category_id || '').trim()
          if (!businessId || !categoryId) continue
          const categoryName = categoryNameById.get(categoryId)
          if (!categoryName) continue
          const current = categoriesByBusiness.get(businessId) || []
          categoriesByBusiness.set(businessId, [...current, categoryName])
        }
      }
    }

    const items: PendingItem[] = businessRows.map((business) => ({
      business,
      owner: business.owner_id ? ownerMap.get(business.owner_id) || null : null,
      categories: uniqueByKey(categoriesByBusiness.get(business.id) || [], (value) =>
        normalizeText(value)
      ),
    }))

    setPendingItems(items)
    setSelectedBusinessId((current) => {
      if (current && items.some((item) => item.business.id === current)) {
        return current
      }
      return items[0]?.business.id || null
    })
    setQueueLoading(false)
    setRefreshing(false)
  }

  const fetchFeatureEntries = async (businessId: string): Promise<FeatureEntry[]> => {
    let featureRows: LooseFeatureRow[] = []

    const richRes = await supabase
      .from('business_features')
      .select('feature_id,feature_name,value')
      .eq('business_id', businessId)

    if (!richRes.error) {
      featureRows = (richRes.data || []) as LooseFeatureRow[]
    } else {
      const fallbackRes = await supabase
        .from('business_features')
        .select('feature_id,value')
        .eq('business_id', businessId)

      if (!fallbackRes.error) {
        featureRows = (fallbackRes.data || []) as LooseFeatureRow[]
      }
    }

    if (featureRows.length === 0) {
      return []
    }

    const featureIdSet = new Set<string>()
    for (const row of featureRows) {
      const id = row.feature_id === null || row.feature_id === undefined ? '' : String(row.feature_id).trim()
      if (id) {
        featureIdSet.add(id)
      }
    }

    const featureNameById = new Map<string, string>()
    const featureIds = Array.from(featureIdSet)
    if (featureIds.length > 0) {
      const featureRes = await supabase.from('features').select('id,name').in('id', featureIds)
      if (!featureRes.error) {
        for (const row of (featureRes.data || []) as Array<{ id?: string | null; name?: string | null }>) {
          const id = (row.id || '').trim()
          const name = (row.name || '').trim()
          if (id && name) {
            featureNameById.set(id, name)
          }
        }
      }
    }

    const mapped = featureRows
      .map((row) => {
        const rowFeatureId =
          row.feature_id === null || row.feature_id === undefined ? '' : String(row.feature_id).trim()
        const explicitName = (row.feature_name || '').trim()
        const fallbackName = rowFeatureId ? featureNameById.get(rowFeatureId) || '' : ''
        const resolvedName = explicitName || fallbackName
        return {
          name: resolvedName,
          value: row.value || null,
        }
      })
      .filter((entry) => entry.name.length > 0)

    return uniqueByKey(mapped, (entry) => normalizeText(entry.name))
  }

  const fetchDetail = async (businessId: string) => {
    setDetailLoading(true)

    const queued = pendingItems.find((item) => item.business.id === businessId) || null

    const businessRes = await supabase.from('businesses').select('*').eq('id', businessId).maybeSingle()
    const businessRaw = isObject(businessRes.data) ? businessRes.data : queued?.business || null
    if (!businessRaw) {
      setDetail(null)
      setDetailLoading(false)
      return
    }

    const business = asBusinessRow(businessRaw)
    const ownerId = (business.owner_id || '').trim()

    const [ownerRes, relationRes, features, photosRes, storesRes, campaignRes, menuCountRes, reviewRes] =
      await Promise.all([
        ownerId ? supabase.from('profiles').select('*').eq('id', ownerId).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('business_categories').select('category_id').eq('business_id', businessId),
        fetchFeatureEntries(businessId),
        supabase
          .from('business_photos')
          .select('id,url,is_cover,created_at')
          .eq('business_id', businessId)
          .order('is_cover', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('business_stores').select('id,name,floor_info').eq('business_id', businessId),
        supabase.from('business_campaigns').select('id,is_active').eq('business_id', businessId),
        supabase
          .from('business_menu_items')
          .select('id', { head: true, count: 'exact' })
          .eq('business_id', businessId),
        supabase.from('business_reviews').select('id,rating').eq('business_id', businessId),
      ])

    let categories = queued?.categories || []
    if (!relationRes.error) {
      const categoryIds = ((relationRes.data || []) as Array<{ category_id?: string | null }>)
        .map((row) => (row.category_id || '').trim())
        .filter((value) => value.length > 0)

      if (categoryIds.length > 0) {
        const categoryRes = await supabase.from('categories').select('id,name').in('id', categoryIds)
        if (!categoryRes.error) {
          categories = uniqueByKey(
            (categoryRes.data || [])
              .map((row) => ((row as { name?: string | null }).name || '').trim())
              .filter((name) => name.length > 0),
            (name) => normalizeText(name)
          )
        }
      }
    }

    const mediaRows = !photosRes.error
      ? ((photosRes.data || []) as Array<{ id?: string | null; url?: string | null; is_cover?: boolean | null; created_at?: string | null }>)
      : []

    const mediaFromTable: BusinessPhoto[] = mediaRows
      .map((row, index) => ({
        id: (row.id || '').trim() || `media-${index}`,
        url: (row.url || '').trim(),
        is_cover: Boolean(row.is_cover),
        created_at: row.created_at || null,
      }))
      .filter((row) => row.url.length > 0)

    const fallbackMedia: BusinessPhoto[] = []
    if (business.image_url && business.image_url.trim()) {
      fallbackMedia.push({
        id: 'legacy-cover',
        url: business.image_url.trim(),
        is_cover: true,
        created_at: business.created_at,
      })
    }
    if (Array.isArray(business.gallery)) {
      business.gallery.forEach((url, index) => {
        if (!url || !url.trim()) return
        fallbackMedia.push({
          id: `legacy-gallery-${index}`,
          url: url.trim(),
          is_cover: false,
          created_at: business.created_at,
        })
      })
    }

    const mergedPhotos = uniqueByKey(
      mediaFromTable.length > 0 ? mediaFromTable : fallbackMedia,
      (photo) => photo.url
    )

    const stores = !storesRes.error
      ? ((storesRes.data || []) as Array<{ id?: string | null; name?: string | null; floor_info?: string | null }>).map(
          (row, index) => ({
            id: (row.id || '').trim() || `store-${index}`,
            name: row.name || null,
            floor_info: row.floor_info || null,
          })
        )
      : []

    const campaignRows = !campaignRes.error
      ? (campaignRes.data || []) as Array<{ is_active?: boolean | null }>
      : []
    const activeCampaignCount = campaignRows.filter((row) => Boolean(row.is_active)).length

    const reviewRows = !reviewRes.error
      ? (reviewRes.data || []) as Array<{ rating?: number | null }>
      : []

    const ratings = reviewRows
      .map((row) => (typeof row.rating === 'number' && Number.isFinite(row.rating) ? row.rating : null))
      .filter((value): value is number => value !== null)

    const reviewAverage =
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10
        : null

    const nextDetail: DetailState = {
      business,
      owner: isObject(ownerRes.data) ? asProfileRow(ownerRes.data) : queued?.owner || null,
      categories,
      features,
      photos: mergedPhotos,
      stores,
      stats: {
        campaignCount: campaignRows.length,
        activeCampaignCount,
        menuItemCount: menuCountRes.error ? 0 : menuCountRes.count || 0,
        reviewCount: reviewRows.length,
        reviewAverage,
      },
    }

    setDetail(nextDetail)
    setActivePhoto(nextDetail.photos[0]?.url || null)
    setDetailLoading(false)
  }

  useEffect(() => {
    void fetchPending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedBusinessId) {
      setDetail(null)
      return
    }

    void fetchDetail(selectedBusinessId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId, pendingItems])

  const queueMetrics = useMemo(() => {
    const pendingCount = pendingItems.length
    const now = Date.now()
    const waitingLongCount = pendingItems.filter((item) => {
      const ts = toTs(item.business.created_at)
      if (!ts) return false
      const hours = (now - ts) / (1000 * 60 * 60)
      return hours >= 48
    }).length

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayCount = pendingItems.filter((item) => {
      const ts = toTs(item.business.created_at)
      return ts >= todayStart.getTime()
    }).length

    const oldestTs = pendingItems.reduce((min, item) => {
      const ts = toTs(item.business.created_at)
      if (!ts) return min
      if (!min) return ts
      return Math.min(min, ts)
    }, 0)

    return {
      pendingCount,
      waitingLongCount,
      todayCount,
      oldestWait: oldestTs ? formatWait(new Date(oldestTs).toISOString()) : '-',
    }
  }, [pendingItems])

  const filteredItems = useMemo(() => {
    const q = normalizeText(searchTerm.trim())
    const items = pendingItems.filter((item) => {
      if (!q) return true
      const haystack = normalizeText(
        [
          item.business.name || '',
          item.business.type || '',
          item.business.phone || '',
          item.business.address_text || '',
          item.owner?.full_name || '',
          item.owner?.email || '',
          item.categories.join(' '),
        ].join(' ')
      )
      return haystack.includes(q)
    })

    items.sort((left, right) => {
      const leftTs = toTs(left.business.created_at)
      const rightTs = toTs(right.business.created_at)
      return sortOrder === 'newest' ? rightTs - leftTs : leftTs - rightTs
    })
    return items
  }, [pendingItems, searchTerm, sortOrder])

  const handleDecision = async (decision: DecisionType) => {
    if (!detail) return

    const businessId = detail.business.id
    const businessName = detail.business.name || 'İşletme'
    const confirmText =
      decision === 'active'
        ? `${businessName} işletmesini onaylamak istiyor musunuz?`
        : `${businessName} işletmesini reddetmek istiyor musunuz?`

    if (!window.confirm(confirmText)) {
      return
    }

    setDecisionLoading(decision)

    const updateRes = await supabase.from('businesses').update({ status: decision }).eq('id', businessId)
    if (updateRes.error) {
      setDecisionLoading(null)
      alert(`İşlem yapılamadı: ${updateRes.error.message}`)
      return
    }

    const ownerId = detail.owner?.id || (detail.business.owner_id || '')
    if (ownerId) {
      if (decision === 'active') {
        await supabase
          .from('profiles')
          .update({ role: 'isletmeci', status: 'active' })
          .eq('id', ownerId)
          .neq('role', 'admin')
      } else {
        const remainingRes = await supabase
          .from('businesses')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', ownerId)
          .in('status', ['active', 'pending'])

        if (!remainingRes.error && (remainingRes.count || 0) === 0) {
          await supabase.from('profiles').update({ role: 'user' }).eq('id', ownerId).eq('role', 'pending_business')
        }
      }
    }

    await fetchPending(true)
    setDecisionLoading(null)
  }

  const businessCard = detail?.business || null
  const ownerCard = detail?.owner || null
  const hasPending = filteredItems.length > 0

  return (
    <div className="h-full flex flex-col gap-4 text-slate-700">
      <section className={`${cardClass} p-4 md:p-5`}>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Onay Merkezi</h1>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500">Bekleyen</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{queueMetrics.pendingCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-amber-50 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-amber-700">48+ Saat</p>
              <p className="mt-1 text-lg font-bold text-amber-800">{queueMetrics.waitingLongCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-blue-50 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-blue-700">Bugün</p>
              <p className="mt-1 text-lg font-bold text-blue-800">{queueMetrics.todayCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-emerald-50 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-emerald-700">En Eski Bekleme</p>
              <p className="mt-1 text-sm font-bold text-emerald-800">{queueMetrics.oldestWait}</p>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="İşletme, kategori, sahip, e-posta veya telefon ara..."
              className="w-full h-11 rounded-xl border border-slate-200/80 bg-white pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-300"
            />
          </div>
          <button
            type="button"
            onClick={() => setSortOrder((current) => (current === 'oldest' ? 'newest' : 'oldest'))}
            className="h-11 px-4 rounded-xl border border-slate-200/80 bg-white text-sm font-semibold text-slate-700 inline-flex items-center justify-center gap-2"
          >
            {sortOrder === 'oldest' ? <ArrowDownAZ size={15} /> : <ArrowUpAZ size={15} />}
            {sortOrder === 'oldest' ? 'Eski → Yeni' : 'Yeni → Eski'}
          </button>
          <button
            type="button"
            onClick={() => void fetchPending(true)}
            disabled={refreshing}
            className="h-11 px-4 rounded-xl border border-slate-200/80 bg-white text-sm font-semibold text-slate-700 inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Yenile
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={`${cardClass} p-3 h-[calc(100vh-292px)] min-h-[520px] flex flex-col`}>
          <div className="px-2 pb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-500">Başvuru Kuyruğu</p>
            <span className="text-xs font-semibold text-slate-500">{filteredItems.length}</span>
          </div>

          {queueLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : !hasPending ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 px-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              <p className="mt-3 text-sm font-semibold">Bekleyen başvuru bulunmuyor.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {filteredItems.map((item) => {
                const active = selectedBusinessId === item.business.id
                return (
                  <button
                    key={item.business.id}
                    type="button"
                    onClick={() => setSelectedBusinessId(item.business.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      active
                        ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-[0_14px_20px_-18px_rgba(245,158,11,0.85)]'
                        : 'border-slate-200/80 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-800 truncate">{item.business.name || 'İsimsiz işletme'}</p>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {item.owner?.full_name || item.owner?.email || 'Başvuran bulunamadı'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(item.categories.length > 0 ? item.categories : [item.business.type || 'Kategori yok']).map(
                        (category) => (
                          <span
                            key={`${item.business.id}-${category}`}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700"
                          >
                            {category}
                          </span>
                        )
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>{formatDate(item.business.created_at)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={12} />
                        {formatWait(item.business.created_at)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </aside>

        <article className={`${cardClass} p-4 md:p-5 h-[calc(100vh-292px)] min-h-[520px] overflow-y-auto`}>
          {detailLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
          ) : !detail || !businessCard ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <ShieldAlert className="w-10 h-10 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-500">İncelemek için soldan bir başvuru seçin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 to-slate-100/90 p-4">
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">
                      İşletme Başvurusu
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">{businessCard.name || 'İsimsiz işletme'}</h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(detail.categories.length > 0 ? detail.categories : [businessCard.type || 'Kategori yok']).map(
                        (category) => (
                          <span
                            key={category}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200"
                          >
                            {category}
                          </span>
                        )
                      )}
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-slate-600 border border-slate-200">
                        Başvuru: {formatDateTime(businessCard.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 min-w-[260px]">
                    <button
                      type="button"
                      onClick={() => void handleDecision('active')}
                      disabled={Boolean(decisionLoading)}
                      className="h-11 rounded-xl bg-emerald-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {decisionLoading === 'active' ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      Onayla
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDecision('rejected')}
                      disabled={Boolean(decisionLoading)}
                      className="h-11 rounded-xl bg-rose-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-rose-700 disabled:opacity-60"
                    >
                      {decisionLoading === 'rejected' ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <XCircle size={16} />
                      )}
                      Reddet
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-4">
                  <div className={`${cardClass} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      İşletme Bilgileri
                    </p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <InfoCell label="İşletme Adı" value={businessCard.name || '-'} icon={<Store size={14} />} />
                      <InfoCell label="Telefon" value={businessCard.phone || '-'} icon={<Phone size={14} />} />
                      <InfoCell label="Durum" value={businessCard.status || '-'} />
                      <InfoCell label="Ana Tip" value={businessCard.type || '-'} />
                      <InfoCell label="Yol" value={businessCard.road_name || '-'} />
                      <InfoCell label="Yol Tipi" value={businessCard.road_type || '-'} />
                    </div>

                    <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500">Adres</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{businessCard.address_text || '-'}</p>
                    </div>

                    <div className="mt-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500">Koordinat</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {businessCard.lat ?? '-'}, {businessCard.lng ?? '-'}
                        </p>
                      </div>
                      {businessCard.lat !== null && businessCard.lng !== null ? (
                        <a
                          href={`https://maps.google.com/?q=${businessCard.lat},${businessCard.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5"
                        >
                          <MapPin size={13} />
                          Haritada Aç
                          <ExternalLink size={12} />
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-500">Açıklama</p>
                      <p className="mt-1 text-sm text-slate-700">{businessCard.description || '-'}</p>
                    </div>
                  </div>

                  <div className={`${cardClass} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Operasyon Özeti
                    </p>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                      <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Kampanya</p>
                        <p className="mt-1 text-base font-bold text-slate-900">{detail.stats.campaignCount}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Aktif Kamp.</p>
                        <p className="mt-1 text-base font-bold text-emerald-700">{detail.stats.activeCampaignCount}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Menü Ürünü</p>
                        <p className="mt-1 text-base font-bold text-slate-900">{detail.stats.menuItemCount}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Yorum</p>
                        <p className="mt-1 text-base font-bold text-slate-900">{detail.stats.reviewCount}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Puan Ort.</p>
                        <p className="mt-1 text-base font-bold text-amber-700">
                          {detail.stats.reviewAverage !== null ? detail.stats.reviewAverage.toFixed(1) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`${cardClass} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Medya</p>
                    {detail.photos.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 py-10 text-center text-slate-500">
                        <ImageIcon className="w-7 h-7 mx-auto" />
                        <p className="mt-2 text-sm font-semibold">Fotoğraf bulunamadı.</p>
                      </div>
                    ) : (
                      <>
                        <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                          <img
                            src={activePhoto || detail.photos[0].url}
                            alt="İşletme görseli"
                            className="w-full h-[260px] object-cover"
                          />
                        </div>
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                          {detail.photos.map((photo) => {
                            const selected = (activePhoto || detail.photos[0].url) === photo.url
                            return (
                              <button
                                key={photo.id}
                                type="button"
                                onClick={() => setActivePhoto(photo.url)}
                                className={`relative shrink-0 rounded-lg overflow-hidden border-2 ${
                                  selected ? 'border-blue-500' : 'border-transparent'
                                }`}
                              >
                                <img src={photo.url} alt="" className="w-[86px] h-[66px] object-cover" />
                                {photo.is_cover ? (
                                  <span className="absolute left-1 top-1 px-1.5 py-0.5 rounded bg-slate-900/70 text-white text-[9px] font-semibold">
                                    Kapak
                                  </span>
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  <div className={`${cardClass} p-4`}>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Özellikler</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {detail.features.length > 0 ? (
                            detail.features.map((feature) => (
                              <span
                                key={feature.name}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700"
                              >
                                {feature.name}
                                {feature.value ? `: ${feature.value}` : ''}
                              </span>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">Özellik kaydı yok.</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Mağaza/Bölüm</p>
                        <div className="mt-3 space-y-1.5">
                          {detail.stores.length > 0 ? (
                            detail.stores.map((store) => (
                              <div
                                key={store.id}
                                className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 text-xs"
                              >
                                <p className="font-semibold text-slate-800">{store.name || '-'}</p>
                                <p className="text-slate-500">{store.floor_info || '-'}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">Bölüm kaydı yok.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`${cardClass} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Başvuran Kullanıcı</p>
                    {ownerCard ? (
                      <div className="mt-3">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-full border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                            {ownerCard.avatar_url ? (
                              <img src={ownerCard.avatar_url} alt={ownerCard.full_name || 'Profil'} className="w-full h-full object-cover" />
                            ) : (
                              <UserCircle2 className="w-8 h-8 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-bold text-slate-900 truncate">{ownerCard.full_name || 'İsimsiz kullanıcı'}</p>
                            <p className="text-xs text-slate-500 break-all">{ownerCard.email || '-'}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2">
                          <InfoCell label="Kullanıcı ID" value={ownerCard.id} />
                          <InfoCell label="Rol" value={ownerCard.role || '-'} />
                          <InfoCell label="Durum" value={ownerCard.status || '-'} />
                          <InfoCell label="Kayıt Tarihi" value={formatDateTime(ownerCard.created_at)} />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Başvuru sahibinin profil kaydı okunamadı.
                      </div>
                    )}
                  </div>

                  <RawFieldTable title="İşletme Tüm Alanlar" record={businessCard} />
                  <RawFieldTable title="Kullanıcı Tüm Alanlar" record={ownerCard} />
                </div>
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
