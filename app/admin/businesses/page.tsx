'use client'

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

const panelCardClass =
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

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
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
    <div className={`${panelCardClass} p-3`}>
      <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">{title}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500 mt-2">Kayıt yok.</p>
      ) : (
        <div className="mt-2 rounded-xl border border-slate-200/80 max-h-[280px] overflow-y-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-200/70">
              {entries.map((entry) => (
                <tr key={entry.key}>
                  <td className="w-[36%] px-3 py-2 text-[11px] font-semibold text-slate-500 align-top">{entry.key}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-700 break-all align-top">{entry.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function statusTone(status: string | null): string {
  const v = normalizeText(status || '')
  if (v === 'active') return 'bg-emerald-50 border-emerald-200 text-emerald-700'
  if (v === 'pending') return 'bg-amber-50 border-amber-200 text-amber-700'
  if (v === 'rejected') return 'bg-rose-50 border-rose-200 text-rose-700'
  if (v === 'passive') return 'bg-orange-50 border-orange-200 text-orange-700'
  return 'bg-slate-100 border-slate-200 text-slate-600'
}

async function safeCount(query: Promise<{ count: number | null; error: { message?: string } | null }>): Promise<number> {
  try {
    const { count, error } = await query
    if (error) return 0
    return count || 0
  } catch {
    return 0
  }
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

  const featureNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const feature of features) {
      map.set(feature.id, feature.name)
    }
    return map
  }, [features])

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

  const insertBusinessFeatures = async (rows: Array<Record<string, unknown>>) => {
    if (rows.length === 0) return

    const withValueRes = await supabase
      .from('business_features')
      .insert(rows.map((row) => ({ ...row, value: 'true' })))

    if (!withValueRes.error) return

    const plainRes = await supabase.from('business_features').insert(rows)
    if (plainRes.error) {
      throw new Error(plainRes.error.message)
    }
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

  const writeCategories = async (businessId: string, categoryIds: string[]) => {
    await supabase.from('business_categories').delete().eq('business_id', businessId)
    if (categoryIds.length === 0) return
    const inserts = categoryIds.map((categoryId) => ({ business_id: businessId, category_id: categoryId }))
    const insertRes = await supabase.from('business_categories').insert(inserts)
    if (insertRes.error) {
      throw new Error(insertRes.error.message)
    }
  }

  const writeFeatures = async (
    businessId: string,
    selectedFeatureIds: string[],
    legacyNames: string[],
    writeMode: 'id' | 'name' | 'mixed'
  ) => {
    await supabase.from('business_features').delete().eq('business_id', businessId)

    const uniqueIds = Array.from(new Set(selectedFeatureIds.filter((id) => id.trim().length > 0)))
    const namesFromIds = uniqueIds
      .map((id) => featureNameById.get(id) || '')
      .filter((name) => name.trim().length > 0)
    const uniqueNames = Array.from(new Set([...namesFromIds, ...legacyNames].map((value) => value.trim()).filter((value) => value.length > 0)))

    if (uniqueIds.length === 0 && uniqueNames.length === 0) {
      return
    }

    if (writeMode === 'name') {
      if (uniqueNames.length > 0) {
        await insertBusinessFeatures(uniqueNames.map((name) => ({ business_id: businessId, feature_name: name })))
      }
      return
    }

    if (uniqueIds.length > 0) {
      try {
        await insertBusinessFeatures(uniqueIds.map((featureId) => ({ business_id: businessId, feature_id: featureId })))
        if (writeMode === 'mixed' && uniqueNames.length > 0) {
          await insertBusinessFeatures(uniqueNames.map((name) => ({ business_id: businessId, feature_name: name })))
        }
        return
      } catch {
        // Falls back to legacy name mode below.
      }
    }

    if (uniqueNames.length > 0) {
      await insertBusinessFeatures(uniqueNames.map((name) => ({ business_id: businessId, feature_name: name })))
    }
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

    const updateRes = await supabase.from('businesses').update(payload).eq('id', businessId)
    if (updateRes.error) {
      setSaving(false)
      window.alert(`Kaydedilemedi: ${updateRes.error.message}`)
      return
    }

    try {
      await writeCategories(businessId, editCategoryIds)
      await writeFeatures(businessId, editFeatureIds, featureLegacyNames, featureWriteMode)
    } catch (error) {
      setSaving(false)
      const message = error instanceof Error ? error.message : 'İlişkili alanlar kaydedilemedi.'
      window.alert(message)
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
    const typed = window.prompt(`Silmek için işletme adını yazın:\n${businessName}`)
    if (typed === null) return
    if (typed.trim() !== businessName.trim()) {
      window.alert('İsim eşleşmedi. Silme iptal edildi.')
      return
    }

    setDeleting(true)
    const deleteRes = await supabase.from('businesses').delete().eq('id', businessId)
    if (deleteRes.error) {
      window.alert(`Silinemedi: ${deleteRes.error.message}`)
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
      for (const chunk of chunkArray(ids, 250)) {
        const res = await supabase.from('businesses').update({ status: bulkStatus }).in('id', chunk)
        if (res.error) throw new Error(res.error.message)
      }

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
      for (const chunk of chunkArray(ids, 250)) {
        const res = await supabase.from('businesses').delete().in('id', chunk)
        if (res.error) throw new Error(res.error.message)
      }

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
    <div className="h-full flex flex-col gap-4 text-slate-700">
      <section className={`${panelCardClass} p-4 md:p-5`}>
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">İşletme Operasyon Merkezi</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              void fetchStatusStats()
              void fetchBusinesses(true)
            }}
            disabled={refreshing}
            className="h-11 px-4 rounded-xl border border-slate-200/80 bg-white text-sm font-semibold text-slate-700 inline-flex items-center gap-2 disabled:opacity-60"
          >
            {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Yenile
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">Toplam</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{totalCount}</p>
          </div>
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-emerald-700">Aktif</p>
            <p className="mt-1 text-xl font-bold text-emerald-900">{statusStats.active}</p>
          </div>
          <div className="rounded-xl border border-orange-200/80 bg-orange-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-orange-700">Pasif</p>
            <p className="mt-1 text-xl font-bold text-orange-900">{statusStats.passive}</p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-amber-700">Onay Bekleyen</p>
            <p className="mt-1 text-xl font-bold text-amber-900">{statusStats.pending}</p>
          </div>
          <div className="rounded-xl border border-rose-200/80 bg-rose-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-rose-700">Reddedilen</p>
            <p className="mt-1 text-xl font-bold text-rose-900">{statusStats.rejected}</p>
          </div>
        </div>
      </section>

      <section className={`${panelCardClass} p-3 md:p-4`}>
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))] gap-2.5">
          <div>
            <label className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Ara</label>
            <div className="mt-1.5 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-700 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setPage(1)
                  setSearchApplied(searchInput.trim())
                }}
                className="h-11 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                Ara
              </button>
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Durum</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
            >
              <option value="all">Tümü</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
              <option value="pending">Onay Bekleyen</option>
              <option value="rejected">Reddedilen</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Kategori</span>
            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value)
                setPage(1)
              }}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
            >
              <option value="all">Tümü</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Sıralama</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortValue)
                setPage(1)
              }}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
            >
              <option value="created_desc">Yeni → Eski</option>
              <option value="created_asc">Eski → Yeni</option>
              <option value="name_asc">İsim A → Z</option>
              <option value="name_desc">İsim Z → A</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Sayfa Boyutu</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(1)
              }}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} kayıt
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className={`${panelCardClass} p-3 md:p-4`}>
        <div className="mb-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5">
            <div className="text-xs font-semibold text-slate-600">
              Seçili kayıt: <span className="text-slate-900">{selectedBusinessIds.length}</span> • Bu sayfa: {currentPageSelectedCount}/
              {currentPageBusinessIds.length}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={toggleSelectCurrentPage}
                disabled={loading || businesses.length === 0 || bulkProcessing}
                className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                {isCurrentPageAllSelected ? 'Sayfayı Bırak' : 'Sayfayı Seç'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedBusinessIds([])}
                disabled={selectedBusinessIds.length === 0 || bulkProcessing}
                className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Seçimi Temizle
              </button>
              <select
                value={bulkStatus}
                onChange={(event) => setBulkStatus(event.target.value as BulkStatus)}
                disabled={bulkProcessing}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none disabled:opacity-50"
              >
                <option value="active">active</option>
                <option value="passive">passive</option>
                <option value="pending">pending</option>
                <option value="rejected">rejected</option>
              </select>
              <button
                type="button"
                onClick={() => void applyBulkStatus()}
                disabled={selectedBusinessIds.length === 0 || bulkProcessing || deleting}
                className="h-9 px-3 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {bulkProcessing ? <Loader2 size={13} className="animate-spin" /> : null}
                Durum Uygula
              </button>
              <button
                type="button"
                onClick={() => void deleteSelectedBusinesses()}
                disabled={selectedBusinessIds.length === 0 || bulkProcessing || deleting}
                className="h-9 px-3 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {bulkProcessing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Toplu Sil
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 overflow-hidden">
          <div className="max-h-[560px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200/80">
                <tr className="text-[11px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
                  <th className="w-12 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={isCurrentPageAllSelected}
                      onChange={toggleSelectCurrentPage}
                      disabled={loading || businesses.length === 0 || bulkProcessing}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      aria-label="Bu sayfadaki işletmeleri seç"
                    />
                  </th>
                  <th className="px-3 py-3">İşletme</th>
                  <th className="px-3 py-3">Sahip</th>
                  <th className="px-3 py-3">Kategori</th>
                  <th className="px-3 py-3">Durum</th>
                  <th className="px-3 py-3">İletişim</th>
                  <th className="px-3 py-3">Kayıt</th>
                  <th className="px-3 py-3 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <Loader2 className="w-7 h-7 animate-spin text-blue-500 mx-auto" />
                    </td>
                  </tr>
                ) : businesses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-sm text-slate-500 font-semibold">
                      Filtrelere uygun işletme bulunamadı.
                    </td>
                  </tr>
                ) : (
                  businesses.map((item) => {
                    const business = item.business
                    const isSelected = selectedBusinessIdSet.has(business.id)
                    return (
                      <tr key={business.id} className={`${isSelected ? 'bg-blue-50/50' : ''} hover:bg-slate-50/80`}>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleBusinessSelection(business.id)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                            aria-label={`${business.name || 'İşletme'} seç`}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-sm font-bold text-slate-800">{business.name || 'İsimsiz işletme'}</p>
                          <p className="text-xs text-slate-500 font-mono">{business.id}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-sm font-semibold text-slate-700">
                            {item.owner?.full_name || item.owner?.email || 'Sahip yok'}
                          </p>
                          <p className="text-xs text-slate-500">{item.owner ? roleLabel(item.owner.role) : '-'}</p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(item.categories.length > 0 ? item.categories : [business.type || 'Kategori yok']).map(
                              (name) => (
                                <span
                                  key={`${business.id}-${name}`}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700"
                                >
                                  {name}
                                </span>
                              )
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex w-fit px-2 py-0.5 rounded-md text-[10px] font-semibold border ${statusTone(business.status)}`}>
                              {business.status || 'bilinmiyor'}
                            </span>
                            <span
                              className={`inline-flex w-fit px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                business.is_open
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}
                            >
                              {business.is_open ? 'servis açık' : 'servis kapalı'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-xs text-slate-700 inline-flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {business.phone || '-'}
                          </p>
                          <p className="text-xs text-slate-500 inline-flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {business.road_name || 'Yol bilgisi yok'}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold text-slate-600">{formatDate(business.created_at)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => void openDetail(item)}
                              disabled={bulkProcessing || deleting}
                              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                            >
                              <Eye size={13} />
                              İncele
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteBusiness(business.id, business.name || 'İşletme')}
                              disabled={deleting || bulkProcessing}
                              className="h-9 px-3 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 inline-flex items-center gap-1.5 hover:bg-rose-100 disabled:opacity-50"
                            >
                              <Trash2 size={13} />
                              Sil
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

          <div className="border-t border-slate-200/80 px-3 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <p className="text-xs font-semibold text-slate-500">
              Toplam {totalCount} kayıt • Sayfa {safePage}/{totalPages}
            </p>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, windowStart - PAGE_WINDOW))}
                disabled={windowStart <= 1}
                className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.max(1, safePage - 1))}
                disabled={safePage === 1}
                className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              {pageNumbers.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPage(num)}
                  className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-semibold border ${
                    num === safePage
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage === totalPages}
                className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, windowEnd + 1))}
                disabled={windowEnd >= totalPages}
                className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
              >
                <ChevronsRight size={14} />
              </button>

              <div className="ml-2 flex items-center gap-1.5">
                <input
                  value={jumpPage}
                  onChange={(event) => setJumpPage(event.target.value.replace(/[^\d]/g, ''))}
                  placeholder="Sayfa"
                  className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = Number(jumpPage || '0')
                    if (!Number.isFinite(next) || next <= 0) return
                    setPage(Math.min(totalPages, Math.max(1, next)))
                  }}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                >
                  Git
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {detail && form ? (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm p-3 md:p-5">
          <div className="mx-auto w-full max-w-[1320px] h-full max-h-[92vh] rounded-[24px] border border-white/70 bg-[#f8fbff] shadow-[0_30px_44px_-26px_rgba(15,23,42,0.7)] flex flex-col overflow-hidden">
            <div className="h-[78px] px-4 md:px-6 border-b border-slate-200/80 bg-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">İşletme Detayı</p>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{form.name || 'İsimsiz işletme'}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void deleteBusiness(detail.business.id, form.name || 'İşletme')}
                  disabled={deleting}
                  className="h-10 px-3 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Sil
                </button>
                <button
                  type="button"
                  onClick={() => void saveDetail()}
                  disabled={saving}
                  className="h-10 px-3 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetail(null)
                    setForm(null)
                  }}
                  className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 inline-flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="h-[52px] px-4 md:px-6 border-b border-slate-200/70 bg-white flex items-center gap-1.5 overflow-x-auto">
              {([
                ['genel', 'Genel'],
                ['konum', 'Konum'],
                ['kategori', 'Kategori & Özellik'],
                ['medya', 'Medya'],
                ['sahip', 'Sahip'],
                ['ham', 'Ham Veri'],
              ] as Array<[TabValue, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveTab(value)}
                  className={`h-9 px-3 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    activeTab === value
                      ? 'bg-blue-50 border border-blue-200 text-blue-700'
                      : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-5">
              {detailLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTab === 'genel' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
                      <div className={`${panelCardClass} p-4 space-y-3`}>
                        <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Temel Bilgiler</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          <label className="block">
                            <span className="text-[11px] text-slate-500 font-semibold">İşletme Adı</span>
                            <input
                              value={form.name}
                              onChange={(event) => setForm((current) => (current ? { ...current, name: event.target.value } : current))}
                              className="mt-1.5 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                            />
                          </label>
                          <label className="block">
                            <span className="text-[11px] text-slate-500 font-semibold">Telefon</span>
                            <input
                              value={form.phone}
                              onChange={(event) => setForm((current) => (current ? { ...current, phone: event.target.value } : current))}
                              className="mt-1.5 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                            />
                          </label>
                          <label className="block">
                            <span className="text-[11px] text-slate-500 font-semibold">Ana Tip</span>
                            <input
                              value={form.type}
                              onChange={(event) => setForm((current) => (current ? { ...current, type: event.target.value } : current))}
                              className="mt-1.5 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                            />
                          </label>
                          <label className="block">
                            <span className="text-[11px] text-slate-500 font-semibold">Durum</span>
                            <select
                              value={form.status}
                              onChange={(event) => setForm((current) => (current ? { ...current, status: event.target.value } : current))}
                              className="mt-1.5 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                            >
                              <option value="active">active</option>
                              <option value="passive">passive</option>
                              <option value="pending">pending</option>
                              <option value="rejected">rejected</option>
                            </select>
                          </label>
                        </div>

                        <label className="block">
                          <span className="text-[11px] text-slate-500 font-semibold">Adres</span>
                          <input
                            value={form.address_text}
                            onChange={(event) =>
                              setForm((current) => (current ? { ...current, address_text: event.target.value } : current))
                            }
                            className="mt-1.5 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                          />
                        </label>

                        <label className="block">
                          <span className="text-[11px] text-slate-500 font-semibold">Açıklama</span>
                          <textarea
                            value={form.description}
                            onChange={(event) =>
                              setForm((current) => (current ? { ...current, description: event.target.value } : current))
                            }
                            className="mt-1.5 w-full min-h-[120px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none resize-y"
                          />
                        </label>

                        <label className="block">
                          <span className="text-[11px] text-slate-500 font-semibold">Menü Açıklaması</span>
                          <textarea
                            value={form.menu_description}
                            onChange={(event) =>
                              setForm((current) => (current ? { ...current, menu_description: event.target.value } : current))
                            }
                            className="mt-1.5 w-full min-h-[100px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none resize-y"
                          />
                        </label>
                      </div>

                      <div className="space-y-3">
                        <div className={`${panelCardClass} p-4`}>
                          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Operasyon Özeti</p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                              <p className="text-[10px] text-slate-500 font-semibold">Kampanya</p>
                              <p className="mt-1 text-base font-bold text-slate-900">{detail.metrics.campaignCount}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                              <p className="text-[10px] text-slate-500 font-semibold">Aktif Kamp.</p>
                              <p className="mt-1 text-base font-bold text-emerald-700">{detail.metrics.activeCampaignCount}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                              <p className="text-[10px] text-slate-500 font-semibold">Yorum</p>
                              <p className="mt-1 text-base font-bold text-slate-900">{detail.metrics.reviewCount}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                              <p className="text-[10px] text-slate-500 font-semibold">Puan Ort.</p>
                              <p className="mt-1 text-base font-bold text-amber-700">
                                {detail.metrics.reviewAverage !== null ? detail.metrics.reviewAverage.toFixed(1) : '-'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className={`${panelCardClass} p-4`}>
                          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Servis Durumu</p>
                          <button
                            type="button"
                            onClick={() =>
                              setForm((current) => (current ? { ...current, is_open: !current.is_open } : current))
                            }
                            className={`mt-2 h-10 w-full rounded-lg border text-sm font-semibold ${
                              form.is_open
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            {form.is_open ? 'Servis Açık' : 'Servis Kapalı'}
                          </button>
                          <p className="mt-2 text-xs text-slate-500">Durum kaydettiğinizde işletmeye uygulanır.</p>
                        </div>

                        <div className={`${panelCardClass} p-4`}>
                          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Kayıt Bilgisi</p>
                          <p className="mt-2 text-xs text-slate-600 font-mono break-all">{detail.business.id}</p>
                          <p className="mt-1 text-xs text-slate-500">Eklenme: {formatDateTime(detail.business.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === 'konum' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-4">
                      <div className={`${panelCardClass} p-4 space-y-3`}>
                        <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Konum Alanları</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          <label>
                            <span className="text-[11px] text-slate-500 font-semibold">Enlem</span>
                            <input
                              value={form.lat}
                              onChange={(event) => setForm((current) => (current ? { ...current, lat: event.target.value } : current))}
                              className="mt-1.5 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                            />
                          </label>
                          <label>
                            <span className="text-[11px] text-slate-500 font-semibold">Boylam</span>
                            <input
                              value={form.lng}
                              onChange={(event) => setForm((current) => (current ? { ...current, lng: event.target.value } : current))}
                              className="mt-1.5 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                            />
                          </label>
                          <label>
                            <span className="text-[11px] text-slate-500 font-semibold">Yol Adı</span>
                            <input
                              value={form.road_name}
                              onChange={(event) =>
                                setForm((current) => (current ? { ...current, road_name: event.target.value } : current))
                              }
                              className="mt-1.5 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                            />
                          </label>
                          <label>
                            <span className="text-[11px] text-slate-500 font-semibold">Yol Tipi</span>
                            <input
                              value={form.road_type}
                              onChange={(event) =>
                                setForm((current) => (current ? { ...current, road_type: event.target.value } : current))
                              }
                              className="mt-1.5 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                            />
                          </label>
                        </div>
                        <label className="block">
                          <span className="text-[11px] text-slate-500 font-semibold">Yol Notu</span>
                          <input
                            value={form.road_note}
                            onChange={(event) =>
                              setForm((current) => (current ? { ...current, road_note: event.target.value } : current))
                            }
                            className="mt-1.5 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] text-slate-500 font-semibold">Google Place ID</span>
                          <input
                            value={form.road_place_id}
                            onChange={(event) =>
                              setForm((current) => (current ? { ...current, road_place_id: event.target.value } : current))
                            }
                            className="mt-1.5 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none font-mono"
                          />
                        </label>
                      </div>
                      <div className={`${panelCardClass} p-4`}>
                        <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Harita</p>
                        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-100 h-[280px] flex items-center justify-center">
                          {form.lat.trim() && form.lng.trim() ? (
                            <a
                              href={`https://maps.google.com/?q=${form.lat},${form.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700"
                            >
                              <MapPin size={16} />
                              Haritada Aç
                            </a>
                          ) : (
                            <div className="text-sm text-slate-500">Koordinat girildiğinde harita bağlantısı aktif olur.</div>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Koordinat: {form.lat || '-'}, {form.lng || '-'}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === 'kategori' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div className={`${panelCardClass} p-4`}>
                        <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Kategori Seçimi</p>
                        <div className="mt-2 flex flex-wrap gap-2">
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
                                className={`px-3 h-9 rounded-lg text-xs font-semibold border ${
                                  selected
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                {category.name}
                              </button>
                            )
                          })}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Seçili: {activeCategoryNameList.length > 0 ? activeCategoryNameList.join(', ') : 'Kategori yok'}
                        </p>
                      </div>

                      <div className={`${panelCardClass} p-4`}>
                        <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Özellik Seçimi</p>
                        <div className="mt-2 max-h-[290px] overflow-y-auto flex flex-wrap gap-2 pr-1">
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
                                className={`px-3 h-9 rounded-lg text-xs font-semibold border ${
                                  selected
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                {feature.name}
                              </button>
                            )
                          })}
                        </div>
                        {featureLegacyNames.length > 0 ? (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                            <span className="font-semibold inline-flex items-center gap-1">
                              <AlertTriangle size={13} />
                              Eski şema özellik adları:
                            </span>{' '}
                            {featureLegacyNames.join(', ')}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {activeTab === 'medya' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
                      <div className={`${panelCardClass} p-4`}>
                        <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Görseller</p>
                        {detail.photos.length === 0 ? (
                          <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-14 text-center text-slate-500">
                            <ImageIcon className="w-7 h-7 mx-auto" />
                            <p className="mt-2 text-sm font-semibold">Fotoğraf kaydı bulunamadı.</p>
                          </div>
                        ) : (
                          <>
                            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden">
                              <img src={activePhotoUrl || detail.photos[0].url} alt="" className="w-full h-[320px] object-cover" />
                            </div>
                            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                              {detail.photos.map((photo) => {
                                const selected = (activePhotoUrl || detail.photos[0].url) === photo.url
                                return (
                                  <button
                                    key={photo.id}
                                    type="button"
                                    onClick={() => setActivePhotoUrl(photo.url)}
                                    className={`relative rounded-lg overflow-hidden border-2 shrink-0 ${
                                      selected ? 'border-blue-500' : 'border-transparent'
                                    }`}
                                  >
                                    <img src={photo.url} alt="" className="w-[92px] h-[72px] object-cover" />
                                    {photo.is_cover ? (
                                      <span className="absolute left-1 top-1 text-[9px] px-1.5 py-0.5 rounded bg-slate-900/70 text-white font-semibold">
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

                      <div className={`${panelCardClass} p-4`}>
                        <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Medya Alanları</p>
                        <label className="block mt-2">
                          <span className="text-[11px] text-slate-500 font-semibold">Kapak URL</span>
                          <input
                            value={form.image_url}
                            onChange={(event) =>
                              setForm((current) => (current ? { ...current, image_url: event.target.value } : current))
                            }
                            className="mt-1.5 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                          />
                        </label>

                        <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500 mt-4">Mağaza/Bölüm</p>
                        <div className="mt-2 space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                          {detail.stores.length > 0 ? (
                            detail.stores.map((store) => (
                              <div key={store.id} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                                <p className="text-xs font-semibold text-slate-800">{store.name || '-'}</p>
                                <p className="text-[11px] text-slate-500">{store.floor_info || '-'}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">Mağaza kaydı yok.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === 'sahip' ? (
                    <div className={`${panelCardClass} p-4`}>
                      <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Sahip Profili</p>
                      {detail.owner ? (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-[72px_minmax(0,1fr)] gap-3">
                          <div className="w-[72px] h-[72px] rounded-full border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                            {detail.owner.avatar_url ? (
                              <img src={detail.owner.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <UserCircle2 className="w-8 h-8 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xl font-bold text-slate-900">{detail.owner.full_name || 'İsimsiz kullanıcı'}</p>
                            <p className="text-sm text-slate-600 break-all">{detail.owner.email || '-'}</p>
                            <div className="mt-2 flex gap-2 flex-wrap">
                              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {roleLabel(detail.owner.role)}
                              </span>
                              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {detail.owner.status || 'durum yok'}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500 font-mono break-all">{detail.owner.id}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">Sahip profili bulunamadı.</p>
                      )}
                    </div>
                  ) : null}

                  {activeTab === 'ham' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <RawTable title="İşletme Ham Alanları" data={detail.business.raw} />
                      <RawTable title="Sahip Ham Alanları" data={detail.ownerRaw} />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
