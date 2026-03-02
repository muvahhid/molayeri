'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { PanelTitle } from '../_components/panel-title'
import {
  ArrowUpDown,
  Check,
  List,
  Loader2,
  Plus,
  SlidersHorizontal,
  Star,
  Trash2,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'

type BusinessPhoto = {
  id: string
  url: string
  is_cover?: boolean | null
}

type BusinessWithPhotos = {
  id: string
  owner_id: string
  name: string
  phone: string | null
  address_text: string | null
  description: string | null
  status: string | null
  type: string | null
  created_at?: string | null
  is_open?: boolean | null
  category_names?: string[]
  business_photos?: BusinessPhoto[]
}

type OptionItem = {
  id: string
  name: string
}

type FeatureItem = {
  id: string
  name: string
  is_global: boolean
  category_id: string | null
}

type OpenFilterValue = 'all' | 'open' | 'closed'
type SortOrderValue = 'newest' | 'oldest'
type ViewModeValue = 'single' | 'grid-2' | 'grid-3' | 'table'
type ViewModeOverride = 'auto' | ViewModeValue

const TABLE_PAGE_SIZE = 50
const TABLE_PAGE_WINDOW = 10

function isBusinessOpen(business: BusinessWithPhotos): boolean {
  if (typeof business.is_open === 'boolean') {
    return business.is_open
  }

  return business.status === 'active'
}

function formatBusinessDate(value?: string | null): string {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleDateString('tr-TR')
}

function formatBusinessCategories(business: BusinessWithPhotos): string[] {
  if (business.category_names && business.category_names.length > 0) {
    return business.category_names
  }

  if (business.type) {
    return [business.type]
  }

  return ['Diğer']
}

function getCoverPhotoUrl(business: BusinessWithPhotos): string | null {
  const photos = business.business_photos || []
  const cover = photos.find((photo) => photo.is_cover)
  return cover?.url || photos[0]?.url || null
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

export default function MerchantBusinessesPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [businesses, setBusinesses] = useState<BusinessWithPhotos[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithPhotos | null>(null)

  const [allFeatures, setAllFeatures] = useState<FeatureItem[]>([])
  const [allCategories, setAllCategories] = useState<OptionItem[]>([])
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [galleryPhotos, setGalleryPhotos] = useState<BusinessPhoto[]>([])

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address_text: '',
    description: '',
    status: 'active',
  })
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [openFilter, setOpenFilter] = useState<OpenFilterValue>('all')
  const [sortOrder, setSortOrder] = useState<SortOrderValue>('newest')
  const [viewModeOverride, setViewModeOverride] = useState<ViewModeOverride>('auto')
  const [tablePage, setTablePage] = useState(1)
  const [managementTab, setManagementTab] = useState<'categories' | 'features'>('categories')
  const [featureCategoryTab, setFeatureCategoryTab] = useState<'global' | string>('global')

  const loadBusinesses = async () => {
    setLoading(true)

    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id

    if (!userId) {
      setLoading(false)
      return
    }

    const [businessRes, featuresRes, categoriesRes] = await Promise.all([
      supabase
        .from('businesses')
        .select('*, business_photos(*)')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('features').select('id, name, is_global, category_id'),
      supabase.from('categories').select('id, name'),
    ])

    const businessRows = (businessRes.data || []) as BusinessWithPhotos[]
    const categoryRows = (categoriesRes.data || []) as OptionItem[]
    const categoryNameById = new Map(categoryRows.map((item) => [item.id, item.name]))
    const categoryNamesByBusiness = new Map<string, Set<string>>()

    if (businessRows.length > 0) {
      const { data: relationRows } = await supabase
        .from('business_categories')
        .select('business_id, category_id')
        .in(
          'business_id',
          businessRows.map((business) => business.id)
        )

      for (const relation of (relationRows || []) as { business_id?: string | null; category_id?: string | null }[]) {
        if (!relation.business_id || !relation.category_id) {
          continue
        }

        const categoryName = categoryNameById.get(relation.category_id)
        if (!categoryName) {
          continue
        }

        const current = categoryNamesByBusiness.get(relation.business_id) || new Set<string>()
        current.add(categoryName)
        categoryNamesByBusiness.set(relation.business_id, current)
      }
    }

    setBusinesses(
      businessRows.map((business) => ({
        ...business,
        category_names: Array.from(categoryNamesByBusiness.get(business.id) || []),
      }))
    )
    setAllFeatures((featuresRes.data || []) as FeatureItem[])
    setAllCategories(categoryRows)

    setLoading(false)
  }

  const openEdit = async (business: BusinessWithPhotos) => {
    setSelectedBusiness(business)
    setGalleryPhotos(business.business_photos || [])
    setManagementTab('categories')
    setForm({
      name: business.name || '',
      phone: business.phone || '',
      address_text: business.address_text || '',
      description: business.description || '',
      status: business.status || 'active',
    })

    const [featureRes, categoryRes] = await Promise.all([
      supabase.from('business_features').select('feature_id').eq('business_id', business.id),
      supabase.from('business_categories').select('category_id').eq('business_id', business.id),
    ])

    const featureIds = (featureRes.data || []).map((row) => (row as { feature_id: string }).feature_id.toString())
    const categoryIds = (categoryRes.data || []).map((row) => (row as { category_id: string }).category_id.toString())

    setSelectedFeatureIds(featureIds)
    setSelectedCategoryIds(categoryIds)
    setFeatureCategoryTab(categoryIds[0] || 'global')
  }

  const closeEdit = () => {
    setSelectedBusiness(null)
    setSelectedFeatureIds([])
    setSelectedCategoryIds([])
    setGalleryPhotos([])
  }

  const toggleValue = (current: string[], value: string, setter: (next: string[]) => void) => {
    if (current.includes(value)) {
      setter(current.filter((item) => item !== value))
    } else {
      setter([...current, value])
    }
  }

  const addPhoto = async (file: File) => {
    if (!selectedBusiness) {
      return
    }

    setUploadingPhoto(true)

    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `biz_${selectedBusiness.id}_${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('business_logos')
      .upload(fileName, file, {
        upsert: false,
      })

    if (uploadError) {
      setUploadingPhoto(false)
      return
    }

    const { data: publicUrlData } = supabase.storage.from('business_logos').getPublicUrl(fileName)

    const { data: insertedPhoto } = await supabase
      .from('business_photos')
      .insert({
        business_id: selectedBusiness.id,
        url: publicUrlData.publicUrl,
        is_cover: galleryPhotos.length === 0,
      })
      .select()
      .single()

    if (insertedPhoto) {
      const typedPhoto = insertedPhoto as BusinessPhoto
      setGalleryPhotos((current) => [...current, typedPhoto])
      setBusinesses((current) =>
        current.map((business) =>
          business.id === selectedBusiness.id
            ? { ...business, business_photos: [...(business.business_photos || []), typedPhoto] }
            : business
        )
      )
    }

    setUploadingPhoto(false)
  }

  const removePhoto = async (photoId: string) => {
    if (!selectedBusiness) {
      return
    }

    await supabase.from('business_photos').delete().eq('id', photoId)

    setGalleryPhotos((current) => current.filter((photo) => photo.id !== photoId))
    setBusinesses((current) =>
      current.map((business) =>
        business.id === selectedBusiness.id
          ? {
              ...business,
              business_photos: (business.business_photos || []).filter((photo) => photo.id !== photoId),
            }
          : business
      )
    )
  }

  const setCoverPhoto = async (photoId: string) => {
    if (!selectedBusiness) {
      return
    }

    await supabase
      .from('business_photos')
      .update({ is_cover: false })
      .eq('business_id', selectedBusiness.id)

    await supabase
      .from('business_photos')
      .update({ is_cover: true })
      .eq('id', photoId)

    setGalleryPhotos((current) =>
      current.map((photo) => ({
        ...photo,
        is_cover: photo.id === photoId,
      }))
    )

    setBusinesses((current) =>
      current.map((business) =>
        business.id === selectedBusiness.id
          ? {
              ...business,
              business_photos: (business.business_photos || []).map((photo) => ({
                ...photo,
                is_cover: photo.id === photoId,
              })),
            }
          : business
      )
    )
  }

  const saveChanges = async () => {
    if (!selectedBusiness) {
      return
    }

    setSaving(true)

    const primaryCategoryName =
      allCategories.find((category) => category.id === selectedCategoryIds[0])?.name || 'other'

    await supabase
      .from('businesses')
      .update({
        name: form.name,
        phone: form.phone,
        address_text: form.address_text,
        description: form.description,
        status: form.status,
        type: primaryCategoryName,
      })
      .eq('id', selectedBusiness.id)

    await Promise.all([
      supabase.from('business_features').delete().eq('business_id', selectedBusiness.id),
      supabase.from('business_categories').delete().eq('business_id', selectedBusiness.id),
    ])

    if (selectedFeatureIds.length > 0) {
      await supabase.from('business_features').insert(
        selectedFeatureIds.map((featureId) => ({
          business_id: selectedBusiness.id,
          feature_id: featureId,
        }))
      )
    }

    if (selectedCategoryIds.length > 0) {
      await supabase.from('business_categories').insert(
        selectedCategoryIds.map((categoryId) => ({
          business_id: selectedBusiness.id,
          category_id: categoryId,
        }))
      )
    }

    await loadBusinesses()
    setSaving(false)
    closeEdit()
  }

  const deleteBusiness = async () => {
    if (!selectedBusiness) {
      return
    }

    const confirmed = window.confirm('Bu işletmeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')
    if (!confirmed) {
      return
    }

    setSaving(true)
    await supabase.from('businesses').delete().eq('id', selectedBusiness.id)
    await loadBusinesses()
    setSaving(false)
    closeEdit()
  }

  useEffect(() => {
    loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const availableCategoryFilters = useMemo(() => {
    const categorySet = new Set<string>()
    const collator = new Intl.Collator('tr-TR', { sensitivity: 'base' })

    for (const business of businesses) {
      for (const categoryName of formatBusinessCategories(business)) {
        if (categoryName.trim()) {
          categorySet.add(categoryName.trim())
        }
      }
    }

    return Array.from(categorySet).sort((a, b) => collator.compare(a, b))
  }, [businesses])

  const filteredBusinesses = useMemo(() => {
    const sorted = businesses.filter((business) => {
      const categoryMatch =
        categoryFilter === 'all' ||
        formatBusinessCategories(business).some((categoryName) => categoryName === categoryFilter)

      const openMatch =
        openFilter === 'all' ||
        (openFilter === 'open' ? isBusinessOpen(business) : !isBusinessOpen(business))

      return categoryMatch && openMatch
    })

    sorted.sort((left, right) => {
      const leftTs = left.created_at ? new Date(left.created_at).getTime() : 0
      const rightTs = right.created_at ? new Date(right.created_at).getTime() : 0
      return sortOrder === 'oldest' ? leftTs - rightTs : rightTs - leftTs
    })

    return sorted
  }, [businesses, categoryFilter, openFilter, sortOrder])

  const businessViewMode = useMemo<ViewModeValue>(() => {
    const count = filteredBusinesses.length

    if (count <= 1) return 'single'
    if (count <= 6) return 'grid-2'
    if (count <= 15) return 'grid-3'
    return 'table'
  }, [filteredBusinesses.length])

  const activeViewMode: ViewModeValue =
    viewModeOverride === 'auto' ? businessViewMode : viewModeOverride

  const cardGridClass =
    activeViewMode === 'single'
      ? 'grid grid-cols-1'
      : activeViewMode === 'grid-2'
        ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'

  const tableTotalPages = Math.max(1, Math.ceil(filteredBusinesses.length / TABLE_PAGE_SIZE))
  const clampedTablePage = Math.min(tablePage, tableTotalPages)
  const tableStartIndex = (clampedTablePage - 1) * TABLE_PAGE_SIZE
  const tablePageBusinesses = filteredBusinesses.slice(tableStartIndex, tableStartIndex + TABLE_PAGE_SIZE)
  const tableWindowStart = Math.floor((clampedTablePage - 1) / TABLE_PAGE_WINDOW) * TABLE_PAGE_WINDOW + 1
  const tableWindowEnd = Math.min(tableWindowStart + TABLE_PAGE_WINDOW - 1, tableTotalPages)
  const tableWindowPages = Array.from(
    { length: tableWindowEnd - tableWindowStart + 1 },
    (_, index) => tableWindowStart + index
  )
  const categoryNameById = useMemo(() => {
    return new Map(allCategories.map((category) => [category.id, category.name]))
  }, [allCategories])
  const selectedCategoryTabs = useMemo(() => {
    return selectedCategoryIds
      .map((categoryId) => ({
        id: categoryId,
        name: categoryNameById.get(categoryId) || 'Kategori',
      }))
      .filter((item) => item.id)
  }, [selectedCategoryIds, categoryNameById])
  const visibleFeatures = useMemo(() => {
    if (featureCategoryTab === 'global') {
      return allFeatures.filter((feature) => feature.is_global)
    }

    return allFeatures.filter(
      (feature) => !feature.is_global && feature.category_id === featureCategoryTab
    )
  }, [allFeatures, featureCategoryTab])

  useEffect(() => {
    setTablePage(1)
  }, [categoryFilter, openFilter, sortOrder, viewModeOverride])

  useEffect(() => {
    if (tablePage > tableTotalPages) {
      setTablePage(tableTotalPages)
    }
  }, [tablePage, tableTotalPages])

  useEffect(() => {
    if (featureCategoryTab === 'global') {
      return
    }

    if (!selectedCategoryIds.includes(featureCategoryTab)) {
      setFeatureCategoryTab(selectedCategoryIds[0] || 'global')
    }
  }, [featureCategoryTab, selectedCategoryIds])

  useEffect(() => {
    setSelectedFeatureIds((current) => {
      const validFeatureIds = new Set(
        allFeatures
          .filter((feature) => feature.is_global || (feature.category_id ? selectedCategoryIds.includes(feature.category_id) : false))
          .map((feature) => feature.id)
      )

      const next = current.filter((featureId) => validFeatureIds.has(featureId))
      return next.length === current.length ? current : next
    })
  }, [allFeatures, selectedCategoryIds])

  return (
    <div className="space-y-6">
      <div className="border-b border-[#2d313a] pb-4">
        <PanelTitle title="Şubelerim" />
        <p className="mt-2 text-[11px] text-[#64748b]">İşletmelerinizin web yönetim ekranı.</p>
      </div>

      <div className="space-y-4">
        {!loading && businesses.length > 0 ? (
          <div className="bg-[#16181d] border border-[#2d313a] rounded-md p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[#2d313a] bg-[#0a0c10] text-[10px] font-mono uppercase tracking-widest text-[#94a3b8]">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filtreler
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[#2d313a] bg-[#0a0c10] text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0]">
                {filteredBusinesses.length} / {businesses.length} ŞUBE
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[#2d313a] bg-[#0a0c10] text-[10px] font-mono uppercase tracking-widest text-[#94a3b8]">
                <List className="w-3.5 h-3.5" />
                {activeViewMode === 'single'
                  ? 'TEK KART'
                  : activeViewMode === 'grid-2'
                    ? '2 KOLON'
                    : activeViewMode === 'grid-3'
                      ? '3 KOLON'
                      : 'TABLO LİSTE'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Kategori
                <select
                  className="mt-2 w-full px-3 py-2.5 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-medium outline-none focus:border-[#38bdf8]/50"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="all">TÜM KATEGORİLER</option>
                  {availableCategoryFilters.map((category) => (
                    <option key={category} value={category}>
                      {category.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Açık / Kapalı
                <select
                  className="mt-2 w-full px-3 py-2.5 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-medium outline-none focus:border-[#38bdf8]/50"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                  value={openFilter}
                  onChange={(event) => setOpenFilter(event.target.value as OpenFilterValue)}
                >
                  <option value="all">TÜMÜ</option>
                  <option value="open">AÇIK</option>
                  <option value="closed">KAPALI</option>
                </select>
              </label>

              <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Sıralama
                <div className="mt-2 relative">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#64748b] absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
                  <select
                    className="w-full px-3 py-2.5 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-medium outline-none focus:border-[#38bdf8]/50 appearance-none"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as SortOrderValue)}
                  >
                    <option value="newest">YENİDEN ESKİYE</option>
                    <option value="oldest">ESKİDEN YENİYE</option>
                  </select>
                </div>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#1e232b] pt-4">
              <span className="text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest mr-2">Görünüm</span>
              {(
                [
                  { key: 'auto', label: 'OTOMATİK' },
                  { key: 'grid-2', label: '2 KOLON' },
                  { key: 'grid-3', label: '3 KOLON' },
                  { key: 'table', label: 'TABLO' },
                ] as { key: ViewModeOverride; label: string }[]
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setViewModeOverride(item.key)}
                  className={`px-3 py-1.5 rounded text-[10px] font-mono tracking-widest uppercase transition-colors border ${
                    viewModeOverride === item.key
                      ? 'bg-[#153445] border-[#226785] text-[#38bdf8]'
                      : 'bg-transparent border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#e2e8f0]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="h-[260px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#38bdf8]" />
          </div>
        ) : businesses.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-[11px] font-mono text-[#64748b] uppercase tracking-widest border border-dashed border-[#2d313a] rounded-md bg-[#0a0c10]">
            HENÜZ İŞLETMENİZ YOK.
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-[11px] font-mono text-[#64748b] uppercase tracking-widest border border-dashed border-[#2d313a] rounded-md bg-[#0a0c10]">
            FİLTREYE UYAN ŞUBE BULUNAMADI.
          </div>
        ) : activeViewMode === 'table' ? (
          <div className="rounded-md border border-[#2d313a] bg-[#16181d] overflow-hidden">
            <div className="hidden lg:grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_120px_120px_90px] gap-3 px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b] bg-[#101419] border-b border-[#2d313a]">
              <span>İşletme</span>
              <span>Kategori</span>
              <span>Durum</span>
              <span>Kayıt</span>
              <span />
            </div>

            <div className="divide-y divide-[#1e232b]">
              {tablePageBusinesses.map((business) => {
                const cover = getCoverPhotoUrl(business)
                const categories = formatBusinessCategories(business)
                const open = isBusinessOpen(business)

                return (
                  <button
                    key={business.id}
                    type="button"
                    onClick={() => openEdit(business)}
                    className="w-full text-left px-4 py-3 hover:bg-[#1a1d24] transition-colors"
                  >
                    <div className="hidden lg:grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_120px_120px_90px] gap-3 items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded border border-[#2d313a] overflow-hidden bg-[#0a0c10] shrink-0">
                          {cover ? (
                            <img src={cover} alt={business.name} className="w-full h-full object-cover mix-blend-lighten opacity-80" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[9px] font-mono uppercase tracking-widest text-[#475569]">
                              GÖRSEL
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#e2e8f0] truncate">{business.name}</p>
                          <p className="text-[11px] font-mono text-[#64748b] truncate">{business.phone || business.address_text || 'Bilgi yok'}</p>
                        </div>
                      </div>

                      <p className="text-[11px] font-mono text-[#94a3b8] truncate uppercase">{categories.slice(0, 2).join(', ')}</p>

                      <span
                        className={`inline-flex justify-center px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-widest border ${
                          open ? 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50' : 'text-rose-400 bg-rose-950/30 border-rose-900/50'
                        }`}
                      >
                        {open ? 'AÇIK' : 'KAPALI'}
                      </span>

                      <p className="text-[11px] font-mono text-[#64748b]">{formatBusinessDate(business.created_at)}</p>
                      <p className="text-[10px] font-mono text-[#38bdf8] uppercase tracking-widest">DÜZENLE</p>
                    </div>

                    <div className="lg:hidden">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#e2e8f0] truncate">{business.name}</p>
                          <p className="text-[11px] font-mono text-[#64748b] truncate uppercase mt-1">{categories.slice(0, 2).join(', ')}</p>
                        </div>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-widest border ${
                            open ? 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50' : 'text-rose-400 bg-rose-950/30 border-rose-900/50'
                          }`}
                        >
                          {open ? 'AÇIK' : 'KAPALI'}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="px-4 py-3 border-t border-[#2d313a] bg-[#101419] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                {filteredBusinesses.length} işletme içinde {tableStartIndex + 1}-
                {Math.min(tableStartIndex + TABLE_PAGE_SIZE, filteredBusinesses.length)} arası.
              </p>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTablePage(Math.max(1, tableWindowStart - TABLE_PAGE_WINDOW))}
                  disabled={tableWindowStart === 1}
                  className="px-2.5 py-1.5 rounded border border-[#2d313a] text-[10px] font-mono tracking-widest bg-transparent text-[#94a3b8] hover:bg-[#1a1d24] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  10 GERİ
                </button>
                <button
                  type="button"
                  onClick={() => setTablePage(Math.max(1, clampedTablePage - 1))}
                  disabled={clampedTablePage === 1}
                  className="px-2.5 py-1.5 rounded border border-[#2d313a] text-[10px] font-mono tracking-widest bg-transparent text-[#94a3b8] hover:bg-[#1a1d24] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  GERİ
                </button>

                {tableWindowPages.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setTablePage(page)}
                    className={`px-2.5 py-1.5 rounded border text-[10px] font-mono tracking-widest transition-colors ${
                      page === clampedTablePage
                        ? 'bg-[#153445] border-[#226785] text-[#38bdf8]'
                        : 'bg-transparent border-[#2d313a] text-[#64748b] hover:bg-[#1a1d24] hover:text-[#e2e8f0]'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setTablePage(Math.min(tableTotalPages, clampedTablePage + 1))}
                  disabled={clampedTablePage === tableTotalPages}
                  className="px-2.5 py-1.5 rounded border border-[#2d313a] text-[10px] font-mono tracking-widest bg-transparent text-[#94a3b8] hover:bg-[#1a1d24] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  İLERİ
                </button>
                <button
                  type="button"
                  onClick={() => setTablePage(Math.min(tableTotalPages, tableWindowEnd + 1))}
                  disabled={tableWindowEnd === tableTotalPages}
                  className="px-2.5 py-1.5 rounded border border-[#2d313a] text-[10px] font-mono tracking-widest bg-transparent text-[#94a3b8] hover:bg-[#1a1d24] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  10 İLERİ
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={cardGridClass}>
            {filteredBusinesses.map((business) => {
              const cover = getCoverPhotoUrl(business)
              const categories = formatBusinessCategories(business)
              const open = isBusinessOpen(business)

              return (
                <HardwarePanel
                  key={business.id}
                  className={`text-left group transition-all hover:border-[#475569] ${
                    activeViewMode === 'single' ? 'p-0 overflow-hidden' : 'p-4'
                  }`}
                >
                  <button type="button" onClick={() => openEdit(business)} className="w-full text-left">
                    {activeViewMode === 'single' ? (
                      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
                        <div className="h-64 lg:h-[360px] bg-[#0a0c10] border-r border-[#2d313a] overflow-hidden">
                          {cover ? (
                            <img src={cover} alt={business.name} className="w-full h-full object-cover mix-blend-lighten opacity-80" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[11px] font-mono uppercase tracking-widest text-[#475569]">
                              GÖRSEL YOK
                            </div>
                          )}
                        </div>
                        <div className="p-6 flex flex-col relative z-10">
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <h2 className="text-xl md:text-2xl font-medium text-[#e2e8f0]">{business.name}</h2>
                            <span
                              className={`inline-flex px-3 py-1 rounded border text-[10px] font-mono uppercase tracking-widest ${
                                open ? 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50' : 'text-rose-400 bg-rose-950/30 border-rose-900/50'
                              }`}
                            >
                              {open ? 'AÇIK' : 'KAPALI'}
                            </span>
                          </div>
                          <p className="mt-2 text-[13px] font-mono text-[#94a3b8] line-clamp-2 leading-relaxed">{business.address_text || 'Adres bilgisi girilmemiş.'}</p>
                          <div className="mt-6 flex flex-wrap gap-2">
                            {categories.slice(0, 4).map((categoryName) => (
                              <span key={`${business.id}-${categoryName}`} className="px-2.5 py-1 rounded bg-[#0a0c10] border border-[#2d313a] text-[10px] font-mono text-[#64748b] uppercase tracking-wide">
                                {categoryName}
                              </span>
                            ))}
                          </div>
                          <div className="mt-auto pt-6 flex items-center justify-between text-[11px] font-mono text-[#64748b] border-t border-[#1e232b]">
                            <span>{business.phone || 'TELEFON YOK'}</span>
                            <span>{formatBusinessDate(business.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="h-36 rounded bg-[#0a0c10] border border-[#2d313a] overflow-hidden mb-4 relative z-10">
                          {cover ? (
                            <img src={cover} alt={business.name} className="w-full h-full object-cover mix-blend-lighten opacity-80" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[10px] font-mono uppercase tracking-widest text-[#475569]">
                              GÖRSEL YOK
                            </div>
                          )}
                        </div>

                        <div className="flex items-start justify-between gap-3 relative z-10">
                          <h2 className="text-[15px] font-medium text-[#e2e8f0] truncate">{business.name}</h2>
                          <span
                            className={`inline-flex px-2.5 py-1 rounded border text-[9px] font-mono uppercase tracking-widest shrink-0 ${
                              open ? 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50' : 'text-rose-400 bg-rose-950/30 border-rose-900/50'
                            }`}
                          >
                            {open ? 'AÇIK' : 'KAPALI'}
                          </span>
                        </div>

                        <p className="text-[11px] font-mono text-[#64748b] mt-2 line-clamp-1 relative z-10">{business.address_text || 'Adres bilgisi yok'}</p>

                        <div className="mt-4 flex flex-wrap gap-2 relative z-10">
                          {categories.slice(0, 2).map((categoryName) => (
                            <span key={`${business.id}-${categoryName}`} className="px-2 py-1 rounded bg-[#0a0c10] border border-[#2d313a] text-[9px] font-mono text-[#64748b] uppercase tracking-wide">
                              {categoryName}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 pt-3 flex items-center justify-between border-t border-[#1e232b] text-[10px] font-mono text-[#475569] relative z-10">
                          <span>{business.phone || '-'}</span>
                          <span>{formatBusinessDate(business.created_at)}</span>
                        </div>
                      </>
                    )}
                  </button>
                </HardwarePanel>
              )
            })}
          </div>
        )}
      </div>

      {selectedBusiness && (
        <div className="fixed inset-0 z-50 bg-[#050608]/90 backdrop-blur-sm p-4 flex items-center justify-center">
          <HardwarePanel className="w-full max-w-5xl max-h-[94vh] flex flex-col p-0">
            <div className="px-6 py-5 border-b border-[#2d313a] bg-[#0f1115] flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#64748b]">Şube Yönetimi</p>
                <h2 className="mt-1 text-xl font-medium text-[#e2e8f0] tracking-wide">{selectedBusiness.name}</h2>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="px-4 py-2 rounded text-[10px] font-mono tracking-widest uppercase border border-[#2d313a] text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
              >
                Kapat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0c0e12]">
              <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1fr] gap-6">
                
                <section className="rounded-md p-5 bg-[#16181d] border border-[#2d313a] space-y-4">
                  <h3 className="text-[11px] font-mono text-[#e2e8f0] uppercase tracking-widest mb-4 border-b border-[#1e232b] pb-2">İşletme Bilgileri</h3>

                  <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    İşletme Adı
                    <input
                      className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm outline-none focus:border-[#38bdf8]/50"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </label>

                  <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    Telefon
                    <input
                      className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm outline-none focus:border-[#38bdf8]/50"
                      value={form.phone}
                      onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    />
                  </label>

                  <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    Adres
                    <input
                      className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm outline-none focus:border-[#38bdf8]/50"
                      value={form.address_text}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, address_text: event.target.value }))
                      }
                    />
                  </label>

                  <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    Açıklama
                    <textarea
                      className="mt-2 w-full min-h-[100px] px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm outline-none focus:border-[#38bdf8]/50 custom-scrollbar resize-none"
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, description: event.target.value }))
                      }
                    />
                  </label>

                  <label className="block text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                    Durum
                    <select
                      className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm outline-none focus:border-[#38bdf8]/50 appearance-none"
                      value={form.status}
                      onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                    >
                      <option value="active">AKTİF</option>
                      <option value="passive">PASİF</option>
                      <option value="rejected">REDDEDİLDİ</option>
                    </select>
                  </label>
                </section>

                <section className="rounded-md p-5 bg-[#16181d] border border-[#2d313a] space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-[#1e232b] pb-2 mb-4">
                    <h3 className="text-[11px] font-mono text-[#e2e8f0] uppercase tracking-widest">Galeri ve Vitrin</h3>
                    <span className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest">{galleryPhotos.length} GÖRSEL</span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {galleryPhotos.map((photo) => (
                      <div key={photo.id} className="relative rounded border border-[#2d313a] overflow-hidden bg-[#0a0c10] aspect-square group">
                        <img src={photo.url} className="w-full h-full object-cover mix-blend-lighten opacity-80" alt="İşletme fotoğrafı" />
                        {photo.is_cover ? (
                          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest border border-amber-900/50 text-amber-400 bg-amber-950/50">
                            <Star className="w-2.5 h-2.5" /> VİTRİN
                          </span>
                        ) : null}

                        <div className="absolute inset-x-0 bottom-0 p-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-[#06080b] to-transparent pt-4">
                          <button
                            type="button"
                            onClick={() => setCoverPhoto(photo.id)}
                            className={`flex-1 px-1.5 py-1 rounded text-[8px] font-mono uppercase tracking-widest border ${
                              photo.is_cover
                                ? 'bg-emerald-950/80 border-emerald-900/50 text-emerald-400'
                                : 'bg-[#16181d]/90 border-[#2d313a] text-[#94a3b8] hover:text-[#e2e8f0]'
                            }`}
                          >
                            {photo.is_cover ? 'VİTRİN FOTO' : 'VİTRİN YAP'}
                          </button>
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            className="w-6 h-6 rounded border border-rose-900/50 bg-rose-950/80 text-rose-400 flex items-center justify-center hover:bg-rose-900"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="rounded border border-dashed border-[#333842] hover:border-[#38bdf8]/50 text-[#64748b] hover:text-[#38bdf8] flex flex-col items-center justify-center gap-2 aspect-square bg-[#0a0c10] transition-colors"
                    >
                      {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" strokeWidth={1.5} />}
                      <span className="text-[9px] font-mono uppercase tracking-widest">FOTO EKLE</span>
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          addPhoto(file)
                          event.target.value = ''
                        }
                      }}
                    />
                  </div>
                </section>
              </div>

              <section className="rounded-md p-5 bg-[#16181d] border border-[#2d313a] space-y-5">
                <div className="inline-flex rounded border border-[#2d313a] p-1 bg-[#0a0c10]">
                  <button
                    type="button"
                    onClick={() => setManagementTab('categories')}
                    className={`px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest transition-colors ${
                      managementTab === 'categories'
                        ? 'bg-[#153445] border border-[#226785] text-[#38bdf8]'
                        : 'text-[#64748b] hover:text-[#94a3b8]'
                    }`}
                  >
                    Kategoriler
                  </button>
                  <button
                    type="button"
                    onClick={() => setManagementTab('features')}
                    className={`px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest transition-colors ${
                      managementTab === 'features'
                        ? 'bg-[#153445] border border-[#226785] text-[#38bdf8]'
                        : 'text-[#64748b] hover:text-[#94a3b8]'
                    }`}
                  >
                    Özellikler
                  </button>
                </div>

                {managementTab === 'categories' ? (
                  <div>
                    <div className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest mb-3 border-b border-[#1e232b] pb-2">Kategori Seçimi</div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {allCategories.map((category) => {
                        const selected = selectedCategoryIds.includes(category.id)
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => toggleValue(selectedCategoryIds, category.id, setSelectedCategoryIds)}
                            className={`px-3 py-1.5 rounded border text-[10px] font-mono uppercase tracking-widest transition-colors ${
                              selected
                                ? 'bg-[#153445] border-[#226785] text-[#38bdf8]'
                                : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#e2e8f0]'
                            }`}
                          >
                            {category.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest border-b border-[#1e232b] pb-2">Özellik Seçimi</div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setFeatureCategoryTab('global')}
                        className={`px-3 py-1.5 rounded border text-[10px] font-mono uppercase tracking-widest transition-colors ${
                          featureCategoryTab === 'global'
                            ? 'bg-[#14532d]/40 border-[#166534] text-emerald-400'
                            : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:text-[#e2e8f0]'
                        }`}
                      >
                        Genel
                      </button>
                      {selectedCategoryTabs.map((categoryTab) => (
                        <button
                          key={categoryTab.id}
                          type="button"
                          onClick={() => setFeatureCategoryTab(categoryTab.id)}
                          className={`px-3 py-1.5 rounded border text-[10px] font-mono uppercase tracking-widest transition-colors ${
                            featureCategoryTab === categoryTab.id
                              ? 'bg-[#153445] border-[#226785] text-[#38bdf8]'
                              : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:text-[#e2e8f0]'
                          }`}
                        >
                          {categoryTab.name}
                        </button>
                      ))}
                    </div>

                    {visibleFeatures.length === 0 ? (
                      <div className="rounded p-4 text-[10px] font-mono text-[#475569] uppercase tracking-widest border border-dashed border-[#2d313a] bg-[#0a0c10]">
                        BU SEKMEYE AİT ÖZELLİK BULUNAMADI.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {visibleFeatures.map((feature) => {
                          const selected = selectedFeatureIds.includes(feature.id)
                          return (
                            <button
                              key={feature.id}
                              type="button"
                              onClick={() => toggleValue(selectedFeatureIds, feature.id, setSelectedFeatureIds)}
                              className={`px-3 py-1.5 rounded border text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2 transition-colors ${
                                selected
                                  ? 'bg-[#14532d]/40 border-[#166534] text-emerald-400'
                                  : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#e2e8f0]'
                              }`}
                            >
                              {selected ? <Check className="w-3.5 h-3.5" strokeWidth={2} /> : null}
                              {feature.name}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            <div className="px-6 py-4 border-t border-[#2d313a] bg-[#0f1115] flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={deleteBusiness}
                disabled={saving}
                className="px-6 py-3 rounded text-[11px] font-mono tracking-widest uppercase border border-rose-900/50 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 disabled:opacity-50 transition-colors"
              >
                İşletmeyi Sil
              </button>
              <button
                type="button"
                onClick={saveChanges}
                disabled={saving}
                className="px-6 py-3 rounded text-[11px] font-mono tracking-widest uppercase bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'KAYDEDİLİYOR...' : 'DEĞİŞİKLİKLERİ KAYDET'}
              </button>
            </div>
          </HardwarePanel>
        </div>
      )}
    </div>
  )
}
