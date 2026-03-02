import Link from 'next/link'
import { Lock, MapPin } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#06080b] flex flex-col items-center justify-center p-4 font-sans selection:bg-[#38bdf8]/30 overflow-hidden">
      
      {/* Background Tech Grid */}
      <div 
        className="pointer-events-none fixed inset-0 opacity-[0.02]" 
        style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
      />

      {/* Main Hardware Panel */}
      <section className="relative z-10 w-full max-w-md bg-[#16181d] border border-[#2d313a] rounded-xl shadow-2xl p-8 md:p-12 text-center animate-in fade-in zoom-in-95 duration-500">
        
        {/* Physical Screws / Corner Dots */}
        <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
        <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
        <div className="absolute bottom-3 left-3 w-1.5 h-1.5 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
        <div className="absolute bottom-3 right-3 w-1.5 h-1.5 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />

        {/* Top Indication Line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-[2px] bg-[#38bdf8] shadow-[0_0_10px_rgba(56,189,248,0.5)]" />

        {/* Badge */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-md bg-[#0a0c10] border border-[#2d313a] relative group">
            <div className="absolute inset-0 bg-[#38bdf8]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <MapPin className="w-8 h-8 text-[#38bdf8]" strokeWidth={1.5} />
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-medium text-[#e2e8f0] tracking-wide mb-4">MolaYeri</h1>
        
        <p className="text-sm font-mono text-[#64748b] leading-relaxed mb-10 max-w-[280px] mx-auto">
          Modern yönetim deneyimi: işletme, içerik, kampanya ve iletişim akışlarını tek merkezde kontrol et.
        </p>

        {/* Actions */}
        <div className="flex justify-center">
          <Link 
            href="/login" 
            className="w-full relative overflow-hidden transition-all duration-150 rounded-md flex items-center justify-center gap-3 uppercase text-[12px] font-mono tracking-widest select-none py-4 bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110"
          >
            <Lock size={16} strokeWidth={1.5} />
            Sisteme Giriş
          </Link>
        </div>

      </section>
    </div>
  )
}