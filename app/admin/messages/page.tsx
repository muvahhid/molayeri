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

const cardClass =
  'rounded-2xl border border-white/80 bg-white/95 shadow-[0_16px_24px_-20px_rgba(15,23,42,0.6)] backdrop-blur'

function toTs(raw: string): number {
  const ts = new Date(raw).getTime()
  return Number.isFinite(ts) ? ts : 0
}

function mapMessage(row: GenericRow): MessageRecord {
  const attachmentsRaw = row.attachments
  const attachments = Array.isArray(attachmentsRaw)
    ? attachmentsRaw.filter((item) => typeof item === 'string').map((item) => String(item))
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
    <div className="h-full flex flex-col gap-4 text-slate-700">
      <section className={`${cardClass} p-4 md:p-5`}>
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Mesaj Merkezi</h1>
          </div>
          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="h-11 px-4 rounded-xl border border-slate-200/80 bg-white text-sm font-semibold text-slate-700 inline-flex items-center gap-2 disabled:opacity-60"
          >
            {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Yenile
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-slate-200/80 bg-blue-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-blue-700">Gelen Toplam</p>
            <p className="mt-1 text-xl font-bold text-blue-900">{inboxMessages.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-emerald-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-emerald-700">Okunmamış</p>
            <p className="mt-1 text-xl font-bold text-emerald-900">{inboxUnreadCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-amber-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-amber-700">Gönderilen Duyuru</p>
            <p className="mt-1 text-xl font-bold text-amber-900">{sentBroadcastCount}</p>
          </div>
        </div>
      </section>

      <section className={`${cardClass} p-3 md:p-4`}>
        <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl border border-slate-200/70 bg-white">
          <button
            type="button"
            onClick={() => setTab('inbox')}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold inline-flex items-center gap-1.5 ${
              tab === 'inbox' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Inbox size={14} />
            Gelen
          </button>
          <button
            type="button"
            onClick={() => setTab('sent')}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold inline-flex items-center gap-1.5 ${
              tab === 'sent' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Megaphone size={14} />
            Gönderilen
          </button>
          <button
            type="button"
            onClick={() => setTab('compose')}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold inline-flex items-center gap-1.5 ${
              tab === 'compose' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <PencilLine size={14} />
            Yeni Mesaj
          </button>
        </div>
      </section>

      {loading ? (
        <section className={`${cardClass} p-8 min-h-[420px] flex items-center justify-center`}>
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </section>
      ) : tab === 'compose' ? (
        <section className={`${cardClass} p-4 md:p-5`}>
          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500">Hedef</p>
              <button
                type="button"
                onClick={() => setTargetType('broadcast_all')}
                className={`w-full h-11 rounded-xl border text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                  targetType === 'broadcast_all'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <Users size={15} />
                Tüm Kullanıcılar
              </button>
              <button
                type="button"
                onClick={() => setTargetType('broadcast_business')}
                className={`w-full h-11 rounded-xl border text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                  targetType === 'broadcast_business'
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <Megaphone size={15} />
                İşletmeci Duyurusu
              </button>
              <button
                type="button"
                onClick={() => setTargetType('single')}
                className={`w-full h-11 rounded-xl border text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                  targetType === 'single'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <MessageCircleReply size={15} />
                Tek Kullanıcı
              </button>

              {targetType === 'single' ? (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <input
                    value={recipientSearch}
                    onChange={(event) => setRecipientSearch(event.target.value)}
                    placeholder="İsim, e-posta veya ID ile ara..."
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                  />
                  <div className="max-h-[240px] overflow-y-auto space-y-1 pr-1">
                    {recipientCandidates.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => {
                          setRecipientId(profile.id)
                          setRecipientSearch(profile.full_name || profile.email || profile.id)
                        }}
                        className={`w-full p-2 rounded-lg border text-left ${
                          recipientId === profile.id
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {profile.full_name || 'İsimsiz kullanıcı'}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{profile.email || profile.id}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{roleLabel(profile.role)}</p>
                      </button>
                    ))}
                    {recipientCandidates.length === 0 ? (
                      <p className="text-xs text-slate-500">Eşleşen kullanıcı bulunamadı.</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Mesaj başlığı"
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
              />
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Mesaj içeriği"
                className="w-full min-h-[320px] rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none resize-y"
              />
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Hedef: <span className="font-semibold text-slate-700">{messageTypeLabel(targetType === 'single' ? 'direct' : targetType)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void sendNewMessage()}
                  disabled={sendDisabled}
                  className="h-11 px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-blue-700 disabled:opacity-55"
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Gönder
                </button>
              </div>
              {sendMessage ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {sendMessage}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <section className={`${cardClass} p-3 md:p-4`}>
          <div className="grid gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 overflow-hidden min-h-[420px]">
              <div className="p-3 border-b border-slate-200/80">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Konu, içerik veya kullanıcı ara..."
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="max-h-[560px] overflow-y-auto p-2 space-y-1.5">
                {filteredMessages.length === 0 ? (
                  <div className="h-[320px] flex flex-col items-center justify-center text-center px-6">
                    <ShieldAlert className="w-8 h-8 text-slate-400" />
                    <p className="mt-2 text-sm font-semibold text-slate-500">Kayıt bulunamadı.</p>
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
                        className={`w-full p-3 rounded-xl border text-left ${
                          selected
                            ? 'border-blue-300 bg-blue-50'
                            : unread
                              ? 'border-emerald-200 bg-emerald-50/70'
                              : 'border-transparent bg-white hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-800 line-clamp-1">
                            {message.subject || 'Başlıksız'}
                          </p>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {new Date(message.created_at).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 line-clamp-2">{message.content || '-'}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-500">
                            {tab === 'inbox'
                              ? sender?.full_name || sender?.email || message.sender_id || '-'
                              : sentTargetLabel(message)}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                            {messageTypeLabel(message.message_type)}
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white min-h-[420px] p-4">
              {!selectedMessage ? (
                <div className="h-full min-h-[320px] flex items-center justify-center text-sm font-semibold text-slate-500">
                  Mesaj seçildiğinde detay burada açılır.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                        {selectedMessage.subject || 'Başlıksız'}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(selectedMessage.created_at).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    {tab === 'inbox' && selectedMessage.recipient_id === currentUserId && !selectedMessage.is_read ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={13} />
                        Yeni
                      </span>
                    ) : null}
                  </div>

                  <div className="grid md:grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">Gönderen</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {(() => {
                          const sender = resolveProfile(selectedMessage.sender_id)
                          return sender?.full_name || sender?.email || selectedMessage.sender_id || '-'
                        })()}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">Hedef</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {selectedMessage.recipient_id
                          ? (() => {
                              const recipient = resolveProfile(selectedMessage.recipient_id)
                              return recipient?.full_name || recipient?.email || selectedMessage.recipient_id
                            })()
                          : sentTargetLabel(selectedMessage)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">Mesaj İçeriği</p>
                    <div className="mt-2 text-sm leading-6 text-slate-800 whitespace-pre-wrap">
                      {selectedMessage.content || '-'}
                    </div>
                  </div>

                  {selectedMessage.attachments && selectedMessage.attachments.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">Ekler</p>
                      <div className="mt-2 space-y-1.5">
                        {selectedMessage.attachments.map((url, index) => (
                          <a
                            key={`${selectedMessage.id}-att-${index}`}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-sm font-semibold text-blue-700 hover:underline break-all"
                          >
                            Ek {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedMessage.sender_id ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">
                        Gönderen Profil
                      </p>
                      <div className="mt-2 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                          {resolveProfile(selectedMessage.sender_id)?.avatar_url ? (
                            <img
                              src={resolveProfile(selectedMessage.sender_id)?.avatar_url || ''}
                              alt="Gönderen"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserCircle2 size={17} className="text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {resolveProfile(selectedMessage.sender_id)?.full_name || 'İsimsiz kullanıcı'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {resolveProfile(selectedMessage.sender_id)?.email || selectedMessage.sender_id}
                          </p>
                          <p className="text-[11px] text-slate-500">
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
        </section>
      )}
    </div>
  )
}

export default function AdminMessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <MessagesCenterContent />
    </Suspense>
  )
}
