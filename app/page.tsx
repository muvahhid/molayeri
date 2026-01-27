import Link from 'next/link'
import { MapPin, ArrowRight, Lock, Store } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#eef0f4] flex flex-col items-center justify-center font-sans text-slate-600 p-6 selection:bg-orange-100 selection:text-orange-900">
      
      {/* CARD CONTAINER */}
      <div className="bg-[#eef0f4] rounded-[40px] shadow-[12px_12px_24px_#d1d5db,-12px_-12px_24px_#ffffff] border border-white/60 p-10 md:p-14 max-w-md w-full text-center relative overflow-hidden">
        
        {/* DECORATIVE BLUR */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-400/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* LOGO AREA */}
        <div className="w-24 h-24 bg-[#eef0f4] rounded-3xl flex items-center justify-center text-orange-500 shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff] mx-auto mb-8 border border-white/50">
          <MapPin className="w-10 h-10 drop-shadow-sm" />
        </div>

        <h1 className="text-3xl font-black text-slate-700 mb-2 tracking-tight">MolaYeri</h1>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-10">İşletme Yönetim Portalı</p>

        {/* ACTION BUTTONS */}
        <div className="space-y-6 relative z-10">
          
          {/* İŞLETME EKLE BUTONU (PRIMARY) */}
          <Link 
            href="/register/business" 
            className="group relative block w-full py-5 rounded-2xl font-black text-sm uppercase tracking-wide text-white shadow-[6px_6px_20px_rgba(249,115,22,0.4),-6px_-6px_20px_rgba(255,255,255,0.8)] transition-all hover:-translate-y-1 active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600"></div>
            <div className="relative flex items-center justify-center gap-3">
              <Store className="w-5 h-5"/>
              İşletmeni Kaydet
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
            </div>
          </Link>

          {/* GİRİŞ YAP LINKI (SECONDARY) */}
          <Link 
            href="/login" 
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-slate-500 text-sm hover:text-orange-600 hover:bg-[#eef0f4] hover:shadow-[4px_4px_8px_#d1d5db,-4px_-4px_8px_#ffffff] transition-all border border-transparent hover:border-white/50"
          >
            <Lock className="w-4 h-4"/>
            Yönetici Girişi
          </Link>

        </div>

      </div>

      {/* FOOTER */}
      <div className="mt-12 flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
        <div className="w-8 h-1 bg-slate-300 rounded-full"></div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          © 2026 MolaYeri Inc. Gizli Proje
        </p>
      </div>

    </div>
  )
}