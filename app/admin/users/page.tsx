'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Save,
  Search,
  Shield,
  User,
  UserCircle2,
  X,
} from 'lucide-react'

type GenericRow = Record<string, unknown>

type UserRow = {
  raw: GenericRow
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  role: string | null
  status: string | null
  created_at: string | null
}

type UserFormState = {
  full_name: string
  role: string
  status: string
}

type SortValue = 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc'
type DetailTab = 'profil' | 'yetki' | 'ham'

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

function buildUserRow(raw: GenericRow): UserRow {
  return {
    raw,
    id: String(raw.id || ''),
    full_name: typeof raw.full_name === 'string' ? raw.full_name : null,
    email: typeof raw.email === 'string' ? raw.email : null,
    avatar_url: typeof raw.avatar_url === 'string' ? raw.avatar_url : null,
    role: typeof raw.role === 'string' ? raw.role : null,
    status: typeof raw.status === 'string' ? raw.status : null,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : null,
  }
}

function roleLabel(value: string | null): string {
  const role = normalizeText(value || '')
  if (role === 'admin') return 'Admin'
  if (role === 'isletmeci') return 'İşletmeci'
  if (role === 'pending_business') return 'Onay Bekleyen'
  return 'Kullanıcı'
}

function roleTone(value: string | null): string {
  const role = normalizeText(value || '')
  if (role === 'admin') return 'bg-purple-50 border-purple-200 text-purple-700'
  if (role === 'isletmeci') return 'bg-blue-50 border-blue-200 text-blue-700'
  if (role === 'pending_business') return 'bg-amber-50 border-amber-200 text-amber-700'
  return 'bg-slate-100 border-slate-200 text-slate-600'
}

function statusLabel(value: string | null): string {
  const status = normalizeText(value || '')
  if (status === 'banned') return 'Yasaklı'
  return 'Aktif'
}

function statusTone(value: string | null): string {
  const status = normalizeText(value || '')
  if (status === 'banned') return 'bg-rose-50 border-rose-200 text-rose-700'
  return 'bg-emerald-50 border-emerald-200 text-emerald-700'
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

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
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
        <div className="mt-2 rounded-xl border border-slate-200/80 max-h-[420px] overflow-y-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-200/70">
              {entries.map((entry) => (
                <tr key={entry.key}>
                  <td className="w-[35%] px-3 py-2 text-[11px] font-semibold text-slate-500 align-top">{entry.key}</td>
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

export default function AdminUsersPage() {
  const router = useRouter()
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
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const [users, setUsers] = useState<UserRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    admin: 0,
    merchant: 0,
    pendingBusiness: 0,
    standard: 0,
    banned: 0,
  })

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [jumpPage, setJumpPage] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all')
  const [sort, setSort] = useState<SortValue>('created_desc')

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [bulkRole, setBulkRole] = useState('user')
  const [bulkStatus, setBulkStatus] = useState<'active' | 'banned'>('active')

  const [detail, setDetail] = useState<UserRow | null>(null)
  const [form, setForm] = useState<UserFormState | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>('profil')

  const fetchStats = async () => {
    const [total, admin, merchant, pendingBusiness, standard, banned] = await Promise.all([
      safeCount(supabase.from('profiles').select('id', { head: true, count: 'exact' })),
      safeCount(supabase.from('profiles').select('id', { head: true, count: 'exact' }).eq('role', 'admin')),
      safeCount(supabase.from('profiles').select('id', { head: true, count: 'exact' }).eq('role', 'isletmeci')),
      safeCount(supabase.from('profiles').select('id', { head: true, count: 'exact' }).eq('role', 'pending_business')),
      safeCount(supabase.from('profiles').select('id', { head: true, count: 'exact' }).eq('role', 'user')),
      safeCount(supabase.from('profiles').select('id', { head: true, count: 'exact' }).eq('status', 'banned')),
    ])

    setStats({ total, admin, merchant, pendingBusiness, standard, banned })
  }

  const buildSort = (): { column: string; asc: boolean } => {
    if (sort === 'created_asc') return { column: 'created_at', asc: true }
    if (sort === 'name_asc') return { column: 'full_name', asc: true }
    if (sort === 'name_desc') return { column: 'full_name', asc: false }
    return { column: 'created_at', asc: false }
  }

  const fetchUsers = async (soft = false) => {
    if (soft) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    let query = supabase.from('profiles').select('*', { count: 'exact' })

    const q = searchApplied.trim()
    if (q) {
      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    }

    if (roleFilter !== 'all') {
      query = query.eq('role', roleFilter)
    }

    if (statusFilter === 'active') {
      query = query.or('status.is.null,status.eq.active')
    } else if (statusFilter === 'banned') {
      query = query.eq('status', 'banned')
    }

    const sortConfig = buildSort()
    query = query.order(sortConfig.column, { ascending: sortConfig.asc })

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      setUsers([])
      setTotalCount(0)
      setLoading(false)
      setRefreshing(false)
      return
    }

    const nextCount = count || 0
    const totalPages = Math.max(1, Math.ceil(nextCount / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
      setLoading(false)
      setRefreshing(false)
      return
    }

    const mapped = ((data || []) as GenericRow[]).map(buildUserRow)

    setUsers(mapped)
    setTotalCount(nextCount)
    setLoading(false)
    setRefreshing(false)
  }

  const openDetail = async (user: UserRow) => {
    setDetailLoading(true)
    setActiveTab('profil')

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    const fullUser = data ? buildUserRow(data as GenericRow) : user

    setDetail(fullUser)
    setForm({
      full_name: fullUser.full_name || '',
      role: fullUser.role || 'user',
      status: fullUser.status || 'active',
    })
    setDetailLoading(false)
  }

  const saveDetail = async () => {
    if (!detail || !form) return
    setSaving(true)

    const payload = {
      full_name: form.full_name.trim() || null,
      role: form.role,
      status: form.status,
    }

    const res = await supabase.from('profiles').update(payload).eq('id', detail.id)

    if (res.error) {
      window.alert(`Kaydedilemedi: ${res.error.message}`)
      setSaving(false)
      return
    }

    const mergedRaw = { ...detail.raw, ...payload, id: detail.id }
    const mergedUser = buildUserRow(mergedRaw)

    setUsers((current) => current.map((user) => (user.id === detail.id ? mergedUser : user)))
    setDetail(mergedUser)

    await fetchStats()
    setSaving(false)
  }

  const sendMessage = (userId: string) => {
    router.push(`/admin/messages?compose=true&uid=${userId}`)
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    )
  }

  const toggleSelectCurrentPage = () => {
    const pageIds = users.map((user) => user.id).filter((id) => id.length > 0)
    if (pageIds.length === 0) return

    setSelectedUserIds((current) => {
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

  const applyBulkRole = async () => {
    const ids = Array.from(new Set(selectedUserIds)).filter((id) => id.length > 0)
    if (ids.length === 0 || bulkProcessing) return

    const confirmed = window.confirm(`${ids.length} kullanıcının rolü "${bulkRole}" olarak güncellensin mi?`)
    if (!confirmed) return

    setBulkProcessing(true)

    try {
      for (const chunk of chunkArray(ids, 250)) {
        const res = await supabase.from('profiles').update({ role: bulkRole }).in('id', chunk)
        if (res.error) throw new Error(res.error.message)
      }

      if (detail && form && ids.includes(detail.id)) {
        setForm({ ...form, role: bulkRole })
        setDetail(buildUserRow({ ...detail.raw, role: bulkRole, id: detail.id }))
      }

      await Promise.all([fetchUsers(true), fetchStats()])
      setSelectedUserIds([])
      window.alert(`Toplu rol güncellemesi tamamlandı. (${ids.length} kullanıcı)`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Toplu rol güncellemesi başarısız.'
      window.alert(message)
    } finally {
      setBulkProcessing(false)
    }
  }

  const applyBulkStatus = async () => {
    const ids = Array.from(new Set(selectedUserIds)).filter((id) => id.length > 0)
    if (ids.length === 0 || bulkProcessing) return

    const confirmed = window.confirm(`${ids.length} kullanıcının durumu "${bulkStatus}" olarak güncellensin mi?`)
    if (!confirmed) return

    setBulkProcessing(true)

    try {
      for (const chunk of chunkArray(ids, 250)) {
        const res = await supabase.from('profiles').update({ status: bulkStatus }).in('id', chunk)
        if (res.error) throw new Error(res.error.message)
      }

      if (detail && form && ids.includes(detail.id)) {
        setForm({ ...form, status: bulkStatus })
        setDetail(buildUserRow({ ...detail.raw, status: bulkStatus, id: detail.id }))
      }

      await Promise.all([fetchUsers(true), fetchStats()])
      setSelectedUserIds([])
      window.alert(`Toplu durum güncellemesi tamamlandı. (${ids.length} kullanıcı)`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Toplu durum güncellemesi başarısız.'
      window.alert(message)
    } finally {
      setBulkProcessing(false)
    }
  }

  const quickToggleBan = async (user: UserRow) => {
    if (bulkProcessing || saving) return

    const nextStatus = normalizeText(user.status || '') === 'banned' ? 'active' : 'banned'
    const confirmed = window.confirm(
      nextStatus === 'banned'
        ? `${user.full_name || user.email || 'Kullanıcı'} hesabı yasaklansın mı?`
        : `${user.full_name || user.email || 'Kullanıcı'} yasağı kaldırılsın mı?`
    )

    if (!confirmed) return

    const res = await supabase.from('profiles').update({ status: nextStatus }).eq('id', user.id)
    if (res.error) {
      window.alert(`İşlem başarısız: ${res.error.message}`)
      return
    }

    setUsers((current) =>
      current.map((item) => (item.id === user.id ? buildUserRow({ ...item.raw, status: nextStatus, id: item.id }) : item))
    )

    if (detail && form && detail.id === user.id) {
      setForm({ ...form, status: nextStatus })
      setDetail(buildUserRow({ ...detail.raw, status: nextStatus, id: detail.id }))
    }

    await fetchStats()
  }

  useEffect(() => {
    void fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void fetchUsers(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, roleFilter, statusFilter, sort, searchApplied])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(page, totalPages)
  const windowStart = Math.floor((safePage - 1) / PAGE_WINDOW) * PAGE_WINDOW + 1
  const windowEnd = Math.min(totalPages, windowStart + PAGE_WINDOW - 1)
  const pageNumbers = Array.from({ length: windowEnd - windowStart + 1 }, (_, idx) => windowStart + idx)

  const selectedUserIdSet = new Set(selectedUserIds)
  const currentPageUserIds = users.map((user) => user.id).filter((id) => id.length > 0)
  const currentPageSelectedCount = currentPageUserIds.filter((id) => selectedUserIdSet.has(id)).length
  const isCurrentPageAllSelected =
    currentPageUserIds.length > 0 && currentPageSelectedCount === currentPageUserIds.length

  return (
    <div className="h-full flex flex-col gap-4 text-slate-700">
      <section className={`${panelCardClass} p-4 md:p-5`}>
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Kullanıcı Operasyon Merkezi</h1>
            <p className="mt-1 text-sm text-slate-500">
              Yüksek hacimli kullanıcı havuzu için filtre, yetki, güvenlik ve iletişim akışlarını tek panelden yönetin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void fetchStats()
              void fetchUsers(true)
            }}
            disabled={refreshing}
            className="h-11 px-4 rounded-xl border border-slate-200/80 bg-white text-sm font-semibold text-slate-700 inline-flex items-center gap-2 disabled:opacity-60"
          >
            {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Yenile
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">Toplam</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-purple-200/80 bg-purple-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-purple-700">Admin</p>
            <p className="mt-1 text-xl font-bold text-purple-900">{stats.admin}</p>
          </div>
          <div className="rounded-xl border border-blue-200/80 bg-blue-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-blue-700">İşletmeci</p>
            <p className="mt-1 text-xl font-bold text-blue-900">{stats.merchant}</p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-amber-700">Onay Bekleyen</p>
            <p className="mt-1 text-xl font-bold text-amber-900">{stats.pendingBusiness}</p>
          </div>
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-emerald-700">Kullanıcı</p>
            <p className="mt-1 text-xl font-bold text-emerald-900">{stats.standard}</p>
          </div>
          <div className="rounded-xl border border-rose-200/80 bg-rose-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-rose-700">Yasaklı</p>
            <p className="mt-1 text-xl font-bold text-rose-900">{stats.banned}</p>
          </div>
        </div>
      </section>

      <section className={`${panelCardClass} p-3 md:p-4`}>
        <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_repeat(4,minmax(0,1fr))] gap-2.5">
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
                  placeholder="Ad soyad veya e-posta"
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
            <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Rol</span>
            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value)
                setPage(1)
              }}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
            >
              <option value="all">Tümü</option>
              <option value="user">Kullanıcı</option>
              <option value="pending_business">Onay Bekleyen</option>
              <option value="isletmeci">İşletmeci</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Durum</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | 'active' | 'banned')
                setPage(1)
              }}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
            >
              <option value="all">Tümü</option>
              <option value="active">Aktif</option>
              <option value="banned">Yasaklı</option>
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
              <option value="name_asc">Ad A → Z</option>
              <option value="name_desc">Ad Z → A</option>
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
              Seçili kullanıcı: <span className="text-slate-900">{selectedUserIds.length}</span> • Bu sayfa: {currentPageSelectedCount}/
              {currentPageUserIds.length}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={toggleSelectCurrentPage}
                disabled={loading || users.length === 0 || bulkProcessing}
                className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                {isCurrentPageAllSelected ? 'Sayfayı Bırak' : 'Sayfayı Seç'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedUserIds([])}
                disabled={selectedUserIds.length === 0 || bulkProcessing}
                className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Seçimi Temizle
              </button>

              <select
                value={bulkRole}
                onChange={(event) => setBulkRole(event.target.value)}
                disabled={bulkProcessing}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none disabled:opacity-50"
              >
                <option value="user">user</option>
                <option value="pending_business">pending_business</option>
                <option value="isletmeci">isletmeci</option>
                <option value="admin">admin</option>
              </select>
              <button
                type="button"
                onClick={() => void applyBulkRole()}
                disabled={selectedUserIds.length === 0 || bulkProcessing || saving}
                className="h-9 px-3 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {bulkProcessing ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
                Rol Uygula
              </button>

              <select
                value={bulkStatus}
                onChange={(event) => setBulkStatus(event.target.value as 'active' | 'banned')}
                disabled={bulkProcessing}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none disabled:opacity-50"
              >
                <option value="active">active</option>
                <option value="banned">banned</option>
              </select>
              <button
                type="button"
                onClick={() => void applyBulkStatus()}
                disabled={selectedUserIds.length === 0 || bulkProcessing || saving}
                className="h-9 px-3 rounded-lg border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-700 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {bulkProcessing ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                Durum Uygula
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200/80">
                <tr className="text-[11px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
                  <th className="w-12 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={isCurrentPageAllSelected}
                      onChange={toggleSelectCurrentPage}
                      disabled={loading || users.length === 0 || bulkProcessing}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      aria-label="Bu sayfadaki kullanıcıları seç"
                    />
                  </th>
                  <th className="px-3 py-3">Kullanıcı</th>
                  <th className="px-3 py-3">Rol</th>
                  <th className="px-3 py-3">Durum</th>
                  <th className="px-3 py-3">Kayıt</th>
                  <th className="px-3 py-3 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <Loader2 className="w-7 h-7 animate-spin text-blue-500 mx-auto" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm text-slate-500 font-semibold">
                      Filtrelere uygun kullanıcı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const selected = selectedUserIdSet.has(user.id)
                    const isBanned = normalizeText(user.status || '') === 'banned'

                    return (
                      <tr key={user.id} className={`${selected ? 'bg-blue-50/50' : ''} hover:bg-slate-50/80`}>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleUserSelection(user.id)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                            aria-label={`${user.full_name || 'Kullanıcı'} seç`}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-slate-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{user.full_name || 'İsimsiz kullanıcı'}</p>
                              <p className="text-xs text-slate-500 truncate">{user.email || '-'}</p>
                              <p className="text-[11px] text-slate-500 font-mono truncate">{user.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${roleTone(user.role)}`}>
                            {roleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${statusTone(user.status)}`}>
                            {statusLabel(user.status)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold text-slate-600">{formatDate(user.created_at)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => sendMessage(user.id)}
                              disabled={bulkProcessing || saving}
                              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <MessageSquare size={13} />
                              Mesaj
                            </button>
                            <button
                              type="button"
                              onClick={() => void quickToggleBan(user)}
                              disabled={bulkProcessing || saving}
                              className={`h-9 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 ${
                                isBanned
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-rose-200 bg-rose-50 text-rose-700'
                              }`}
                            >
                              {isBanned ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                              {isBanned ? 'Yasağı Kaldır' : 'Yasakla'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void openDetail(user)}
                              disabled={bulkProcessing || saving}
                              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Eye size={13} />
                              İncele
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
              Filtre sonucu {totalCount} kayıt • Sayfa {safePage}/{totalPages}
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
          <div className="mx-auto w-full max-w-[1120px] h-full max-h-[92vh] rounded-[24px] border border-white/70 bg-[#f8fbff] shadow-[0_30px_44px_-26px_rgba(15,23,42,0.7)] flex flex-col overflow-hidden">
            <div className="h-[78px] px-4 md:px-6 border-b border-slate-200/80 bg-white flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                  {detail.avatar_url ? (
                    <img src={detail.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle2 className="w-6 h-6 text-slate-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Kullanıcı Detayı</p>
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{form.full_name || detail.email || 'İsimsiz kullanıcı'}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => sendMessage(detail.id)}
                  className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5"
                >
                  <MessageSquare size={14} />
                  Mesaj
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
                ['profil', 'Profil'],
                ['yetki', 'Yetki & Güvenlik'],
                ['ham', 'Ham Veri'],
              ] as Array<[DetailTab, string]>).map(([value, label]) => (
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
                <>
                  {activeTab === 'profil' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
                      <div className={`${panelCardClass} p-4`}>
                        <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Profil Bilgileri</p>

                        <label className="block mt-3">
                          <span className="text-[11px] text-slate-500 font-semibold">Ad Soyad</span>
                          <input
                            value={form.full_name}
                            onChange={(event) => setForm((current) => (current ? { ...current, full_name: event.target.value } : current))}
                            className="mt-1.5 w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                          />
                        </label>

                        <label className="block mt-3">
                          <span className="text-[11px] text-slate-500 font-semibold">E-posta</span>
                          <div className="mt-1.5 h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 inline-flex items-center w-full">
                            <Mail className="w-4 h-4 text-slate-400 mr-2" />
                            {detail.email || '-'}
                          </div>
                        </label>

                        <label className="block mt-3">
                          <span className="text-[11px] text-slate-500 font-semibold">Kullanıcı ID</span>
                          <div className="mt-1.5 h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 inline-flex items-center w-full font-mono truncate">
                            {detail.id}
                          </div>
                        </label>

                        <label className="block mt-3">
                          <span className="text-[11px] text-slate-500 font-semibold">Avatar URL</span>
                          <div className="mt-1.5 h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 inline-flex items-center w-full truncate">
                            {detail.avatar_url || '-'}
                          </div>
                        </label>
                      </div>

                      <div className="space-y-3">
                        <div className={`${panelCardClass} p-4`}>
                          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Hesap Durumu</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border ${roleTone(form.role)}`}>
                              {roleLabel(form.role)}
                            </span>
                            <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border ${statusTone(form.status)}`}>
                              {statusLabel(form.status)}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">Kayıt: {formatDateTime(detail.created_at)}</p>
                        </div>

                        <div className={`${panelCardClass} p-4`}>
                          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Hızlı Aksiyon</p>
                          <div className="mt-2 grid grid-cols-1 gap-2">
                            <button
                              type="button"
                              onClick={() => sendMessage(detail.id)}
                              className="h-10 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 inline-flex items-center justify-center gap-2"
                            >
                              <MessageSquare size={14} />
                              Mesaj Gönder
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        status: normalizeText(current.status) === 'banned' ? 'active' : 'banned',
                                      }
                                    : current
                                )
                              }
                              className={`h-10 rounded-lg border text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                                normalizeText(form.status) === 'banned'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-rose-200 bg-rose-50 text-rose-700'
                              }`}
                            >
                              {normalizeText(form.status) === 'banned' ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                              {normalizeText(form.status) === 'banned' ? 'Yasağı Kaldır' : 'Yasakla'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === 'yetki' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className={`${panelCardClass} p-4`}>
                        <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Rol Seçimi</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {['user', 'pending_business', 'isletmeci', 'admin'].map((role) => {
                            const selected = form.role === role
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() => setForm((current) => (current ? { ...current, role } : current))}
                                className={`h-10 rounded-lg border text-xs font-semibold ${
                                  selected
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                {role}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className={`${panelCardClass} p-4`}>
                        <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500">Durum</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {['active', 'banned'].map((status) => {
                            const selected = form.status === status
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => setForm((current) => (current ? { ...current, status } : current))}
                                className={`h-10 rounded-lg border text-xs font-semibold ${
                                  selected
                                    ? status === 'banned'
                                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                {status}
                              </button>
                            )
                          })}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Değişiklikler sadece <strong>Kaydet</strong> ile kalıcı olur.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === 'ham' ? <RawTable title="Kullanıcı Ham Alanları" data={detail.raw} /> : null}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
