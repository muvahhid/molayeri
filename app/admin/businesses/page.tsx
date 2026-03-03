'use client'

import { ModuleTitle } from '../../merchant/_components/module-title'
import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserCircle2,
  X,
} from 'lucide-react'

type GenericRow = Record<string, unknown>

type CategoryOption = {
  id: string
  name: string
  slug: string
}

type FeatureOption = {
  id: string
  name: string
  is_global: boolean
  category_id: string | null
}

type ProfileLite = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  role: string | null
  status: string | null
}

type BusinessRow = {
  raw: GenericRow
  id: string
  owner_id: string | null
  name: string | null
  description: string | null
  phone: string | null
  address_text: string | null
  type: string | null
  status: string | null
  lat: number | null
  lng: number | null
  road_name: string | null
  road_note: string | null
  road_type: string | null
  road_place_id: string | null
  image_url: string | null
  menu_description: string | null
  is_open: boolean
  created_at: string | null
}

type BusinessListItem = {
  business: BusinessRow
  owner: ProfileLite | null
  categories: string[]
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
  owner: ProfileLite | null
  ownerRaw: GenericRow | null
  categoryIds: string[]
  featureIds: string[]
  featureLegacyNames: string[]
  featureWriteMode: 'id' | 'name' | 'mixed'
  photos: BusinessPhoto[]
  stores: BusinessStore[]
  metrics: {
    campaignCount: number
    activeCampaignCount: number
    reviewCount: number
    reviewAverage: number | null
    menuItemCount: number
  }
}

type FormState = {
  name: string
  description: string
  phone: string
  address_text: string
  type: string
  status: string
  lat: string
  lng: string
  road_name: string
  road_note: string
  road_type: string
  road_place_id: string
  image_url: string
  menu_description: string
  is_open: boolean
}

type SortValue = 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc'
type BulkStatus = 'active' | 'passive' | 'pending' | 'rejected'
type TabValue = 'genel' | 'konum' | 'kategori' | 'medya' | 'sahip' | 'ham'

const PAGE_WINDOW = 10
const PAGE_SIZE_OPTIONS = [25, 50, 100]
const ADMIN_BUSINESSES_API = '/api/admin/businesses'

type AdminBusinessesApiResult = {
  ok?: boolean
  error?: string
  affected?: number
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

function parseNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}


function buildBusinessRow(raw: GenericRow): BusinessRow {
  return {
    raw,
    id: String(raw.id || ''),
    owner_id: typeof raw.owner_id === 'string' ? raw.owner_id : null,
    name: typeof raw.name === 'string' ? raw.name : null,
    description: typeof raw.description === 'string' ? raw.description : null,
    phone: typeof raw.phone === 'string' ? raw.phone : null,
    address_text: typeof raw.address_text === 'string' ? raw.address_text : null,
    type: typeof raw.type === 'string' ? raw.type : null,
    status: typeof raw.status === 'string' ? raw.status : null,
    lat: parseNumber(raw.lat),
    lng: parseNumber(raw.lng),
    road_name: typeof raw.road_name === 'string' ? raw.road_name : null,
    road_note: typeof raw.road_note === 'string' ? raw.road_note : null,
    road_type: typeof raw.road_type === 'string' ? raw.road_type : null,
    road_place_id: typeof raw.road_place_id === 'string' ? raw.road_place_id : null,
    image_url: typeof raw.image_url === 'string' ? raw.image_url : null,
    menu_description: typeof raw.menu_description === 'string' ? raw.menu_description : null,
    is_open: raw.is_open === false ? false : true,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : null,
  }
}

function buildProfileLite(raw: GenericRow): ProfileLite {
  return {
    id: String(raw.id || ''),
    full_name: typeof raw.full_name === 'string' ? raw.full_name : null,
    email: typeof raw.email === 'string' ? raw.email : null,
    avatar_url: typeof raw.avatar_url === 'string' ? raw.avatar_url : null,
    role: typeof raw.role === 'string' ? raw.role : null,
    status: typeof raw.status === 'string' ? raw.status : null,
  }
}

function roleLabel(value: string | null): string {
  const role = normalizeText(value || '')
  if (role === 'admin') return 'Admin'
  if (role === 'isletmeci') return 'İşletmeci'
  if (role === 'pending_business') return 'Aday İşletmeci'
  return 'Kullanıcı'
}

function safeStringify(value: unknown): string {
  if (value === undefined) return '-'
  if (value === null) return '-'
  if (typeof value === 'string') return value || '-'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
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

function RawTable({ title, data }: { title: string; data: GenericRow | null }) {
  const entries = useMemo(() => {
    if (!data) return [] as Array<{ key: string; value: string }>
    return Object.keys(data)
      .sort((a, b) => a.localeCompare(b, 'tr-TR'))
      .map((key) => ({
        key,
        value: safeStringify(data[key]),
      }))
  }, [data])

  return (
    <HardwarePanel className="p-4 md:p-5">
      <p className="text-[10px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3 mb-4">{title}</p>
      {entries.length === 0 ? (
        <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Kayıt yok.</p>
      ) : (
        <div className="rounded border border-[#2d313a] bg-[#101419] max-h-[380px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <tbody className="divide-y divide-[#1e232b]">
              {entries.map((entry) => (
                <tr key={entry.key} className="hover:bg-[#16181d] transition-colors">
                  <td className="w-[36%] px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b] border-r border-[#1e232b] align-top">{entry.key}</td>
                  <td className="px-4 py-3 text-[11px] font-mono text-[#cbd5e1] break-all align-top">{entry.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HardwarePanel>
  )
}

function statusTone(status: string | null): string {
  const v = normalizeText(status || '')
  if (v === 'active') return 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400'
  if (v === 'pending') return 'bg-amber-950/30 border-amber-900/50 text-amber-400'
  if (v === 'rejected') return 'bg-rose-950/30 border-rose-900/50 text-rose-400'
  if (v === 'passive') return 'bg-orange-950/30 border-orange-900/50 text-orange-400'
  return 'bg-[#16181d] border-[#2d313a] text-[#64748b]'
}

async function safeCount(
  query: PromiseLike<{ count: number | null; error: { message?: string } | null }>
): Promise<number> {
  try {
    const { count, error } = await query
    if (error) return 0
    return count || 0
  } catch {
    return 0
  }
}

async function postAdminBusinessesAction(payload: Record<string, unknown>): Promise<AdminBusinessesApiResult> {
  const response = await fetch(ADMIN_BUSINESSES_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => null)) as AdminBusinessesApiResult | null
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || 'İşlem başarısız.')
  }
  return data
}

export default function AdminBusinessesPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [businesses, setBusinesses] = useState<BusinessListItem[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [features, setFeatures] = useState<FeatureOption[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [statusStats, setStatusStats] = useState({
    active: 0,
    passive: 0,
    pending: 0,
    rejected: 0,
  })

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [jumpPage, setJumpPage] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState<SortValue>('created_desc')
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState<BulkStatus>('active')
  const [bulkProcessing, setBulkProcessing] = useState(false)

  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<DetailState | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>([])
  const [editFeatureIds, setEditFeatureIds] = useState<string[]>([])
  const [featureLegacyNames, setFeatureLegacyNames] = useState<string[]>([])
  const [featureWriteMode, setFeatureWriteMode] = useState<'id' | 'name' | 'mixed'>('id')
  const [activeTab, setActiveTab] = useState<TabValue>('genel')
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null)

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const category of categories) {
      map.set(category.id, category.name)
    }
    return map
  }, [categories])


  const fetchLookups = async () => {
    const [categoryRes, featureRes] = await Promise.all([
      supabase.from('categories').select('id,name,slug').order('name'),
      supabase.from('features').select('id,name,is_global,category_id').order('name'),
    ])

    if (!categoryRes.error) {
      const rows = (categoryRes.data || []) as Array<{ id?: string | null; name?: string | null; slug?: string | null }>
      setCategories(
        rows
          .map((row) => ({
            id: (row.id || '').trim(),
            name: (row.name || '').trim(),
            slug: (row.slug || '').trim(),
          }))
          .filter((row) => row.id && row.name)
      )
    }

    if (!featureRes.error) {
      const rows = (featureRes.data || []) as Array<{
        id?: string | null
        name?: string | null
        is_global?: boolean | null
        category_id?: string | null
      }>
      setFeatures(
        rows
          .map((row) => ({
            id: (row.id || '').trim(),
            name: (row.name || '').trim(),
            is_global: Boolean(row.is_global),
            category_id: row.category_id || null,
          }))
          .filter((row) => row.id && row.name)
      )
    }
  }

  const fetchStatusStats = async () => {
    const [active, passive, pending, rejected] = await Promise.all([
      safeCount(supabase.from('businesses').select('id', { head: true, count: 'exact' }).eq('status', 'active')),
      safeCount(supabase.from('businesses').select('id', { head: true, count: 'exact' }).eq('status', 'passive')),
      safeCount(supabase.from('businesses').select('id', { head: true, count: 'exact' }).eq('status', 'pending')),
      safeCount(supabase.from('businesses').select('id', { head: true, count: 'exact' }).eq('status', 'rejected')),
    ])

    setStatusStats({ active, passive, pending, rejected })
  }

  const buildSort = (): { column: string; asc: boolean } => {
    if (sort === 'created_asc') return { column: 'created_at', asc: true }
    if (sort === 'name_asc') return { column: 'name', asc: true }
    if (sort === 'name_desc') return { column: 'name', asc: false }
    return { column: 'created_at', asc: false }
  }

  const readBusinessFeatures = async (
    businessId: string
  ): Promise<{ rows: Array<{ feature_id?: string | null; feature_name?: string | null }>; readMode: 'id' | 'name' | 'mixed' }> => {
    const mixedRes = await supabase
      .from('business_features')
      .select('feature_id,feature_name')
      .eq('business_id', businessId)

    if (!mixedRes.error) {
      return {
        rows: (mixedRes.data || []) as Array<{ feature_id?: string | null; feature_name?: string | null }>,
        readMode: 'mixed',
      }
    }

    const idRes = await supabase.from('business_features').select('feature_id').eq('business_id', businessId)
    if (!idRes.error) {
      return {
        rows: (idRes.data || []) as Array<{ feature_id?: string | null; feature_name?: string | null }>,
        readMode: 'id',
      }
    }

    const nameRes = await supabase.from('business_features').select('feature_name').eq('business_id', businessId)
    if (!nameRes.error) {
      return {
        rows: (nameRes.data || []) as Array<{ feature_id?: string | null; feature_name?: string | null }>,
        readMode: 'name',
      }
    }

    return { rows: [], readMode: 'id' }
  }

  const fetchBusinesses = async (soft = false) => {
    if (soft) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    let query = supabase.from('businesses').select('*', { count: 'exact' })

    const appliedQuery = searchApplied.trim()
    if (appliedQuery) {
      query = query.or(
        `name.ilike.%${appliedQuery}%,phone.ilike.%${appliedQuery}%,address_text.ilike.%${appliedQuery}%,road_name.ilike.%${appliedQuery}%`
      )
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (categoryFilter !== 'all') {
      query = query.eq('type', categoryFilter)
    }

    const sortConfig = buildSort()
    query = query.order(sortConfig.column, { ascending: sortConfig.asc })

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      setBusinesses([])
      setTotalCount(0)
      setLoading(false)
      setRefreshing(false)
      return
    }

    const rows = ((data || []) as GenericRow[]).map(buildBusinessRow)
    setTotalCount(count || 0)

    const ownerIds = Array.from(
      new Set(
        rows
          .map((row) => row.owner_id || '')
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      )
    )
    const businessIds = rows.map((row) => row.id)

    const ownerMap = new Map<string, ProfileLite>()
    if (ownerIds.length > 0) {
      const ownerRes = await supabase
        .from('profiles')
        .select('id,full_name,email,avatar_url,role,status')
        .in('id', ownerIds)

      if (!ownerRes.error) {
        for (const row of (ownerRes.data || []) as GenericRow[]) {
          const profile = buildProfileLite(row)
          ownerMap.set(profile.id, profile)
        }
      }
    }

    const categoryIdsByBusiness = new Map<string, string[]>()
    if (businessIds.length > 0) {
      const relationRes = await supabase
        .from('business_categories')
        .select('business_id,category_id')
        .in('business_id', businessIds)

      if (!relationRes.error) {
        for (const row of (relationRes.data || []) as Array<{ business_id?: string | null; category_id?: string | null }>) {
          const businessId = (row.business_id || '').trim()
          const categoryId = (row.category_id || '').trim()
          if (!businessId || !categoryId) continue
          const current = categoryIdsByBusiness.get(businessId) || []
          categoryIdsByBusiness.set(businessId, [...current, categoryId])
        }
      }
    }

    const list: BusinessListItem[] = rows.map((business) => {
      const categoryIds = categoryIdsByBusiness.get(business.id) || []
      const categoryNames = Array.from(
        new Set(
          categoryIds
            .map((id) => categoryNameById.get(id) || '')
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        )
      )

      return {
        business,
        owner: business.owner_id ? ownerMap.get(business.owner_id) || null : null,
        categories: categoryNames,
      }
    })

    setBusinesses(list)
    setLoading(false)
    setRefreshing(false)
  }

  const openDetail = async (item: BusinessListItem) => {
    setDetailLoading(true)
    setActiveTab('genel')

    const businessId = item.business.id

    const businessRes = await supabase.from('businesses').select('*').eq('id', businessId).maybeSingle()
    const business = businessRes.data ? buildBusinessRow(businessRes.data as GenericRow) : item.business

    const [ownerRes, categoryRelRes, featureRel, photosRes, storesRes, campaignRes, menuRes, reviewRes] =
      await Promise.all([
        business.owner_id
          ? supabase
              .from('profiles')
              .select('id,full_name,email,avatar_url,role,status')
              .eq('id', business.owner_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('business_categories').select('category_id').eq('business_id', businessId),
        readBusinessFeatures(businessId),
        supabase
          .from('business_photos')
          .select('id,url,is_cover,created_at')
          .eq('business_id', businessId)
          .order('is_cover', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('business_stores').select('id,name,floor_info').eq('business_id', businessId),
        supabase.from('business_campaigns').select('id,is_active').eq('business_id', businessId),
        supabase.from('business_menu_items').select('id', { head: true, count: 'exact' }).eq('business_id', businessId),
        supabase.from('business_reviews').select('rating').eq('business_id', businessId),
      ])

    let ownerRaw: GenericRow | null = null
    let owner: ProfileLite | null = null
    if (ownerRes.data) {
      ownerRaw = ownerRes.data as GenericRow
      owner = buildProfileLite(ownerRaw)
    } else {
      owner = item.owner
    }

    const categoryIds = (categoryRelRes.data || [])
      .map((row) => ((row as { category_id?: string | null }).category_id || '').trim())
      .filter((id) => id.length > 0)

    const featureRows = featureRel.rows
    const featureIds = Array.from(
      new Set(
        featureRows
          .map((row) => (row.feature_id || '').trim())
          .filter((id) => id.length > 0)
      )
    )
    const rawFeatureNames = Array.from(
      new Set(
        featureRows
          .map((row) => (row.feature_name || '').trim())
          .filter((name) => name.length > 0)
      )
    )

    const mappedFeatureIdsFromNames = rawFeatureNames
      .map((name) => features.find((feature) => normalizeText(feature.name) === normalizeText(name))?.id || '')
      .filter((id) => id.length > 0)

    const mergedFeatureIds = Array.from(new Set([...featureIds, ...mappedFeatureIdsFromNames]))
    const unresolvedFeatureNames = rawFeatureNames.filter(
      (name) => !features.some((feature) => normalizeText(feature.name) === normalizeText(name))
    )

    let writeMode: 'id' | 'name' | 'mixed' = featureRel.readMode
    if (featureIds.length === 0 && rawFeatureNames.length > 0) writeMode = 'name'
    if (featureIds.length > 0 && rawFeatureNames.length > 0) writeMode = 'mixed'

    const photos = (photosRes.data || [])
      .map((row, index) => {
        const typed = row as { id?: string | null; url?: string | null; is_cover?: boolean | null; created_at?: string | null }
        const id = (typed.id || '').trim() || `photo-${index}`
        const url = (typed.url || '').trim()
        return {
          id,
          url,
          is_cover: Boolean(typed.is_cover),
          created_at: typed.created_at || null,
        }
      })
      .filter((row) => row.url.length > 0)

    if (photos.length === 0 && business.image_url) {
      photos.push({
        id: 'legacy-cover',
        url: business.image_url,
        is_cover: true,
        created_at: business.created_at,
      })
    }

    const stores = (storesRes.data || []).map((row, index) => {
      const typed = row as { id?: string | null; name?: string | null; floor_info?: string | null }
      return {
        id: (typed.id || '').trim() || `store-${index}`,
        name: typed.name || null,
        floor_info: typed.floor_info || null,
      }
    })

    const campaigns = (campaignRes.data || []) as Array<{ is_active?: boolean | null }>
    const ratings = ((reviewRes.data || []) as Array<{ rating?: number | null }>)
      .map((row) => parseNumber(row.rating ?? null))
      .filter((value): value is number => value !== null)

    const reviewAverage =
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10
        : null

    const detailState: DetailState = {
      business,
      owner,
      ownerRaw,
      categoryIds,
      featureIds: mergedFeatureIds,
      featureLegacyNames: unresolvedFeatureNames,
      featureWriteMode: writeMode,
      photos,
      stores,
      metrics: {
        campaignCount: campaigns.length,
        activeCampaignCount: campaigns.filter((item) => Boolean(item.is_active)).length,
        reviewCount: ratings.length,
        reviewAverage,
        menuItemCount: menuRes.error ? 0 : menuRes.count || 0,
      },
    }

    setDetail(detailState)
    setEditCategoryIds(categoryIds)
    setEditFeatureIds(mergedFeatureIds)
    setFeatureLegacyNames(unresolvedFeatureNames)
    setFeatureWriteMode(writeMode)
    setForm({
      name: business.name || '',
      description: business.description || '',
      phone: business.phone || '',
      address_text: business.address_text || '',
      type: business.type || '',
      status: business.status || 'active',
      lat: business.lat !== null ? String(business.lat) : '',
      lng: business.lng !== null ? String(business.lng) : '',
      road_name: business.road_name || '',
      road_note: business.road_note || '',
      road_type: business.road_type || '',
      road_place_id: business.road_place_id || '',
      image_url: business.image_url || '',
      menu_description: business.menu_description || '',
      is_open: business.is_open,
    })
    setActivePhotoUrl(photos[0]?.url || business.image_url || null)
    setDetailLoading(false)
  }


  const saveDetail = async () => {
    if (!detail || !form) return
    const businessId = detail.business.id
    setSaving(true)

    const lat = form.lat.trim() ? Number(form.lat.trim()) : null
    const lng = form.lng.trim() ? Number(form.lng.trim()) : null

    const payload: GenericRow = {
      name: form.name.trim(),
      description: form.description.trim(),
      phone: form.phone.trim(),
      address_text: form.address_text.trim(),
      type: form.type.trim() || null,
      status: form.status.trim() || null,
      lat: Number.isFinite(lat as number) ? lat : null,
      lng: Number.isFinite(lng as number) ? lng : null,
      road_name: form.road_name.trim() || null,
      road_note: form.road_note.trim() || null,
      road_type: form.road_type.trim() || null,
      road_place_id: form.road_place_id.trim() || null,
      image_url: form.image_url.trim() || null,
      menu_description: form.menu_description.trim() || null,
      is_open: form.is_open,
    }

    try {
      await postAdminBusinessesAction({
        action: 'save_business',
        businessId,
        payload,
        categoryIds: editCategoryIds,
        featureIds: editFeatureIds,
        featureLegacyNames,
        featureWriteMode,
      })
    } catch (error) {
      setSaving(false)
      const message = error instanceof Error ? error.message : 'Kaydedilemedi.'
      window.alert(`Kaydedilemedi: ${message}`)
      return
    }

    await fetchBusinesses(true)
    await openDetail({
      business: buildBusinessRow({ ...detail.business.raw, ...payload, id: businessId }),
      owner: detail.owner,
      categories: [],
    })
    setSaving(false)
  }


  const deleteBusiness = async (businessId: string, businessName: string) => {
    if (deleting) return
    const typed = window.prompt(`Silmek için işletme adını yazın:
${businessName}`)
    if (typed === null) return
    if (typed.trim() !== businessName.trim()) {
      window.alert('İsim eşleşmedi. Silme iptal edildi.')
      return
    }

    setDeleting(true)
    try {
      await postAdminBusinessesAction({ action: 'delete_business', businessId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Silinemedi.'
      window.alert(`Silinemedi: ${message}`)
      setDeleting(false)
      return
    }

    if (detail?.business.id === businessId) {
      setDetail(null)
      setForm(null)
    }
    setSelectedBusinessIds((current) => current.filter((id) => id !== businessId))
    await fetchBusinesses(true)
    await fetchStatusStats()
    setDeleting(false)
  }

  const toggleBusinessSelection = (businessId: string) => {
    setSelectedBusinessIds((current) =>
      current.includes(businessId) ? current.filter((id) => id !== businessId) : [...current, businessId]
    )
  }

  const toggleSelectCurrentPage = () => {
    const pageIds = businesses.map((item) => item.business.id).filter((id) => id.length > 0)
    if (pageIds.length === 0) return

    setSelectedBusinessIds((current) => {
      const currentSet = new Set(current)
      const allSelected = pageIds.every((id) => currentSet.has(id))
      if (allSelected) {
        for (const id of pageIds) currentSet.delete(id)
      } else {
        for (const id of pageIds) currentSet.add(id)
      }
      return Array.from(currentSet)
    })
  }


  const applyBulkStatus = async () => {
    const ids = Array.from(new Set(selectedBusinessIds)).filter((id) => id.length > 0)
    if (ids.length === 0 || bulkProcessing) return

    const confirmed = window.confirm(
      `${ids.length} işletmenin durumu "${bulkStatus}" olarak güncellensin mi?`
    )
    if (!confirmed) return

    setBulkProcessing(true)
    try {
      await postAdminBusinessesAction({
        action: 'bulk_status',
        businessIds: ids,
        bulkStatus,
      })

      if (detail && ids.includes(detail.business.id)) {
        setForm((current) => (current ? { ...current, status: bulkStatus } : current))
      }

      await Promise.all([fetchBusinesses(true), fetchStatusStats()])
      setSelectedBusinessIds([])
      window.alert(`Durum güncellemesi tamamlandı. (${ids.length} işletme)`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Toplu durum güncellemesi başarısız.'
      window.alert(message)
    } finally {
      setBulkProcessing(false)
    }
  }


  const deleteSelectedBusinesses = async () => {
    const ids = Array.from(new Set(selectedBusinessIds)).filter((id) => id.length > 0)
    if (ids.length === 0 || bulkProcessing) return

    const typed = window.prompt(
      `${ids.length} işletmeyi kalıcı silmek için "TOPLU SIL" yazın.`
    )
    if (typed === null) return
    if (typed.trim().toUpperCase() !== 'TOPLU SIL') {
      window.alert('Doğrulama başarısız. Toplu silme iptal edildi.')
      return
    }

    setBulkProcessing(true)
    try {
      await postAdminBusinessesAction({
        action: 'bulk_delete',
        businessIds: ids,
      })

      if (detail && ids.includes(detail.business.id)) {
        setDetail(null)
        setForm(null)
      }

      await Promise.all([fetchBusinesses(true), fetchStatusStats()])
      setSelectedBusinessIds([])
      window.alert(`Toplu silme tamamlandı. (${ids.length} işletme)`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Toplu silme başarısız.'
      window.alert(message)
    } finally {
      setBulkProcessing(false)
    }
  }

  useEffect(() => {
    void fetchLookups()
    void fetchStatusStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void fetchBusinesses(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, statusFilter, categoryFilter, sort, searchApplied, categories])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(page, totalPages)
  const windowStart = Math.floor((safePage - 1) / PAGE_WINDOW) * PAGE_WINDOW + 1
  const windowEnd = Math.min(totalPages, windowStart + PAGE_WINDOW - 1)
  const pageNumbers = Array.from({ length: windowEnd - windowStart + 1 }, (_, idx) => windowStart + idx)
  const selectedBusinessIdSet = new Set(selectedBusinessIds)
  const currentPageBusinessIds = businesses.map((item) => item.business.id).filter((id) => id.length > 0)
  const currentPageSelectedCount = currentPageBusinessIds.filter((id) => selectedBusinessIdSet.has(id)).length
  const isCurrentPageAllSelected = currentPageBusinessIds.length > 0 && currentPageSelectedCount === currentPageBusinessIds.length

  const activeCategoryNameList = detail
    ? editCategoryIds
        .map((id) => categories.find((category) => category.id === id)?.name || '')
        .filter((name) => name.length > 0)
    : []

  return (
    <div className="h-full flex flex-col gap-4 text-[#e2e8f0]">
      <HardwarePanel className="p-4 md:p-5">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <ModuleTitle title="İşletme Operasyon Merkezi" />
          </div>
          <button
            type="button"
            onClick={() => {
              void fetchStatusStats()
              void fetchBusinesses(true)
            }}
            disabled={refreshing}
            className="h-11 px-4 rounded bg-[#16181d] border border-[#2d313a] text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0] inline-flex items-center gap-2 disabled:opacity-50 hover:bg-[#1a1d24] transition-colors"
          >
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Yenile
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Toplam</p>
            <p className="mt-1 text-xl font-mono text-[#e2e8f0]">{totalCount}</p>
          </div>
          <div className="rounded border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-emerald-500/0 group-hover:bg-emerald-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-emerald-500/70">Aktif</p>
            <p className="mt-1 text-xl font-mono text-emerald-400">{statusStats.active}</p>
          </div>
          <div className="rounded border border-orange-900/50 bg-orange-950/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-orange-500/0 group-hover:bg-orange-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-orange-500/70">Pasif</p>
            <p className="mt-1 text-xl font-mono text-orange-400">{statusStats.passive}</p>
          </div>
          <div className="rounded border border-amber-900/50 bg-amber-950/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-amber-500/0 group-hover:bg-amber-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-amber-500/70">Onay Bekleyen</p>
            <p className="mt-1 text-xl font-mono text-amber-400">{statusStats.pending}</p>
          </div>
          <div className="rounded border border-rose-900/50 bg-rose-950/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-rose-500/0 group-hover:bg-rose-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-rose-500/70">Reddedilen</p>
            <p className="mt-1 text-xl font-mono text-rose-400">{statusStats.rejected}</p>
          </div>
        </div>
      </HardwarePanel>

      <HardwarePanel className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))] gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">Ara</label>
            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      setPage(1)
                      setSearchApplied(searchInput.trim())
                    }
                  }}
                  placeholder="İşletme adı, telefon, adres, yol..."
                  className="w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] pl-10 pr-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setPage(1)
                  setSearchApplied(searchInput.trim())
                }}
                className="h-11 px-5 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] text-[10px] font-mono uppercase tracking-widest border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 transition-all"
              >
                Ara
              </button>
            </div>
          </div>

          <label className="block">
            <span className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">Durum</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
              className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
            >
              <option value="all">TÜMÜ</option>
              <option value="active">AKTİF</option>
              <option value="passive">PASİF</option>
              <option value="pending">ONAY BEKLEYEN</option>
              <option value="rejected">REDDEDİLEN</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">Kategori</span>
            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value)
                setPage(1)
              }}
              className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
            >
              <option value="all">TÜMÜ</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">Sıralama</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortValue)
                setPage(1)
              }}
              className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
            >
              <option value="created_desc">YENİ → ESKİ</option>
              <option value="created_asc">ESKİ → YENİ</option>
              <option value="name_asc">İSİM A → Z</option>
              <option value="name_desc">İSİM Z → A</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">Sayfa Boyutu</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(1)
              }}
              className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} KAYIT
                </option>
              ))}
            </select>
          </label>
        </div>
      </HardwarePanel>

      <HardwarePanel className="p-0 overflow-hidden flex flex-col h-full">
        <div className="px-4 py-3 bg-[#0f1115] border-b border-[#2d313a] flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="text-[10px] font-mono text-[#64748b] tracking-widest uppercase">
            SEÇİLİ KAYIT: <span className="text-[#e2e8f0]">{selectedBusinessIds.length}</span> • BU SAYFA: {currentPageSelectedCount}/
            {currentPageBusinessIds.length}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectCurrentPage}
              disabled={loading || businesses.length === 0 || bulkProcessing}
              className="h-9 px-4 rounded border border-[#2d313a] bg-[#16181d] text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0] hover:bg-[#1a1d24] disabled:opacity-50 transition-colors"
            >
              {isCurrentPageAllSelected ? 'SAYFAYI BIRAK' : 'SAYFAYI SEÇ'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedBusinessIds([])}
              disabled={selectedBusinessIds.length === 0 || bulkProcessing}
              className="h-9 px-4 rounded border border-[#2d313a] bg-[#16181d] text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0] hover:bg-[#1a1d24] disabled:opacity-50 transition-colors"
            >
              SEÇİMİ TEMİZLE
            </button>
            <select
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value as BulkStatus)}
              disabled={bulkProcessing}
              className="h-9 rounded border border-[#2d313a] bg-[#0a0c10] px-3 text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0] outline-none disabled:opacity-50 appearance-none"
            >
              <option value="active">AKTİF</option>
              <option value="passive">PASİF</option>
              <option value="pending">BEKLEYEN</option>
              <option value="rejected">RED</option>
            </select>
            <button
              type="button"
              onClick={() => void applyBulkStatus()}
              disabled={selectedBusinessIds.length === 0 || bulkProcessing || deleting}
              className="h-9 px-4 rounded border border-[#226785] bg-[#153445] text-[#38bdf8] text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2 hover:brightness-110 disabled:opacity-50 transition-colors"
            >
              {bulkProcessing ? <Loader2 size={14} className="animate-spin" /> : null}
              DURUM UYGULA
            </button>
            <button
              type="button"
              onClick={() => void deleteSelectedBusinesses()}
              disabled={selectedBusinessIds.length === 0 || bulkProcessing || deleting}
              className="h-9 px-4 rounded border border-rose-900/50 bg-rose-950/20 text-rose-400 text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2 hover:bg-rose-900/40 disabled:opacity-50 transition-colors"
            >
              {bulkProcessing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              TOPLU SİL
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar bg-[#16181d]">
          <table className="min-w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#101419] border-b border-[#2d313a] shadow-sm">
              <tr className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isCurrentPageAllSelected}
                    onChange={toggleSelectCurrentPage}
                    disabled={loading || businesses.length === 0 || bulkProcessing}
                    className="h-4 w-4 rounded border-[#2d313a] bg-[#0a0c10] accent-[#38bdf8]"
                    aria-label="Bu sayfadaki işletmeleri seç"
                  />
                </th>
                <th className="px-4 py-3">İşletme</th>
                <th className="px-4 py-3">Sahip</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">İletişim</th>
                <th className="px-4 py-3">Kayıt</th>
                <th className="px-4 py-3 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e232b]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Loader2 className="w-7 h-7 animate-spin text-[#38bdf8] mx-auto" />
                  </td>
                </tr>
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                    FİLTRELERE UYGUN İŞLETME BULUNAMADI.
                  </td>
                </tr>
              ) : (
                businesses.map((item) => {
                  const business = item.business
                  const isSelected = selectedBusinessIdSet.has(business.id)
                  return (
                    <tr key={business.id} className={`${isSelected ? 'bg-[#153445]/20' : ''} hover:bg-[#1a1d24] transition-colors`}>
                      <td className="px-4 py-4 align-top">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleBusinessSelection(business.id)}
                          className="h-4 w-4 rounded border-[#2d313a] bg-[#0a0c10] accent-[#38bdf8]"
                          aria-label={`${business.name || 'İşletme'} seç`}
                        />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-[13px] font-medium text-[#e2e8f0] uppercase tracking-wide">{business.name || 'İSİMSİZ İŞLETME'}</p>
                        <p className="mt-1 text-[10px] font-mono text-[#64748b]">{business.id}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-[11px] font-mono text-[#cbd5e1] truncate max-w-[160px]">
                          {item.owner?.full_name || item.owner?.email || 'SAHİP YOK'}
                        </p>
                        <p className="mt-1 text-[9px] font-mono uppercase tracking-widest text-[#64748b]">{item.owner ? roleLabel(item.owner.role) : '-'}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          {(item.categories.length > 0 ? item.categories : [business.type || 'KATEGORİ YOK']).map(
                            (name) => (
                              <span
                                key={`${business.id}-${name}`}
                                className="px-2 py-1 rounded text-[9px] font-mono uppercase tracking-widest bg-[#0a0c10] border border-[#2d313a] text-[#94a3b8]"
                              >
                                {name}
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col gap-1.5">
                          <span className={`inline-flex w-fit px-2 py-1 rounded text-[9px] font-mono uppercase tracking-widest border ${statusTone(business.status)}`}>
                            {business.status || 'BİLİNMİYOR'}
                          </span>
                          <span
                            className={`inline-flex w-fit px-2 py-1 rounded text-[9px] font-mono uppercase tracking-widest border ${
                              business.is_open
                                ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400'
                                : 'bg-[#16181d] border-[#2d313a] text-[#64748b]'
                            }`}
                          >
                            {business.is_open ? 'SERVİS AÇIK' : 'SERVİS KAPALI'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-[10px] font-mono text-[#cbd5e1] inline-flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#64748b]" />
                          {business.phone || '-'}
                        </p>
                        <p className="mt-1.5 text-[10px] font-mono text-[#94a3b8] inline-flex items-center gap-1.5 uppercase tracking-widest">
                          <MapPin className="w-3.5 h-3.5 text-[#64748b]" />
                          {business.road_name || 'YOL BİLGİSİ YOK'}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top text-[10px] font-mono text-[#64748b] tracking-widest">
                        {formatDate(business.created_at)}
                      </td>
                      <td className="px-4 py-4 align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void openDetail(item)}
                            disabled={bulkProcessing || deleting}
                            className="h-9 px-3 rounded border border-[#2d313a] bg-[#16181d] text-[#e2e8f0] text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2 hover:bg-[#1a1d24] disabled:opacity-50 transition-colors"
                          >
                            <Eye size={14} className="text-[#38bdf8]" />
                            İNCELE
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteBusiness(business.id, business.name || 'İşletme')}
                            disabled={deleting || bulkProcessing}
                            className="h-9 px-3 rounded border border-rose-900/50 bg-rose-950/20 text-rose-400 text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2 hover:bg-rose-900/40 disabled:opacity-50 transition-colors"
                          >
                            <Trash2 size={14} />
                            SİL
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#2d313a] bg-[#101419] px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
            TOPLAM {totalCount} KAYIT • SAYFA {safePage}/{totalPages}
          </p>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, windowStart - PAGE_WINDOW))}
              disabled={windowStart <= 1}
              className="h-8 px-2.5 rounded border border-[#2d313a] bg-[#16181d] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
              className="h-8 px-2.5 rounded border border-[#2d313a] bg-[#16181d] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {pageNumbers.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPage(num)}
                className={`h-8 min-w-[32px] px-2 rounded text-[10px] font-mono uppercase tracking-widest border transition-colors ${
                  num === safePage
                    ? 'bg-[#153445] border-[#226785] text-[#38bdf8]'
                    : 'bg-[#16181d] border-[#2d313a] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24]'
                }`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}
              className="h-8 px-2.5 rounded border border-[#2d313a] bg-[#16181d] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, windowEnd + 1))}
              disabled={windowEnd >= totalPages}
              className="h-8 px-2.5 rounded border border-[#2d313a] bg-[#16181d] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight size={14} />
            </button>

            <div className="ml-3 flex items-center gap-1.5">
              <input
                value={jumpPage}
                onChange={(event) => setJumpPage(event.target.value.replace(/[^\d]/g, ''))}
                placeholder="SAYFA"
                className="h-8 w-16 rounded border border-[#2d313a] bg-[#0a0c10] px-2 text-[10px] font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569] uppercase"
              />
              <button
                type="button"
                onClick={() => {
                  const next = Number(jumpPage || '0')
                  if (!Number.isFinite(next) || next <= 0) return
                  setPage(Math.min(totalPages, Math.max(1, next)))
                }}
                className="h-8 px-3 rounded border border-[#2d313a] bg-[#16181d] text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0] hover:bg-[#1a1d24] transition-colors"
              >
                GİT
              </button>
            </div>
          </div>
        </div>
      </HardwarePanel>

      {detail && form ? (
        <div className="fixed inset-0 z-50 bg-[#050608]/90 backdrop-blur-sm p-4 flex items-center justify-center">
          <HardwarePanel className="w-full max-w-5xl h-full max-h-[94vh] flex flex-col p-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-[#2d313a] bg-[#0f1115] flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">İşletme Detayı</p>
                <h3 className="mt-1 text-[16px] font-medium text-[#e2e8f0] uppercase tracking-wide truncate">{form.name || 'İSİMSİZ İŞLETME'}</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void deleteBusiness(detail.business.id, form.name || 'İşletme')}
                  disabled={deleting}
                  className="h-10 px-4 rounded border border-rose-900/50 bg-rose-950/20 text-[10px] font-mono uppercase tracking-widest text-rose-400 inline-flex items-center gap-2 hover:bg-rose-900/40 disabled:opacity-50 transition-colors"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  SİL
                </button>
                <button
                  type="button"
                  onClick={() => void saveDetail()}
                  disabled={saving}
                  className="h-10 px-5 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] text-[11px] font-mono uppercase tracking-widest border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 inline-flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  KAYDET
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetail(null)
                    setForm(null)
                  }}
                  className="h-10 w-10 rounded border border-[#2d313a] bg-[#16181d] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24] inline-flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto px-6 py-3 border-b border-[#2d313a] bg-[#0a0c10] custom-scrollbar">
              {([
                ['genel', 'GENEL'],
                ['konum', 'KONUM'],
                ['kategori', 'KATEGORİ & ÖZELLİK'],
                ['medya', 'MEDYA'],
                ['sahip', 'SAHİP'],
                ['ham', 'HAM VERİ'],
              ] as Array<[TabValue, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveTab(value)}
                  className={`h-9 px-4 rounded text-[10px] font-mono uppercase tracking-widest whitespace-nowrap transition-colors border ${
                    activeTab === value
                      ? 'bg-[#153445] border-[#226785] text-[#38bdf8]'
                      : 'bg-transparent border-transparent text-[#64748b] hover:bg-[#16181d] hover:text-[#e2e8f0]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-[#0c0e12] custom-scrollbar">
              {detailLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#38bdf8]" />
                </div>
              ) : (
                <div className="space-y-5">
                  {activeTab === 'genel' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
                      <HardwarePanel className="p-5 space-y-4">
                        <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Temel Bilgiler</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="block text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                            İşletme Adı
                            <input
                              value={form.name}
                              onChange={(event) => setForm((current) => (current ? { ...current, name: event.target.value } : current))}
                              className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-4 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50"
                            />
                          </label>
                          <label className="block text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                            Telefon
                            <input
                              value={form.phone}
                              onChange={(event) => setForm((current) => (current ? { ...current, phone: event.target.value } : current))}
                              className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-4 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50"
                            />
                          </label>
                          <label className="block text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                            Ana Tip
                            <input
                              value={form.type}
                              onChange={(event) => setForm((current) => (current ? { ...current, type: event.target.value } : current))}
                              className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-4 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 uppercase"
                            />
                          </label>
                          <label className="block text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                            Durum
                            <select
                              value={form.status}
                              onChange={(event) => setForm((current) => (current ? { ...current, status: event.target.value } : current))}
                              className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-4 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
                            >
                              <option value="active">AKTİF</option>
                              <option value="passive">PASİF</option>
                              <option value="pending">BEKLEYEN</option>
                              <option value="rejected">RED</option>
                            </select>
                          </label>
                        </div>

                        <label className="block text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                          Adres
                          <input
                            value={form.address_text}
                            onChange={(event) =>
                              setForm((current) => (current ? { ...current, address_text: event.target.value } : current))
                            }
                            className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-4 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50"
                          />
                        </label>

                        <label className="block text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                          Açıklama
                          <textarea
                            value={form.description}
                            onChange={(event) =>
                              setForm((current) => (current ? { ...current, description: event.target.value } : current))
                            }
                            className="mt-2 w-full min-h-[120px] rounded bg-[#0a0c10] border border-[#2d313a] px-4 py-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 resize-y custom-scrollbar"
                          />
                        </label>

                        <label className="block text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                          Menü Açıklaması
                          <textarea
                            value={form.menu_description}
                            onChange={(event) =>
                              setForm((current) => (current ? { ...current, menu_description: event.target.value } : current))
                            }
                            className="mt-2 w-full min-h-[100px] rounded bg-[#0a0c10] border border-[#2d313a] px-4 py-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 resize-y custom-scrollbar"
                          />
                        </label>
                      </HardwarePanel>

                      <div className="space-y-5">
                        <HardwarePanel className="p-5">
                          <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Operasyon Özeti</p>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-3 py-2.5">
                              <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Kampanya</p>
                              <p className="mt-1 text-base font-mono text-[#e2e8f0]">{detail.metrics.campaignCount}</p>
                            </div>
                            <div className="rounded border border-[#226785] bg-[#153445]/20 px-3 py-2.5">
                              <p className="text-[9px] font-mono uppercase tracking-widest text-[#38bdf8]">Aktif Kamp.</p>
                              <p className="mt-1 text-base font-mono text-[#38bdf8]">{detail.metrics.activeCampaignCount}</p>
                            </div>
                            <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-3 py-2.5">
                              <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Yorum</p>
                              <p className="mt-1 text-base font-mono text-[#e2e8f0]">{detail.metrics.reviewCount}</p>
                            </div>
                            <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-3 py-2.5">
                              <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">Puan Ort.</p>
                              <p className="mt-1 text-base font-mono text-amber-400">
                                {detail.metrics.reviewAverage !== null ? detail.metrics.reviewAverage.toFixed(1) : '-'}
                              </p>
                            </div>
                          </div>
                        </HardwarePanel>

                        <HardwarePanel className="p-5">
                          <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Servis Durumu</p>
                          <button
                            type="button"
                            onClick={() =>
                              setForm((current) => (current ? { ...current, is_open: !current.is_open } : current))
                            }
                            className={`mt-4 h-11 w-full rounded border text-[11px] font-mono uppercase tracking-widest transition-colors ${
                              form.is_open
                                ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400'
                                : 'bg-[#16181d] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#e2e8f0]'
                            }`}
                          >
                            {form.is_open ? 'SERVİS AÇIK' : 'SERVİS KAPALI'}
                          </button>
                          <p className="mt-3 text-[9px] font-mono uppercase tracking-widest text-[#475569] text-center">Durum kaydettiğinizde işletmeye uygulanır.</p>
                        </HardwarePanel>

                        <HardwarePanel className="p-5">
                          <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Kayıt Bilgisi</p>
                          <div className="mt-4 rounded border border-[#2d313a] bg-[#0a0c10] px-3 py-2.5">
                            <p className="text-[10px] font-mono text-[#e2e8f0] truncate">{detail.business.id}</p>
                            <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b] mt-1.5">EKLENME: {formatDateTime(detail.business.created_at)}</p>
                          </div>
                        </HardwarePanel>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === 'konum' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-5">
                      <HardwarePanel className="p-5 space-y-4">
                        <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Konum Alanları</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="block text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                            Enlem (Lat)
                            <input
                              value={form.lat}
                              onChange={(event) => setForm((current) => (current ? { ...current, lat: event.target.value } : current))}
                              className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-4 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50"
                            />
                          </label>
                          <label className="block text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                            Boylam (Lng)
                            <input
                              value={form.lng}
                              onChange={(event) => setForm((current) => (current ? { ...current, lng: event.target.value } : current))}
                              className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-4 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50"
                            />
                          </label>
                          <label className="block text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                            Yol Adı
                            <input
                              value={form.road_name}
                              onChange={(event) =>
                                setForm((current) => (current ? { ...current, road_name: event.target.value } : current))
                              }
                              className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-4 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50"
                            />
                          </label>
                          <label className="block text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                            Yol Tipi
                            <input
                              value={form.road_type}
                              onChange={(event) =>
                                setForm((current) => (current ? { ...current, road_type: event.target.value } : current))
                              }
                              className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-4 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 uppercase"
                            />
                          </label>
                        </div>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                          Yol Notu
                          <input
                            value={form.road_note}
                            onChange={(event) =>
                              setForm((current) => (current ? { ...current, road_note: event.target.value } : current))
                            }
                            className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-4 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50"
                          />
                        </label>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                          Google Place ID
                          <input
                            value={form.road_place_id}
                            onChange={(event) =>
                              setForm((current) => (current ? { ...current, road_place_id: event.target.value } : current))
                            }
                            className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-4 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50"
                          />
                        </label>
                      </HardwarePanel>

                      <HardwarePanel className="p-5">
                        <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Harita Doğrulama</p>
                        <div className="mt-4 rounded border border-[#2d313a] bg-[#0a0c10] h-[280px] flex items-center justify-center">
                          {form.lat.trim() && form.lng.trim() ? (
                            <a
                              href={`https://maps.google.com/?q=${form.lat},${form.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 h-11 px-5 rounded border border-[#2d313a] bg-[#16181d] text-[10px] font-mono uppercase tracking-widest text-[#38bdf8] hover:bg-[#1a1d24] transition-colors"
                            >
                              <MapPin size={14} />
                              HARİTADA AÇ
                            </a>
                          ) : (
                            <div className="text-[10px] font-mono uppercase tracking-widest text-[#475569]">KOORDİNAT GİRİLDİĞİNDE AKTİF OLUR.</div>
                          )}
                        </div>
                        <div className="mt-4 flex items-center justify-between rounded border border-[#2d313a] bg-[#16181d] px-4 py-3">
                          <span className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">GÜNCEL KOORDİNAT</span>
                          <span className="text-[10px] font-mono text-[#e2e8f0]">{form.lat || '-'}, {form.lng || '-'}</span>
                        </div>
                      </HardwarePanel>
                    </div>
                  ) : null}

                  {activeTab === 'kategori' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                      <HardwarePanel className="p-5">
                        <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Kategori Seçimi</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {categories.map((category) => {
                            const selected = editCategoryIds.includes(category.id)
                            return (
                              <button
                                key={category.id}
                                type="button"
                                onClick={() =>
                                  setEditCategoryIds((current) =>
                                    current.includes(category.id)
                                      ? current.filter((id) => id !== category.id)
                                      : [...current, category.id]
                                  )
                                }
                                className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-widest border transition-colors ${
                                  selected
                                    ? 'bg-[#153445] border-[#226785] text-[#38bdf8]'
                                    : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:text-[#e2e8f0] hover:border-[#475569]'
                                }`}
                              >
                                {category.name}
                              </button>
                            )
                          })}
                        </div>
                        <div className="mt-5 rounded border border-[#2d313a] bg-[#0a0c10] p-4 text-[9px] font-mono uppercase tracking-widest text-[#64748b] leading-relaxed">
                          SEÇİLİ: <span className="text-[#e2e8f0]">{activeCategoryNameList.length > 0 ? activeCategoryNameList.join(', ') : 'KATEGORİ YOK'}</span>
                        </div>
                      </HardwarePanel>

                      <HardwarePanel className="p-5">
                        <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Özellik Seçimi</p>
                        <div className="mt-4 max-h-[340px] overflow-y-auto flex flex-wrap gap-2 pr-2 custom-scrollbar">
                          {features.map((feature) => {
                            const selected = editFeatureIds.includes(feature.id)
                            return (
                              <button
                                key={feature.id}
                                type="button"
                                onClick={() =>
                                  setEditFeatureIds((current) =>
                                    current.includes(feature.id)
                                      ? current.filter((id) => id !== feature.id)
                                      : [...current, feature.id]
                                  )
                                }
                                className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-widest border transition-colors ${
                                  selected
                                    ? 'bg-[#14532d]/40 border-[#166534] text-emerald-400'
                                    : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:text-[#e2e8f0] hover:border-[#475569]'
                                }`}
                              >
                                {feature.name}
                              </button>
                            )
                          })}
                        </div>
                        {featureLegacyNames.length > 0 ? (
                          <div className="mt-5 rounded border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-amber-400">
                            <span className="inline-flex items-center gap-1.5 font-bold border-b border-amber-900/30 pb-1 mb-2 block w-max">
                              <AlertTriangle size={12} />
                              ESKİ ŞEMA ÖZELLİK ADLARI:
                            </span>
                            <span className="leading-relaxed">{featureLegacyNames.join(', ')}</span>
                          </div>
                        ) : null}
                      </HardwarePanel>
                    </div>
                  ) : null}

                  {activeTab === 'medya' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
                      <HardwarePanel className="p-5">
                        <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Görseller</p>
                        {detail.photos.length === 0 ? (
                          <div className="mt-4 rounded border border-dashed border-[#2d313a] bg-[#0a0c10] py-16 flex flex-col items-center justify-center text-[10px] font-mono uppercase tracking-widest text-[#475569]">
                            <ImageIcon className="w-8 h-8 mb-4 opacity-50" />
                            FOTOĞRAF KAYDI BULUNAMADI.
                          </div>
                        ) : (
                          <>
                            <div className="mt-4 rounded border border-[#2d313a] bg-[#0a0c10] overflow-hidden aspect-[16/9] md:aspect-[21/9]">
                              <img src={activePhotoUrl || detail.photos[0].url} alt="" className="w-full h-full object-cover mix-blend-lighten opacity-80" />
                            </div>
                            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                              {detail.photos.map((photo) => {
                                const selected = (activePhotoUrl || detail.photos[0].url) === photo.url
                                return (
                                  <button
                                    key={photo.id}
                                    type="button"
                                    onClick={() => setActivePhotoUrl(photo.url)}
                                    className={`relative shrink-0 rounded border-2 transition-all overflow-hidden ${
                                      selected ? 'border-[#38bdf8] opacity-100' : 'border-[#2d313a] opacity-50 hover:opacity-100'
                                    }`}
                                  >
                                    <img src={photo.url} alt="" className="w-24 h-16 object-cover mix-blend-lighten" />
                                    {photo.is_cover ? (
                                      <span className="absolute left-1 top-1 text-[8px] px-1.5 py-0.5 rounded bg-[#16181d]/80 border border-[#2d313a] text-[#38bdf8] font-mono uppercase tracking-widest backdrop-blur-sm">
                                        KAPAK
                                      </span>
                                    ) : null}
                                  </button>
                                )
                              })}
                            </div>
                          </>
                        )}
                      </HardwarePanel>

                      <HardwarePanel className="p-5 space-y-5">
                        <div>
                          <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3 mb-4">Medya Alanları</p>
                          <label className="block text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                            Kapak URL
                            <input
                              value={form.image_url}
                              onChange={(event) =>
                                setForm((current) => (current ? { ...current, image_url: event.target.value } : current))
                              }
                              className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-4 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50"
                            />
                          </label>
                        </div>

                        <div>
                          <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3 mb-4">Mağaza / Bölüm</p>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {detail.stores.length > 0 ? (
                              detail.stores.map((store) => (
                                <div key={store.id} className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3 flex items-center justify-between gap-2">
                                  <p className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] truncate">{store.name || '-'}</p>
                                  <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b] shrink-0">{store.floor_info || '-'}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] font-mono uppercase tracking-widest text-[#475569]">MAĞAZA KAYDI YOK.</p>
                            )}
                          </div>
                        </div>
                      </HardwarePanel>
                    </div>
                  ) : null}

                  {activeTab === 'sahip' ? (
                    <HardwarePanel className="p-5">
                      <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Sahip Profili</p>
                      {detail.owner ? (
                        <div className="mt-5 flex items-center gap-5">
                          <div className="w-20 h-20 rounded border border-[#2d313a] bg-[#16181d] overflow-hidden flex items-center justify-center shrink-0">
                            {detail.owner.avatar_url ? (
                              <img src={detail.owner.avatar_url} alt="" className="w-full h-full object-cover mix-blend-lighten opacity-80" />
                            ) : (
                              <UserCircle2 className="w-8 h-8 text-[#475569]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[16px] font-medium text-[#e2e8f0] uppercase tracking-wide truncate">{detail.owner.full_name || 'İSİMSİZ KULLANICI'}</p>
                            <p className="text-[11px] font-mono text-[#64748b] mt-1 break-all">{detail.owner.email || '-'}</p>
                            <div className="mt-3 flex gap-2 flex-wrap text-[9px] font-mono uppercase tracking-widest">
                              <span className="px-2.5 py-1 rounded bg-[#16181d] border border-[#2d313a] text-[#94a3b8]">
                                {roleLabel(detail.owner.role)}
                              </span>
                              <span className="px-2.5 py-1 rounded bg-[#16181d] border border-[#2d313a] text-[#94a3b8]">
                                {detail.owner.status || 'DURUM YOK'}
                              </span>
                            </div>
                            <p className="mt-3 text-[10px] font-mono text-[#475569] break-all">ID: {detail.owner.id}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-4 text-[10px] font-mono uppercase tracking-widest text-[#475569]">SAHİP PROFİLİ BULUNAMADI.</p>
                      )}
                    </HardwarePanel>
                  ) : null}

                  {activeTab === 'ham' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                      <RawTable title="İşletme Ham Alanları" data={detail.business.raw} />
                      <RawTable title="Sahip Ham Alanları" data={detail.ownerRaw} />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </HardwarePanel>
        </div>
      ) : null}
    </div>
  )
}