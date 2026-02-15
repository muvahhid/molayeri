'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import { ModuleTitle } from '../_components/module-title'

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
      <div>
        <ModuleTitle title="Şubelerim" />
        <p className="text-sm text-slate-500 mt-1">Mobildeki İşletmelerim ekranının web karşılığı.</p>
      </div>

      <div className="rounded-[28px] p-5 md:p-6 bg-[linear-gradient(145deg,#ffffff_0%,#f3f7ff_100%)] shadow-[0_20px_28px_-22px_rgba(15,23,42,0.55)] space-y-4">
        {!loading && businesses.length > 0 ? (
          <div className="rounded-2xl p-4 bg-[#edf2fa] shadow-[inset_4px_4px_10px_rgba(148,163,184,0.2),inset_-4px_-4px_10px_rgba(255,255,255,0.9)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 bg-white shadow-sm">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filtreler
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 bg-white shadow-sm">
                {filteredBusinesses.length} / {businesses.length} şube
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 bg-white shadow-sm">
                <List className="w-3.5 h-3.5" />
                {activeViewMode === 'single'
                  ? 'Tek Kart'
                  : activeViewMode === 'grid-2'
                    ? '2 Kolon'
                    : activeViewMode === 'grid-3'
                      ? '3 Kolon'
                      : 'Tablo Liste'}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Kategori
                <select
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white text-slate-700 text-sm font-semibold shadow-sm"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="all">Tüm Kategoriler</option>
                  {availableCategoryFilters.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Açık / Kapalı
                <select
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white text-slate-700 text-sm font-semibold shadow-sm"
                  value={openFilter}
                  onChange={(event) => setOpenFilter(event.target.value as OpenFilterValue)}
                >
                  <option value="all">Tümü</option>
                  <option value="open">Açık</option>
                  <option value="closed">Kapalı</option>
                </select>
              </label>

              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Sıralama
                <div className="mt-1.5 relative">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
                  <select
                    className="w-full px-3 py-2.5 rounded-xl bg-white text-slate-700 text-sm font-semibold shadow-sm appearance-none"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as SortOrderValue)}
                  >
                    <option value="newest">Yeniden Eskiye</option>
                    <option value="oldest">Eskiden Yeniye</option>
                  </select>
                </div>
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Görünüm</span>
              {(
                [
                  { key: 'auto', label: 'Otomatik' },
                  { key: 'grid-2', label: '2 Kolon' },
                  { key: 'grid-3', label: '3 Kolon' },
                  { key: 'table', label: 'Tablo' },
                ] as { key: ViewModeOverride; label: string }[]
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setViewModeOverride(item.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    viewModeOverride === item.key
                      ? 'bg-slate-800 text-white shadow-[0_10px_16px_-12px_rgba(15,23,42,0.72)]'
                      : 'bg-white text-slate-600 shadow-sm hover:text-slate-800'
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
            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          </div>
        ) : businesses.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm font-bold text-slate-500">
            Henüz işletmeniz yok.
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm font-bold text-slate-500">
            Filtreye uyan şube bulunamadı.
          </div>
        ) : activeViewMode === 'table' ? (
          <div className="rounded-2xl overflow-hidden border border-white/70 bg-white shadow-[0_14px_24px_-18px_rgba(15,23,42,0.55)]">
            <div className="hidden lg:grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_120px_120px_90px] gap-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400 bg-[#f7f9fd] border-b border-slate-200/70">
              <span>İşletme</span>
              <span>Kategori</span>
              <span>Durum</span>
              <span>Kayıt</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100">
              {tablePageBusinesses.map((business) => {
                const cover = getCoverPhotoUrl(business)
                const categories = formatBusinessCategories(business)
                const open = isBusinessOpen(business)

                return (
                  <button
                    key={business.id}
                    type="button"
                    onClick={() => openEdit(business)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="hidden lg:grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_120px_120px_90px] gap-3 items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                          {cover ? (
                            <img src={cover} alt={business.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                              Görsel
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{business.name}</p>
                          <p className="text-xs text-slate-500 truncate">{business.phone || business.address_text || 'Bilgi yok'}</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 truncate">{categories.slice(0, 2).join(', ')}</p>

                      <span
                        className={`inline-flex justify-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          open ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                        }`}
                      >
                        {open ? 'Açık' : 'Kapalı'}
                      </span>

                      <p className="text-xs text-slate-500">{formatBusinessDate(business.created_at)}</p>
                      <p className="text-xs font-semibold text-slate-600">Düzenle</p>
                    </div>

                    <div className="lg:hidden">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{business.name}</p>
                          <p className="text-xs text-slate-500 truncate">{categories.slice(0, 2).join(', ')}</p>
                        </div>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            open ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                          }`}
                        >
                          {open ? 'Açık' : 'Kapalı'}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="px-4 py-3 border-t border-slate-200/70 bg-[#f7f9fd] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p className="text-xs text-slate-500">
                {filteredBusinesses.length} işletme içinde {tableStartIndex + 1}-
                {Math.min(tableStartIndex + TABLE_PAGE_SIZE, filteredBusinesses.length)} arası
                gösteriliyor.
              </p>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTablePage(Math.max(1, tableWindowStart - TABLE_PAGE_WINDOW))}
                  disabled={tableWindowStart === 1}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-600 shadow-sm disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  10 Geri
                </button>
                <button
                  type="button"
                  onClick={() => setTablePage(Math.max(1, clampedTablePage - 1))}
                  disabled={clampedTablePage === 1}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-600 shadow-sm disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  Geri
                </button>

                {tableWindowPages.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setTablePage(page)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      page === clampedTablePage
                        ? 'bg-slate-800 text-white shadow-[0_8px_14px_-10px_rgba(15,23,42,0.78)]'
                        : 'bg-white text-slate-600 shadow-sm hover:text-slate-800'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setTablePage(Math.min(tableTotalPages, clampedTablePage + 1))}
                  disabled={clampedTablePage === tableTotalPages}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-600 shadow-sm disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  İleri
                </button>
                <button
                  type="button"
                  onClick={() => setTablePage(Math.min(tableTotalPages, tableWindowEnd + 1))}
                  disabled={tableWindowEnd === tableTotalPages}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-600 shadow-sm disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  10 İleri
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
                <button
                  key={business.id}
                  type="button"
                  onClick={() => openEdit(business)}
                  className={`text-left rounded-2xl bg-white shadow-[0_14px_20px_-18px_rgba(15,23,42,0.58)] border border-white/70 transition-transform hover:-translate-y-0.5 ${
                    activeViewMode === 'single' ? 'p-0 overflow-hidden' : 'p-4'
                  }`}
                >
                  {activeViewMode === 'single' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
                      <div className="h-64 lg:h-[360px] bg-slate-200 overflow-hidden">
                        {cover ? (
                          <img src={cover} alt={business.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-sm font-bold text-slate-500">
                            Görsel yok
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-[28px] leading-tight font-bold text-slate-800">{business.name}</h2>
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                              open ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                            }`}
                          >
                            {open ? 'Açık' : 'Kapalı'}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500 line-clamp-2">{business.address_text || 'Adres bilgisi girilmemiş.'}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {categories.slice(0, 4).map((categoryName) => (
                            <span key={`${business.id}-${categoryName}`} className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100">
                              {categoryName}
                            </span>
                          ))}
                        </div>
                        <div className="mt-auto pt-6 flex items-center justify-between text-xs text-slate-500">
                          <span>{business.phone || 'Telefon yok'}</span>
                          <span>{formatBusinessDate(business.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="h-36 rounded-xl bg-slate-200 overflow-hidden mb-3">
                        {cover ? (
                          <img src={cover} alt={business.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-500">
                            Görsel yok
                          </div>
                        )}
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-base font-semibold text-slate-700">{business.name}</h2>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            open ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                          }`}
                        >
                          {open ? 'Açık' : 'Kapalı'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{business.address_text || 'Adres bilgisi yok'}</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {categories.slice(0, 2).map((categoryName) => (
                          <span key={`${business.id}-${categoryName}`} className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100">
                            {categoryName}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{business.phone || '-'}</span>
                        <span>{formatBusinessDate(business.created_at)}</span>
                      </div>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selectedBusiness && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-5xl max-h-[94vh] overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(160deg,#f8fbff_0%,#f1f5fd_100%)] shadow-[0_28px_55px_-30px_rgba(15,23,42,0.65)] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-200/70 bg-[linear-gradient(145deg,#ffffff_0%,#f5f8ff_100%)] flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-500">Şube Yönetimi</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-800">{selectedBusiness.name}</h2>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white shadow-sm"
              >
                Kapat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1fr] gap-5">
                <section className="rounded-2xl p-5 bg-white/90 border border-white/70 shadow-[0_16px_24px_-22px_rgba(15,23,42,0.6)] space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-widest">İşletme Bilgileri</h3>

                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    İşletme Adı
                    <input
                      className="mt-2 w-full px-4 py-3 rounded-xl bg-white text-slate-700 font-bold shadow-sm"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </label>

                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Telefon
                    <input
                      className="mt-2 w-full px-4 py-3 rounded-xl bg-white text-slate-700 font-bold shadow-sm"
                      value={form.phone}
                      onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    />
                  </label>

                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Adres
                    <input
                      className="mt-2 w-full px-4 py-3 rounded-xl bg-white text-slate-700 font-bold shadow-sm"
                      value={form.address_text}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, address_text: event.target.value }))
                      }
                    />
                  </label>

                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Açıklama
                    <textarea
                      className="mt-2 w-full min-h-24 px-4 py-3 rounded-xl bg-white text-slate-700 font-bold shadow-sm"
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, description: event.target.value }))
                      }
                    />
                  </label>

                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Durum
                    <select
                      className="mt-2 w-full px-4 py-3 rounded-xl bg-white text-slate-700 font-bold shadow-sm"
                      value={form.status}
                      onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                    >
                      <option value="active">Aktif</option>
                      <option value="passive">Pasif</option>
                      <option value="rejected">Reddedildi</option>
                    </select>
                  </label>
                </section>

                <section className="rounded-2xl p-5 bg-white/90 border border-white/70 shadow-[0_16px_24px_-22px_rgba(15,23,42,0.6)] space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-widest">Galeri ve Vitrin</h3>
                    <span className="text-[11px] text-slate-500">{galleryPhotos.length} görsel</span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {galleryPhotos.map((photo) => (
                      <div key={photo.id} className="relative rounded-xl overflow-hidden bg-slate-200 aspect-square shadow-sm">
                        <img src={photo.url} className="w-full h-full object-cover" alt="İşletme fotoğrafı" />
                        {photo.is_cover ? (
                          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-amber-800 bg-amber-100">
                            <Star className="w-3 h-3" />
                            Vitrin
                          </span>
                        ) : null}

                        <div className="absolute inset-x-1 bottom-1 flex gap-1">
                          <button
                            type="button"
                            onClick={() => setCoverPhoto(photo.id)}
                            className={`flex-1 px-2 py-1 rounded-md text-[10px] font-semibold ${
                              photo.is_cover
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-white/90 text-slate-700'
                            }`}
                          >
                            {photo.is_cover ? 'Vitrin Foto' : 'Vitrin Yap'}
                          </button>
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            className="w-7 h-7 rounded-md bg-rose-500 text-white flex items-center justify-center"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="rounded-xl border-2 border-dashed border-slate-300 text-slate-500 flex flex-col items-center justify-center gap-2 aspect-square bg-white/70"
                    >
                      {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span className="text-[10px] font-semibold uppercase tracking-widest">Foto Ekle</span>
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

              <section className="rounded-2xl p-5 bg-white/90 border border-white/70 shadow-[0_16px_24px_-22px_rgba(15,23,42,0.6)] space-y-4">
                <div className="inline-flex rounded-xl p-1 bg-[#edf2f9] shadow-[inset_3px_3px_8px_rgba(148,163,184,0.2),inset_-3px_-3px_8px_rgba(255,255,255,0.85)]">
                  <button
                    type="button"
                    onClick={() => setManagementTab('categories')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      managementTab === 'categories'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    Kategoriler
                  </button>
                  <button
                    type="button"
                    onClick={() => setManagementTab('features')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      managementTab === 'features'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    Özellikler
                  </button>
                </div>

                {managementTab === 'categories' ? (
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Kategori Seçimi</div>
                    <div className="flex flex-wrap gap-2">
                      {allCategories.map((category) => {
                        const selected = selectedCategoryIds.includes(category.id)
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => toggleValue(selectedCategoryIds, category.id, setSelectedCategoryIds)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                              selected
                                ? 'bg-blue-100 border-blue-300 text-blue-700'
                                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800'
                            }`}
                          >
                            {category.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Özellik Seçimi</div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setFeatureCategoryTab('global')}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          featureCategoryTab === 'global'
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        Genel
                      </button>
                      {selectedCategoryTabs.map((categoryTab) => (
                        <button
                          key={categoryTab.id}
                          type="button"
                          onClick={() => setFeatureCategoryTab(categoryTab.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                            featureCategoryTab === categoryTab.id
                              ? 'bg-blue-100 border-blue-300 text-blue-700'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {categoryTab.name}
                        </button>
                      ))}
                    </div>

                    {visibleFeatures.length === 0 ? (
                      <div className="rounded-xl p-3 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200">
                        Bu sekmede gösterilecek özellik bulunamadı.
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
                              className={`px-3 py-2 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-colors ${
                                selected
                                  ? 'bg-green-100 border-green-300 text-green-700'
                                  : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              {selected ? <Check className="w-3.5 h-3.5" /> : null}
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

            <div className="px-6 py-4 border-t border-slate-200/70 bg-[linear-gradient(145deg,#ffffff_0%,#f5f8ff_100%)] flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={deleteBusiness}
                disabled={saving}
                className="px-4 py-3 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                İşletmeyi Sil
              </button>
              <button
                type="button"
                onClick={saveChanges}
                disabled={saving}
                className="px-4 py-3 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
