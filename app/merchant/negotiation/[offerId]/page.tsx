'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Send, StopCircle } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'

type OfferMessage = {
  id: string
  sender_id: string | null
  content: string | null
  created_at: string
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

export default function MerchantNegotiationPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])
  const params = useParams<{ offerId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  const offerId = String(params.offerId || '')
  const targetName = searchParams.get('target') || 'Kaptan'
  const subTitle = searchParams.get('sub') || 'Konvoy'
  const isBusiness = searchParams.get('isBusiness') !== '0'

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [ending, setEnding] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [messages, setMessages] = useState<OfferMessage[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [readTrackingEnabled, setReadTrackingEnabled] = useState(true)

  const markOfferAsRead = async () => {
    if (!isBusiness || !readTrackingEnabled || !myUserId) {
      return
    }

    try {
      await supabase.from('offer_message_reads').upsert(
        {
          offer_id: offerId,
          user_id: myUserId,
          last_read_at: new Date().toISOString(),
        },
        {
          onConflict: 'offer_id,user_id',
        }
      )
    } catch {
      setReadTrackingEnabled(false)
    }
  }

  const fetchMessages = async () => {
    if (!offerId) {
      setLoading(false)
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    setMyUserId(user?.id || null)

    const { data } = await supabase
      .from('offer_messages')
      .select('id, sender_id, content, created_at')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false })

    setMessages((data || []) as OfferMessage[])
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!myUserId || !messageText.trim() || ending) {
      return
    }

    setSending(true)

    const payload = {
      offer_id: offerId,
      sender_id: myUserId,
      content: messageText.trim(),
    }

    const { error } = await supabase.from('offer_messages').insert(payload)

    if (!error) {
      setMessageText('')
      await fetchMessages()
      if (isBusiness) {
        await markOfferAsRead()
      }
    }

    setSending(false)
  }

  const endNegotiation = async () => {
    if (ending) {
      return
    }

    const confirmed = window.confirm('Bu görüşmeyi kapatmak istediğine emin misin?')
    if (!confirmed) {
      return
    }

    setEnding(true)

    const { error } = await supabase
      .from('convoy_offers')
      .update({ status: 'completed' })
      .eq('id', offerId)

    if (!error) {
      router.back()
      return
    }

    setEnding(false)
    window.alert(`Görüşme sonlandırılamadı: ${error.message}`)
  }

  useEffect(() => {
    fetchMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId])

  useEffect(() => {
    if (!offerId) {
      return
    }

    if (isBusiness) {
      markOfferAsRead()
    }

    const fetchTimer = setInterval(() => {
      fetchMessages()
    }, 2500)

    const readTimer = setInterval(() => {
      markOfferAsRead()
    }, 4000)

    return () => {
      clearInterval(fetchTimer)
      clearInterval(readTimer)
      if (isBusiness) {
        markOfferAsRead()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId, isBusiness, myUserId, readTrackingEnabled])

  return (
    <div className="min-h-screen bg-[#06080b] flex flex-col font-sans selection:bg-[#38bdf8]/30 relative overflow-hidden">
      {/* Background Tech Grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <header className="px-4 py-5 md:px-6 md:py-6 border-b border-[#2d313a] bg-[#0f1115] relative z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded border border-[#2d313a] bg-[#0a0c10] text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a1d24] transition-colors"
          >
            GERİ
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-medium text-[#e2e8f0] uppercase tracking-wide truncate">
              {decodeURIComponent(targetName)}
            </h1>
            <div className="mt-1 text-[10px] font-mono text-[#64748b] tracking-widest uppercase truncate">
              {decodeURIComponent(subTitle)}
            </div>
          </div>

          {isBusiness ? (
            <button
              type="button"
              onClick={endNegotiation}
              disabled={ending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded border border-rose-900/50 bg-rose-950/20 text-[10px] font-mono uppercase tracking-widest text-rose-400 hover:bg-rose-900/40 disabled:opacity-50 transition-colors shrink-0"
            >
              {ending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StopCircle className="w-3.5 h-3.5" />}
              SONLANDIR
            </button>
          ) : null}
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 flex flex-col relative z-10">
        <HardwarePanel className="flex-1 flex flex-col p-0 overflow-hidden bg-[#0c0e12] border-[#2d313a]">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col-reverse gap-4 custom-scrollbar">
            {loading ? (
              <div className="flex-1 flex items-center justify-center min-h-[200px]">
                <Loader2 className="w-6 h-6 animate-spin text-[#38bdf8]" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center min-h-[200px] text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                Sohbeti başlatın...
              </div>
            ) : (
              messages.map((message) => {
                const isMe = message.sender_id && myUserId ? message.sender_id === myUserId : false
                const dt = new Date(message.created_at)
                const time = Number.isNaN(dt.getTime())
                  ? '--:--'
                  : dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

                return (
                  <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] md:max-w-[70%] px-5 py-4 rounded-md border ${
                        isMe
                          ? 'bg-[#153445] border-[#226785] text-[#e2e8f0] rounded-br-none'
                          : 'bg-[#16181d] border-[#2d313a] text-[#cbd5e1] rounded-bl-none'
                      }`}
                    >
                      <div className="text-[13px] font-sans leading-relaxed whitespace-pre-wrap">
                        {message.content || ''}
                      </div>
                      <div className={`mt-3 text-[9px] font-mono tracking-widest uppercase text-right ${isMe ? 'text-[#38bdf8]/70' : 'text-[#64748b]'}`}>
                        {time}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="p-4 md:p-5 border-t border-[#1e232b] bg-[#101419]">
            <div className="flex gap-3">
              <textarea
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Mesaj yaz..."
                className="flex-1 min-h-[60px] max-h-[140px] rounded bg-[#0a0c10] px-4 py-3 text-sm font-mono text-[#e2e8f0] border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569] resize-none custom-scrollbar"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={sending || ending || !messageText.trim()}
                className="self-end w-[60px] h-[60px] shrink-0 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 flex items-center justify-center disabled:opacity-50 transition-all"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </HardwarePanel>
      </main>
    </div>
  )
}