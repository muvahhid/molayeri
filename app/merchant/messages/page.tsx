'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
  Loader2,
  Mail,
  Megaphone,
  RefreshCcw,
  Square,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { PanelTitle } from '../_components/panel-title'

const PAGE_SIZE = 15
const PAGE_WINDOW = 10
const ACTIVE_LIMIT = 150

type MessageTab = 'broadcast' | 'direct'
type MessageScope = 'active' | 'archive'

type MerchantMessage = {
  id: string
  subject: string | null
  content: string | null
  created_at: string
  sender_id: string | null
  recipient_id: string | null
  is_read: boolean | null
}

type MessageBucket = {
  active: MerchantMessage[]
  archive: MerchantMessage[]
  overflowCount: number
}

function toTs(value: string): number {
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function sortByDateDesc(a: MerchantMessage, b: MerchantMessage): number {
  return toTs(b.created_at) - toTs(a.created_at)
}

function splitMessageBucket(
  rows: MerchantMessage[],
  archivedIds: Set<string>,
  deletedIds: Set<string>
): MessageBucket {
  const sorted = [...rows].sort(sortByDateDesc)
  const visible = sorted.filter((item) => !deletedIds.has(item.id.toString()))
  const manualArchive = visible.filter((item) => archivedIds.has(item.id.toString()))
  const remaining = visible.filter((item) => !archivedIds.has(item.id.toString()))
  const overflowCount = Math.max(0, remaining.length - ACTIVE_LIMIT)
  return {
    active: remaining.slice(0, ACTIVE_LIMIT),
    archive: [...manualArchive, ...remaining.slice(ACTIVE_LIMIT)].sort(sortByDateDesc),
    overflowCount,
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

export default function MerchantMessagesPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<MessageTab>('broadcast')
  const [scope, setScope] = useState<MessageScope>('active')
  const [currentPage, setCurrentPage] = useState(1)

  const [broadcasts, setBroadcasts] = useState<MerchantMessage[]>([])
  const [directMessages, setDirectMessages] = useState<MerchantMessage[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)

  const [selectedMessage, setSelectedMessage] = useState<MerchantMessage | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [myReplies, setMyReplies] = useState<MerchantMessage[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set())
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [actionBusy, setActionBusy] = useState(false)

  const loadMessages = async () => {
    setLoading(true)
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) {
      setLoading(false)
      return
    }

    setUserId(user.id)
    const accountCreatedAt = user.created_at || new Date(0).toISOString()

    const [broadcastRes, directRes, readsRes] = await Promise.all([
      supabase
        .from('messages')
        .select('*')
        .is('recipient_id', null)
        .in('message_type', ['broadcast_all', 'broadcast_business'])
        .neq('sender_id', user.id)
        .gt('created_at', accountCreatedAt)
        .order('created_at', { ascending: false }),
      supabase
        .from('messages')
        .select('*')
        .eq('recipient_id', user.id)
        .eq('message_type', 'direct')
        .order('created_at', { ascending: false }),
      supabase.from('message_reads').select('message_id').eq('user_id', user.id),
    ])

    const readSet = new Set(
      (readsRes.data || []).map((row) => (row as { message_id: string }).message_id.toString())
    )

    for (const message of directRes.data || []) {
      const typed = message as MerchantMessage
      if (typed.is_read) {
        readSet.add(typed.id.toString())
      }
    }

    setBroadcasts((broadcastRes.data || []) as MerchantMessage[])
    setDirectMessages((directRes.data || []) as MerchantMessage[])
    setReadIds(readSet)
    setLoading(false)
  }

  useEffect(() => {
    if (!userId) {
      setArchivedIds(new Set())
      setDeletedIds(new Set())
      return
    }
    try {
      const raw = window.localStorage.getItem(`merchant-message-state:${userId}`)
      if (!raw) {
        setArchivedIds(new Set())
        setDeletedIds(new Set())
        return
      }
      const parsed = JSON.parse(raw) as { archivedIds?: string[]; deletedIds?: string[] }
      setArchivedIds(new Set(parsed.archivedIds || []))
      setDeletedIds(new Set(parsed.deletedIds || []))
    } catch {
      setArchivedIds(new Set())
      setDeletedIds(new Set())
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    try {
      window.localStorage.setItem(
        `merchant-message-state:${userId}`,
        JSON.stringify({
          archivedIds: Array.from(archivedIds),
          deletedIds: Array.from(deletedIds),
        })
      )
    } catch {}
  }, [userId, archivedIds, deletedIds])

  const markAsRead = async (message: MerchantMessage, isBroadcast: boolean) => {
    if (!userId || readIds.has(message.id)) {
      return
    }

    setReadIds((current) => new Set([...current, message.id]))

    await Promise.all([
      supabase.from('message_reads').insert({ user_id: userId, message_id: message.id }),
      !isBroadcast
        ? supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', message.id)
            .eq('recipient_id', userId)
        : Promise.resolve(),
    ])
  }

  const openMessage = async (message: MerchantMessage, isBroadcast: boolean) => {
    await markAsRead(message, isBroadcast)
    setSelectedMessage(message)
    setReplyText('')

    if (!isBroadcast && userId && message.sender_id) {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', userId)
        .eq('recipient_id', message.sender_id)
        .eq('message_type', 'direct')
        .order('created_at', { ascending: true })

      setMyReplies((data || []) as MerchantMessage[])
    } else {
      setMyReplies([])
    }
  }

  const sendReply = async () => {
    if (!selectedMessage || !userId || !replyText.trim()) {
      return
    }

    const recipientId = selectedMessage.sender_id || ''
    if (!recipientId) {
      setSendingReply(false)
      window.alert('Bu mesaja yanıt gönderilemiyor.')
      return
    }

    setSendingReply(true)

    const subject = selectedMessage.subject?.startsWith('Ynt:')
      ? selectedMessage.subject
      : `Ynt: ${selectedMessage.subject || 'Mesaj'}`

    const { error } = await supabase.from('messages').insert({
      sender_id: userId,
      recipient_id: recipientId,
      subject,
      content: replyText.trim(),
      message_type: 'direct',
    })

    if (!error) {
      setReplyText('')
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', userId)
        .eq('recipient_id', recipientId)
        .eq('message_type', 'direct')
        .order('created_at', { ascending: true })

      setMyReplies((data || []) as MerchantMessage[])
    }

    setSendingReply(false)
  }

  useEffect(() => {
    void loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const broadcastBucket = useMemo(
    () => splitMessageBucket(broadcasts, archivedIds, deletedIds),
    [broadcasts, archivedIds, deletedIds]
  )
  const directBucket = useMemo(
    () => splitMessageBucket(directMessages, archivedIds, deletedIds),
    [directMessages, archivedIds, deletedIds]
  )

  const currentBucket = tab === 'broadcast' ? broadcastBucket : directBucket
  const scopedList = scope === 'active' ? currentBucket.active : currentBucket.archive

  const totalPages = Math.max(1, Math.ceil(scopedList.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const listStart = (safePage - 1) * PAGE_SIZE
  const paginatedMessages = scopedList.slice(listStart, listStart + PAGE_SIZE)

  const windowStart = Math.floor((safePage - 1) / PAGE_WINDOW) * PAGE_WINDOW + 1
  const windowEnd = Math.min(totalPages, windowStart + PAGE_WINDOW - 1)
  const pageNumbers = Array.from({ length: windowEnd - windowStart + 1 }, (_, idx) => windowStart + idx)
  const scopedIdSet = useMemo(() => new Set(scopedList.map((item) => item.id.toString())), [scopedList])
  const selectedScopedIds = useMemo(
    () => Array.from(selectedIds).filter((id) => scopedIdSet.has(id)),
    [selectedIds, scopedIdSet]
  )
  const isAllPageSelected =
    paginatedMessages.length > 0 &&
    paginatedMessages.every((item) => selectedIds.has(item.id.toString()))

  const unreadBroadcast = useMemo(
    () => broadcastBucket.active.reduce((total, item) => total + (readIds.has(item.id.toString()) ? 0 : 1), 0),
    [broadcastBucket.active, readIds]
  )

  const unreadDirect = useMemo(
    () => directBucket.active.reduce((total, item) => total + (readIds.has(item.id.toString()) ? 0 : 1), 0),
    [directBucket.active, readIds]
  )

  const toggleSelectOne = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectPage = () => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (isAllPageSelected) {
        for (const item of paginatedMessages) {
          next.delete(item.id.toString())
        }
      } else {
        for (const item of paginatedMessages) {
          next.add(item.id.toString())
        }
      }
      return next
    })
  }

  const archiveSelected = (ids: string[]) => {
    if (ids.length === 0) return
    setArchivedIds((current) => new Set([...current, ...ids]))
    setSelectedIds((current) => {
      const next = new Set(current)
      for (const id of ids) next.delete(id)
      return next
    })
    if (selectedMessage && ids.includes(selectedMessage.id.toString())) {
      setSelectedMessage(null)
    }
  }

  const unarchiveSelected = (ids: string[]) => {
    if (ids.length === 0) return
    setArchivedIds((current) => {
      const next = new Set(current)
      for (const id of ids) next.delete(id)
      return next
    })
    setSelectedIds((current) => {
      const next = new Set(current)
      for (const id of ids) next.delete(id)
      return next
    })
  }

  const removePermanently = async (ids: string[]) => {
    if (!userId || ids.length === 0 || actionBusy) return
    const ok = window.confirm(`${ids.length} mesaj kalıcı olarak silinsin mi?`)
    if (!ok) return

    setActionBusy(true)
    try {
      const directDeletableIds = directMessages
        .filter((item) => item.recipient_id === userId && ids.includes(item.id.toString()))
        .map((item) => item.id.toString())

      if (directDeletableIds.length > 0) {
        await supabase
          .from('messages')
          .delete()
          .in('id', directDeletableIds)
          .eq('recipient_id', userId)
      }

      setDeletedIds((current) => new Set([...current, ...ids]))
      setArchivedIds((current) => {
        const next = new Set(current)
        for (const id of ids) next.delete(id)
        return next
      })
      setSelectedIds((current) => {
        const next = new Set(current)
        for (const id of ids) next.delete(id)
        return next
      })
      if (selectedMessage && ids.includes(selectedMessage.id.toString())) {
        setSelectedMessage(null)
      }

      if (directDeletableIds.length > 0) {
        await loadMessages()
      }
    } finally {
      setActionBusy(false)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds(new Set())
  }, [tab, scope])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const nextTenEnabled = windowEnd < totalPages
  const prevTenEnabled = windowStart > 1

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 border-b border-[#2d313a] pb-4">
        <div>
          <PanelTitle title="Mesaj Merkezi" />
          <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b] mt-2">
            15 mesaj/sayfa, aktif kutuda maksimum 150 mesaj tutulur.
          </p>
        </div>

        <button
          type="button"
          onClick={loadMessages}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-[#2d313a] bg-[#16181d] text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0] hover:bg-[#1a1d24] transition-colors"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HardwarePanel className="p-4 flex flex-col items-start group">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-amber-500/0 group-hover:bg-amber-500/50 transition-colors" />
          <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b]">Okunmamış Duyuru</p>
          <p className="mt-2 text-xl font-mono text-amber-400">{unreadBroadcast}</p>
        </HardwarePanel>
        <HardwarePanel className="p-4 flex flex-col items-start group">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
          <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b]">Okunmamış Özel</p>
          <p className="mt-2 text-xl font-mono text-[#38bdf8]">{unreadDirect}</p>
        </HardwarePanel>
        <HardwarePanel className="p-4 flex flex-col items-start group">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-indigo-500/0 group-hover:bg-indigo-500/50 transition-colors" />
          <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b]">Toplam Arşiv</p>
          <p className="mt-2 text-xl font-mono text-indigo-400">
            {broadcastBucket.archive.length + directBucket.archive.length}
          </p>
        </HardwarePanel>
      </div>

      <HardwarePanel className="p-5 md:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="inline-flex rounded border border-[#2d313a] p-1 bg-[#0a0c10]">
            <button
              type="button"
              onClick={() => setTab('broadcast')}
              className={`px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest transition-colors ${
                tab === 'broadcast'
                  ? 'bg-amber-950/30 border border-amber-900/50 text-amber-400'
                  : 'text-[#64748b] hover:text-[#94a3b8] border border-transparent'
              }`}
            >
              Duyurular ({broadcastBucket.active.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('direct')}
              className={`px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest transition-colors ${
                tab === 'direct'
                  ? 'bg-[#153445] border border-[#226785] text-[#38bdf8]'
                  : 'text-[#64748b] hover:text-[#94a3b8] border border-transparent'
              }`}
            >
              Bana Özel ({directBucket.active.length})
            </button>
          </div>

          <div className="inline-flex rounded border border-[#2d313a] p-1 bg-[#0a0c10]">
            <button
              type="button"
              onClick={() => setScope('active')}
              className={`px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2 transition-colors ${
                scope === 'active'
                  ? 'bg-emerald-950/20 border border-emerald-900/50 text-emerald-400'
                  : 'text-[#64748b] hover:text-[#94a3b8] border border-transparent'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              Aktif
            </button>
            <button
              type="button"
              onClick={() => setScope('archive')}
              className={`px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2 transition-colors ${
                scope === 'archive'
                  ? 'bg-indigo-950/30 border border-indigo-900/50 text-indigo-400'
                  : 'text-[#64748b] hover:text-[#94a3b8] border border-transparent'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Arşiv ({currentBucket.archive.length})
            </button>
          </div>
        </div>

        {currentBucket.overflowCount > 0 && scope === 'active' && (
          <div className="rounded border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-amber-400">
            150 MESAJ ÜZERİNDEKİ {currentBucket.overflowCount} KAYIT OTOMATİK OLARAK ARŞİVE TAŞINDI.
          </div>
        )}

        {scopedList.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded border border-[#2d313a] bg-[#101419] px-4 py-3">
            <button
              type="button"
              onClick={toggleSelectPage}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[#2d313a] bg-[#16181d] text-[9px] font-mono uppercase tracking-widest text-[#94a3b8] hover:bg-[#1a1d24] transition-colors"
            >
              {isAllPageSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              SAYFAYI SEÇ
            </button>
            <span className="text-[10px] font-mono text-[#64748b] tracking-widest uppercase">{selectedScopedIds.length} SEÇİLİ</span>
            <button
              type="button"
              onClick={() =>
                scope === 'active' ? archiveSelected(selectedScopedIds) : unarchiveSelected(selectedScopedIds)
              }
              disabled={selectedScopedIds.length === 0 || actionBusy}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[#2d313a] bg-[#16181d] text-[9px] font-mono uppercase tracking-widest text-[#94a3b8] hover:bg-[#1a1d24] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scope === 'active' ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
              {scope === 'active' ? 'ARŞİVLE' : 'AKTİFE AL'}
            </button>
            <button
              type="button"
              onClick={() => void removePermanently(selectedScopedIds)}
              disabled={selectedScopedIds.length === 0 || actionBusy}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-rose-900/50 bg-rose-950/20 text-[9px] font-mono uppercase tracking-widest text-rose-400 hover:bg-rose-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              KALICI SİL
            </button>
            {selectedScopedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[#2d313a] bg-transparent text-[9px] font-mono uppercase tracking-widest text-[#64748b] hover:bg-[#1a1d24] transition-colors ml-auto"
              >
                <X className="w-3.5 h-3.5" />
                SEÇİMİ TEMİZLE
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)] gap-5 items-start">
          
          <div className="rounded border border-[#2d313a] bg-[#0a0c10] min-h-[440px] flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#38bdf8]" />
              </div>
            ) : paginatedMessages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                {scope === 'archive' ? 'ARŞİVDE MESAJ YOK.' : 'MESAJ KUTUSU BOŞ.'}
              </div>
            ) : (
              <div className="flex-1 divide-y divide-[#1e232b] overflow-y-auto pr-1 custom-scrollbar">
                {paginatedMessages.map((message) => {
                  const id = message.id.toString()
                  const isRead = readIds.has(id)
                  const isBroadcast = tab === 'broadcast'
                  const isSelected = selectedMessage?.id === message.id
                  const isChecked = selectedIds.has(id)

                  const baseClass = isSelected
                    ? isBroadcast
                      ? 'bg-amber-950/20 border-l-amber-500'
                      : 'bg-[#153445]/40 border-l-[#38bdf8]'
                    : isRead
                      ? 'border-l-transparent hover:bg-[#16181d]'
                      : isBroadcast
                        ? 'border-l-amber-500/50 bg-amber-950/10 hover:bg-amber-950/20'
                        : 'border-l-[#38bdf8]/50 bg-[#153445]/10 hover:bg-[#153445]/20'

                  return (
                    <div
                      key={message.id}
                      className={`w-full px-3 py-3 transition-colors border-l-[3px] ${baseClass}`}
                    >
                      <div className="grid grid-cols-[24px_18px_minmax(0,1fr)_74px_auto] items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(id)}
                          className="mt-0.5 inline-flex items-center justify-center text-[#64748b] hover:text-[#e2e8f0] transition-colors"
                        >
                          {isChecked ? <CheckSquare className="w-4 h-4 text-[#38bdf8]" /> : <Square className="w-4 h-4" />}
                        </button>
                        <span className="mt-0.5 inline-flex items-center justify-center">
                          {isBroadcast ? (
                            <Megaphone className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
                          ) : (
                            <Mail className="w-3.5 h-3.5 text-[#38bdf8]" strokeWidth={1.5} />
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => void openMessage(message, isBroadcast)}
                          className="min-w-0 text-left"
                        >
                          <p className={`text-[13px] tracking-wide truncate ${isRead ? 'text-[#cbd5e1] font-medium' : 'text-[#f8fafc] font-semibold'}`}>
                            {message.subject || 'BAŞLIKSIZ'}
                          </p>
                          <p className="text-[11px] font-mono text-[#64748b] truncate mt-1">{message.content || '-'}</p>
                        </button>
                        <div className="text-right flex flex-col items-end">
                          {!isRead && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#38bdf8] mb-1.5 shadow-[0_0_6px_rgba(56,189,248,0.8)]" />}
                          <p className="text-[9px] font-mono uppercase tracking-widest text-[#94a3b8] leading-none">
                            {new Date(message.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                          </p>
                          <p className="text-[9px] font-mono text-[#64748b] leading-none mt-1.5">
                            {new Date(message.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {scope === 'active' ? (
                            <button
                              type="button"
                              onClick={() => archiveSelected([id])}
                              className="text-[#64748b] hover:text-amber-400 transition-colors"
                              title="Arşivle"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => unarchiveSelected([id])}
                              className="text-[#64748b] hover:text-emerald-400 transition-colors"
                              title="Aktife al"
                            >
                              <ArchiveRestore className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void removePermanently([id])}
                            disabled={actionBusy}
                            className="text-[#64748b] hover:text-rose-400 disabled:opacity-30 transition-colors"
                            title="Kalıcı sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!loading && scopedList.length > 0 && (
              <div className="border-t border-[#2d313a] bg-[#101419] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">
                  SAYFA {safePage}/{totalPages} • {scopedList.length} MESAJ
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.max(1, windowStart - PAGE_WINDOW))}
                    disabled={!prevTenEnabled}
                    className="px-2 py-1.5 rounded border border-[#2d313a] bg-[#16181d] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                    disabled={safePage === 1}
                    className="px-2 py-1.5 rounded border border-[#2d313a] bg-[#16181d] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>

                  {pageNumbers.map((pageNo) => (
                    <button
                      key={pageNo}
                      type="button"
                      onClick={() => setCurrentPage(pageNo)}
                      className={`min-w-[28px] px-2 py-1.5 rounded border text-[10px] font-mono transition-colors ${
                        safePage === pageNo
                          ? 'bg-[#153445] border-[#226785] text-[#38bdf8]'
                          : 'bg-[#16181d] border-[#2d313a] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24]'
                      }`}
                    >
                      {pageNo}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                    disabled={safePage === totalPages}
                    className="px-2 py-1.5 rounded border border-[#2d313a] bg-[#16181d] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.min(totalPages, windowEnd + 1))}
                    disabled={!nextTenEnabled}
                    className="px-2 py-1.5 rounded border border-[#2d313a] bg-[#16181d] text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1a1d24] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded border border-[#2d313a] bg-[#101419] min-h-[440px] flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-[linear-gradient(90deg,rgba(56,189,248,0)_0%,rgba(56,189,248,0.5)_50%,rgba(56,189,248,0)_100%)]" />
            
            {!selectedMessage ? (
              <div className="flex-1 flex items-center justify-center text-[10px] font-mono uppercase tracking-widest text-[#475569]">
                MESAJ SEÇTİĞİNİZDE DETAY BURADA AÇILIR.
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-5 space-y-5">
                <div className="flex items-start justify-between gap-4 border-b border-[#1e232b] pb-4">
                  <div>
                    <h2 className="text-[15px] font-medium text-[#e2e8f0] uppercase tracking-wide">{selectedMessage.subject || 'BAŞLIKSIZ'}</h2>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] mt-2">
                      {new Date(selectedMessage.created_at).toLocaleString('tr-TR')}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded border border-[#2d313a] bg-[#0a0c10] text-[#64748b] text-[9px] font-mono uppercase tracking-widest hover:text-[#e2e8f0] hover:bg-[#1a1d24] transition-colors"
                    onClick={() => setSelectedMessage(null)}
                  >
                    TEMİZLE
                  </button>
                </div>

                <div className="flex-1 rounded bg-[#0a0c10] border border-[#2d313a] p-5 text-[13px] font-sans text-[#cbd5e1] leading-relaxed whitespace-pre-wrap overflow-y-auto custom-scrollbar">
                  {selectedMessage.content || '-'}
                </div>

                {tab === 'direct' && (
                  <div className="pt-4 border-t border-[#1e232b] flex flex-col gap-4">
                    <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Cevaplarım</h3>

                    {myReplies.length === 0 ? (
                      <div className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">HENÜZ CEVAP YOK.</div>
                    ) : (
                      <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                        {myReplies.map((reply) => (
                          <div key={reply.id} className="rounded bg-[#16181d] border border-[#2d313a] p-4 text-[12px] font-sans text-[#cbd5e1] leading-relaxed">
                            <div>{reply.content || '-'}</div>
                            <div className="text-[9px] font-mono uppercase tracking-widest text-[#64748b] mt-3">
                              {new Date(reply.created_at).toLocaleString('tr-TR')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <textarea
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        placeholder="İletişim birimine cevap yazın..."
                        className="flex-1 min-h-[80px] rounded bg-[#0a0c10] px-4 py-3 text-sm font-mono text-[#e2e8f0] border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569] resize-none custom-scrollbar"
                      />
                      <button
                        type="button"
                        onClick={sendReply}
                        disabled={sendingReply || !replyText.trim()}
                        className="self-end inline-flex items-center justify-center w-12 h-12 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 disabled:opacity-50 transition-all"
                      >
                        {sendingReply ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </HardwarePanel>
    </div>
  )
}