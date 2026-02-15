'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Edit3,
  Layers,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react'

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

    const res = editingCategoryId
      ? await supabase.from('categories').update(payload).eq('id', editingCategoryId)
      : await supabase.from('categories').insert(payload)

    setSavingCategory(false)

    if (res.error) {
      window.alert(`Kaydedilemedi: ${res.error.message}`)
      return
    }

    setCategoryModalOpen(false)
    await fetchData(true)
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

    if (relatedFeatureCount > 0) {
      const featureReset = await supabase
        .from('features')
        .update({ category_id: null, is_global: true })
        .eq('category_id', category.id)

      if (featureReset.error) {
        window.alert(`Kategori silme ön hazırlığı başarısız: ${featureReset.error.message}`)
        setDeletingCategoryId('')
        return
      }
    }

    await supabase.from('business_categories').delete().eq('category_id', category.id)

    const deleteRes = await supabase.from('categories').delete().eq('id', category.id)

    setDeletingCategoryId('')

    if (deleteRes.error) {
      window.alert(`Silinemedi: ${deleteRes.error.message}`)
      return
    }

    if (focusCategoryId === category.id) {
      setFocusCategoryId('')
    }

    await fetchData(true)
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

    const res = editingFeatureId
      ? await supabase.from('features').update(payload).eq('id', editingFeatureId)
      : await supabase.from('features').insert(payload)

    setSavingFeature(false)

    if (res.error) {
      window.alert(`Kaydedilemedi: ${res.error.message}`)
      return
    }

    setFeatureModalOpen(false)
    await fetchData(true)
  }

  const removeFeature = async (feature: FeatureRow) => {
    if (deletingFeatureId) return

    const confirmed = window.confirm(`${feature.name} özelliği silinsin mi?`)
    if (!confirmed) return

    setDeletingFeatureId(feature.id)

    await supabase.from('business_features').delete().eq('feature_id', feature.id)

    const res = await supabase.from('features').delete().eq('id', feature.id)

    setDeletingFeatureId('')

    if (res.error) {
      window.alert(`Silinemedi: ${res.error.message}`)
      return
    }

    await fetchData(true)
  }

  return (
    <div className="h-full flex flex-col gap-4 text-slate-700">
      <section className={`${panelCardClass} p-4 md:p-5`}>
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Kategori & Özellik Merkezi</h1>
          </div>
          <button
            type="button"
            onClick={() => void fetchData(true)}
            disabled={refreshing}
            className="h-11 px-4 rounded-xl border border-slate-200/80 bg-white text-sm font-semibold text-slate-700 inline-flex items-center gap-2 disabled:opacity-60"
          >
            {refreshing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Yenile
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">Kategori</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{categories.length}</p>
          </div>
          <div className="rounded-xl border border-blue-200/80 bg-blue-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-blue-700">Toplam Özellik</p>
            <p className="mt-1 text-xl font-bold text-blue-900">{features.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-emerald-700">Global Özellik</p>
            <p className="mt-1 text-xl font-bold text-emerald-900">{globalFeatureCount}</p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-amber-700">Kategoriye Bağlı</p>
            <p className="mt-1 text-xl font-bold text-amber-900">{categoryBoundFeatureCount}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] gap-4">
        <div className={`${panelCardClass} p-3 md:p-4 min-h-[520px] flex flex-col`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-[0.14em]">Kategoriler</h2>
            <button
              type="button"
              onClick={openCreateCategoryModal}
              className="h-9 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-blue-700"
            >
              <Plus size={13} />
              Yeni Kategori
            </button>
          </div>

          <div className="mt-2">
            <label className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Ara</label>
            <div className="relative mt-1.5">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Kategori adı veya slug"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-700 outline-none"
              />
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200/80 overflow-hidden flex-1">
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200/80">
                  <tr className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">
                    <th className="px-3 py-2.5">Kategori</th>
                    <th className="px-3 py-2.5">Slug</th>
                    <th className="px-3 py-2.5">Özellik</th>
                    <th className="px-3 py-2.5 text-right">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-14 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                      </td>
                    </tr>
                  ) : filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-sm font-semibold text-slate-500">
                        Kategori bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((category) => {
                      const focused = focusCategoryId === category.id
                      const deleting = deletingCategoryId === category.id

                      return (
                        <tr key={category.id} className={focused ? 'bg-blue-50/70' : 'hover:bg-slate-50/80'}>
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => setFocusCategoryId(category.id)}
                              className="text-left"
                            >
                              <p className="text-sm font-bold text-slate-800">{category.name}</p>
                              <p className="text-[11px] text-slate-500">{formatDate(category.created_at)}</p>
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-mono text-slate-600">{category.slug}</td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {categoryFeatureCount.get(category.id) || 0}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openCreateFeatureModal(category.id)}
                                className="h-8 px-2.5 rounded-lg border border-blue-200 bg-blue-50 text-[11px] font-semibold text-blue-700"
                              >
                                Özellik Ekle
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditCategoryModal(category)}
                                className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 inline-flex items-center justify-center"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => void removeCategory(category)}
                                disabled={deleting}
                                className="h-8 w-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 inline-flex items-center justify-center disabled:opacity-60"
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
          </div>
        </div>

        <div className={`${panelCardClass} p-3 md:p-4 min-h-[520px] flex flex-col`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-[0.14em]">Özellikler</h2>
            <button
              type="button"
              onClick={() => openCreateFeatureModal()}
              className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-emerald-700"
            >
              <Plus size={13} />
              Yeni Özellik
            </button>
          </div>

          {focusCategory ? (
            <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 flex items-center justify-between gap-2">
              <span>
                Odak kategori: <strong>{focusCategory.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setFeatureModeFilter('category')
                  setFeatureCategoryFilter(focusCategory.id)
                }}
                className="h-7 px-2.5 rounded-md border border-blue-200 bg-white text-[11px] font-semibold text-blue-700"
              >
                Filtreye Uygula
              </button>
            </div>
          ) : null}

          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <label>
              <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Ara</span>
              <div className="relative mt-1.5">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={featureSearch}
                  onChange={(event) => setFeatureSearch(event.target.value)}
                  placeholder="Özellik adı"
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-700 outline-none"
                />
              </div>
            </label>

            <label>
              <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Tip</span>
              <select
                value={featureModeFilter}
                onChange={(event) => setFeatureModeFilter(event.target.value as 'all' | 'global' | 'category')}
                className="mt-1.5 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
              >
                <option value="all">Tümü</option>
                <option value="global">Global</option>
                <option value="category">Kategoriye Bağlı</option>
              </select>
            </label>

            <label>
              <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Kategori</span>
              <select
                value={featureCategoryFilter}
                onChange={(event) => setFeatureCategoryFilter(event.target.value)}
                className="mt-1.5 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
              >
                <option value="all">Tüm kategoriler</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200/80 overflow-hidden flex-1">
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200/80">
                  <tr className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">
                    <th className="px-3 py-2.5">Özellik</th>
                    <th className="px-3 py-2.5">Tip</th>
                    <th className="px-3 py-2.5">Kategori</th>
                    <th className="px-3 py-2.5">Kayıt</th>
                    <th className="px-3 py-2.5 text-right">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-14 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                      </td>
                    </tr>
                  ) : filteredFeatures.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm font-semibold text-slate-500">
                        Özellik bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredFeatures.map((feature) => {
                      const isGlobal = feature.is_global || !feature.category_id
                      const deleting = deletingFeatureId === feature.id

                      return (
                        <tr key={feature.id} className="hover:bg-slate-50/80">
                          <td className="px-3 py-2.5">
                            <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-800">
                              {isGlobal ? <Sparkles size={14} className="text-emerald-600" /> : <Tag size={14} className="text-blue-600" />}
                              {feature.name}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                isGlobal
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-blue-50 border-blue-200 text-blue-700'
                              }`}
                            >
                              {isGlobal ? 'global' : 'kategori'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-slate-700">
                            {isGlobal ? '-' : categoryNameById.get(feature.category_id || '') || 'Kategori yok'}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-slate-600">{formatDate(feature.created_at)}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditFeatureModal(feature)}
                                className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 inline-flex items-center justify-center"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => void removeFeature(feature)}
                                disabled={deleting}
                                className="h-8 w-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 inline-flex items-center justify-center disabled:opacity-60"
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
          </div>
        </div>
      </section>

      {categoryModalOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm p-3 md:p-5">
          <div className="mx-auto w-full max-w-[560px] rounded-[24px] border border-white/70 bg-[#f8fbff] shadow-[0_30px_44px_-26px_rgba(15,23,42,0.7)]">
            <div className="h-[72px] px-5 border-b border-slate-200/80 bg-white flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {editingCategoryId ? 'Kategori Düzenle' : 'Yeni Kategori'}
              </h3>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 inline-flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Kategori Adı</span>
                <div className="relative mt-1.5">
                  <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-700 outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Slug</span>
                <div className="relative mt-1.5">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={categoryForm.slug}
                    onChange={(event) => {
                      setSlugTouched(true)
                      setCategoryForm((current) => ({ ...current, slug: event.target.value }))
                    }}
                    placeholder="akaryakit"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-700 outline-none font-mono"
                  />
                </div>
              </label>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => void saveCategory()}
                  disabled={savingCategory}
                  className="h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingCategory ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {featureModalOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm p-3 md:p-5">
          <div className="mx-auto w-full max-w-[560px] rounded-[24px] border border-white/70 bg-[#f8fbff] shadow-[0_30px_44px_-26px_rgba(15,23,42,0.7)]">
            <div className="h-[72px] px-5 border-b border-slate-200/80 bg-white flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {editingFeatureId ? 'Özellik Düzenle' : 'Yeni Özellik'}
              </h3>
              <button
                type="button"
                onClick={() => setFeatureModalOpen(false)}
                className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 inline-flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Özellik Adı</span>
                <div className="relative mt-1.5">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={featureForm.name}
                    onChange={(event) => setFeatureForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Örn: 24 Saat Açık"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-700 outline-none"
                  />
                </div>
              </label>

              <div>
                <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Özellik Tipi</span>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFeatureForm((current) => ({ ...current, target: 'global' }))}
                    className={`h-10 rounded-xl border text-sm font-semibold ${
                      featureForm.target === 'global'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Global
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
                    className={`h-10 rounded-xl border text-sm font-semibold disabled:opacity-60 ${
                      featureForm.target === 'category'
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Kategoriye Bağlı
                  </button>
                </div>
              </div>

              {featureForm.target === 'category' ? (
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Kategori</span>
                  <select
                    value={featureForm.categoryId}
                    onChange={(event) =>
                      setFeatureForm((current) => ({
                        ...current,
                        categoryId: event.target.value,
                      }))
                    }
                    className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                  >
                    <option value="">Kategori seçin</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFeatureModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => void saveFeature()}
                  disabled={savingFeature}
                  className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-emerald-700 disabled:opacity-60"
                >
                  {savingFeature ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
