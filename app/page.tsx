import Link from 'next/link'
import { MapPin, Smartphone, ShieldCheck, Zap, ChevronRight, Star } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500 selection:text-white">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
              MolaYeri
            </span>
          </div>
          <div className="flex gap-4">
             {/* Admin Giriş Linki - Sadece bilen tıklar */}
            <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              İşletme Girişi
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Arkaplan Efektleri */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10" />
        
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-800 text-blue-300 text-xs font-semibold mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Yapay Zeka Destekli Rota Planlayıcı
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white mb-6">
            Yolculuğun <span className="text-blue-500">Akıllı</span> Hali
          </h1>
          <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Sadece gitmek yetmez. MolaYeri, rotanız üzerindeki en kaliteli tesisleri, camileri ve lezzet duraklarını sizin için planlar.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2 w-full sm:w-auto justify-center">
              <Smartphone className="w-5 h-5" />
              App Store'dan İndir
            </button>
            <button className="px-8 py-4 bg-slate-800 text-white border border-slate-700 rounded-xl font-bold hover:bg-slate-700 transition-all w-full sm:w-auto">
              Google Play'de Keşfet
            </button>
          </div>
        </div>
      </section>

      {/* --- ÖZELLİKLER (FEATURES) --- */}
      <section className="py-24 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Neden MolaYeri?</h2>
            <p className="text-slate-400">Sıradan bir navigasyon değil, yol arkadaşınız.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Kart 1 */}
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 transition-colors group">
              <div className="w-12 h-12 bg-blue-900/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="text-blue-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Akıllı Rota Analizi</h3>
              <p className="text-slate-400 leading-relaxed">
                Rotanızı çizin, yapay zeka yorgunluk durumunuza göre en ideal mola noktalarını size önersin.
              </p>
            </div>

            {/* Kart 2 */}
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 transition-colors group">
              <div className="w-12 h-12 bg-purple-900/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="text-purple-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Doğrulanmış İşletmeler</h3>
              <p className="text-slate-400 leading-relaxed">
                Sürpriz yok. Sadece MolaYeri ekibi ve topluluk tarafından onaylanmış, güvenilir tesisler.
              </p>
            </div>

            {/* Kart 3 */}
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-green-500/50 transition-colors group">
              <div className="w-12 h-12 bg-green-900/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Star className="text-green-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Topluluk Odaklı</h3>
              <p className="text-slate-400 leading-relaxed">
                Kendi favori mola yerinizi ekleyin, yorum yapın, diğer yolculara rehberlik edin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- CTA / FOOTER --- */}
      <footer className="py-12 text-center border-t border-slate-800">
        <div className="flex items-center justify-center gap-2 mb-4">
           <MapPin className="text-blue-500 w-5 h-5" />
           <span className="text-xl font-bold text-white">MolaYeri</span>
        </div>
        <p className="text-slate-500 text-sm">
          © 2026 MolaYeri A.Ş. Tüm hakları saklıdır. <br />
          İstanbul, Türkiye
        </p>
      </footer>
    </div>
  )
}
