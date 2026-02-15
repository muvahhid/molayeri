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
    <div className="min-h-screen bg-white text-slate-700 flex flex-col">
      <header className="p-5 border-b border-slate-200/70 bg-white">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 shadow-sm"
          >
            Geri
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-semibold">{decodeURIComponent(targetName)}</h1>
            <div className="text-xs text-slate-500">{decodeURIComponent(subTitle)}</div>
          </div>

          {isBusiness ? (
            <button
              type="button"
              onClick={endNegotiation}
              disabled={ending}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-orange-600 bg-orange-100 disabled:opacity-50"
            >
              {ending ? <Loader2 className="w-3 h-3 animate-spin" /> : <StopCircle className="w-3 h-3" />}
              Sonlandır
            </button>
          ) : null}
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-5 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-2 pb-3">
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-slate-500">
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
                    className={`max-w-[78%] px-4 py-3 rounded-2xl ${
                      isMe
                        ? isBusiness
                          ? 'bg-orange-500 text-white'
                          : 'bg-blue-500 text-white'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{message.content || ''}</div>
                    <div className={`mt-1 text-[10px] ${isMe ? 'text-white/80' : 'text-slate-400'}`}>{time}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="pt-3 border-t border-slate-200/70">
          <div className="flex gap-2">
            <textarea
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder="Mesaj yaz..."
              className="flex-1 min-h-16 max-h-32 rounded-xl p-3 text-sm bg-white text-slate-700 shadow-sm"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={sending || ending || !messageText.trim()}
              className="self-end w-11 h-11 rounded-xl text-white bg-orange-500 hover:bg-orange-600 flex items-center justify-center disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
