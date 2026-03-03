'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Edit3,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { ModuleTitle } from '../../merchant/_components/module-title'

type CategoryRow = {
  id: string
  name: string
  slug: string
  created_at: string | null
}

type FeatureRow = {
  id: string
  name: string
  is_global: boolean
  category_id: string | null
  created_at: string | null
}

type CategoryFormState = {
  name: string
  slug: string
}

type FeatureFormState = {
  name: string
  target: 'global' | 'category'
  categoryId: string
}

const ADMIN_CATEGORIES_API = '/api/admin/categories'

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

function generateSlug(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
}

function formatDate(raw: string | null): string {
  if (!raw) return '-'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('tr-TR')
}

type AdminCategoriesApiResult = {
  ok?: boolean
  error?: string
}

async function postAdminCategoriesAction(payload: Record<string, unknown>): Promise<void> {
  const response = await fetch(ADMIN_CATEGORIES_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await response.json().catch(() => null)) as AdminCategoriesApiResult | null
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || 'İşlem başarısız.')
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

export default function AdminCategoriesPage() {
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
  const [savingCategory, setSavingCategory] = useState(false)
  const [savingFeature, setSavingFeature] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState('')
  const [deletingFeatureId, setDeletingFeatureId] = useState('')

  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [features, setFeatures] = useState<FeatureRow[]>([])

  const [categorySearch, setCategorySearch] = useState('')
  const [featureSearch, setFeatureSearch] = useState('')
  const [featureModeFilter, setFeatureModeFilter] = useState<'all' | 'global' | 'category'>('all')
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState('all')
  const [focusCategoryId, setFocusCategoryId] = useState('')

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({ name: '', slug: '' })
  const [slugTouched, setSlugTouched] = useState(false)

  const [featureModalOpen, setFeatureModalOpen] = useState(false)
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null)
  const [featureForm, setFeatureForm] = useState<FeatureFormState>({
    name: '',
    target: 'global',
    categoryId: '',
  })

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const category of categories) {
      map.set(category.id, category.name)
    }
    return map
  }, [categories])

  const categoryFeatureCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const feature of features) {
      if (!feature.category_id) continue
      map.set(feature.category_id, (map.get(feature.category_id) || 0) + 1)
    }
    return map
  }, [features])

  const globalFeatureCount = useMemo(
    () => features.filter((feature) => feature.is_global || !feature.category_id).length,
    [features]
  )

  const categoryBoundFeatureCount = features.length - globalFeatureCount

  const filteredCategories = useMemo(() => {
    const q = normalizeText(categorySearch.trim())
    if (!q) return categories
    return categories.filter((category) => {
      const name = normalizeText(category.name)
      const slug = normalizeText(category.slug)
      return name.includes(q) || slug.includes(q)
    })
  }, [categories, categorySearch])

  const filteredFeatures = useMemo(() => {
    const q = normalizeText(featureSearch.trim())

    return features.filter((feature) => {
      if (featureModeFilter === 'global' && !(feature.is_global || !feature.category_id)) return false
      if (featureModeFilter === 'category' && (feature.is_global || !feature.category_id)) return false

      if (featureCategoryFilter !== 'all' && feature.category_id !== featureCategoryFilter) return false

      if (!q) return true

      const name = normalizeText(feature.name)
      const categoryName = normalizeText(categoryNameById.get(feature.category_id || '') || '')
      return name.includes(q) || categoryName.includes(q)
    })
  }, [features, featureSearch, featureModeFilter, featureCategoryFilter, categoryNameById])

  const focusCategory = categories.find((category) => category.id === focusCategoryId) || null

  const fetchData = async (soft = false) => {
    if (soft) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    const [categoryRes, featureRes] = await Promise.all([
      supabase.from('categories').select('id,name,slug,created_at').order('name'),
      supabase.from('features').select('id,name,is_global,category_id,created_at').order('name'),
    ])

    if (!categoryRes.error) {
      const categoryRows = (categoryRes.data || []) as Array<{
        id?: string | null
        name?: string | null
        slug?: string | null
        created_at?: string | null
      }>

      setCategories(
        categoryRows
          .map((row) => ({
            id: (row.id || '').trim(),
            name: (row.name || '').trim(),
            slug: (row.slug || '').trim(),
            created_at: row.created_at || null,
          }))
          .filter((row) => row.id && row.name && row.slug)
      )
    }

    if (!featureRes.error) {
      const featureRows = (featureRes.data || []) as Array<{
        id?: string | null
        name?: string | null
        is_global?: boolean | null
        category_id?: string | null
        created_at?: string | null
      }>

      setFeatures(
        featureRows
          .map((row) => ({
            id: (row.id || '').trim(),
            name: (row.name || '').trim(),
            is_global: Boolean(row.is_global),
            category_id: row.category_id || null,
            created_at: row.created_at || null,
          }))
          .filter((row) => row.id && row.name)
      )
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    void fetchData(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreateCategoryModal = () => {
    setEditingCategoryId(null)
    setCategoryForm({ name: '', slug: '' })
    setSlugTouched(false)
    setCategoryModalOpen(true)
  }

  const openEditCategoryModal = (category: CategoryRow) => {
    setEditingCategoryId(category.id)
    setCategoryForm({ name: category.name, slug: category.slug })
    setSlugTouched(true)
    setCategoryModalOpen(true)
  }

  const saveCategory = async () => {
    if (!categoryForm.name.trim() || !categoryForm.slug.trim()) {
      window.alert('Kategori adı ve slug zorunludur.')
      return
    }

    setSavingCategory(true)

    const payload = {
      name: categoryForm.name.trim(),
      slug: categoryForm.slug.trim(),
    }

    try {
      await postAdminCategoriesAction({
        action: 'save_category',
        categoryId: editingCategoryId || undefined,
        ...payload,
      })
      setCategoryModalOpen(false)
      await fetchData(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kaydedilemedi.'
      window.alert(`Kaydedilemedi: ${message}`)
    } finally {
      setSavingCategory(false)
    }
  }

  const removeCategory = async (category: CategoryRow) => {
    if (deletingCategoryId) return

    const relatedFeatureCount = categoryFeatureCount.get(category.id) || 0
    const confirmationText =
      relatedFeatureCount > 0
        ? `${category.name} kategorisi silinsin mi?\nBu kategoriye bağlı ${relatedFeatureCount} özellik globale taşınacak.`
        : `${category.name} kategorisi silinsin mi?`

    const confirmed = window.confirm(confirmationText)
    if (!confirmed) return

    setDeletingCategoryId(category.id)

    try {
      await postAdminCategoriesAction({
        action: 'delete_category',
        categoryId: category.id,
      })
      if (focusCategoryId === category.id) {
        setFocusCategoryId('')
      }
      await fetchData(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Silinemedi.'
      window.alert(`Silinemedi: ${message}`)
    } finally {
      setDeletingCategoryId('')
    }
  }

  const openCreateFeatureModal = (categoryId?: string) => {
    const fallbackCategoryId = categoryId || focusCategoryId || categories[0]?.id || ''
    setEditingFeatureId(null)
    setFeatureForm({
      name: '',
      target: fallbackCategoryId ? 'category' : 'global',
      categoryId: fallbackCategoryId,
    })
    setFeatureModalOpen(true)
  }

  const openEditFeatureModal = (feature: FeatureRow) => {
    const isGlobal = feature.is_global || !feature.category_id
    setEditingFeatureId(feature.id)
    setFeatureForm({
      name: feature.name,
      target: isGlobal ? 'global' : 'category',
      categoryId: feature.category_id || '',
    })
    setFeatureModalOpen(true)
  }

  const saveFeature = async () => {
    if (!featureForm.name.trim()) {
      window.alert('Özellik adı zorunludur.')
      return
    }

    if (featureForm.target === 'category' && !featureForm.categoryId) {
      window.alert('Kategoriye bağlı özellik için kategori seçmelisiniz.')
      return
    }

    setSavingFeature(true)

    const isGlobal = featureForm.target === 'global'
    const payload = {
      name: featureForm.name.trim(),
      is_global: isGlobal,
      category_id: isGlobal ? null : featureForm.categoryId,
    }

    try {
      await postAdminCategoriesAction({
        action: 'save_feature',
        featureId: editingFeatureId || undefined,
        ...payload,
        feature_category_id: payload.category_id,
      })
      setFeatureModalOpen(false)
      await fetchData(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kaydedilemedi.'
      window.alert(`Kaydedilemedi: ${message}`)
    } finally {
      setSavingFeature(false)
    }
  }

  const removeFeature = async (feature: FeatureRow) => {
    if (deletingFeatureId) return

    const confirmed = window.confirm(`${feature.name} özelliği silinsin mi?`)
    if (!confirmed) return

    setDeletingFeatureId(feature.id)

    try {
      await postAdminCategoriesAction({
        action: 'delete_feature',
        featureId: feature.id,
      })
      await fetchData(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Silinemedi.'
      window.alert(`Silinemedi: ${message}`)
    } finally {
      setDeletingFeatureId('')
    }
  }

  return (
    <div className="h-full flex flex-col gap-4 text-[#e2e8f0]">
      <HardwarePanel className="p-5 border-b border-[#2d313a]">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <ModuleTitle title="Kategori & Özellik Merkezi" />
            <p className="mt-2 text-[10px] font-mono tracking-widest uppercase text-[#64748b]">
              Sistem genelindeki işletme kategorilerini ve donanım özelliklerini yönetin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchData(true)}
            disabled={refreshing}
            className="h-11 px-4 rounded bg-[#16181d] border border-[#2d313a] text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0] inline-flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#1a1d24] transition-colors"
          >
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Yenile
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Kategori</p>
            <p className="mt-1 text-xl font-mono text-[#e2e8f0]">{categories.length}</p>
          </div>
          <div className="rounded border border-[#226785] bg-[#153445]/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-[#38bdf8]">Toplam Özellik</p>
            <p className="mt-1 text-xl font-mono text-[#38bdf8]">{features.length}</p>
          </div>
          <div className="rounded border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-emerald-500/0 group-hover:bg-emerald-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-emerald-500/70">Global Özellik</p>
            <p className="mt-1 text-xl font-mono text-emerald-400">{globalFeatureCount}</p>
          </div>
          <div className="rounded border border-amber-900/50 bg-amber-950/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-amber-500/0 group-hover:bg-amber-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-amber-500/70">Kategoriye Bağlı</p>
            <p className="mt-1 text-xl font-mono text-amber-400">{categoryBoundFeatureCount}</p>
          </div>
        </div>
      </HardwarePanel>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] gap-4">
        
        {/* LEYFT SIDEBAR (KATEGORİLER) */}
        <HardwarePanel className="p-0 overflow-hidden min-h-[520px] flex flex-col">
          <div className="px-5 py-4 border-b border-[#2d313a] bg-[#0f1115] flex items-center justify-between">
            <h2 className="text-[11px] font-mono font-medium text-[#e2e8f0] uppercase tracking-widest">Kategoriler</h2>
            <button
              type="button"
              onClick={openCreateCategoryModal}
              className="h-9 px-3 rounded border border-[#226785] bg-[#153445] text-[#38bdf8] text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-1.5 hover:brightness-110 transition-colors"
            >
              <Plus size={13} />
              YENİ
            </button>
          </div>

          <div className="p-4 border-b border-[#2d313a] bg-[#101419]">
            <label className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">Ara</label>
            <div className="relative mt-2">
              <Search className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Ad veya slug..."
                className="w-full h-10 rounded bg-[#0a0c10] border border-[#2d313a] pl-9 pr-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#16181d] custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-[#101419] z-10 border-b border-[#2d313a]">
                <tr className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Özellik</th>
                  <th className="px-4 py-3 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e232b]">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-14 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#38bdf8] mx-auto" />
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                      KATEGORİ BULUNAMADI.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((category) => {
                    const focused = focusCategoryId === category.id
                    const deleting = deletingCategoryId === category.id

                    return (
                      <tr key={category.id} className={`transition-colors ${focused ? 'bg-[#153445]/20 border-l-[3px] border-l-[#38bdf8]' : 'hover:bg-[#1a1d24] border-l-[3px] border-l-transparent'}`}>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setFocusCategoryId(category.id)}
                            className="text-left block w-full"
                          >
                            <p className={`text-[12px] font-medium uppercase tracking-wide ${focused ? 'text-[#38bdf8]' : 'text-[#e2e8f0]'}`}>{category.name}</p>
                            <p className="mt-1 text-[9px] font-mono uppercase tracking-widest text-[#64748b]">{formatDate(category.created_at)}</p>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-[10px] font-mono text-[#94a3b8]">{category.slug}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded bg-[#101419] border border-[#1e232b] text-[9px] font-mono text-[#cbd5e1]">
                            {categoryFeatureCount.get(category.id) || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openCreateFeatureModal(category.id)}
                              className="h-8 px-2.5 rounded border border-[#2d313a] bg-[#0a0c10] text-[9px] font-mono uppercase tracking-widest text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a1d24] transition-colors"
                            >
                              EKLE
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditCategoryModal(category)}
                              className="h-8 w-8 rounded border border-[#2d313a] bg-[#16181d] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24] inline-flex items-center justify-center transition-colors"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeCategory(category)}
                              disabled={deleting}
                              className="h-8 w-8 rounded border border-rose-900/50 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40 inline-flex items-center justify-center disabled:opacity-50 transition-colors"
                            >
                              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
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
        </HardwarePanel>

        {/* RIGHT AREA (ÖZELLİKLER) */}
        <HardwarePanel className="p-0 overflow-hidden min-h-[520px] flex flex-col">
          <div className="px-5 py-4 border-b border-[#2d313a] bg-[#0f1115] flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[11px] font-mono font-medium text-[#e2e8f0] uppercase tracking-widest">Özellikler</h2>
            <button
              type="button"
              onClick={() => openCreateFeatureModal()}
              className="h-9 px-3 rounded border border-emerald-900/50 bg-emerald-950/30 text-[10px] font-mono uppercase tracking-widest text-emerald-400 hover:bg-emerald-900/40 transition-colors inline-flex items-center gap-1.5"
            >
              <Plus size={13} />
              YENİ
            </button>
          </div>

          <div className="p-4 border-b border-[#2d313a] bg-[#101419] space-y-3">
            {focusCategory ? (
              <div className="rounded border border-[#226785] bg-[#153445]/20 px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#cbd5e1]">
                  ODAK: <strong className="text-[#38bdf8]">{focusCategory.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFeatureModeFilter('category')
                    setFeatureCategoryFilter(focusCategory.id)
                  }}
                  className="h-8 px-3 rounded border border-[#226785] bg-[#153445] text-[9px] font-mono uppercase tracking-widest text-[#38bdf8] hover:brightness-110 transition-colors"
                >
                  FİLTRELE
                </button>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label>
                <span className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">Ara</span>
                <div className="relative mt-2">
                  <Search className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={featureSearch}
                    onChange={(event) => setFeatureSearch(event.target.value)}
                    placeholder="Ad..."
                    className="w-full h-10 rounded bg-[#0a0c10] border border-[#2d313a] pl-9 pr-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                  />
                </div>
              </label>

              <label>
                <span className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">Tip</span>
                <select
                  value={featureModeFilter}
                  onChange={(event) => setFeatureModeFilter(event.target.value as 'all' | 'global' | 'category')}
                  className="mt-2 w-full h-10 rounded bg-[#0a0c10] border border-[#2d313a] px-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
                >
                  <option value="all">TÜMÜ</option>
                  <option value="global">GLOBAL</option>
                  <option value="category">KATEGORİYE BAĞLI</option>
                </select>
              </label>

              <label>
                <span className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">Kategori Filtresi</span>
                <select
                  value={featureCategoryFilter}
                  onChange={(event) => setFeatureCategoryFilter(event.target.value)}
                  className="mt-2 w-full h-10 rounded bg-[#0a0c10] border border-[#2d313a] px-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
                >
                  <option value="all">TÜMÜ</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#16181d] custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-[#101419] z-10 border-b border-[#2d313a]">
                <tr className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">
                  <th className="px-4 py-3">Özellik</th>
                  <th className="px-4 py-3">Tip</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Kayıt</th>
                  <th className="px-4 py-3 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e232b]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#38bdf8] mx-auto" />
                    </td>
                  </tr>
                ) : filteredFeatures.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                      ÖZELLİK BULUNAMADI.
                    </td>
                  </tr>
                ) : (
                  filteredFeatures.map((feature) => {
                    const isGlobal = feature.is_global || !feature.category_id
                    const deleting = deletingFeatureId === feature.id

                    return (
                      <tr key={feature.id} className="hover:bg-[#1a1d24] transition-colors">
                        <td className="px-4 py-3">
                          <div className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-[#e2e8f0]">
                            {isGlobal ? <Sparkles size={14} className="text-emerald-400" /> : <Tag size={14} className="text-[#38bdf8]" />}
                            {feature.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest border ${
                              isGlobal
                                ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-400'
                                : 'border-[#226785] bg-[#153445]/20 text-[#38bdf8]'
                            }`}
                          >
                            {isGlobal ? 'GLOBAL' : 'KATEGORİ'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-[#94a3b8]">
                          {isGlobal ? '-' : categoryNameById.get(feature.category_id || '') || 'BİLİNMİYOR'}
                        </td>
                        <td className="px-4 py-3 text-[10px] font-mono text-[#64748b] tracking-widest">{formatDate(feature.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditFeatureModal(feature)}
                              className="h-8 w-8 rounded border border-[#2d313a] bg-[#16181d] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24] inline-flex items-center justify-center transition-colors"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeFeature(feature)}
                              disabled={deleting}
                              className="h-8 w-8 rounded border border-rose-900/50 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40 inline-flex items-center justify-center disabled:opacity-50 transition-colors"
                            >
                              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
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
        </HardwarePanel>
      </section>

      {/* MODALS */}
      {categoryModalOpen ? (
        <div className="fixed inset-0 z-50 bg-[#050608]/90 backdrop-blur-sm p-4 flex items-center justify-center">
          <HardwarePanel className="w-full max-w-lg p-0 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-[#2d313a] bg-[#0f1115] flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-[#e2e8f0] uppercase tracking-wide">
                {editingCategoryId ? 'Kategori Düzenle' : 'Yeni Kategori'}
              </h3>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="h-9 w-9 rounded border border-[#2d313a] bg-[#16181d] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24] inline-flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 bg-[#0c0e12] space-y-5">
              <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Kategori Adı
                <div className="relative mt-2">
                  <Layers className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={categoryForm.name}
                    onChange={(event) => {
                      const nextName = event.target.value
                      setCategoryForm((current) => ({
                        ...current,
                        name: nextName,
                        slug: slugTouched ? current.slug : generateSlug(nextName),
                      }))
                    }}
                    placeholder="Örn: Akaryakıt"
                    className="w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] pl-9 pr-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                  />
                </div>
              </label>

              <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Slug
                <div className="relative mt-2">
                  <Tag className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={categoryForm.slug}
                    onChange={(event) => {
                      setSlugTouched(true)
                      setCategoryForm((current) => ({ ...current, slug: event.target.value }))
                    }}
                    placeholder="akaryakit"
                    className="w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] pl-9 pr-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                  />
                </div>
              </label>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#1e232b]">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="h-11 px-5 rounded border border-[#2d313a] bg-transparent text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
                >
                  VAZGEÇ
                </button>
                <button
                  type="button"
                  onClick={() => void saveCategory()}
                  disabled={savingCategory}
                  className="h-11 px-6 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] text-[11px] font-mono uppercase tracking-widest border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 disabled:opacity-50 inline-flex items-center gap-2 transition-all"
                >
                  {savingCategory ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  KAYDET
                </button>
              </div>
            </div>
          </HardwarePanel>
        </div>
      ) : null}

      {featureModalOpen ? (
        <div className="fixed inset-0 z-50 bg-[#050608]/90 backdrop-blur-sm p-4 flex items-center justify-center">
          <HardwarePanel className="w-full max-w-lg p-0 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-[#2d313a] bg-[#0f1115] flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-[#e2e8f0] uppercase tracking-wide">
                {editingFeatureId ? 'Özellik Düzenle' : 'Yeni Özellik'}
              </h3>
              <button
                type="button"
                onClick={() => setFeatureModalOpen(false)}
                className="h-9 w-9 rounded border border-[#2d313a] bg-[#16181d] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24] inline-flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 bg-[#0c0e12] space-y-5">
              <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Özellik Adı
                <div className="relative mt-2">
                  <Tag className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={featureForm.name}
                    onChange={(event) => setFeatureForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Örn: 24 Saat Açık"
                    className="w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] pl-9 pr-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                  />
                </div>
              </label>

              <div>
                <span className="text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">Özellik Tipi</span>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFeatureForm((current) => ({ ...current, target: 'global' }))}
                    className={`h-11 rounded border text-[10px] font-mono uppercase tracking-widest transition-colors ${
                      featureForm.target === 'global'
                        ? 'bg-[#14532d]/40 border-[#166534] text-emerald-400'
                        : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#e2e8f0]'
                    }`}
                  >
                    GLOBAL
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFeatureForm((current) => ({
                        ...current,
                        target: 'category',
                        categoryId: current.categoryId || focusCategoryId || categories[0]?.id || '',
                      }))
                    }
                    disabled={categories.length === 0}
                    className={`h-11 rounded border text-[10px] font-mono uppercase tracking-widest disabled:opacity-50 transition-colors ${
                      featureForm.target === 'category'
                        ? 'bg-[#153445] border-[#226785] text-[#38bdf8]'
                        : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#e2e8f0]'
                    }`}
                  >
                    KATEGORİYE BAĞLI
                  </button>
                </div>
              </div>

              {featureForm.target === 'category' ? (
                <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                  Kategori
                  <select
                    value={featureForm.categoryId}
                    onChange={(event) =>
                      setFeatureForm((current) => ({
                        ...current,
                        categoryId: event.target.value,
                      }))
                    }
                    className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
                  >
                    <option value="">KATEGORİ SEÇİN</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="pt-4 flex justify-end gap-3 border-t border-[#1e232b]">
                <button
                  type="button"
                  onClick={() => setFeatureModalOpen(false)}
                  className="h-11 px-5 rounded border border-[#2d313a] bg-transparent text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors"
                >
                  VAZGEÇ
                </button>
                <button
                  type="button"
                  onClick={() => void saveFeature()}
                  disabled={savingFeature}
                  className="h-11 px-6 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] text-[11px] font-mono uppercase tracking-widest border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 disabled:opacity-50 inline-flex items-center gap-2 transition-all"
                >
                  {savingFeature ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  KAYDET
                </button>
              </div>
            </div>
          </HardwarePanel>
        </div>
      ) : null}
    </div>
  )
}
