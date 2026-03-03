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
import { ModuleTitle } from '../../merchant/_components/module-title'
import { adminJsonHeaders } from '../_lib/csrf'

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

const ADMIN_APPROVALS_API = '/api/admin/approvals'

type AdminApprovalsApiResult = {
  ok?: boolean
  error?: string
}

type LooseFeatureRow = {
  feature_id?: string | number | null
  feature_name?: string | null
  value?: string | null
}

async function postAdminApprovalsAction(payload: Record<string, unknown>): Promise<void> {
  const response = await fetch(ADMIN_APPROVALS_API, {
    method: 'POST',
    headers: adminJsonHeaders(),
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => null)) as AdminApprovalsApiResult | null
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || 'İşlem başarısız.')
  }
}

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

function RawFieldTable({ title, record }: { title: string; record: GenericRow | null }) {
  const entries = useMemo(() => {
    if (!record) return [] as Array<{ key: string; value: string }>
    return Object.keys(record)
      .sort((a, b) => a.localeCompare(b, 'tr-TR'))
      .map((key) => ({ key, value: normalizeCellValue(record[key]) }))
  }, [record])

  if (entries.length === 0) {
    return (
      <HardwarePanel className="p-5">
        <p className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] border-b border-[#1e232b] pb-3">{title}</p>
        <p className="mt-4 text-[10px] font-mono text-[#64748b] uppercase tracking-widest">Alan bulunamadı.</p>
      </HardwarePanel>
    )
  }

  return (
    <HardwarePanel className="p-5">
      <p className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] border-b border-[#1e232b] pb-3">{title}</p>
      <div className="mt-4 max-h-[320px] overflow-y-auto rounded border border-[#2d313a] bg-[#101419] custom-scrollbar">
        <table className="w-full text-left">
          <tbody className="divide-y divide-[#1e232b]">
            {entries.map((entry) => (
              <tr key={entry.key} className="align-top hover:bg-[#16181d] transition-colors">
                <td className="w-[36%] px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b] border-r border-[#1e232b]">{entry.key}</td>
                <td className="px-4 py-3 text-[11px] font-mono text-[#cbd5e1] break-all">{entry.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </HardwarePanel>
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
    <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3">
      <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">{label}</p>
      <p className="mt-1.5 text-[11px] font-mono text-[#e2e8f0] flex items-center gap-2">
        {icon ? <span className="text-[#38bdf8]">{icon}</span> : null}
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

    try {
      await postAdminApprovalsAction({
        action: 'set_decision',
        businessId,
        decision,
      })
      await fetchPending(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'İşlem yapılamadı.'
      alert(`İşlem yapılamadı: ${message}`)
    } finally {
      setDecisionLoading(null)
    }
  }

  const businessCard = detail?.business || null
  const ownerCard = detail?.owner || null
  const hasPending = filteredItems.length > 0

  return (
    <div className="space-y-6 flex flex-col h-full">
      <HardwarePanel className="p-5 md:p-6 border-b border-[#2d313a]">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <ModuleTitle title="Onay Merkezi" />
            <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b] mt-2">
              Bekleyen işletme başvurularını incele ve aksiyon al.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
              <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Bekleyen</p>
              <p className="mt-1 text-lg font-mono text-[#e2e8f0]">{queueMetrics.pendingCount}</p>
            </div>
            <div className="rounded border border-amber-900/30 bg-amber-950/10 px-4 py-3 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-amber-500/0 group-hover:bg-amber-500/50 transition-colors" />
              <p className="text-[9px] uppercase tracking-widest font-mono text-amber-500/70">48+ Saat</p>
              <p className="mt-1 text-lg font-mono text-amber-400">{queueMetrics.waitingLongCount}</p>
            </div>
            <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
              <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Bugün</p>
              <p className="mt-1 text-lg font-mono text-[#e2e8f0]">{queueMetrics.todayCount}</p>
            </div>
            <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
              <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">En Eski Bekleme</p>
              <p className="mt-1 text-sm font-mono text-[#e2e8f0] truncate">{queueMetrics.oldestWait}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#475569]" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="İşletme, kategori, sahip, e-posta veya telefon ara..."
              className="w-full pl-11 pr-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
            />
          </div>
          <button
            type="button"
            onClick={() => setSortOrder((current) => (current === 'oldest' ? 'newest' : 'oldest'))}
            className="px-4 py-3 rounded text-[10px] font-mono uppercase tracking-widest bg-[#0a0c10] border border-[#2d313a] text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors inline-flex items-center justify-center gap-2"
          >
            {sortOrder === 'oldest' ? <ArrowDownAZ size={14} /> : <ArrowUpAZ size={14} />}
            {sortOrder === 'oldest' ? 'Eski → Yeni' : 'Yeni → Eski'}
          </button>
          <button
            type="button"
            onClick={() => void fetchPending(true)}
            disabled={refreshing}
            className="px-4 py-3 rounded text-[10px] font-mono uppercase tracking-widest bg-[#16181d] border border-[#2d313a] text-[#e2e8f0] hover:bg-[#1a1d24] transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Yenile
          </button>
        </div>
      </HardwarePanel>

      <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] flex-1 min-h-0">
        
        {/* LEYFT SIDEBAR (QUEUE) */}
        <HardwarePanel className="p-0 overflow-hidden flex flex-col h-[calc(100vh-320px)] min-h-[500px]">
          <div className="px-5 py-4 border-b border-[#2d313a] bg-[#0f1115] flex items-center justify-between">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#e2e8f0]">Başvuru Kuyruğu</p>
            <span className="px-2.5 py-1 rounded bg-[#101419] border border-[#1e232b] text-[9px] font-mono text-[#64748b]">{filteredItems.length} ADET</span>
          </div>

          {queueLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#38bdf8]" />
            </div>
          ) : !hasPending ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
              <CheckCircle2 className="w-8 h-8 text-[#166534] mb-3" />
              BEKLEYEN BAŞVURU BULUNMUYOR.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-[#0a0c10]">
              {filteredItems.map((item) => {
                const active = selectedBusinessId === item.business.id
                return (
                  <button
                    key={item.business.id}
                    type="button"
                    onClick={() => setSelectedBusinessId(item.business.id)}
                    className={`w-full text-left p-4 rounded border transition-all ${
                      active
                        ? 'border-[#226785] bg-[#153445]'
                        : 'border-[#2d313a] bg-[#16181d] hover:border-[#475569]'
                    }`}
                  >
                    <p className={`text-[12px] font-medium uppercase tracking-wide truncate ${active ? 'text-[#38bdf8]' : 'text-[#e2e8f0]'}`}>
                      {item.business.name || 'İSİMSİZ İŞLETME'}
                    </p>
                    <p className="text-[10px] font-mono text-[#64748b] mt-1.5 truncate uppercase tracking-widest">
                      {item.owner?.full_name || item.owner?.email || 'SAHİP BİLİNMİYOR'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(item.categories.length > 0 ? item.categories : [item.business.type || 'KATEGORİ YOK']).map(
                        (category) => (
                          <span
                            key={`${item.business.id}-${category}`}
                            className={`px-2 py-1 rounded text-[8px] font-mono uppercase tracking-widest border ${
                              active ? 'bg-[#101920] border-[#1e232b] text-[#38bdf8]' : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b]'
                            }`}
                          >
                            {category}
                          </span>
                        )
                      )}
                    </div>
                    <div className="mt-3 pt-2 flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-[#64748b] border-t border-[#1e232b]">
                      <span>{formatDate(item.business.created_at)}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={10} />
                        {formatWait(item.business.created_at)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </HardwarePanel>

        {/* RIGHT AREA (DETAIL) */}
        <div className="h-[calc(100vh-320px)] min-h-[500px] overflow-y-auto custom-scrollbar">
          {detailLoading ? (
            <HardwarePanel className="h-full flex items-center justify-center p-0">
              <Loader2 className="w-8 h-8 animate-spin text-[#38bdf8]" />
            </HardwarePanel>
          ) : !detail || !businessCard ? (
            <HardwarePanel className="h-full flex flex-col items-center justify-center text-center p-6 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
              <ShieldAlert className="w-8 h-8 mb-3 opacity-50" />
              İNCELEMEK İÇİN SOLDAN BİR BAŞVURU SEÇİN.
            </HardwarePanel>
          ) : (
            <div className="space-y-5">
              
              <HardwarePanel className="p-5 md:p-6 bg-[#0f1115]">
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">İşletme Başvurusu</p>
                    <h2 className="mt-1 text-[20px] font-medium text-[#e2e8f0] uppercase tracking-wide">{businessCard.name || 'İSİMSİZ İŞLETME'}</h2>
                    <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-mono uppercase tracking-widest">
                      {(detail.categories.length > 0 ? detail.categories : [businessCard.type || 'KATEGORİ YOK']).map(
                        (category) => (
                          <span
                            key={category}
                            className="px-2.5 py-1 rounded bg-[#16181d] border border-[#2d313a] text-[#cbd5e1]"
                          >
                            {category}
                          </span>
                        )
                      )}
                      <span className="px-2.5 py-1 rounded bg-[#16181d] border border-[#2d313a] text-[#64748b]">
                        BAŞVURU: {formatDateTime(businessCard.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 xl:w-[320px]">
                    <button
                      type="button"
                      onClick={() => void handleDecision('active')}
                      disabled={Boolean(decisionLoading)}
                      className="h-12 rounded bg-[linear-gradient(180deg,#065f46_0%,#14532d_100%)] border border-emerald-700/50 text-emerald-400 text-[11px] font-mono uppercase tracking-widest inline-flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    >
                      {decisionLoading === 'active' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      ONAYLA
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDecision('rejected')}
                      disabled={Boolean(decisionLoading)}
                      className="h-12 rounded bg-[linear-gradient(180deg,#9f1239_0%,#881337_100%)] border border-rose-800/50 text-rose-300 text-[11px] font-mono uppercase tracking-widest inline-flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    >
                      {decisionLoading === 'rejected' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <XCircle size={14} />
                      )}
                      REDDET
                    </button>
                  </div>
                </div>
              </HardwarePanel>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
                
                <div className="space-y-5">
                  <HardwarePanel className="p-5">
                    <p className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] border-b border-[#1e232b] pb-3">
                      İşletme Bilgileri
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <InfoCell label="İşletme Adı" value={businessCard.name || '-'} icon={<Store size={14} />} />
                      <InfoCell label="Telefon" value={businessCard.phone || '-'} icon={<Phone size={14} />} />
                      <InfoCell label="Durum" value={businessCard.status || '-'} />
                      <InfoCell label="Ana Tip" value={businessCard.type || '-'} />
                      <InfoCell label="Yol" value={businessCard.road_name || '-'} />
                      <InfoCell label="Yol Tipi" value={businessCard.road_type || '-'} />
                    </div>

                    <div className="mt-3 rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3">
                      <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Adres</p>
                      <p className="mt-1.5 text-[11px] font-mono text-[#e2e8f0] leading-relaxed">{businessCard.address_text || '-'}</p>
                    </div>

                    <div className="mt-3 rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Koordinat</p>
                        <p className="mt-1.5 text-[11px] font-mono text-[#e2e8f0]">
                          {businessCard.lat ?? '-'}, {businessCard.lng ?? '-'}
                        </p>
                      </div>
                      {businessCard.lat !== null && businessCard.lng !== null ? (
                        <a
                          href={`https://maps.google.com/?q=${businessCard.lat},${businessCard.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded border border-[#2d313a] bg-[#16181d] text-[9px] font-mono uppercase tracking-widest text-[#38bdf8] inline-flex items-center gap-2 hover:bg-[#1a1d24] transition-colors"
                        >
                          <MapPin size={12} />
                          HARİTA
                          <ExternalLink size={10} />
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-3 rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3">
                      <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Açıklama</p>
                      <p className="mt-1.5 text-[11px] font-mono text-[#cbd5e1] leading-relaxed">{businessCard.description || '-'}</p>
                    </div>
                  </HardwarePanel>

                  <HardwarePanel className="p-5">
                    <p className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] border-b border-[#1e232b] pb-3">
                      Özellik ve İmkanlar
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b] mb-2.5">Genel Özellikler</p>
                        <div className="flex flex-wrap gap-2">
                          {detail.features.length > 0 ? (
                            detail.features.map((feature) => (
                              <span
                                key={feature.name}
                                className="px-2.5 py-1.5 rounded border border-[#2d313a] bg-[#0a0c10] text-[9px] font-mono uppercase tracking-widest text-[#cbd5e1]"
                              >
                                {feature.name}
                                {feature.value ? `: ${feature.value}` : ''}
                              </span>
                            ))
                          ) : (
                            <p className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">ÖZELLİK KAYDI YOK.</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b] mb-2.5">Mağaza / Bölüm</p>
                        <div className="space-y-2">
                          {detail.stores.length > 0 ? (
                            detail.stores.map((store) => (
                              <div
                                key={store.id}
                                className="rounded border border-[#2d313a] bg-[#0a0c10] px-3 py-2 flex justify-between items-center gap-2"
                              >
                                <p className="text-[10px] font-mono text-[#e2e8f0] uppercase tracking-widest truncate">{store.name || '-'}</p>
                                <p className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest shrink-0">{store.floor_info || '-'}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">BÖLÜM KAYDI YOK.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </HardwarePanel>

                  <HardwarePanel className="p-5">
                    <p className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] border-b border-[#1e232b] pb-3">
                      Medya Varlıkları
                    </p>
                    {detail.photos.length === 0 ? (
                      <div className="mt-4 rounded border border-dashed border-[#2d313a] bg-[#0a0c10] py-12 flex flex-col items-center justify-center text-[10px] font-mono text-[#475569] uppercase tracking-widest">
                        <ImageIcon className="w-6 h-6 mb-3 opacity-50" />
                        GÖRSEL BULUNAMADI.
                      </div>
                    ) : (
                      <>
                        <div className="mt-4 rounded border border-[#2d313a] bg-[#0a0c10] overflow-hidden aspect-video">
                          <img
                            src={activePhoto || detail.photos[0].url}
                            alt="İşletme görseli"
                            className="w-full h-full object-cover mix-blend-lighten opacity-80"
                          />
                        </div>
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                          {detail.photos.map((photo) => {
                            const selected = (activePhoto || detail.photos[0].url) === photo.url
                            return (
                              <button
                                key={photo.id}
                                type="button"
                                onClick={() => setActivePhoto(photo.url)}
                                className={`relative shrink-0 rounded border-2 transition-all overflow-hidden ${
                                  selected ? 'border-[#38bdf8] opacity-100' : 'border-[#2d313a] opacity-60 hover:opacity-100'
                                }`}
                              >
                                <img src={photo.url} alt="" className="w-20 h-14 object-cover mix-blend-lighten" />
                                {photo.is_cover ? (
                                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#16181d]/80 border border-[#2d313a] text-[#38bdf8] text-[8px] font-mono uppercase tracking-widest backdrop-blur-sm">
                                    VİTRİN
                                  </span>
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </HardwarePanel>
                </div>

                <div className="space-y-5">
                  <HardwarePanel className="p-5">
                    <p className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] border-b border-[#1e232b] pb-3">
                      Başvuran Kullanıcı
                    </p>
                    {ownerCard ? (
                      <div className="mt-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded border border-[#2d313a] bg-[#16181d] overflow-hidden flex items-center justify-center shrink-0">
                            {ownerCard.avatar_url ? (
                              <img src={ownerCard.avatar_url} alt={ownerCard.full_name || 'Profil'} className="w-full h-full object-cover mix-blend-lighten opacity-80" />
                            ) : (
                              <UserCircle2 className="w-6 h-6 text-[#475569]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[#e2e8f0] uppercase tracking-wide truncate">{ownerCard.full_name || 'İSİMSİZ KULLANICI'}</p>
                            <p className="text-[10px] font-mono text-[#64748b] mt-1 truncate">{ownerCard.email || '-'}</p>
                          </div>
                        </div>
                        <div className="mt-5 grid gap-3">
                          <InfoCell label="Kullanıcı ID" value={ownerCard.id} />
                          <InfoCell label="Rol" value={(ownerCard.role || '-').toUpperCase()} />
                          <InfoCell label="Durum" value={(ownerCard.status || '-').toUpperCase()} />
                          <InfoCell label="Kayıt Tarihi" value={formatDateTime(ownerCard.created_at)} />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-rose-400 flex items-center gap-2">
                        <AlertTriangle size={14} className="shrink-0" />
                        BAŞVURU SAHİBİNİN PROFİL KAYDI OKUNAMADI.
                      </div>
                    )}
                  </HardwarePanel>

                  <HardwarePanel className="p-5">
                    <p className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] border-b border-[#1e232b] pb-3">
                      Operasyon Özeti
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-3 py-2.5">
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Kampanya</p>
                        <p className="mt-1.5 text-base font-mono text-[#e2e8f0]">{detail.stats.campaignCount}</p>
                      </div>
                      <div className="rounded border border-[#226785] bg-[#153445]/20 px-3 py-2.5">
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[#38bdf8]">Aktif Kamp.</p>
                        <p className="mt-1.5 text-base font-mono text-[#38bdf8]">{detail.stats.activeCampaignCount}</p>
                      </div>
                      <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-3 py-2.5">
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Menü Ürünü</p>
                        <p className="mt-1.5 text-base font-mono text-[#e2e8f0]">{detail.stats.menuItemCount}</p>
                      </div>
                      <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-3 py-2.5">
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Yorum</p>
                        <p className="mt-1.5 text-base font-mono text-[#e2e8f0]">{detail.stats.reviewCount}</p>
                      </div>
                      <div className="col-span-2 rounded border border-[#2d313a] bg-[#0a0c10] px-3 py-2.5 flex items-center justify-between">
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Puan Ortalaması</p>
                        <p className="text-base font-mono text-amber-400">
                          {detail.stats.reviewAverage !== null ? detail.stats.reviewAverage.toFixed(1) : '-'}
                        </p>
                      </div>
                    </div>
                  </HardwarePanel>

                  <RawFieldTable title="İşletme Veri Dökümü" record={businessCard} />
                  <RawFieldTable title="Kullanıcı Veri Dökümü" record={ownerCard} />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
