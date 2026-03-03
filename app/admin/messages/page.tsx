'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle2,
  Inbox,
  Loader2,
  Megaphone,
  MessageCircleReply,
  PencilLine,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  UserCircle2,
  Users,
} from 'lucide-react'
import { ModuleTitle } from '../../merchant/_components/module-title'

type GenericRow = Record<string, unknown>

type MessageRecord = {
  id: string
  subject: string | null
  content: string | null
  created_at: string
  sender_id: string | null
  recipient_id: string | null
  message_type: string | null
  is_read: boolean | null
  attachments: string[] | null
}

type ProfileRecord = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  role: string | null
  status: string | null
}

type TabValue = 'inbox' | 'sent' | 'compose'
type TargetType = 'broadcast_all' | 'broadcast_business' | 'single'

function toTs(raw: string): number {
  const ts = new Date(raw).getTime()
  return Number.isFinite(ts) ? ts : 0
}

function sanitizeAttachmentUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw) return null

  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

function mapMessage(row: GenericRow): MessageRecord {
  const attachmentsRaw = row.attachments
  const attachments = Array.isArray(attachmentsRaw)
    ? attachmentsRaw
        .map((item) => sanitizeAttachmentUrl(item))
        .filter((item): item is string => Boolean(item))
    : null

  return {
    id: String(row.id || ''),
    subject: typeof row.subject === 'string' ? row.subject : null,
    content: typeof row.content === 'string' ? row.content : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    sender_id: typeof row.sender_id === 'string' ? row.sender_id : null,
    recipient_id: typeof row.recipient_id === 'string' ? row.recipient_id : null,
    message_type: typeof row.message_type === 'string' ? row.message_type : null,
    is_read: typeof row.is_read === 'boolean' ? row.is_read : null,
    attachments,
  }
}

function mapProfile(row: GenericRow): ProfileRecord {
  return {
    id: String(row.id || ''),
    full_name: typeof row.full_name === 'string' ? row.full_name : null,
    email: typeof row.email === 'string' ? row.email : null,
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    role: typeof row.role === 'string' ? row.role : null,
    status: typeof row.status === 'string' ? row.status : null,
  }
}

function messageTypeLabel(messageType: string | null): string {
  if (messageType === 'broadcast_all') return 'Genel Duyuru'
  if (messageType === 'broadcast_business') return 'İşletmeci Duyurusu'
  if (messageType === 'admin_signal') return 'Admin Sinyali'
  if (messageType === 'direct') return 'Özel Mesaj'
  return 'Sistem'
}

function roleLabel(role: string | null): string {
  if (role === 'admin') return 'Admin'
  if (role === 'isletmeci') return 'İşletmeci'
  if (role === 'pending_business') return 'Aday İşletmeci'
  return 'Kullanıcı'
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

function MessagesCenterContent() {
  const searchParams = useSearchParams()
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  const [tab, setTab] = useState<TabValue>('inbox')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [inboxMessages, setInboxMessages] = useState<MessageRecord[]>([])
  const [sentMessages, setSentMessages] = useState<MessageRecord[]>([])
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')

  const [recipientPool, setRecipientPool] = useState<ProfileRecord[]>([])
  const [profileMap, setProfileMap] = useState<Record<string, ProfileRecord>>({})

  const [targetType, setTargetType] = useState<TargetType>('broadcast_all')
  const [recipientId, setRecipientId] = useState('')
  const [recipientSearch, setRecipientSearch] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [sendMessage, setSendMessage] = useState<string | null>(null)

  const loadData = async (soft = false) => {
    if (soft) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    if (!user) {
      setCurrentUserId(null)
      setInboxMessages([])
      setSentMessages([])
      setLoading(false)
      setRefreshing(false)
      return
    }

    setCurrentUserId(user.id)

    const [incomingDirectRes, incomingSignalRes, sentRes, profileRes] = await Promise.all([
      supabase
        .from('messages')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(300),
      supabase
        .from('messages')
        .select('*')
        .is('recipient_id', null)
        .in('message_type', ['admin_signal', 'direct'])
        .neq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(300),
      supabase.from('messages').select('*').eq('sender_id', user.id).order('created_at', { ascending: false }).limit(400),
      supabase
        .from('profiles')
        .select('id,full_name,email,avatar_url,role,status')
        .order('created_at', { ascending: false })
        .limit(500),
    ])

    const incomingDirect = !incomingDirectRes.error
      ? (incomingDirectRes.data || []).map((row) => mapMessage(row as GenericRow))
      : []
    const incomingSignal = !incomingSignalRes.error
      ? (incomingSignalRes.data || []).map((row) => mapMessage(row as GenericRow))
      : []

    const incomingMerged = [...incomingDirect, ...incomingSignal]
      .filter((item) => item.id.length > 0)
      .sort((a, b) => toTs(b.created_at) - toTs(a.created_at))

    const incomingUnique = incomingMerged.filter(
      (item, index, list) => list.findIndex((other) => other.id === item.id) === index
    )

    const sentList = !sentRes.error
      ? (sentRes.data || []).map((row) => mapMessage(row as GenericRow))
      : []

    const map: Record<string, ProfileRecord> = {}
    const pool: ProfileRecord[] = []
    if (!profileRes.error) {
      for (const row of (profileRes.data || []) as GenericRow[]) {
        const profile = mapProfile(row)
        if (!profile.id) continue
        map[profile.id] = profile
        pool.push(profile)
      }
    }

    setInboxMessages(incomingUnique)
    setSentMessages(sentList)
    setProfileMap(map)
    setRecipientPool(pool)
    setSelectedMessageId((current) => {
      const source = tab === 'sent' ? sentList : incomingUnique
      if (current && source.some((message) => message.id === current)) {
        return current
      }
      return source[0]?.id || null
    })

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const compose = searchParams.get('compose')
    const uid = searchParams.get('uid')
    if (compose === 'true') {
      setTab('compose')
      setTargetType('single')
      if (uid) {
        setRecipientId(uid)
      }
    }
  }, [searchParams])

  const activeMessages = tab === 'sent' ? sentMessages : inboxMessages

  const filteredMessages = useMemo(() => {
    const q = normalizeText(searchValue.trim())
    const list = activeMessages.filter((message) => {
      if (!q) return true
      const sender = message.sender_id ? profileMap[message.sender_id] : undefined
      const recipient = message.recipient_id ? profileMap[message.recipient_id] : undefined

      const haystack = normalizeText(
        [
          message.subject || '',
          message.content || '',
          messageTypeLabel(message.message_type),
          sender?.full_name || '',
          sender?.email || '',
          recipient?.full_name || '',
          recipient?.email || '',
        ].join(' ')
      )
      return haystack.includes(q)
    })

    return list.sort((a, b) => toTs(b.created_at) - toTs(a.created_at))
  }, [activeMessages, searchValue, profileMap])

  const selectedMessage = useMemo(
    () => filteredMessages.find((message) => message.id === selectedMessageId) || null,
    [filteredMessages, selectedMessageId]
  )

  useEffect(() => {
    if (tab === 'compose') return
    setSelectedMessageId((current) => {
      if (current && filteredMessages.some((message) => message.id === current)) {
        return current
      }
      return filteredMessages[0]?.id || null
    })
  }, [filteredMessages, tab])

  const inboxUnreadCount = useMemo(
    () => inboxMessages.filter((message) => message.recipient_id === currentUserId && !message.is_read).length,
    [inboxMessages, currentUserId]
  )

  const sentBroadcastCount = useMemo(
    () =>
      sentMessages.filter(
        (message) => message.message_type === 'broadcast_all' || message.message_type === 'broadcast_business'
      ).length,
    [sentMessages]
  )

  const sendDisabled =
    sending ||
    !subject.trim() ||
    !content.trim() ||
    (targetType === 'single' && recipientId.trim().length === 0)

  const recipientCandidates = useMemo(() => {
    const q = normalizeText(recipientSearch.trim())
    const base = recipientPool.filter((profile) => profile.id !== currentUserId)
    if (!q) return base.slice(0, 8)
    return base
      .filter((profile) =>
        normalizeText(
          `${profile.full_name || ''} ${profile.email || ''} ${profile.role || ''} ${profile.id || ''}`
        ).includes(q)
      )
      .slice(0, 8)
  }, [recipientPool, recipientSearch, currentUserId])

  const handleOpenMessage = async (message: MessageRecord) => {
    setSelectedMessageId(message.id)

    if (tab !== 'inbox') return
    if (!currentUserId) return
    if (message.recipient_id !== currentUserId) return
    if (message.is_read) return

    setInboxMessages((current) =>
      current.map((row) => (row.id === message.id ? { ...row, is_read: true } : row))
    )
    await supabase.from('messages').update({ is_read: true }).eq('id', message.id).eq('recipient_id', currentUserId)
  }

  const resolveProfile = (id: string | null): ProfileRecord | null => {
    if (!id) return null
    return profileMap[id] || null
  }

  const sentTargetLabel = (message: MessageRecord): string => {
    if (message.message_type === 'broadcast_all') return 'Tüm Kullanıcılar'
    if (message.message_type === 'broadcast_business') return 'İşletmeciler'
    if (message.recipient_id) {
      const recipient = resolveProfile(message.recipient_id)
      return recipient?.full_name || recipient?.email || message.recipient_id
    }
    return 'Sistem'
  }

  const sendNewMessage = async () => {
    if (!currentUserId || sendDisabled) return

    setSending(true)
    setSendMessage(null)

    const payload: GenericRow = {
      sender_id: currentUserId,
      recipient_id: targetType === 'single' ? recipientId : null,
      subject: subject.trim(),
      content: content.trim(),
      message_type: targetType === 'single' ? 'direct' : targetType,
      is_read: false,
    }

    const { error } = await supabase.from('messages').insert(payload)
    if (error) {
      setSendMessage(`Gönderilemedi: ${error.message}`)
      setSending(false)
      return
    }

    setSubject('')
    setContent('')
    setRecipientId('')
    setRecipientSearch('')
    setTargetType('broadcast_all')
    setSendMessage('Mesaj başarıyla gönderildi.')
    setSending(false)
    setTab('sent')
    await loadData(true)
  }

  return (
    <div className="h-full flex flex-col gap-4 text-[#e2e8f0]">
      <HardwarePanel className="p-5 border-b border-[#2d313a]">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <ModuleTitle title="Mesaj Merkezi" />
            <p className="mt-2 text-[10px] font-mono tracking-widest uppercase text-[#64748b]">Sistem içi iletişim, duyuru ve kullanıcı mesajları.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="h-11 px-4 rounded border border-[#2d313a] bg-[#16181d] text-[10px] font-mono uppercase tracking-widest text-[#e2e8f0] inline-flex items-center justify-center gap-2 hover:bg-[#1a1d24] disabled:opacity-50 transition-colors"
          >
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Yenile
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Gelen Toplam</p>
            <p className="mt-1 text-xl font-mono text-[#e2e8f0]">{inboxMessages.length}</p>
          </div>
          <div className="rounded border border-[#166534] bg-[#14532d]/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-emerald-500/0 group-hover:bg-emerald-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-emerald-500/70">Okunmamış</p>
            <p className="mt-1 text-xl font-mono text-emerald-400">{inboxUnreadCount}</p>
          </div>
          <div className="rounded border border-amber-900/50 bg-amber-950/20 px-4 py-3 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-amber-500/0 group-hover:bg-amber-500/50 transition-colors" />
            <p className="text-[9px] uppercase tracking-widest font-mono text-amber-500/70">Gönderilen Duyuru</p>
            <p className="mt-1 text-xl font-mono text-amber-400">{sentBroadcastCount}</p>
          </div>
        </div>
      </HardwarePanel>

      <HardwarePanel className="p-4">
        <div className="inline-flex rounded border border-[#2d313a] p-1 bg-[#0a0c10]">
          <button
            type="button"
            onClick={() => setTab('inbox')}
            className={`px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-1.5 transition-colors ${
              tab === 'inbox' ? 'bg-[#153445] border border-[#226785] text-[#38bdf8]' : 'text-[#64748b] hover:text-[#94a3b8] border border-transparent'
            }`}
          >
            <Inbox size={13} />
            Gelen
          </button>
          <button
            type="button"
            onClick={() => setTab('sent')}
            className={`px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-1.5 transition-colors ${
              tab === 'sent' ? 'bg-[#153445] border border-[#226785] text-[#38bdf8]' : 'text-[#64748b] hover:text-[#94a3b8] border border-transparent'
            }`}
          >
            <Megaphone size={13} />
            Gönderilen
          </button>
          <button
            type="button"
            onClick={() => setTab('compose')}
            className={`px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-1.5 transition-colors ${
              tab === 'compose' ? 'bg-emerald-950/30 border border-emerald-900/50 text-emerald-400' : 'text-[#64748b] hover:text-[#94a3b8] border border-transparent'
            }`}
          >
            <PencilLine size={13} />
            Yeni Mesaj
          </button>
        </div>
      </HardwarePanel>

      {loading ? (
        <HardwarePanel className="p-10 min-h-[420px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#38bdf8] animate-spin" />
        </HardwarePanel>
      ) : tab === 'compose' ? (
        <HardwarePanel className="p-5 md:p-6 min-h-[420px]">
          <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)] h-full">
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">Hedef Kitle</p>
              
              <button
                type="button"
                onClick={() => setTargetType('broadcast_all')}
                className={`w-full h-11 rounded border text-[10px] font-mono uppercase tracking-widest inline-flex items-center justify-center gap-2 transition-colors ${
                  targetType === 'broadcast_all'
                    ? 'bg-[#153445] border-[#226785] text-[#38bdf8]'
                    : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#e2e8f0]'
                }`}
              >
                <Users size={14} />
                Tüm Kullanıcılar
              </button>

              <button
                type="button"
                onClick={() => setTargetType('broadcast_business')}
                className={`w-full h-11 rounded border text-[10px] font-mono uppercase tracking-widest inline-flex items-center justify-center gap-2 transition-colors ${
                  targetType === 'broadcast_business'
                    ? 'bg-[#153445] border-[#226785] text-[#38bdf8]'
                    : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#e2e8f0]'
                }`}
              >
                <Megaphone size={14} />
                İşletmeci Duyurusu
              </button>

              <button
                type="button"
                onClick={() => setTargetType('single')}
                className={`w-full h-11 rounded border text-[10px] font-mono uppercase tracking-widest inline-flex items-center justify-center gap-2 transition-colors ${
                  targetType === 'single'
                    ? 'bg-[#14532d]/40 border-[#166534] text-emerald-400'
                    : 'bg-[#0a0c10] border-[#2d313a] text-[#64748b] hover:border-[#475569] hover:text-[#e2e8f0]'
                }`}
              >
                <MessageCircleReply size={14} />
                Tek Kullanıcı
              </button>

              {targetType === 'single' ? (
                <div className="space-y-3 rounded border border-[#2d313a] bg-[#101419] p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                    <input
                      value={recipientSearch}
                      onChange={(event) => setRecipientSearch(event.target.value)}
                      placeholder="İsim, e-posta, ID..."
                      className="w-full h-10 rounded bg-[#0a0c10] border border-[#2d313a] pl-9 pr-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                    />
                  </div>
                  <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                    {recipientCandidates.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => {
                          setRecipientId(profile.id)
                          setRecipientSearch(profile.full_name || profile.email || profile.id)
                        }}
                        className={`w-full p-3 rounded border text-left transition-colors ${
                          recipientId === profile.id
                            ? 'bg-[#14532d]/40 border-[#166534]'
                            : 'bg-[#0a0c10] border-[#2d313a] hover:border-[#475569]'
                        }`}
                      >
                        <p className={`text-[12px] font-medium uppercase tracking-wide truncate ${recipientId === profile.id ? 'text-emerald-400' : 'text-[#e2e8f0]'}`}>
                          {profile.full_name || 'İSİMSİZ KULLANICI'}
                        </p>
                        <p className="text-[10px] font-mono text-[#64748b] truncate mt-1">{profile.email || profile.id}</p>
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[#475569] mt-2">{roleLabel(profile.role)}</p>
                      </button>
                    ))}
                    {recipientCandidates.length === 0 ? (
                      <p className="text-[10px] font-mono uppercase tracking-widest text-[#475569] py-2 text-center">SONUÇ YOK.</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4 flex flex-col h-full">
              <p className="text-[11px] uppercase tracking-widest font-mono text-[#e2e8f0] border-b border-[#1e232b] pb-3">İçerik Editörü</p>
              
              <label className="block">
                <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest block mb-2">Başlık</span>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Mesaj başlığı"
                  className="w-full h-11 rounded bg-[#0a0c10] border border-[#2d313a] px-4 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                />
              </label>

              <label className="block flex-1 flex flex-col">
                <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest block mb-2">Mesaj Metni</span>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Mesaj içeriğini buraya yazın..."
                  className="w-full flex-1 min-h-[240px] rounded bg-[#0a0c10] border border-[#2d313a] p-4 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 resize-none custom-scrollbar placeholder:text-[#475569]"
                />
              </label>

              <div className="flex items-center justify-between gap-4 pt-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                  GÖNDERİM: <span className="text-[#38bdf8]">{messageTypeLabel(targetType === 'single' ? 'direct' : targetType)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void sendNewMessage()}
                  disabled={sendDisabled}
                  className="h-11 px-6 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] text-[11px] font-mono uppercase tracking-widest border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 inline-flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  GÖNDER
                </button>
              </div>

              {sendMessage ? (
                <div className="rounded border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                  [SİSTEM] {sendMessage}
                </div>
              ) : null}
            </div>
          </div>
        </HardwarePanel>
      ) : (
        <HardwarePanel className="p-0 overflow-hidden min-h-[500px]">
          <div className="grid gap-0 xl:grid-cols-[400px_minmax(0,1fr)] h-[calc(100vh-320px)] min-h-[500px]">
            
            {/* LİSTE */}
            <div className="border-r border-[#2d313a] bg-[#0a0c10] flex flex-col h-full">
              <div className="p-4 border-b border-[#2d313a]">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Konu, içerik, kullanıcı..."
                    className="w-full h-10 rounded bg-[#16181d] border border-[#2d313a] pl-9 pr-3 text-sm font-mono text-[#e2e8f0] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569]"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {filteredMessages.length === 0 ? (
                  <div className="h-[200px] flex flex-col items-center justify-center text-center">
                    <ShieldAlert className="w-6 h-6 text-[#475569] mb-3" />
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">KAYIT BULUNAMADI.</p>
                  </div>
                ) : (
                  filteredMessages.map((message) => {
                    const selected = selectedMessageId === message.id
                    const unread = tab === 'inbox' && message.recipient_id === currentUserId && !message.is_read
                    const sender = resolveProfile(message.sender_id)

                    return (
                      <button
                        key={message.id}
                        type="button"
                        onClick={() => void handleOpenMessage(message)}
                        className={`w-full p-4 rounded border text-left transition-colors ${
                          selected
                            ? 'bg-[#153445]/30 border-[#38bdf8] border-l-[3px]'
                            : unread
                              ? 'bg-emerald-950/10 border-emerald-900/50 border-l-[3px] border-l-emerald-400'
                              : 'bg-[#16181d] border-[#2d313a] hover:border-[#475569] border-l-[3px] border-l-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[12px] uppercase tracking-wide truncate ${selected || unread ? 'text-[#e2e8f0] font-medium' : 'text-[#cbd5e1]'}`}>
                            {message.subject || 'BAŞLIKSIZ'}
                          </p>
                          <span className="text-[9px] font-mono uppercase tracking-widest text-[#64748b] shrink-0">
                            {new Date(message.created_at).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] font-mono text-[#94a3b8] line-clamp-2 leading-relaxed">{message.content || '-'}</p>
                        
                        <div className="mt-3 pt-2 border-t border-[#1e232b] flex items-center justify-between">
                          <span className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest truncate max-w-[180px]">
                            {tab === 'inbox'
                              ? sender?.full_name || sender?.email || message.sender_id || 'SİSTEM'
                              : sentTargetLabel(message)}
                          </span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#0a0c10] border border-[#2d313a] text-[#475569] font-mono uppercase tracking-widest">
                            {messageTypeLabel(message.message_type)}
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* DETAY */}
            <div className="bg-[#0c0e12] h-full flex flex-col overflow-hidden">
              {!selectedMessage ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[10px] font-mono uppercase tracking-widest text-[#475569]">
                  <MessageCircleReply className="w-8 h-8 mb-3 opacity-30" />
                  MESAJ SEÇİLDİĞİNDE DETAY BURADA AÇILIR.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar space-y-6">
                  
                  <div className="flex items-start justify-between gap-4 border-b border-[#2d313a] pb-4">
                    <div>
                      <h2 className="text-[18px] font-medium text-[#e2e8f0] uppercase tracking-wide">
                        {selectedMessage.subject || 'BAŞLIKSIZ'}
                      </h2>
                      <p className="mt-1.5 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                        {new Date(selectedMessage.created_at).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    {tab === 'inbox' && selectedMessage.recipient_id === currentUserId && !selectedMessage.is_read ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-emerald-900/50 bg-emerald-950/20 text-[9px] font-mono uppercase tracking-widest text-emerald-400 shrink-0">
                        <CheckCircle2 size={12} />
                        YENİ
                      </span>
                    ) : null}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded border border-[#2d313a] bg-[#101419] px-4 py-3">
                      <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">GÖNDEREN</p>
                      <p className="mt-1.5 text-[12px] font-mono text-[#e2e8f0] truncate">
                        {(() => {
                          const sender = resolveProfile(selectedMessage.sender_id)
                          return sender?.full_name || sender?.email || selectedMessage.sender_id || 'SİSTEM'
                        })()}
                      </p>
                    </div>
                    <div className="rounded border border-[#2d313a] bg-[#101419] px-4 py-3">
                      <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">HEDEF</p>
                      <p className="mt-1.5 text-[12px] font-mono text-[#e2e8f0] truncate">
                        {selectedMessage.recipient_id
                          ? (() => {
                              const recipient = resolveProfile(selectedMessage.recipient_id)
                              return recipient?.full_name || recipient?.email || selectedMessage.recipient_id
                            })()
                          : sentTargetLabel(selectedMessage)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded border border-[#1e232b] bg-[#0a0c10] p-5">
                    <p className="text-[9px] uppercase tracking-widest font-mono text-[#475569] mb-3">MESAJ İÇERİĞİ</p>
                    <div className="text-[13px] font-sans leading-relaxed text-[#cbd5e1] whitespace-pre-wrap">
                      {selectedMessage.content || '-'}
                    </div>
                  </div>

                  {selectedMessage.attachments && selectedMessage.attachments.length > 0 ? (
                    <div className="rounded border border-[#2d313a] bg-[#101419] p-4">
                      <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b] mb-3">EKLER</p>
                      <div className="flex flex-wrap gap-3">
                        {selectedMessage.attachments.map((url, index) => (
                          <a
                            key={`${selectedMessage.id}-att-${index}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="px-3 py-1.5 rounded bg-[#16181d] border border-[#2d313a] text-[10px] font-mono text-[#38bdf8] hover:bg-[#1a1d24] transition-colors break-all max-w-full truncate"
                          >
                            EK DOSYA {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedMessage.sender_id ? (
                    <div className="rounded border border-[#2d313a] bg-[#101419] p-4">
                      <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b] mb-3">GÖNDEREN PROFİLİ</p>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded border border-[#2d313a] bg-[#16181d] overflow-hidden flex items-center justify-center shrink-0">
                          {resolveProfile(selectedMessage.sender_id)?.avatar_url ? (
                            <img
                              src={resolveProfile(selectedMessage.sender_id)?.avatar_url || ''}
                              alt="Gönderen"
                              className="w-full h-full object-cover mix-blend-lighten opacity-80"
                            />
                          ) : (
                            <UserCircle2 size={20} className="text-[#475569]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#e2e8f0] uppercase tracking-wide truncate">
                            {resolveProfile(selectedMessage.sender_id)?.full_name || 'İSİMSİZ KULLANICI'}
                          </p>
                          <p className="mt-1 text-[10px] font-mono text-[#64748b] truncate">
                            {resolveProfile(selectedMessage.sender_id)?.email || selectedMessage.sender_id}
                          </p>
                          <p className="mt-1 text-[9px] font-mono uppercase tracking-widest text-[#475569]">
                            {roleLabel(resolveProfile(selectedMessage.sender_id)?.role || null)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </HardwarePanel>
      )}
    </div>
  )
}

export default function AdminMessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#38bdf8] animate-spin" />
        </div>
      }
    >
      <MessagesCenterContent />
    </Suspense>
  )
}
