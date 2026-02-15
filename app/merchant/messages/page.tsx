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
import { ModuleTitle } from '../_components/module-title'

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

    const [broadcastRes, directRes, readsRes] = await Promise.all([
      supabase
        .from('messages')
        .select('*')
        .is('recipient_id', null)
        .in('message_type', ['broadcast_all', 'broadcast_business'])
        .neq('sender_id', user.id)
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
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div className="space-y-2">
          <ModuleTitle title="Mesaj Merkezi" />
          <p className="text-sm text-slate-500">15 mesaj/sayfa, aktif kutuda maksimum 150 mesaj tutulur.</p>
        </div>

        <button
          type="button"
          onClick={loadMessages}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold text-slate-700 border border-white/70 bg-[linear-gradient(145deg,#ffffff_0%,#f6f9ff_100%)] shadow-[0_14px_20px_-18px_rgba(15,23,42,0.55)] hover:-translate-y-0.5 transition-transform"
        >
          <RefreshCcw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <div className="relative overflow-hidden rounded-2xl px-3.5 py-3 border border-white/70 bg-[linear-gradient(160deg,#ffffff_0%,#f8faff_100%)] shadow-[0_12px_20px_-18px_rgba(15,23,42,0.55)]">
          <span className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-orange-200/35 blur-xl" />
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-500">Okunmamış Duyuru</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1.5">{unreadBroadcast}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl px-3.5 py-3 border border-white/70 bg-[linear-gradient(160deg,#ffffff_0%,#f7fbff_100%)] shadow-[0_12px_20px_-18px_rgba(15,23,42,0.55)]">
          <span className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-blue-200/35 blur-xl" />
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-500">Okunmamış Özel</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1.5">{unreadDirect}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl px-3.5 py-3 border border-white/70 bg-[linear-gradient(160deg,#ffffff_0%,#fcfbff_100%)] shadow-[0_12px_20px_-18px_rgba(15,23,42,0.55)]">
          <span className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-violet-200/30 blur-xl" />
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-500">Toplam Arşiv</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1.5">
            {broadcastBucket.archive.length + directBucket.archive.length}
          </p>
        </div>
      </div>

      <div className="rounded-[28px] p-3 md:p-4 border border-white/70 bg-[linear-gradient(145deg,#ffffff_0%,#f2f7ff_100%)] shadow-[0_24px_34px_-26px_rgba(15,23,42,0.56)] space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl border border-white/70 bg-white/90 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.5)]">
            <button
              type="button"
              onClick={() => setTab('broadcast')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
                tab === 'broadcast'
                  ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Duyurular ({broadcastBucket.active.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('direct')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
                tab === 'direct'
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Bana Özel ({directBucket.active.length})
            </button>
          </div>

          <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl border border-white/70 bg-white/90 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.5)]">
            <button
              type="button"
              onClick={() => setScope('active')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold inline-flex items-center gap-1.5 transition-all ${
                scope === 'active'
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Inbox className="w-4 h-4" />
              Aktif
            </button>
            <button
              type="button"
              onClick={() => setScope('archive')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold inline-flex items-center gap-1.5 transition-all ${
                scope === 'archive'
                  ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Archive className="w-4 h-4" />
              Arşiv ({currentBucket.archive.length})
            </button>
          </div>
        </div>

        {currentBucket.overflowCount > 0 && scope === 'active' && (
          <div className="rounded-2xl px-4 py-3 text-xs font-semibold text-amber-800 border border-amber-200 bg-amber-50/80">
            150 mesaj üzerindeki {currentBucket.overflowCount} kayıt otomatik olarak arşive taşındı.
          </div>
        )}

        {scopedList.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2.5 border border-white/70 bg-white/80">
            <button
              type="button"
              onClick={toggleSelectPage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 border border-slate-200 bg-white"
            >
              {isAllPageSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              Sayfayı Seç
            </button>
            <span className="text-xs font-semibold text-slate-500">{selectedScopedIds.length} seçili</span>
            <button
              type="button"
              onClick={() =>
                scope === 'active' ? archiveSelected(selectedScopedIds) : unarchiveSelected(selectedScopedIds)
              }
              disabled={selectedScopedIds.length === 0 || actionBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 border border-slate-200 bg-white disabled:opacity-40"
            >
              {scope === 'active' ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
              {scope === 'active' ? 'Seçilenleri Arşivle' : 'Seçilenleri Aktife Al'}
            </button>
            <button
              type="button"
              onClick={() => void removePermanently(selectedScopedIds)}
              disabled={selectedScopedIds.length === 0 || actionBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 border border-rose-200 bg-rose-50 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Seçilenleri Kalıcı Sil
            </button>
            {selectedScopedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 border border-slate-200 bg-white"
              >
                <X className="w-3.5 h-3.5" />
                Seçimi Temizle
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)] gap-3">
          <div className="rounded-[24px] border border-white/70 bg-[linear-gradient(145deg,#ffffff_0%,#f8fbff_100%)] min-h-[420px] overflow-hidden">
            {loading ? (
              <div className="h-[320px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : paginatedMessages.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-sm font-bold text-slate-500">
                {scope === 'archive' ? 'Arşivde mesaj yok.' : 'Mesaj kutusu boş.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-200/60 p-2" role="tablist" aria-label="Mesaj listesi">
                {paginatedMessages.map((message) => {
                  const id = message.id.toString()
                  const isRead = readIds.has(id)
                  const isBroadcast = tab === 'broadcast'
                  const isSelected = selectedMessage?.id === message.id
                  const isChecked = selectedIds.has(id)
                  return (
                    <div
                      key={message.id}
                      role="tab"
                      aria-selected={isSelected}
                      className={`w-full px-2 py-2 rounded-xl transition-all border-l-[3px] ${
                        isSelected
                          ? isBroadcast
                            ? 'bg-orange-50/80 border-l-orange-500'
                            : 'bg-blue-50/80 border-l-blue-500'
                          : isRead
                            ? 'border-l-transparent hover:bg-slate-50/70'
                            : isBroadcast
                              ? 'border-l-orange-300 bg-orange-50/40 hover:bg-orange-50/70'
                              : 'border-l-blue-300 bg-blue-50/40 hover:bg-blue-50/70'
                      }`}
                    >
                      <div className="grid grid-cols-[24px_18px_minmax(0,1fr)_74px_auto] items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(id)}
                          className="inline-flex items-center justify-center text-slate-500 hover:text-slate-700"
                          title="Mesajı seç"
                        >
                          {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                        <span className="inline-flex items-center justify-center">
                          {isBroadcast ? (
                            <Megaphone className="w-3.5 h-3.5 text-orange-500" />
                          ) : (
                            <Mail className="w-3.5 h-3.5 text-blue-500" />
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => void openMessage(message, isBroadcast)}
                          className="min-w-0 text-left"
                        >
                          <p className="text-[14px] font-extrabold text-slate-900 truncate">{message.subject || 'Başlıksız'}</p>
                          <p className="text-[12px] font-medium text-slate-700 truncate">{message.content || '-'}</p>
                        </button>
                        <div className="text-right">
                          {!isRead && <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mb-1" />}
                          <p className="text-[10px] font-bold text-slate-600 leading-none">
                            {new Date(message.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                          </p>
                          <p className="text-[10px] text-slate-600 leading-none mt-1">
                            {new Date(message.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-1">
                          {scope === 'active' ? (
                            <button
                              type="button"
                              onClick={() => archiveSelected([id])}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                              title="Arşivle"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => unarchiveSelected([id])}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Aktife al"
                            >
                              <ArchiveRestore className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void removePermanently([id])}
                            disabled={actionBusy}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-40"
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
              <div className="border-t border-slate-200/70 px-3 py-2.5 space-y-2">
                <p className="text-[11px] text-slate-500 font-semibold">
                  Sayfa {safePage}/{totalPages} • Toplam {scopedList.length} mesaj
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.max(1, windowStart - PAGE_WINDOW))}
                    disabled={!prevTenEnabled}
                    className="px-2 py-1.5 rounded-lg text-slate-600 bg-white border border-white/70 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    title="10 sayfa geri"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                    disabled={safePage === 1}
                    className="px-2 py-1.5 rounded-lg text-slate-600 bg-white border border-white/70 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Önceki sayfa"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {pageNumbers.map((pageNo) => (
                    <button
                      key={pageNo}
                      type="button"
                      onClick={() => setCurrentPage(pageNo)}
                      className={`min-w-[30px] px-2 py-1.5 rounded-lg text-[11px] font-bold border ${
                        safePage === pageNo
                          ? 'text-white border-transparent bg-[linear-gradient(145deg,#1d4ed8_0%,#2563eb_100%)] shadow-[0_8px_14px_-12px_rgba(37,99,235,0.75)]'
                          : 'text-slate-600 bg-white border-white/70 shadow-sm'
                      }`}
                    >
                      {pageNo}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                    disabled={safePage === totalPages}
                    className="px-2 py-1.5 rounded-lg text-slate-600 bg-white border border-white/70 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Sonraki sayfa"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.min(totalPages, windowEnd + 1))}
                    disabled={!nextTenEnabled}
                    className="px-2 py-1.5 rounded-lg text-slate-600 bg-white border border-white/70 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    title="10 sayfa ileri"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[24px] p-4 md:p-6 border border-white/70 bg-[linear-gradient(145deg,#ffffff_0%,#f8fbff_100%)] min-h-[420px]">
            {!selectedMessage ? (
              <div className="h-full min-h-[320px] flex items-center justify-center text-sm font-bold text-slate-500">
                Mesaj seçtiğinizde detay burada açılır.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">{selectedMessage.subject || 'Başlıksız'}</h2>
                    <div className="text-xs font-bold text-slate-500 mt-1">
                      {new Date(selectedMessage.created_at).toLocaleString('tr-TR')}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 bg-white border border-white/70 shadow-sm"
                    onClick={() => setSelectedMessage(null)}
                  >
                    Temizle
                  </button>
                </div>

                <div className="rounded-2xl p-5 text-[15px] font-medium leading-7 text-slate-800 bg-white border border-white/70 shadow-sm min-h-[180px]">
                  {selectedMessage.content || '-'}
                </div>

                {tab === 'direct' && (
                  <>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Cevaplarım</h3>

                    {myReplies.length === 0 ? (
                      <div className="text-xs text-slate-500">Henüz cevap yok.</div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {myReplies.map((reply) => (
                          <div key={reply.id} className="rounded-xl p-3 text-xs bg-blue-50 text-slate-700 border border-blue-100">
                            <div>{reply.content || '-'}</div>
                            <div className="text-[10px] text-slate-500 mt-1">
                              {new Date(reply.created_at).toLocaleString('tr-TR')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <textarea
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        placeholder="Yönetim birimine cevap yazın..."
                        className="flex-1 min-h-20 rounded-xl p-3 text-sm bg-white text-slate-700 border border-white/70 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={sendReply}
                        disabled={sendingReply || !replyText.trim()}
                        className="self-end px-4 py-3 rounded-xl text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
