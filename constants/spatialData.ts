import type { LucideIcon } from 'lucide-react'
import {
  Route, Wallet, Mic2, ShieldAlert, Radio, Users,
  Navigation, Target, Map, Tag, CreditCard, Smartphone, MapPin,
  Store, Megaphone, Handshake, BarChart3,
  LayoutDashboard, ClipboardList, Bell
} from 'lucide-react'

export type SpatialFeatureItem = {
  title: string
  desc: string
  icon: LucideIcon
}

export type SpatialSection = {
  id: string
  title: string
  navLabel?: string
  icon: LucideIcon
  color: string
  glow: string
  features: SpatialFeatureItem[]
}

export const THEME = {
  bg: 'bg-[#050811]',
  textDark: 'text-white',
  textMuted: 'text-white/60',
  highwayYellow: '#FF7043',
  highwayYellowGlow: 'rgba(255, 112, 67, 0.7)'
}

export const SPATIAL = {
  glassContainer: 'bg-white/[0.02] backdrop-blur-3xl border border-white/[0.05] border-t-white/[0.15] border-l-white/[0.12] shadow-[0_24px_48px_rgba(0,0,0,0.6)]',
  glassCard: 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.04] border-t-white/[0.1] border-l-white/[0.08] shadow-[0_10px_20px_rgba(0,0,0,0.4)]',
  glassInput: 'bg-black/40 border border-white/[0.05] shadow-inner',
  glassButton: 'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all duration-300',
  phoneBezel: 'bg-black border border-white/[0.15] shadow-[0_0_50px_rgba(0,0,0,0.8)]',
  phoneScreen: 'bg-[#070A12]'
}

export const SECTIONS_DATA: SpatialSection[] = [
  {
    id: 'radar', title: 'Akıllı Keşif Radarı', icon: Route, color: 'text-[#FF8A3D]', glow: 'bg-[#FF7043]/20',
    features: [
      { title: 'Güzergaha Göre', desc: 'Başlangıç ve hedefi verdikten sonra rota hattını temel alır; yol üstündeki işletmeleri sapma mantığıyla sıralar.', icon: Navigation },
      { title: 'Mesafeye Göre', desc: 'Bulunduğun konumu merkez kabul eder; seçtiğin kilometre yarıçapında çevrendeki noktaları hızlıca tarar.', icon: Map },
      { title: 'Nokta Atışı', desc: 'Kategori, puan, kampanya ve ihtiyaca göre filtreleme yapar; gereksiz sonuçları ayıklayıp en doğru durakları bırakır.', icon: Target }
    ]
  },
  {
    id: 'wallet', title: 'Cüzdan & POS', icon: Wallet, color: 'text-[#38BDF8]', glow: 'bg-[#29B6F6]/20',
    features: [
      { title: 'Kullanıcı Cüzdanı', desc: 'Kart, bakiye, kuponlar ve güvenli QR aynı ekranda. Kullanıcı kasada tek akışla ödeme akışına hazır olur.', icon: CreditCard },
      { title: 'Kupon + Ödeme Tek QR', desc: 'İşletmeci POS kamerayla tek QR okutur; ödeme tahsilatı ve kupon indirimi aynı doğrulama akışında tamamlanır.', icon: Smartphone },
      { title: 'Mola Yerlerim Akışı', desc: 'Kullanıcı işletmeyi Mola Yerlerim’e ekler; teklif ve kupon akışı mesajlar ekranına düşer.', icon: Tag }
    ]
  },
  {
    id: 'convoy', title: 'Dijital Konvoy', icon: Mic2, color: 'text-[#4ADE80]', glow: 'bg-[#4ADE80]/20',
    features: [
      { title: 'Ses Odaları & Sohbet', desc: 'Aktif konvoy ekranında bas-konuş ve metin sohbet birlikte çalışır; sürüş sırasında ekip iletişimde kalır.', icon: Radio },
      { title: 'Lider Haritası', desc: 'Lider haritasında konvoy dizilimi, yön ve canlı durum tek bakışta görünür; konvoy içi koordinasyon hızlanır.', icon: Users },
      { title: 'Konvoy Teklifleri', desc: 'Konvoylara gönderilen teklif ve kuponlar tek akışta görünür; sürücü ekip hızlıca hareket planını günceller.', icon: ShieldAlert }
    ]
  },
  {
    id: 'long-road', title: 'Uzun Yol', icon: Radio, color: 'text-[#C084FC]', glow: 'bg-[#C084FC]/20',
    features: [
      { title: 'Sesli Sohbet Odaları', desc: 'Sabit ve dinamik odalar tek panelde görünür; sürücüler tek dokunuşla sohbete katılır.', icon: Mic2 },
      { title: 'Katıldığım Oda Akışı', desc: 'Katıldığın odada katılımcı listesi, konuşan durumları ve hızlı ses kontrolü bir arada.', icon: Users },
      { title: 'Kampanya Akışı', desc: 'Uzun yol kampanyaları konuma göre listelenir; yakıt/yemek teklifleri kuponla değerlendirilir.', icon: Tag }
    ]
  },
  {
    id: 'panic', title: 'Panik Modu', icon: ShieldAlert, color: 'text-[#E53935]', glow: 'bg-[#E53935]/20',
    features: [
      { title: 'Tek Dokunuş Acil Akış', desc: 'Ana sayfadaki panik butonu ile acil mod açılır; kullanıcı doğrudan yardım akışına girer.', icon: ShieldAlert },
      { title: 'Canlı Konum ve Yön', desc: 'Konum alınır, rotadaki acil ihtiyaç noktaları hızlıca taranır ve kullanıcı yönlendirilir.', icon: MapPin },
      { title: 'Anında Yardım Görünümü', desc: 'Yakıt, şarj ve servis için yakın noktalar tek panelde görünür; anında GİT aksiyonu alır.', icon: Navigation }
    ]
  }
]

export const MERCHANT_SECTIONS_DATA: SpatialSection[] = [
  {
    id: 'merchant-pulse',
    title: 'Nabız',
    navLabel: 'Nabız',
    icon: BarChart3,
    color: 'text-[#FF8A3D]',
    glow: 'bg-[#FF8A3D]/20',
    features: [
      { title: 'Görünme', desc: 'İşletmenin arama sonuçlarında kaç kez göründüğünü zaman kırılımında izlersin.', icon: Target },
      { title: 'Ziyaret', desc: 'İşletme kartı ve sayfa etkileşimlerini canlı olarak takip edersin.', icon: Users },
      { title: 'Mola', desc: 'Mola\'ya ekleme dönüşümünü tek bakışta görür, anlık artışı yakalarsın.', icon: Tag }
    ]
  },
  {
    id: 'merchant-branch',
    title: 'Şube',
    navLabel: 'Şube',
    icon: Store,
    color: 'text-[#38BDF8]',
    glow: 'bg-[#38BDF8]/20',
    features: [
      { title: 'Bilgiler', desc: 'Şube adı, iletişim, konum ve temel profil alanlarını tek merkezden yönetirsin.', icon: LayoutDashboard },
      { title: 'Kategori', desc: 'Kategori ve özellik bağlarını şubeye göre düzenler, görünürlüğü optimize edersin.', icon: ClipboardList },
      { title: 'Medya', desc: 'Fotoğraf ve vitrin görsellerini güncelleyerek şubenin ilk izlenimini güçlendirirsin.', icon: Bell }
    ]
  },
  {
    id: 'merchant-vitrin',
    title: 'Vitrin',
    navLabel: 'Vitrin',
    icon: LayoutDashboard,
    color: 'text-[#4ADE80]',
    glow: 'bg-[#4ADE80]/20',
    features: [
      { title: 'Menü', desc: 'Ürün ve fiyat akışını düzenleyip menü içeriklerini hızlıca yayınlarsın.', icon: ClipboardList },
      { title: 'Hizmet', desc: 'Sunulan hizmet kalemlerini tek listede yönetir, görünürlük sırasını belirlersin.', icon: Smartphone },
      { title: 'Şarj', desc: 'Şarj altyapısı detaylarını ekleyip elektrikli araç kullanıcılarına net bilgi verirsin.', icon: MapPin }
    ]
  },
  {
    id: 'merchant-campaign',
    title: 'Kampanya',
    navLabel: 'Kampanya',
    icon: Megaphone,
    color: 'text-[#C084FC]',
    glow: 'bg-[#C084FC]/20',
    features: [
      { title: 'Etiket', desc: 'Kısa kampanya notlarını hızlı biçimde üretip işletme kartında öne çıkarırsın.', icon: Tag },
      { title: 'Uzunyol', desc: 'Uzun yol kitlesine özel kampanya akışlarını mesafe odaklı kurgularsın.', icon: Route },
      { title: 'Yayın', desc: 'Aktif ve pasif kampanyaları tek panelde açıp kapatarak ritmi kontrol edersin.', icon: Bell }
    ]
  },
  {
    id: 'merchant-coupon',
    title: 'Kupon',
    navLabel: 'Kupon',
    icon: Tag,
    color: 'text-[#F59E0B]',
    glow: 'bg-[#F59E0B]/20',
    features: [
      { title: 'Oluştur', desc: 'Yüzde, hediye veya ürün tipi kuponları birkaç adımda üretirsin.', icon: ClipboardList },
      { title: 'Dağıtım', desc: 'Kuponların aktiflik durumunu ve detay görünürlüğünü hedefe göre ayarlarsın.', icon: Megaphone },
      { title: 'Analiz', desc: 'Kullanım, fayda ve dönüşüm etkisini canlı metriklerle ölçersin.', icon: BarChart3 }
    ]
  },
  {
    id: 'merchant-convoy',
    title: 'Konvoy',
    navLabel: 'Konvoy',
    icon: Handshake,
    color: 'text-[#22D3EE]',
    glow: 'bg-[#22D3EE]/20',
    features: [
      { title: 'Aktif', desc: 'Canlı konvoyları rota, lider ve yakınlık bilgisiyla eşzamanlı izlersin.', icon: Users },
      { title: 'Plan', desc: 'Planlanan konvoyları zaman ve kapasiteye göre düzenleyip hazırlık yaparsın.', icon: Route },
      { title: 'Teklif', desc: 'Konvoy ekiplerine teklif gönderip görüşme akışını tek ekrandan yönetirsin.', icon: Handshake }
    ]
  },
  {
    id: 'merchant-target',
    title: 'Hedef',
    navLabel: 'Hedef',
    icon: Target,
    color: 'text-[#F472B6]',
    glow: 'bg-[#F472B6]/20',
    features: [
      { title: 'Radar', desc: 'Yakındaki potansiyel müşterileri yarıçap ve kategoriye göre hızlıca tararsın.', icon: Radio },
      { title: 'Mola', desc: 'Mola hedef listesine teklif bağlayıp lokasyon tabanlı aksiyon planı kurarsın.', icon: Navigation },
      { title: 'Toplu', desc: 'Seçili hedeflere toplu kampanya ve kupon iletimini tek komutla tamamlarsın.', icon: Megaphone }
    ]
  },
  {
    id: 'merchant-revenue',
    title: 'Gelir',
    navLabel: 'Gelir',
    icon: Wallet,
    color: 'text-[#FF5D5D]',
    glow: 'bg-[#FF5D5D]/20',
    features: [
      { title: 'Özet', desc: 'Günlük işlem, tahsilat ve net gelir göstergelerini tek kartta toplarsın.', icon: Wallet },
      { title: 'İşlem', desc: 'Kasa hareketlerini kupon etkisiyle birlikte detaylı biçimde incelersin.', icon: CreditCard },
      { title: 'Ödeme', desc: 'Ödeme altyapısı ve alt üye kurulum adımlarını güvenli şekilde tamamlarsın.', icon: Smartphone }
    ]
  }
]
