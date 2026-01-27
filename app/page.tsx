import Link from 'next/link'
import { 
  MapPin, Star, Smartphone, ArrowRight, CheckCircle, 
  Store, ShieldCheck, ChevronRight, Menu 
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-600 selection:bg-blue-100 selection:text-blue-900">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <MapPin className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black text-slate-800 tracking-tight">MolaYeri</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Özellikler</Link>
            <Link href="#download" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Uygulamayı İndir</Link>
            
            <div className="w-px h-6 bg-slate-200"></div>
            
            <Link href="/login" className="text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors">
              Giriş Yap
            </Link>
            
            <Link 
              href="/register/business" 
              className="px-6 py-2.5 bg-slate-900 text-white rounded-full text-sm font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <Store className="w-4 h-4"/>
              İşletmeni Ekle
            </Link>
          </div>

          {/* Mobile Menu Icon */}
          <button className="md:hidden p-2 text-slate-600">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4 -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-50 rounded-full blur-3xl opacity-50 translate-y-1/4 -translate-x-1/4 -z-10"></div>

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Content */}
          <div className="space-y-8 animate-in slide-in-from-left-8 duration-700 fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-black uppercase tracking-wider">
              <Star className="w-3 h-3 fill-blue-600" />
              Türkiye'nin En Kapsamlı Mola Rehberi
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
              Yolculuğun Keyfi <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Molada Çıkar.</span>
            </h1>
            
            <p className="text-lg text-slate-500 leading-relaxed max-w-lg">
              Sadece bir benzinlik değil, ailenizle güvenle durabileceğiniz, temiz, kaliteli ve bol seçenekli mola yerlerini keşfedin.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link 
                href="/register/business" 
                className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                <Store className="w-5 h-5"/>
                İşletmeni Ücretsiz Ekle
              </Link>
              
              <button className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-lg hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                <Smartphone className="w-5 h-5"/>
                Uygulamayı İndir
              </button>
            </div>

            <div className="flex items-center gap-4 text-sm font-medium text-slate-400 pt-4">
              <div className="flex -space-x-2">
                 {[1,2,3,4].map(i => (
                   <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200"></div>
                 ))}
              </div>
              <p>10.000+ Mutlu Yolcu</p>
            </div>
          </div>

          {/* Right Image (Phone Mockup) */}
          <div className="relative flex justify-center lg:justify-end animate-in slide-in-from-right-8 duration-1000 fade-in">
             {/* Decorative Circle */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-slate-200 rounded-full opacity-50"></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] border border-slate-200 rounded-full opacity-50"></div>

             {/* Phone Frame */}
             <div className="relative w-[320px] h-[650px] bg-slate-900 rounded-[50px] p-3 shadow-2xl shadow-blue-900/20 border-4 border-slate-800 rotate-[-6deg] hover:rotate-0 transition-transform duration-500">
                {/* Screen Content PlaceHolder */}
                <div className="w-full h-full bg-slate-100 rounded-[38px] overflow-hidden relative">
                   {/* BURAYA KENDİ EKRAN GÖRÜNTÜNÜ KOYACAKSIN */}
                   <img 
                     src="https://images.unsplash.com/photo-1512428559087-560fa0db7901?q=80&w=800&auto=format&fit=crop" 
                     className="w-full h-full object-cover opacity-80"
                     alt="Uygulama Ekranı"
                   />
                   
                   {/* Fake UI Overlay */}
                   <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur p-4 rounded-2xl shadow-lg">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <Store className="w-5 h-5 text-orange-600"/>
                         </div>
                         <div>
                            <div className="font-bold text-slate-800 text-sm">Lezzet Durağı</div>
                            <div className="text-xs text-slate-500">3 km • Açık • Mescit Var</div>
                         </div>
                      </div>
                   </div>
                </div>
                
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-2xl"></div>
             </div>
          </div>

        </div>
      </section>

      {/* --- FOR BUSINESS OWNERS (CTA) --- */}
      <section className="bg-slate-900 py-20 overflow-hidden relative">
         <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
         
         <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
            <span className="text-blue-400 font-bold tracking-widest uppercase text-xs">İŞLETMECİLER İÇİN</span>
            <h2 className="text-3xl md:text-5xl font-black text-white mt-4 mb-6">Milyonlarca Yolcu Sizi Arıyor</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg mb-10">
              MolaYeri'ne kaydolarak işletmenizi haritada öne çıkarın, özelliklerinizi tanıtın ve gelirinizi artırın. Kurulum sadece 2 dakika.
            </p>

            <Link 
               href="/register/business" 
               className="inline-flex items-center gap-3 px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/50 hover:scale-105"
            >
               <Store className="w-6 h-6"/>
               Hemen Başvuru Yap
               <ChevronRight className="w-5 h-5"/>
            </Link>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl mx-auto">
               <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <CheckCircle className="w-8 h-8 text-green-400 mb-4"/>
                  <h4 className="text-white font-bold text-lg">Ücretsiz Listeleme</h4>
                  <p className="text-slate-400 text-sm mt-2">İşletmenizi eklemek ve temel özelliklerinizi göstermek tamamen ücretsizdir.</p>
               </div>
               <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <Smartphone className="w-8 h-8 text-purple-400 mb-4"/>
                  <h4 className="text-white font-bold text-lg">Mobil Görünürlük</h4>
                  <p className="text-slate-400 text-sm mt-2">Kullanıcılar yoldayken sizi "En Yakın Mola Yeri" olarak görür.</p>
               </div>
               <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <ShieldCheck className="w-8 h-8 text-orange-400 mb-4"/>
                  <h4 className="text-white font-bold text-lg">Onaylı İşletme Rozeti</h4>
                  <p className="text-slate-400 text-sm mt-2">Güvenilir işletme olduğunuzu kanıtlayın, puanlarınızı artırın.</p>
               </div>
            </div>
         </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-16">
              <h2 className="text-3xl font-black text-slate-800">Neden MolaYeri?</h2>
              <p className="text-slate-500 mt-4">Sıradan bir harita uygulamasından çok daha fazlası.</p>
           </div>

           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: "Detaylı Filtreleme", desc: "Sadece mescidi olan veya 24 saat açık yerleri mi arıyorsunuz? Tek tıkla bulun.", icon: MapPin, color: "blue" },
                { title: "Gerçek Yorumlar", desc: "Sadece o konumda bulunmuş gerçek kullanıcıların yorumlarını okuyun.", icon: Star, color: "orange" },
                { title: "Kapsamlı Rehber", desc: "Benzinlik, restoran, otel ve daha fazlası tek bir uygulamada.", icon: Store, color: "purple" },
                { title: "Rota Planlama", desc: "Yolculuğa çıkmadan önce duracağınız noktaları belirleyin, sürpriz yaşamayın.", icon: ArrowRight, color: "green" }
              ].map((f, i) => (
                <div key={i} className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow border border-slate-100">
                   <div className={`w-12 h-12 rounded-2xl bg-${f.color}-50 flex items-center justify-center text-${f.color}-600 mb-6`}>
                      <f.icon className="w-6 h-6"/>
                   </div>
                   <h3 className="font-bold text-slate-800 text-xl mb-3">{f.title}</h3>
                   <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-slate-200 py-12">
         <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white">
                 <MapPin className="w-4 h-4" />
               </div>
               <span className="font-black text-slate-800">MolaYeri</span>
            </div>
            
            <div className="text-sm text-slate-500 font-medium">
               © 2024 MolaYeri Inc. Tüm hakları saklıdır.
            </div>

            <div className="flex gap-6">
               <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors">Gizlilik</a>
               <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors">Kullanım Şartları</a>
               <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors">İletişim</a>
            </div>
         </div>
      </footer>

    </div>
  )
}
