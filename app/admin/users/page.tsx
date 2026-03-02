'use client'

import { ModuleTitle } from '../../merchant/_components/module-title'
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
  if (role === 'admin') return 'bg-indigo-950/30 border-indigo-900/50 text-indigo-400'
  if (role === 'isletmeci') return 'bg-[#153445]/30 border-[#226785] text-[#38bdf8]'
  if (role === 'pending_business') return 'bg-amber-950/30 border-amber-900/50 text-amber-400'
  return 'bg-[#16181d] border-[#2d313a] text-[#64748b]'
}

function statusLabel(value: string | null): string {
  const status = normalizeText(value || '')
  if (status === 'banned') return 'Yasaklı'
  return 'Aktif'
}

function statusTone(value: string | null): string {
  const status = normalizeText(value || '')
  if (status === 'banned') return 'bg-rose-950/30 border-rose-900/50 text-rose-400'
  return 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400'
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
    <HardwarePanel className="p-5">
      <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">{title}</p>
      {entries.length === 0 ? (
        <p className="text-[10px] text-[#64748b] font-mono mt-4 uppercase tracking-widest">Kayıt yok.</p>
      ) : (
        <div className="mt-4 rounded border border-[#2d313a] bg-[#101419] max-h-[420px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <tbody className="divide-y divide-[#1e232b]">
              {entries.map((entry) => (
                <tr key={entry.key} className="hover:bg-[#16181d] transition-colors">
                  <td className="w-[35%] px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b] border-r border-[#1e232b] align-top">{entry.key}</td>
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
    <div className="h-full flex flex-col gap-4 text-[#e2e8f0]">
      <HardwarePanel className="p-5 md:p-6 border-b border-[#2d313a]">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <ModuleTitle title="Kullanıcı Operasyon Merkezi" />
            <p className="mt-2 text-[10px] font-mono tracking-widest uppercase text-[#64748b]">
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
            className="h-11 px-4 rounded bg-[#16181d] border border-[#2d313a] text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0] inline-flex items-center gap-2 disabled:opacity-50 hover:bg-[#1a1d24] transition-colors"
          >
            {refreshing ? <Loader2 size={14} className="animate-spin text-[#38bdf8]" /> : <RefreshCw size={14} />}
            Yenile
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Toplam</p>
            <p className="mt-1 text-xl font-mono text-[#e2e8f0]">{stats.total}</p>
          </div>
          <div className="rounded border border-indigo-900/50 bg-indigo-950/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-indigo-500/0 group-hover:bg-indigo-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-indigo-400/80">Admin</p>
            <p className="mt-1 text-xl font-mono text-indigo-400">{stats.admin}</p>
          </div>
          <div className="rounded border border-[#226785] bg-[#153445]/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-[#38bdf8]/80">İşletmeci</p>
            <p className="mt-1 text-xl font-mono text-[#38bdf8]">{stats.merchant}</p>
          </div>
          <div className="rounded border border-amber-900/50 bg-amber-950/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-amber-500/0 group-hover:bg-amber-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-amber-500/80">Onay Bekleyen</p>
            <p className="mt-1 text-xl font-mono text-amber-400">{stats.pendingBusiness}</p>
          </div>
          <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Kullanıcı</p>
            <p className="mt-1 text-xl font-mono text-[#e2e8f0]">{stats.standard}</p>
          </div>
          <div className="rounded border border-rose-900/50 bg-rose-950/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-rose-500/0 group-hover:bg-rose-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-rose-500/80">Yasaklı</p>
            <p className="mt-1 text-xl font-mono text-rose-400">{stats.banned}</p>
          </div>
        </div>
      </HardwarePanel>

      <HardwarePanel className="p-4 md:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_repeat(4,minmax(0,1fr))] gap-4">
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
                  placeholder="Ad soyad veya e-posta"
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
            <span className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">Rol</span>
            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value)
                setPage(1)
              }}
              className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
            >
              <option value="all">TÜMÜ</option>
              <option value="user">KULLANICI</option>
              <option value="pending_business">ONAY BEKLEYEN</option>
              <option value="isletmeci">İŞLETMECİ</option>
              <option value="admin">ADMİN</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">Durum</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | 'active' | 'banned')
                setPage(1)
              }}
              className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
            >
              <option value="all">TÜMÜ</option>
              <option value="active">AKTİF</option>
              <option value="banned">YASAKLI</option>
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
            SEÇİLİ KULLANICI: <span className="text-[#e2e8f0]">{selectedUserIds.length}</span> • BU SAYFA: {currentPageSelectedCount}/
            {currentPageUserIds.length}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectCurrentPage}
              disabled={loading || users.length === 0 || bulkProcessing}
              className="h-9 px-4 rounded border border-[#2d313a] bg-[#16181d] text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0] hover:bg-[#1a1d24] disabled:opacity-50 transition-colors"
            >
              {isCurrentPageAllSelected ? 'SAYFAYI BIRAK' : 'SAYFAYI SEÇ'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedUserIds([])}
              disabled={selectedUserIds.length === 0 || bulkProcessing}
              className="h-9 px-4 rounded border border-[#2d313a] bg-[#16181d] text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0] hover:bg-[#1a1d24] disabled:opacity-50 transition-colors"
            >
              SEÇİMİ TEMİZLE
            </button>

            <select
              value={bulkRole}
              onChange={(event) => setBulkRole(event.target.value)}
              disabled={bulkProcessing}
              className="h-9 rounded border border-[#2d313a] bg-[#0a0c10] px-3 text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0] outline-none disabled:opacity-50 appearance-none"
            >
              <option value="user">USER</option>
              <option value="pending_business">PENDING_BUSINESS</option>
              <option value="isletmeci">ISLETMECI</option>
              <option value="admin">ADMIN</option>
            </select>
            <button
              type="button"
              onClick={() => void applyBulkRole()}
              disabled={selectedUserIds.length === 0 || bulkProcessing || saving}
              className="h-9 px-4 rounded border border-[#226785] bg-[#153445] text-[#38bdf8] text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2 hover:brightness-110 disabled:opacity-50 transition-colors"
            >
              {bulkProcessing ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              ROL UYGULA
            </button>

            <select
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value as 'active' | 'banned')}
              disabled={bulkProcessing}
              className="h-9 rounded border border-[#2d313a] bg-[#0a0c10] px-3 text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0] outline-none disabled:opacity-50 appearance-none"
            >
              <option value="active">ACTIVE</option>
              <option value="banned">BANNED</option>
            </select>
            <button
              type="button"
              onClick={() => void applyBulkStatus()}
              disabled={selectedUserIds.length === 0 || bulkProcessing || saving}
              className="h-9 px-4 rounded border border-amber-900/50 bg-amber-950/20 text-amber-400 text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2 hover:bg-amber-900/40 disabled:opacity-50 transition-colors"
            >
              {bulkProcessing ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
              DURUM UYGULA
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
                    disabled={loading || users.length === 0 || bulkProcessing}
                    className="h-4 w-4 rounded border-[#2d313a] bg-[#0a0c10] accent-[#38bdf8]"
                    aria-label="Bu sayfadaki kullanıcıları seç"
                  />
                </th>
                <th className="px-4 py-3">Kullanıcı</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Kayıt</th>
                <th className="px-4 py-3 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e232b]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Loader2 className="w-7 h-7 animate-spin text-[#38bdf8] mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                    FİLTRELERE UYGUN KULLANICI BULUNAMADI.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const selected = selectedUserIdSet.has(user.id)
                  const isBanned = normalizeText(user.status || '') === 'banned'

                  return (
                    <tr key={user.id} className={`${selected ? 'bg-[#153445]/20' : ''} hover:bg-[#1a1d24] transition-colors`}>
                      <td className="px-4 py-4 align-top">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleUserSelection(user.id)}
                          className="h-4 w-4 rounded border-[#2d313a] bg-[#0a0c10] accent-[#38bdf8]"
                          aria-label={`${user.full_name || 'Kullanıcı'} seç`}
                        />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded border border-[#2d313a] bg-[#16181d] overflow-hidden flex items-center justify-center shrink-0">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" className="w-full h-full object-cover mix-blend-lighten opacity-80" />
                            ) : (
                              <User className="w-4 h-4 text-[#475569]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[#e2e8f0] uppercase tracking-wide truncate">{user.full_name || 'İSİMSİZ KULLANICI'}</p>
                            <p className="mt-0.5 text-[10px] font-mono text-[#cbd5e1] truncate">{user.email || '-'}</p>
                            <p className="mt-1.5 text-[9px] text-[#64748b] font-mono truncate">ID: {user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest border ${roleTone(user.role)}`}>
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest border ${statusTone(user.status)}`}>
                          {statusLabel(user.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-[10px] font-mono text-[#64748b] tracking-widest">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => sendMessage(user.id)}
                            disabled={bulkProcessing || saving}
                            className="h-9 px-3 rounded border border-[#2d313a] bg-[#16181d] text-[#e2e8f0] text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2 hover:bg-[#1a1d24] disabled:opacity-50 transition-colors"
                          >
                            <MessageSquare size={14} className="text-[#38bdf8]" />
                            MESAJ
                          </button>
                          <button
                            type="button"
                            onClick={() => void quickToggleBan(user)}
                            disabled={bulkProcessing || saving}
                            className={`h-9 px-3 rounded border text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-50 transition-colors ${
                              isBanned
                                ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/40'
                                : 'border-rose-900/50 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40'
                            }`}
                          >
                            {isBanned ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                            {isBanned ? 'YASAĞI KALDIR' : 'YASAKLA'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void openDetail(user)}
                            disabled={bulkProcessing || saving}
                            className="h-9 px-3 rounded border border-[#2d313a] bg-[#16181d] text-[#e2e8f0] text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2 hover:bg-[#1a1d24] disabled:opacity-50 transition-colors"
                          >
                            <Eye size={14} className="text-[#94a3b8]" />
                            İNCELE
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
              <div className="min-w-0 flex items-center gap-4">
                <div className="w-12 h-12 rounded border border-[#2d313a] bg-[#16181d] overflow-hidden flex items-center justify-center shrink-0">
                  {detail.avatar_url ? (
                    <img src={detail.avatar_url} alt="" className="w-full h-full object-cover mix-blend-lighten opacity-80" />
                  ) : (
                    <UserCircle2 className="w-6 h-6 text-[#475569]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest font-mono text-[#64748b]">Kullanıcı Detayı</p>
                  <h3 className="mt-1 text-[16px] font-medium text-[#e2e8f0] uppercase tracking-wide truncate">{form.full_name || detail.email || 'İSİMSİZ KULLANICI'}</h3>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => sendMessage(detail.id)}
                  className="h-10 px-4 rounded border border-[#2d313a] bg-[#16181d] text-[#e2e8f0] text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2 hover:bg-[#1a1d24] transition-colors"
                >
                  <MessageSquare size={14} className="text-[#38bdf8]" />
                  MESAJ
                </button>
                <button
                  type="button"
                  onClick={() => void saveDetail()}
                  disabled={saving}
                  className="h-10 px-5 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] text-[11px] font-mono uppercase tracking-widest border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 disabled:opacity-50 inline-flex items-center gap-2 transition-all"
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
                ['profil', 'PROFİL'],
                ['yetki', 'YETKİ & GÜVENLİK'],
                ['ham', 'HAM VERİ'],
              ] as Array<[DetailTab, string]>).map(([value, label]) => (
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
                  {activeTab === 'profil' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
                      <HardwarePanel className="p-5">
                        <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Profil Bilgileri</p>

                        <label className="block mt-4">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Ad Soyad</span>
                          <input
                            value={form.full_name}
                            onChange={(event) => setForm((current) => (current ? { ...current, full_name: event.target.value } : current))}
                            className="mt-2 w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-4 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50"
                          />
                        </label>

                        <div className="block mt-4">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">E-posta</span>
                          <div className="mt-2 h-11 rounded border border-[#2d313a] bg-[#101419] px-4 text-[12px] font-mono text-[#cbd5e1] inline-flex items-center w-full">
                            <Mail className="w-4 h-4 text-[#475569] mr-2" />
                            {detail.email || '-'}
                          </div>
                        </div>

                        <div className="block mt-4">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Kullanıcı ID</span>
                          <div className="mt-2 h-11 rounded border border-[#2d313a] bg-[#101419] px-4 text-[12px] font-mono text-[#cbd5e1] inline-flex items-center w-full truncate">
                            {detail.id}
                          </div>
                        </div>

                        <div className="block mt-4">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Avatar URL</span>
                          <div className="mt-2 h-11 rounded border border-[#2d313a] bg-[#101419] px-4 text-[12px] font-mono text-[#cbd5e1] inline-flex items-center w-full truncate">
                            {detail.avatar_url || '-'}
                          </div>
                        </div>
                      </HardwarePanel>

                      <div className="space-y-5">
                        <HardwarePanel className="p-5">
                          <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Hesap Durumu</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className={`inline-flex px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-widest border ${roleTone(form.role)}`}>
                              {roleLabel(form.role)}
                            </span>
                            <span className={`inline-flex px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-widest border ${statusTone(form.status)}`}>
                              {statusLabel(form.status)}
                            </span>
                          </div>
                          <p className="mt-4 text-[9px] font-mono uppercase tracking-widest text-[#64748b]">
                            KAYIT: {formatDateTime(detail.created_at)}
                          </p>
                        </HardwarePanel>

                        <HardwarePanel className="p-5">
                          <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Hızlı Aksiyon</p>
                          <div className="mt-4 grid grid-cols-1 gap-3">
                            <button
                              type="button"
                              onClick={() => sendMessage(detail.id)}
                              className="h-11 rounded border border-[#2d313a] bg-[#16181d] text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0] inline-flex items-center justify-center gap-2 hover:bg-[#1a1d24] transition-colors"
                            >
                              <MessageSquare size={14} className="text-[#38bdf8]" />
                              MESAJ GÖNDER
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
                              className={`h-11 rounded border text-[10px] font-mono uppercase tracking-widest inline-flex items-center justify-center gap-2 transition-colors ${
                                normalizeText(form.status) === 'banned'
                                  ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/40'
                                  : 'border-rose-900/50 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40'
                              }`}
                            >
                              {normalizeText(form.status) === 'banned' ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                              {normalizeText(form.status) === 'banned' ? 'YASAĞI KALDIR' : 'YASAKLA'}
                            </button>
                          </div>
                        </HardwarePanel>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === 'yetki' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <HardwarePanel className="p-5">
                        <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Rol Seçimi</p>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          {['user', 'pending_business', 'isletmeci', 'admin'].map((role) => {
                            const selected = form.role === role
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() => setForm((current) => (current ? { ...current, role } : current))}
                                className={`h-11 rounded border text-[10px] font-mono uppercase tracking-widest transition-colors ${
                                  selected
                                    ? 'bg-[#153445] border-[#226785] text-[#38bdf8]'
                                    : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#e2e8f0]'
                                }`}
                              >
                                {role}
                              </button>
                            )
                          })}
                        </div>
                      </HardwarePanel>

                      <HardwarePanel className="p-5">
                        <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Durum</p>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          {['active', 'banned'].map((status) => {
                            const selected = form.status === status
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => setForm((current) => (current ? { ...current, status } : current))}
                                className={`h-11 rounded border text-[10px] font-mono uppercase tracking-widest transition-colors ${
                                  selected
                                    ? status === 'banned'
                                      ? 'bg-rose-950/30 border-rose-900/50 text-rose-400'
                                      : 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400'
                                    : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#e2e8f0]'
                                }`}
                              >
                                {status}
                              </button>
                            )
                          })}
                        </div>
                        <p className="mt-4 text-[9px] font-mono uppercase tracking-widest text-[#475569]">
                          DEĞİŞİKLİKLER SADECE &quot;KAYDET&quot; İLE KALICI OLUR.
                        </p>
                      </HardwarePanel>
                    </div>
                  ) : null}

                  {activeTab === 'ham' ? <RawTable title="Kullanıcı Ham Alanları" data={detail.raw} /> : null}
                </div>
              )}
            </div>
          </HardwarePanel>
        </div>
      ) : null}
    </div>
  )
}