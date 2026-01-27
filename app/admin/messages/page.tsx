'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { 
  Send, Paperclip, Image as ImageIcon, X, 
  Bold, Italic, List, AlignLeft, User, 
  Users, Store, Search, Loader2, CheckCircle, Reply,
  MessageSquare, Type, Link as LinkIcon, Eye
} from 'lucide-react'

// --- ULTRA CLEAN NEUMORPHIC SYSTEM ---

// Temel Renk: #eef0f4 (Daha beyaz, daha ferah)
const BG_COLOR = "bg-[#eef0f4]"
const TEXT_MAIN = "text-slate-600"
const TEXT_MUTED = "text-slate-400"

// Gölgeler: Keskin ama yumuşak (Blur 20px, Opacity düşük)
const SHADOW_OUT = "shadow-[10px_10px_20px_#d1d5db,-10px_-10px_20px_#ffffff]"
const SHADOW_IN = "shadow-[inset_6px_6px_12px_#d1d5db,inset_-6px_-6px_12px_#ffffff]"
const SHADOW_FLOAT = "shadow-[14px_14px_28px_#d1d5db,-14px_-14px_28px_#ffffff]"

const NeuCard = ({ children, className = "" }: any) => (
  <div className={`${BG_COLOR} rounded-[32px] ${SHADOW_OUT} border border-white/50 ${className}`}>
    {children}
  </div>
)

const NeuButton = ({ onClick, children, variant = "primary", className = "", disabled=false, title="" }: any) => {
  const base = "transition-all duration-300 ease-out rounded-2xl font-bold flex items-center justify-center gap-2 select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.96]"
  
  // Primary: Dışa çıkık
  const primary = `${BG_COLOR} ${TEXT_MAIN} ${SHADOW_OUT} border border-white/60 hover:text-blue-600 hover:-translate-y-0.5`
  
  // Active: İçe basık (Gömülü)
  const active = `${BG_COLOR} text-blue-600 ${SHADOW_IN} border border-transparent`
  
  // Solid: Renkli
  const solid = `bg-blue-600 text-white shadow-[6px_6px_15px_rgba(37,99,235,0.3),-6px_-6px_15px_rgba(255,255,255,0.8)] hover:bg-blue-700`

  let style = primary
  if (variant === 'active') style = active
  if (variant === 'solid') style = solid

  return (
    <button onClick={onClick} disabled={disabled} title={title} className={`${base} ${style} ${className}`}>
      {children}
    </button>
  )
}

const NeuInput = ({ ...props }: any) => (
  <div className="relative">
    <input 
      {...props}
      className={`w-full ${BG_COLOR} px-6 py-5 rounded-2xl ${TEXT_MAIN} font-bold text-sm outline-none transition-all
      ${SHADOW_IN} border border-transparent focus:text-blue-700 placeholder:text-slate-400/70`}
    />
  </div>
)

// --- RICH EDITOR TOOLBAR BUTTON ---
const ToolbarBtn = ({ icon: Icon, onClick, active }: any) => (
  <button 
    onClick={onClick}
    className={`p-2 rounded-lg transition-all ${active ? 'bg-slate-200 text-blue-600 shadow-inner' : 'text-slate-500 hover:bg-white hover:text-blue-500 hover:shadow-sm'}`}
  >
    <Icon className="w-5 h-5"/>
  </button>
)

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose'>('inbox')
  
  // COMPOSE STATE
  const [targetType, setTargetType] = useState<'broadcast_all' | 'broadcast_business' | 'single'>('broadcast_all')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [targetUserId, setTargetUserId] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // INBOX STATE
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (activeTab === 'inbox') fetchMessages()
  }, [activeTab])

  const fetchMessages = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*, profiles:sender_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) setMessages(data)
    setLoading(false)
  }

  // --- EDITOR LOGIC (Markdown Insert) ---
  const insertFormat = (startTag: string, endTag: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    
    const before = text.substring(0, start)
    const selection = text.substring(start, end)
    const after = text.substring(end)

    // Seçili metni sar veya imleç konumuna ekle
    const newText = before + startTag + selection + endTag + after
    setContent(newText)

    // İmleci içeriğin sonuna veya ortasına getir
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + startTag.length, end + startTag.length)
    }, 0)
  }

  const handleSend = async () => {
    if (!subject || !content) return alert('Konu ve mesaj içeriği zorunludur.')
    setSending(true)

    try {
      // Dosya Yükleme
      const attachmentUrls: string[] = []
      if (files.length > 0) {
        for (const file of files) {
          const fileName = `${Date.now()}-${file.name}`
          const { error: uploadError } = await supabase.storage.from('message-attachments').upload(fileName, file)
          if (!uploadError) {
             const { data } = supabase.storage.from('message-attachments').getPublicUrl(fileName)
             attachmentUrls.push(data.publicUrl)
          }
        }
      }

      const { data: userData } = await supabase.auth.getUser()
      const payload = {
        sender_id: userData.user?.id,
        recipient_id: targetType === 'single' ? targetUserId : null,
        subject,
        content, // Markdown içerik gider
        message_type: targetType === 'single' ? 'direct' : targetType,
        attachments: attachmentUrls
      }

      const { error } = await supabase.from('messages').insert(payload)
      if (error) throw error
      
      alert('Mesaj başarıyla gönderildi!')
      setSubject('')
      setContent('')
      setFiles([])
      setPreviewMode(false)
      setActiveTab('inbox')
      fetchMessages()

    } catch (err: any) {
      alert('Hata: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`h-full flex flex-col font-sans text-slate-600 ${BG_COLOR} rounded-[40px] overflow-hidden`}>
      
      {/* HEADER & TABS */}
      <div className="pt-8 px-8 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-700 tracking-tight">Mesaj Merkezi</h1>
          <p className="text-slate-500 mt-2 font-medium ml-1">Kullanıcı iletişimi ve sistem duyuruları.</p>
        </div>
        
        <div className={`p-2 ${BG_COLOR} rounded-2xl ${SHADOW_IN} flex gap-2`}>
           <button 
             onClick={() => setActiveTab('inbox')}
             className={`px-6 py-3 rounded-xl font-bold text-xs transition-all ${activeTab === 'inbox' ? `${BG_COLOR} text-blue-600 shadow-[4px_4px_10px_#d1d5db,-4px_-4px_10px_#ffffff]` : 'text-slate-400 hover:text-slate-600'}`}
           >
             Gelen Kutusu
           </button>
           <button 
             onClick={() => setActiveTab('compose')}
             className={`px-6 py-3 rounded-xl font-bold text-xs transition-all ${activeTab === 'compose' ? `${BG_COLOR} text-blue-600 shadow-[4px_4px_10px_#d1d5db,-4px_-4px_10px_#ffffff]` : 'text-slate-400 hover:text-slate-600'}`}
           >
             Yeni Mesaj
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative p-8">
        
        {/* --- INBOX TAB --- */}
        {activeTab === 'inbox' && (
          <NeuCard className="h-full flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
              {loading ? <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div> : (
                messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-50">
                    <MessageSquare className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-400">Gelen kutusu boş</h3>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`group p-6 rounded-3xl transition-all duration-300 border border-transparent hover:border-white ${BG_COLOR} hover:${SHADOW_OUT} cursor-pointer`}>
                        <div className="flex justify-between items-start mb-3">
                           <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl ${BG_COLOR} flex items-center justify-center text-blue-500 shadow-md border border-white`}>
                                <User className="w-6 h-6"/>
                              </div>
                              <div>
                                <h4 className="font-black text-slate-700 text-lg">{msg.profiles?.full_name || 'Bilinmeyen'}</h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${msg.message_type === 'direct' ? 'bg-blue-400' : 'bg-purple-400'}`}>
                                  {msg.message_type === 'direct' ? 'ÖZEL MESAJ' : 'DUYURU'}
                                </span>
                              </div>
                           </div>
                           <span className="text-xs font-bold text-slate-400">{new Date(msg.created_at).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <h5 className="font-bold text-slate-600 mb-2 ml-16">{msg.subject}</h5>
                        <p className="text-sm text-slate-500 ml-16 line-clamp-2">{msg.content}</p>
                    </div>
                  ))
                )
              )}
            </div>
          </NeuCard>
        )}

        {/* --- COMPOSE TAB --- */}
        {activeTab === 'compose' && (
          <div className="h-full flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
            
            {/* LEFT: Editor Area */}
            <div className="flex-1 flex flex-col gap-6">
              
              {/* Target Selection */}
              <div className="flex gap-4">
                 {[
                   { id: 'broadcast_all', icon: Users, label: 'TÜM ÜYELER' },
                   { id: 'broadcast_business', icon: Store, label: 'İŞLETMELER' },
                   { id: 'single', icon: User, label: 'TEK KİŞİ' }
                 ].map((t) => (
                   <NeuButton 
                     key={t.id}
                     onClick={() => setTargetType(t.id as any)} 
                     variant={targetType === t.id ? 'active' : 'primary'}
                     className="flex-1 py-4 text-xs"
                   >
                      <t.icon className="w-5 h-5"/> {t.label}
                   </NeuButton>
                 ))}
              </div>

              {targetType === 'single' && (
                 <div className="animate-in slide-in-from-top-2">
                    <NeuInput placeholder="Kullanıcı UUID (Örn: 550e8400-e29b...)" value={targetUserId} onChange={(e:any) => setTargetUserId(e.target.value)} />
                 </div>
              )}

              <div className="space-y-4 flex-1 flex flex-col">
                 <NeuInput placeholder="Konu Başlığı..." value={subject} onChange={(e:any) => setSubject(e.target.value)} />
                 
                 {/* RICH EDITOR CONTAINER */}
                 <div className={`flex-1 flex flex-col rounded-[24px] ${BG_COLOR} ${SHADOW_IN} overflow-hidden border border-white/50 relative`}>
                    
                    {/* Toolbar */}
                    <div className="flex items-center gap-1 p-3 border-b border-slate-200/50 bg-white/20 backdrop-blur-sm">
                       <ToolbarBtn icon={Bold} onClick={() => insertFormat('**', '**')} />
                       <ToolbarBtn icon={Italic} onClick={() => insertFormat('*', '*')} />
                       <ToolbarBtn icon={LinkIcon} onClick={() => insertFormat('[Link Adı](', ')')} />
                       <div className="w-px h-6 bg-slate-300/50 mx-2"></div>
                       <ToolbarBtn icon={List} onClick={() => insertFormat('\n- ')} />
                       <ToolbarBtn icon={Type} onClick={() => insertFormat('\n# ')} />
                       <div className="flex-1"></div>
                       <button 
                         onClick={() => setPreviewMode(!previewMode)}
                         className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${previewMode ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-white'}`}
                       >
                         <Eye className="w-4 h-4"/> {previewMode ? 'Düzenle' : 'Önizle'}
                       </button>
                    </div>

                    {/* TextArea or Preview */}
                    <div className="flex-1 relative">
                       {previewMode ? (
                         <div className="absolute inset-0 p-6 overflow-y-auto prose prose-slate prose-sm max-w-none">
                            {/* Basit Markdown Önizlemesi */}
                            {content.split('\n').map((line, i) => {
                               if(line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mb-2">{line.slice(2)}</h1>
                               if(line.startsWith('- ')) return <li key={i} className="ml-4">{line.slice(2)}</li>
                               return <p key={i} className="min-h-[1rem]">{line}</p>
                            })}
                         </div>
                       ) : (
                         <textarea 
                           ref={textareaRef}
                           className={`w-full h-full bg-transparent p-6 text-slate-700 font-medium text-sm outline-none resize-none leading-relaxed`}
                           placeholder="Mesajınızı buraya yazın..."
                           value={content}
                           onChange={(e) => setContent(e.target.value)}
                         ></textarea>
                       )}
                    </div>

                 </div>
              </div>
            </div>

            {/* RIGHT: Sidebar */}
            <div className="w-full lg:w-80 flex flex-col gap-6">
              
              <NeuCard className="p-6">
                 <h3 className="text-xs font-black text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-2"><Paperclip className="w-4 h-4"/> EKLER</h3>
                 <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => {if(e.target.files) setFiles(Array.from(e.target.files))}} />
                 
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className={`w-full py-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition-all group flex flex-col items-center gap-2`}
                 >
                    <div className={`w-12 h-12 rounded-xl ${BG_COLOR} ${SHADOW_OUT} flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors`}>
                       <ImageIcon className="w-6 h-6"/>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">DOSYA EKLE</span>
                 </button>

                 {files.length > 0 && (
                   <div className="mt-4 space-y-2">
                     {files.map((f, i) => (
                       <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${BG_COLOR} ${SHADOW_OUT} border border-white/60`}>
                          <span className="text-xs font-bold text-slate-600 truncate max-w-[120px]">{f.name}</span>
                          <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><X className="w-4 h-4"/></button>
                       </div>
                     ))}
                   </div>
                 )}
              </NeuCard>

              <NeuButton onClick={handleSend} variant="solid" className="py-5 text-lg shadow-xl shadow-blue-500/20" disabled={sending}>
                 {sending ? <Loader2 className="animate-spin w-6 h-6"/> : <><Send className="w-5 h-5"/> GÖNDER</>}
              </NeuButton>

              <div className="text-[10px] text-slate-400 text-center leading-relaxed px-4">
                 Toplu gönderimler yoğunluğa göre sırayla iletilir. Spam kurallarına uyunuz.
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  )
}
