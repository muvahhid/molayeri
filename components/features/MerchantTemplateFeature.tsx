'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MERCHANT_SECTIONS_DATA, type SpatialSection } from '../../constants/spatialData'
import { 
  MapPin, Search, Store, 
  Tag, BellRing, Navigation, UtensilsCrossed, 
  Zap, Fuel, CheckCircle2, DollarSign,
  QrCode, PieChart, ShieldCheck
} from 'lucide-react'

// --- RENK VE DATA YAPILARI ---
const MERCHANT_ACCENT_BY_ID: Record<string, string> = {
  'merchant-pulse': '#FF8A3D',   // Turuncu
  'merchant-branch': '#38BDF8',  // Mavi
  'merchant-vitrin': '#4ADE80',  // Yeşil
  'merchant-campaign': '#C084FC',// Mor
  'merchant-coupon': '#F59E0B',  // Sarı
  'merchant-convoy': '#22D3EE',  // Turkuaz
  'merchant-target': '#F472B6',  // Pembe
  'merchant-revenue': '#FF5D5D', // Kırmızı
}

type PersuasionScenario = {
  period: string
  metricLabel: string
  metricValue: number
  metricDelta: string
  metricDeltaTone: string
  flow: Array<{ label: string; value: number; color: string }>
  method: string
  useCase: string
  pitch: string
  script: string
  action: string
}

type SectionCopyPack = {
  subHeadline: string
  intro: string
  badges: [string, string, string]
  screenLabel: string
  scenarios: [PersuasionScenario, PersuasionScenario, PersuasionScenario]
}

// (Daha önceki nöro-pazarlama metinlerinin birebir aynısı, sadece render kısmını değiştireceğiz)
const MERCHANT_COPY_PACKS: Record<string, SectionCopyPack> = {
  'merchant-pulse': {
    subHeadline: 'Canlı Trafik Radarı',
    intro: 'Nabız menüsü, otoyoldaki sürücü niyetinin en sıcak anını yakalar. Tesisinizin önünden geçen trafiği izlemekle kalmaz, onları anında içeri çeker.',
    badges: ['Sosyal Kanıt', 'Kayıp Kaçınma', 'Hızlı Aksiyon'],
    screenLabel: 'Otoyol Dönüşüm Simülasyonu',
    scenarios: [
      { period: 'Son 7 Gün', metricLabel: 'Güzergahta Görülme', metricValue: 18450, metricDelta: '+24%', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Haritada Görülme', value: 18450, color: '#38BDF8' }, { label: 'Detay İnceleme', value: 4120, color: '#A78BFA' }, { label: 'Rotaya Ekleme', value: 1240, color: '#F59E0B' }], method: 'Sosyal Kanıt + Mikro Fayda', useCase: 'Sürücü haritada hızla kaydırırken markanızı görür. Karar penceresi 3 saniyedir.', pitch: 'Kalabalık olan yer güvenlidir. Bölgenin en çok durulan tesisi olduğunuzu vurgulayın.', script: '"Bu güzergahtaki her 4 sürücüden 1\'i kahve molası için bizi seçiyor."', action: 'Akşam Trafiği İçin Hızlı Etiket Aç' },
      { period: 'Son 7 Gün', metricLabel: 'Profil Ziyareti', metricValue: 4120, metricDelta: '+18%', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Detay İnceleme', value: 4120, color: '#A78BFA' }, { label: 'Fırsat İnceleme', value: 1840, color: '#22D3EE' }, { label: 'Kupon Kaydetme', value: 890, color: '#F59E0B' }], method: 'Merak Kancası + Pürüzsüz Geçiş', useCase: 'Tesis detayınıza bakan sürücü durmaya karar vermek üzeredir.', pitch: 'Uzun yolda zaman altındır. Hız ve Kolaylık sat.', script: '"Yolunuza sadece 3 dk mesafede. Kasada beklemeden tek QR ile ödeyin."', action: 'Ziyaretçilere Özel 24 Saatlik CTA Çık' },
      { period: 'Son 7 Gün', metricLabel: 'Rotaya Ekleyenler', metricValue: 1240, metricDelta: '+32%', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Rotaya Ekleme', value: 1240, color: '#F59E0B' }, { label: 'Kupon Kullanımı', value: 580, color: '#4ADE80' }, { label: 'Kasada Dönüşüm', value: 310, color: '#FF8A3D' }], method: 'Kayıp Kaçınma (FOMO)', useCase: 'Bizi rotasına ekleyen kişi zaten bizimdir. Sepeti büyüt.', pitch: 'Hafif bir süre baskısı satışı garantiler.', script: '"Mola rotanıza özel %15 indirim sadece 45 dakika geçerlidir."', action: '5 KM Yaklaşanlara Bildirim At' },
    ],
  },
  'merchant-branch': {
    subHeadline: 'Güven ve İtibar Merkezi',
    intro: 'Şube profili, tesisinizin dijital vitrinidir. Yorgun bir sürücü bilmediği bir tesise girerken önce buradaki güven sinyallerini arar.',
    badges: ['Otorite', 'Şeffaflık', 'Görsel Kanıt'],
    screenLabel: 'Tesis Profil Görünümü',
    scenarios: [
      { period: 'Canlı', metricLabel: 'Profil Doluluk Skoru', metricValue: 98, metricDelta: '+12 Puan', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Temel Bilgiler', value: 100, color: '#38BDF8' }, { label: 'Tesis İmkanları', value: 98, color: '#A78BFA' }, { label: 'Konum', value: 100, color: '#4ADE80' }], method: 'Güven İnşası (Otorite)', useCase: 'Eksik veya yanlış bilgi sürücüde yıkıcı bir öfke yaratır.', pitch: 'Dürüstlük sadakat getirir. Olanı net yaz, olmayanı gizleme.', script: '"7/24 Açık Market ve Temiz WC ile hizmetinizdeyiz. Sürpriz yok."', action: 'Tesis İmkanlarını Güncelle' },
      { period: 'Canlı', metricLabel: 'Arama Eşleşmesi', metricValue: 92, metricDelta: '+8 Puan', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Kategori Uyumu', value: 92, color: '#22D3EE' }, { label: 'Filtre Tıklaması', value: 76, color: '#A78BFA' }, { label: 'Detay', value: 65, color: '#F59E0B' }], method: 'Niyet Eşleştirme', useCase: 'Sürücü panik modunda arama yaparken nokta atışı çıkmalısınız.', pitch: 'Doğru etikette listelenmek, pazarlamanın %80\'ini çözer.', script: '"Yemek ve Dinlenme arayan sürücülere doğrudan önerilen tesisiz."', action: 'Kategori Etiketlerini Optimize Et' },
      { period: 'Canlı', metricLabel: 'Görsel Etki', metricValue: 84, metricDelta: '+21%', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Görüntüleme', value: 4200, color: '#4ADE80' }, { label: 'Menü İnceleme', value: 1850, color: '#38BDF8' }, { label: 'Rota', value: 920, color: '#F59E0B' }], method: 'Somutlaştırma (Visual Proof)', useCase: 'Temiz bir tuvalet veya sıcak bir kahve fotoğrafı her şeyi satar.', pitch: 'Sürücüler yazıları okumaz, fotoğrafları tarar.', script: '"Yorgunluğunuzu atacağınız lezzetlerimiz tam da fotoğraflardaki gibi."', action: 'Fotoğrafları Yüksek Çözünürlüklü Yap' },
    ],
  },
  'merchant-vitrin': {
    subHeadline: 'Nöro-Satış Vitrini',
    intro: 'Menü ve hizmetlerinizi nasıl sunduğunuz, fiyatlarından daha önemlidir. Psikolojik paketleme ile sepet tutarını artırın.',
    badges: ['Çapalama', 'Paketleme', 'Pürüzsüzlük'],
    screenLabel: 'Vitrin Yönetimi',
    scenarios: [
      { period: 'Son 14 Gün', metricLabel: 'Premium Seçim Oranı', metricValue: 48, metricDelta: '+12 Puan', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'İnceleme', value: 3200, color: '#38BDF8' }, { label: 'Karşılaştırma', value: 1450, color: '#A78BFA' }, { label: 'Satın Alma', value: 680, color: '#4ADE80' }], method: 'Çapalama Etkisi (Anchoring)', useCase: 'Pahalı seçeneği gören müşteri, orta paketi "makul" algılar.', pitch: 'Algıyı yönetmek için her zaman 3 seçenek sunun.', script: '"Full Enerji Paketi 450 TL, En Çok Tercih Edilen Mola Menüsü 280 TL."', action: 'Menü Sıralamasını Yeniden Yapılandır' },
      { period: 'Son 14 Gün', metricLabel: 'Paket Satış Artışı', metricValue: 412, metricDelta: '+28%', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Tekil Ürün', value: 2100, color: '#22D3EE' }, { label: 'Paket Görme', value: 1650, color: '#A78BFA' }, { label: 'Paket Alma', value: 412, color: '#4ADE80' }], method: 'Karar Yorgunluğu', useCase: 'Yorgun birine tek tek ürün seçtirmek eziyettir. Paket sunun.', pitch: 'Ne kadar az seçenek, o kadar hızlı satış.', script: '"Kamyoncu Dostu Paket: Sıcak çorba ve ana yemek. Tek tıkla al."', action: 'Ürünleri 3 Ana Paket Haline Getir' },
      { period: 'Son 14 Gün', metricLabel: 'Çapraz Satış', metricValue: 284, metricDelta: '+41%', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Şarj İçin Duran', value: 1250, color: '#4ADE80' }, { label: 'Bildirim', value: 890, color: '#38BDF8' }, { label: 'Harcama', value: 284, color: '#F59E0B' }], method: 'Bekleme Anı Satışı', useCase: 'Şarja bağlayan sürücünün 15 dakikası vardır.', pitch: 'Müşteri beklerken sıkılır. İçeride harcayacağı bir sebep verin.', script: '"Aracınız şarj olurken, taze demlenmiş çayınız içeride sizi bekliyor."', action: 'Bekleme Alanı İçin Kampanya Kur' },
    ],
  },
  'merchant-campaign': {
    subHeadline: 'Dinamik Talep Motoru',
    intro: 'Kampanya sekmesi, otoyolun nabzına göre anlık reaksiyon verir. Kıtlık hissi ve bağlamsal mesajlarla sürücülerin rotasını çizin.',
    badges: ['Kıtlık Hissi', 'Bağlam', 'Yeniden Hedefleme'],
    screenLabel: 'Kampanya Yayın Paneli',
    scenarios: [
      { period: 'Canlı Saat', metricLabel: 'Etiket Dönüşümü', metricValue: 82, metricDelta: '+15 Puan', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Gösterim', value: 6800, color: '#C084FC' }, { label: 'İlgilenenler', value: 2400, color: '#38BDF8' }, { label: 'Ziyaret', value: 820, color: '#F59E0B' }], method: 'Kıtlık Prensibi (Scarcity)', useCase: 'Sınırlandırılmış fırsatlar beynin aciliyet merkezini uyarır.', pitch: 'Bolluk rehavet, kıtlık hareket yaratır.', script: '"Önümüzdeki 2 saat boyunca geçerli %20 İndirim. Sadece 50 Kupon kaldı!"', action: 'Sınırlı Stoklu Kampanya Başlat' },
      { period: 'Haftalık', metricLabel: 'Ağır Vasıta Katılımı', metricValue: 640, metricDelta: '+22%', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Tır Trafiği', value: 3200, color: '#22D3EE' }, { label: 'Özel Teklif', value: 1800, color: '#C084FC' }, { label: 'Kabul', value: 640, color: '#4ADE80' }], method: 'Bağlamsal İkna (Contextual)', useCase: 'Tırcının ihtiyacı ile aile aracının ihtiyacı farklıdır.', pitch: 'Doğru kişiye, doğru saatte, doğru mola sebebi.', script: '"Kaptan, güvenli park alanımız ve sıcak duş imkanımızla buradayız."', action: 'Ağır Vasıta Filtreli Kampanya Çık' },
      { period: 'Aylık', metricLabel: 'Düzenli Müşteri', metricValue: 124, metricDelta: '+18 Puan', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Sık Geçen', value: 4500, color: '#38BDF8' }, { label: 'Hatırlatıcı', value: 2800, color: '#A78BFA' }, { label: 'Dönüşüm', value: 1240, color: '#4ADE80' }], method: 'Sistematik Hatırlatma', useCase: 'Aynı rotayı haftada 3 kez kullanan araçlara evinde hissettir.', pitch: 'Sadakat, tesadüflere bırakılmayacak kadar değerlidir.', script: '"Bu güzergahın müdavimi oldunuz! Kasada anında ekstra indirim."', action: 'Rutin Sürücüleri Hedefle' },
    ],
  },
  'merchant-coupon': {
    subHeadline: 'Akıllı Kupon Algoritması',
    intro: 'Kupon, kârdan zarar etmek değildir; sadakati ucuza satın almaktır. Doğru dağıtılan kuponlar nakit olarak geri döner.',
    badges: ['Karşılıklılık', 'Mikro-Segment', 'ROI Optimizasyonu'],
    screenLabel: 'Kupon Dağıtım Merkezi',
    scenarios: [
      { period: 'Aylık', metricLabel: 'Kullanım Oranı', metricValue: 46, metricDelta: '+9 Puan', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Dağıtım', value: 8400, color: '#38BDF8' }, { label: 'Cüzdan', value: 3800, color: '#F59E0B' }, { label: 'Kullanım', value: 1748, color: '#4ADE80' }], method: 'Karşılıklılık İlkesi (Reciprocity)', useCase: 'Karşılıksız verilen bir değer, müşteride psikolojik borç yaratır.', pitch: 'Önce siz bir adım atın, müşteri içeri girerek karşılık versin.', script: '"İlk mola deneyiminiz için Ücretsiz İçecek Kuponu cüzdanınızda."', action: 'Karşılama Kuponu Tanımla' },
      { period: 'Aylık', metricLabel: 'Atıl Saat Dönüşümü', metricValue: 58, metricDelta: '+34%', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Boş Trafik', value: 2100, color: '#A78BFA' }, { label: 'Gece Kuponu', value: 1250, color: '#22D3EE' }, { label: 'Tesise Giriş', value: 725, color: '#4ADE80' }], method: 'Zaman Bazlı Segmentasyon', useCase: 'Tesisin boş olduğu saatlerde verilen yüksek oranlar ölü zamanı diriltir.', pitch: 'Yoğun saatte verme, boş saatte müşteriyi çek.', script: '"Gece 03:00 - 05:00 rotasında olanlara özel %25 Gece indirimi."', action: 'Ölü Saatler İçin Kupon Kur' },
      { period: 'Aylık', metricLabel: 'Net Kupon Getirisi', metricValue: 345000, metricDelta: '+26%', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Maliyet', value: 45000, color: '#F59E0B' }, { label: 'Ek Ciro', value: 390000, color: '#38BDF8' }, { label: 'Net Kâr', value: 345000, color: '#4ADE80' }], method: 'Veriye Dayalı Büyüme (ROI)', useCase: 'Getirisi (ROI) ölçülmeyen her indirim zarardır.', pitch: 'Kupon bir masraf değil, kontrollü bir yatırımdır.', script: '"En kârlı kupon sistem tarafından otomatik ölçeklendirildi."', action: 'Düşük Performanslıları Durdur' },
    ],
  },
  'merchant-convoy': {
    subHeadline: 'Toplu Dönüşüm (B2B)',
    intro: 'Konvoy özelliği, perakende satışı toptan satışa çevirir. Konvoy liderini ikna ederek tüm grubu tesise indirin.',
    badges: ['Sürü Psikolojisi', 'Ön Taahhüt', 'Hızlı Müzakere'],
    screenLabel: 'Grup ve Konvoy Talepleri',
    scenarios: [
      { period: 'Canlı', metricLabel: 'Aktif Konvoy Radarı', metricValue: 42, metricDelta: '+18%', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Yaklaşan Konvoy', value: 124, color: '#22D3EE' }, { label: 'Teklif İletimi', value: 86, color: '#A78BFA' }, { label: 'Toplu Giriş', value: 42, color: '#4ADE80' }], method: 'Lider Odaklı İkna', useCase: 'Konvoylarda karar verici ikna olduğunda, grup sorgulamadan takip eder.', pitch: 'Sürüyü yönlendirmek için sadece lideri yönlendir.', script: '"Lider Kaptan; 5 araçlık konvoyunuza özel toplu kasa indirimi rezerve edildi."', action: 'Konvoy Liderlerine Teklif Gönder' },
      { period: 'Haftalık', metricLabel: 'Planlı Rezervasyon', metricValue: 28, metricDelta: '+8 Adet', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Planlanan', value: 75, color: '#38BDF8' }, { label: 'Ön Kabul', value: 45, color: '#F59E0B' }, { label: 'Rezervasyon', value: 28, color: '#4ADE80' }], method: 'Ön Taahhüt (Pre-commitment)', useCase: 'Yola çıkmadan önce mola yerini sabitlerse, rakibe bakmazlar.', pitch: 'Planlama aşamasında girilen akıl yolda değişmez.', script: '"Grup sürüşünüz için masalarınız hazır. Beklemeden QR ile ödeyin."', action: 'Konvoylara Ön Davet At' },
      { period: 'Haftalık', metricLabel: 'Müzakere Başarısı', metricValue: 76, metricDelta: '+14 Puan', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Talep', value: 180, color: '#A78BFA' }, { label: 'Karşı Teklif', value: 130, color: '#22D3EE' }, { label: 'Anlaşma', value: 136, color: '#4ADE80' }], method: 'Çerçeveleme (Framing)', useCase: 'Uygulama içi müzakereler, kapıdaki pazarlık krizlerini sıfırlar.', pitch: 'Pazarlığı dijitalde bitir, kapıda hizmet ver.', script: '"Konvoyunuz için anlaştığımız paket tanımlandı. Kasada okutmanız yeterli."', action: 'Bekleyen Talepleri Onayla' },
    ],
  },
  'merchant-target': {
    subHeadline: 'Mikro-Lokasyon Avcısı',
    intro: 'Radar sistemi, tesisinize yaklaşan her aracı hedefler. Konum ve niyet birleştiğinde satış kaçınılmazdır.',
    badges: ['Hiper-Yerel', 'Anlık Niyet', 'Kişiselleştirme'],
    screenLabel: 'Geofence ve Hedefleme',
    scenarios: [
      { period: 'Canlı', metricLabel: 'Geofence (5km) Yakalama', metricValue: 2140, metricDelta: '+28%', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Bölgedeki Araç', value: 3800, color: '#38BDF8' }, { label: 'Bildirim', value: 2140, color: '#A78BFA' }, { label: 'Yönelen', value: 890, color: '#4ADE80' }], method: 'Hiper-Yerel Bildirim', useCase: 'Yorulduğunu hissettiği anda cebine düşen bildirim sihir gibi çalışır.', pitch: 'Zamanlama her şeydir; doğru yerde doğru bildirim.', script: '"Sadece 5 km önünüzdeyiz! Temiz dinlenme alanımızda mola verin."', action: '5 KM Bildirimlerini Aktifleştir' },
      { period: 'Canlı', metricLabel: 'Niyet Anı Yakalama', metricValue: 485, metricDelta: '+36%', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Acil Arama', value: 1200, color: '#F59E0B' }, { label: 'Hızlı Teklif', value: 750, color: '#22D3EE' }, { label: 'Dönüşüm', value: 485, color: '#4ADE80' }], method: 'Problem Çözücü', useCase: 'Panik modundaki sürücü fiyat sormaz, sadece "çözüm" arar.', pitch: 'Acil durumlarda ilk çözümü sunan kazanır.', script: '"Acil mola ihtiyacınız için Tesisimiz 24 saat açık. Sağdan sapın."', action: 'Acil Arayanlara Görün' },
      { period: 'Günlük', metricLabel: 'Özel Bildirim', metricValue: 84, metricDelta: '+16 Puan', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Gönderim', value: 5400, color: '#A78BFA' }, { label: 'Açılma', value: 1840, color: '#38BDF8' }, { label: 'Okutma', value: 840, color: '#4ADE80' }], method: 'Kişiselleştirme', useCase: 'Özel hitap (örn: İzmir rotası) körlüğü kırar.', pitch: 'Robot gibi değil, tesis sahibi gibi konuşun.', script: '"Ankara rotasında ilerleyen değerli sürücümüz, kahveniz sizi bekliyor."', action: 'Rota Bazlı Mesaj At' },
    ],
  },
  'merchant-revenue': {
    subHeadline: 'Finansal Kokpit',
    intro: 'Amacımız kasaya giren net parayı artırmak. Gelir kokpiti, karmaşık muhasebeyi anlık performansa dönüştürür.',
    badges: ['Sezgisel Veri', 'Hızlı Tahsilat', 'Şeffaflık'],
    screenLabel: 'Gerçek Zamanlı Gelir',
    scenarios: [
      { period: 'Bugün', metricLabel: 'Günlük Net Ciro', metricValue: 142500, metricDelta: '+21%', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'İşlem', value: 185000, color: '#38BDF8' }, { label: 'İndirim Payı', value: 42500, color: '#F59E0B' }, { label: 'Net', value: 142500, color: '#4ADE80' }], method: 'KPI Odaklılık', useCase: 'Maliyetler çıktıktan sonra kasadaki net rakam anlık görünmelidir.', pitch: 'Net rakamlar vizyonu netleştirir.', script: '"Ciro hedefimizin %15 üzerindeyiz. Kampanyalar optimize edildi."', action: 'Gün Sonu Raporunu İlet' },
      { period: 'Bugün', metricLabel: 'Ödeme Hızı Skoru', metricValue: 98, metricDelta: '+5 Puan', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'Başlatma', value: 1450, color: '#A78BFA' }, { label: 'QR Onay', value: 1430, color: '#22D3EE' }, { label: 'Tamamlama', value: 1421, color: '#4ADE80' }], method: 'Sırt Sırta Verimlilik', useCase: 'Kasada bekletmek, kuponun değerini sıfırlar. Hız hayati önem taşır.', pitch: 'Kasada yaşanan pürüz, son deneyimdir.', script: '"Pos cihazı beklemeye son. Tek QR okut, ödemeyi saniyeler içinde al."', action: 'Personele QR Hatırlat' },
      { period: 'Aylık', metricLabel: 'İade / Sorunsuzluk', metricValue: 99, metricDelta: '+1 Puan', metricDeltaTone: 'text-emerald-300', flow: [{ label: 'İşlem', value: 42500, color: '#38BDF8' }, { label: 'Başarılı', value: 42100, color: '#A78BFA' }, { label: 'Sıfır İptal', value: 42075, color: '#4ADE80' }], method: 'Güven ve Şeffaflık', useCase: 'BDDK güvencesiyle ters ibraz riski yoktur.', pitch: 'MolaYeri sadece müşteri getirmez, tahsilatı da korur.', script: '"Tüm işlemler güvence altında. Paranız ertesi gün hesabınızda."', action: 'Hak Ediş Tablosunu İncele' },
    ],
  },
}

const formatCount = (value: number): string => new Intl.NumberFormat('tr-TR').format(value)
const formatMoney = (value: number): string => `${new Intl.NumberFormat('tr-TR').format(value)}₺`

type SimulationProps = {
  accent: string
  scenario: PersuasionScenario | null
  activeIndex: number
}

// =========================================================================
// SİMÜLASYON EKRANLARI (SAĞDAKİ TELEFONUN İÇİ, SEKMEYE GÖRE DEĞİŞİR)
// =========================================================================

const PulseScreen = ({ accent, scenario }: SimulationProps) => {
  const flow = scenario?.flow || []
  const waveCount = Math.max(2, Math.min(5, Math.round((scenario?.metricValue || 0) / 5000)))
  return (
  <div className="flex-1 flex flex-col bg-[#050811] relative overflow-hidden">
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
    <div className="p-5 relative z-10 flex flex-col h-full">
      <div className="flex justify-between items-start mb-5">
        <div>
          <span className="text-white font-black text-xl block">Canlı Radar</span>
          <span className="text-white/55 text-[11px] font-semibold">{scenario?.metricLabel || 'Canlı Sinyal'}</span>
        </div>
        <span className="text-[10px] font-black px-2 py-1 rounded-md animate-pulse" style={{ backgroundColor: `${accent}33`, color: accent }}>
          {scenario?.metricDelta || '+0%'}
        </span>
      </div>
      
      <div className="flex-1 flex items-center justify-center relative">
        {Array.from({ length: waveCount }).map((_, index) => (
          <motion.div
            key={`wave-${index}`}
            animate={{ scale: [1, 1.5 + index * 0.2, 2 + index * 0.2], opacity: [0.7, 0.3, 0] }}
            transition={{ duration: 2.2, delay: index * 0.3, repeat: Infinity }}
            className="absolute w-[180px] h-[180px] rounded-full border"
            style={{ borderColor: accent }}
          />
        ))}

        <div className="w-12 h-12 rounded-full flex items-center justify-center relative z-10 shadow-[0_0_20px_rgba(255,138,61,0.6)]" style={{ backgroundColor: accent }}>
          <Store size={20} className="text-white" />
        </div>

        <motion.div animate={{ x: [-10, 10, -10], y: [10, -10, 10] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-[20%] left-[20%] text-white/80"><MapPin size={16} fill={accent} className="text-[#050811]" /></motion.div>
        <motion.div animate={{ x: [10, -10, 10], y: [-10, 10, -10] }} transition={{ duration: 3, repeat: Infinity }} className="absolute bottom-[30%] right-[25%] text-white/80"><MapPin size={16} fill={accent} className="text-[#050811]" /></motion.div>
      </div>

      <div className="bg-[#121A2B] border border-white/10 rounded-2xl p-4 mt-auto">
        <span className="text-white/60 text-[10px] font-black tracking-widest block mb-2">TRAFIK AKIŞI</span>
        <div className="space-y-2 mb-3">
          {flow.slice(0, 2).map((item) => (
            <div key={item.label} className="flex items-center justify-between text-[11px]">
              <span className="text-white/70">{item.label}</span>
              <span className="text-white font-bold">{formatCount(item.value)}</span>
            </div>
          ))}
        </div>
        <button className="w-full text-white font-black text-[12px] py-3 rounded-xl" style={{ backgroundColor: accent, boxShadow: `0 0 15px ${accent}66` }}>
          {scenario?.action || 'YAKINDAKİLERE BİLDİRİM AT'}
        </button>
      </div>
    </div>
  </div>
)
}

const VitrinScreen = ({ accent, scenario, activeIndex }: SimulationProps) => {
  const cardsByTab = [
    [
      { title: 'Standart Menü', desc: 'Çorba + Ana Yemek', price: '180₺', icon: UtensilsCrossed, muted: true },
      { title: 'Enerji Paketi', desc: 'Yemek + Kahve + Yıkama', price: '280₺', icon: Zap, badge: 'EN ÇOK SATAN' },
    ],
    [
      { title: 'Hızlı Servis', desc: '10 dk araç içi temizlik', price: '120₺', icon: Fuel, muted: true },
      { title: 'Premium Hizmet', desc: 'Temizlik + market + lounge', price: '260₺', icon: ShieldCheck, badge: 'TALEP YÜKSEK' },
    ],
    [
      { title: 'AC Şarj Noktası', desc: '22 kW standart şarj', price: '8₺/kWh', icon: Zap, muted: true },
      { title: 'DC Hızlı Şarj', desc: '180 kW hızlı dolum', price: '11₺/kWh', icon: QrCode, badge: 'HIZLI DOLUM' },
    ],
  ]
  const cards = cardsByTab[activeIndex] || cardsByTab[0]

  return (
  <div className="flex-1 flex flex-col bg-[#050811] p-5 overflow-y-auto">
    <div className="flex justify-between items-center mb-6">
      <div>
        <span className="text-white font-black text-xl block">Vitrin Düzeni</span>
        <span className="text-white/50 text-[11px] font-semibold">{scenario?.metricLabel || 'Ürün Sunumu'}</span>
      </div>
      <span className="text-[10px] font-black px-2 py-1 rounded-md" style={{ backgroundColor: `${accent}22`, color: accent }}>{scenario?.metricDelta || '+0%'}</span>
    </div>
    <div className="flex flex-col gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        const highlighted = index === 1
        return (
          <div
            key={card.title}
            className={`relative overflow-hidden rounded-2xl p-4 flex gap-4 border ${
              highlighted ? 'bg-gradient-to-br from-[#121A2B] to-[#050811] shadow-[0_0_20px_rgba(74,222,128,0.15)]' : 'bg-[#121A2B] opacity-80'
            }`}
            style={{ borderColor: highlighted ? `${accent}88` : 'rgba(255,255,255,0.08)' }}
          >
            {card.badge ? (
              <div className="absolute top-0 right-0 text-[#050811] text-[9px] font-black px-3 py-1 rounded-bl-xl" style={{ backgroundColor: accent }}>
                {card.badge}
              </div>
            ) : null}
            <div className="w-16 h-16 rounded-xl flex items-center justify-center border" style={{ backgroundColor: highlighted ? `${accent}22` : 'rgba(255,255,255,0.05)', borderColor: highlighted ? `${accent}66` : 'rgba(255,255,255,0.08)' }}>
              <Icon size={20} className={highlighted ? '' : 'text-white/60'} style={highlighted ? { color: accent } : undefined} />
            </div>
            <div className="flex flex-col flex-1 justify-center">
              <span className="text-white font-bold text-[14px]">{card.title}</span>
              <span className="text-white/65 text-[12px]">{card.desc}</span>
              <span className="font-black mt-1" style={{ color: highlighted ? accent : '#ffffff' }}>{card.price}</span>
            </div>
          </div>
        )
      })}
      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <p className="text-[10px] font-black tracking-widest text-white/50 uppercase">Hazır Reklam Cümlesi</p>
        <p className="text-[11px] text-white/85 mt-1">{scenario?.script || 'Bu menüde en çok tercih edilen ürünler öne çıkarılıyor.'}</p>
      </div>
    </div>
  </div>
)
}

const BranchScreen = ({ accent, scenario, activeIndex }: SimulationProps) => {
  const completeness = Math.max(40, Math.min(100, scenario?.metricValue || 0))
  const checklist = [
    { label: 'Adres ve Konum', done: true },
    { label: 'Kategori Eşleşmesi', done: activeIndex >= 1 },
    { label: 'Fotoğraf Kalitesi', done: activeIndex >= 2 },
  ]
  return (
    <div className="flex-1 flex flex-col bg-[#050811] p-5">
      <div className="flex items-center justify-between mb-5">
        <span className="text-white font-black text-xl">Şube Güven Kartı</span>
        <span className="text-[10px] font-black px-2 py-1 rounded-md" style={{ backgroundColor: `${accent}22`, color: accent }}>{scenario?.metricDelta || '+0'}</span>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#121A2B] p-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-white/60 text-[11px] font-bold">Profil Güven Skoru</span>
          <span className="text-white font-black text-[14px]">%{completeness}</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${completeness}%` }} transition={{ duration: 0.6 }} className="h-full rounded-full" style={{ backgroundColor: accent }} />
        </div>
      </div>
      <div className="space-y-2">
        {checklist.map((item) => (
          <div key={item.label} className="rounded-xl border border-white/10 bg-black/30 p-3 flex items-center justify-between">
            <span className="text-white/80 text-[12px]">{item.label}</span>
            <CheckCircle2 size={16} className={item.done ? 'text-emerald-400' : 'text-white/35'} />
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-black/35 p-3">
        <span className="text-[10px] font-black tracking-widest text-white/45 uppercase">İkna Notu</span>
        <p className="text-[11px] text-white/80 mt-1">{scenario?.pitch || 'Güven ver, sürücü içeri girsin.'}</p>
      </div>
    </div>
)
}

const CouponScreen = ({ accent, scenario }: SimulationProps) => {
  const flow = scenario?.flow || []
  const usage = flow[2]?.value || 0
  const total = Math.max(usage + 1, flow[0]?.value || usage + 1)
  const ratio = Math.round((usage / total) * 100)
  return (
  <div className="flex-1 flex flex-col bg-[#050811] p-5 justify-center">
    <div className="w-full border-2 border-dashed rounded-2xl p-6 relative flex flex-col items-center text-center" style={{ borderColor: `${accent}88`, backgroundColor: `${accent}1A` }}>
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#050811] rounded-full border-r-2 border-dashed" style={{ borderColor: `${accent}88` }} />
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#050811] rounded-full border-l-2 border-dashed" style={{ borderColor: `${accent}88` }} />
      
      <Tag size={32} className="mb-3" style={{ color: accent }} />
      <span className="font-black text-3xl mb-1" style={{ color: accent }}>{scenario?.metricLabel || 'Akıllı Kupon'}</span>
      <span className="text-white/80 font-bold text-[13px] mb-4">{scenario?.method || 'Dinamik teklif aktif'}</span>
      <div className="w-full flex items-center justify-center mb-4 text-white/70">
        <QrCode size={20} />
      </div>
      
      <div className="w-full bg-black/40 rounded-xl p-3 border border-white/5">
        <div className="flex justify-between items-center text-[11px] font-bold">
          <span className="text-white/50">Kullanım: {formatCount(usage)}</span>
          <span className="text-white">{ratio}%</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.max(8, ratio)}%`, backgroundColor: accent }} />
        </div>
      </div>
    </div>
  </div>
)
}

const CampaignScreen = ({ accent, scenario, activeIndex }: SimulationProps) => {
  const countdown = ['01:58:14', '00:42:09', '12:15:31'][activeIndex] || '02:00:00'
  return (
    <div className="flex-1 flex flex-col bg-[#050811] p-5">
      <div className="flex justify-between items-center mb-5">
        <span className="text-white font-black text-xl">Kampanya Masası</span>
        <BellRing size={16} style={{ color: accent }} />
      </div>
      <div className="rounded-2xl border p-4 mb-4 relative overflow-hidden" style={{ borderColor: `${accent}66`, background: 'linear-gradient(140deg,#121A2B,#050811)' }}>
        <div className="absolute top-0 right-0 w-20 h-20 blur-2xl rounded-full" style={{ backgroundColor: `${accent}55` }} />
        <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">Canlı Yayın</span>
        <p className="text-white font-bold text-[14px] mt-2">{scenario?.metricLabel || 'Etiket Kampanyası'}</p>
        <p className="text-white/70 text-[11px] mt-1">{scenario?.script || 'Bu kampanya aktif.'}</p>
        <div className="mt-3 flex items-center justify-between text-[11px]">
          <span className="text-white/55">Kalan Süre</span>
          <span className="font-black" style={{ color: accent }}>{countdown}</span>
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-black/35 p-3">
        <p className="text-[10px] uppercase tracking-widest text-white/45 font-black">Yayın Stratejisi</p>
        <p className="text-[11px] text-white/85 mt-1">{scenario?.pitch || 'Süre kısıtı ile etkiyi büyüt.'}</p>
      </div>
      <button className="mt-4 w-full text-[#050811] font-black text-[12px] py-3 rounded-xl" style={{ backgroundColor: accent }}>
        {scenario?.action || 'KAMPANYAYI YAYINA AL'}
      </button>
    </div>
  )
}

const TargetScreen = ({ accent, scenario, activeIndex }: SimulationProps) => {
  const tagsByTab = [
    ['5 KM', 'YAKIN TRAFİK', 'ANLIK PUSH'],
    ['MOLA LİSTESİ', 'NİYET YÜKSEK', 'TEKLİF HAZIR'],
    ['RUTA SEGMENT', 'ÖZEL METİN', 'OTOMATİK AKIŞ'],
  ]
  const tags = tagsByTab[activeIndex] || tagsByTab[0]
  return (
    <div className="flex-1 flex flex-col bg-[#050811] p-5">
      <div className="flex justify-between items-center mb-5">
        <span className="text-white font-black text-xl">Hedef Avı</span>
        <Search size={16} style={{ color: accent }} />
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#121A2B] p-4 mb-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(244,114,182,0.22)_0%,rgba(244,114,182,0)_45%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-[11px] text-white/70 mb-2">
            <Navigation size={14} style={{ color: accent }} />
            <span>{scenario?.metricLabel || 'Mikro lokasyon hedefi'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-lg border border-white/15 bg-black/25 px-2 py-2 text-center text-[9px] font-black text-white/80">{tag}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-black/35 p-3">
        <p className="text-[10px] uppercase tracking-widest text-white/45 font-black">Hedefleme Metni</p>
        <p className="text-[11px] text-white/85 mt-1">{scenario?.script || 'Doğru araç, doğru mesaj, doğru an.'}</p>
      </div>
      <button className="mt-4 w-full text-[#050811] font-black text-[12px] py-3 rounded-xl" style={{ backgroundColor: accent }}>
        {scenario?.action || 'HEDEFLİ MESAJI GÖNDER'}
      </button>
    </div>
  )
}

const ConvoyScreen = ({ accent, scenario }: SimulationProps) => (
  <div className="flex-1 flex flex-col bg-[#050811] p-5">
    <div className="flex justify-between items-center mb-6">
      <span className="text-white font-black text-xl">Aktif Konvoylar</span>
      <span className="text-[10px] font-black px-2 py-1 rounded-md" style={{ backgroundColor: `${accent}22`, color: accent }}>{scenario?.metricDelta || '+0%'}</span>
    </div>
    
    <div className="bg-[#121A2B] border rounded-2xl p-5 relative overflow-hidden" style={{ borderColor: `${accent}55` }}>
      <div className="absolute top-0 right-0 w-24 h-24 blur-2xl rounded-full" style={{ backgroundColor: `${accent}33` }} />
      <div className="flex justify-between items-center mb-4 relative z-10">
        <div>
          <span className="text-white font-black text-[15px] block">İzmir Turu Grubu</span>
          <span className="text-[11px] font-bold" style={{ color: accent }}>{scenario?.metricLabel || '15 KM Kaldı'}</span>
        </div>
        <div className="flex -space-x-2">
          {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-[#121A2B] bg-white/20" />)}
          <div className="w-8 h-8 rounded-full border-2 border-[#121A2B] flex items-center justify-center text-[#050811] text-[10px] font-black" style={{ backgroundColor: accent }}>
            +{Math.max(2, Math.min(8, Math.round((scenario?.flow?.[2]?.value || 8) / 20)))}
          </div>
        </div>
      </div>
      <button className="w-full text-[#050811] font-black text-[12px] py-3 rounded-xl" style={{ backgroundColor: accent, boxShadow: `0 0 15px ${accent}55` }}>
        {scenario?.action || 'TOPLU TEKLİF GÖNDER'}
      </button>
    </div>
  </div>
)

const RevenueScreen = ({ accent, scenario }: SimulationProps) => {
  const flow = scenario?.flow || []
  const maxFlow = Math.max(1, ...flow.map((item) => item.value))
  const metric = scenario?.metricValue || 0
  return (
  <div className="flex-1 flex flex-col bg-[#050811] p-5">
    <div className="flex justify-between items-center mb-6">
      <span className="text-white font-black text-xl">Günlük Özet</span>
      <span className="text-[10px] font-black px-2 py-1 rounded-md" style={{ backgroundColor: `${accent}22`, color: accent }}>{scenario?.metricDelta || '+0%'}</span>
    </div>
    <div className="flex items-center gap-4 mb-8">
      <div className="w-14 h-14 rounded-full flex items-center justify-center border" style={{ backgroundColor: `${accent}22`, borderColor: `${accent}55` }}>
        <DollarSign size={24} style={{ color: accent }} />
      </div>
      <div>
        <span className="text-white/60 text-[12px] font-bold block">{scenario?.metricLabel || 'Net Ciro'}</span>
        <span className="text-white font-black text-3xl">{formatMoney(metric)}</span>
      </div>
    </div>
    
    <div className="flex items-end justify-between h-32 border-b border-white/10 pb-2 gap-2">
      {flow.map((item, i) => (
        <div key={`${item.label}-${i}`} className="w-full rounded-t-md opacity-90" style={{ height: `${Math.max(18, (item.value / maxFlow) * 100)}%`, backgroundColor: item.color }} />
      ))}
    </div>
    <div className="flex justify-between mt-2 text-white/40 text-[10px] font-bold">
      {flow.map((item) => (
        <span key={item.label}>{item.label.slice(0, 8)}</span>
      ))}
    </div>
  </div>
)
}

const renderScreenSimulation = ({
  sectionId,
  accent,
  scenario,
  activeIndex,
}: {
  sectionId: string
  accent: string
  scenario: PersuasionScenario | null
  activeIndex: number
}) => {
  switch (sectionId) {
    case 'merchant-pulse': return <PulseScreen accent={accent} scenario={scenario} activeIndex={activeIndex} />;
    case 'merchant-branch': return <BranchScreen accent={accent} scenario={scenario} activeIndex={activeIndex} />;
    case 'merchant-vitrin': return <VitrinScreen accent={accent} scenario={scenario} activeIndex={activeIndex} />;
    case 'merchant-campaign': return <CampaignScreen accent={accent} scenario={scenario} activeIndex={activeIndex} />;
    case 'merchant-coupon': return <CouponScreen accent={accent} scenario={scenario} activeIndex={activeIndex} />;
    case 'merchant-convoy': return <ConvoyScreen accent={accent} scenario={scenario} activeIndex={activeIndex} />;
    case 'merchant-target': return <TargetScreen accent={accent} scenario={scenario} activeIndex={activeIndex} />;
    case 'merchant-revenue': return <RevenueScreen accent={accent} scenario={scenario} activeIndex={activeIndex} />;
    default: 
      return (
        <div className="flex-1 flex flex-col bg-[#050811] p-5 justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} style={{ color: accent }} />
          </div>
          <span className="text-white font-bold text-[15px] block mb-2">Sistem Aktif</span>
          <span className="text-white/50 text-[12px]">Seçili modüle ait veriler toplanıyor ve optimize ediliyor.</span>
        </div>
      );
  }
}

export default function MerchantTemplateFeature({
  section,
  activeIndex = 0,
}: {
  section: SpatialSection
  activeIndex?: number
}) {
  const safeIndex = Math.max(0, Math.min(activeIndex, section.features.length - 1))
  const accent = MERCHANT_ACCENT_BY_ID[section.id] ?? '#FF8A3D'
  const copyPack = MERCHANT_COPY_PACKS[section.id] || null
  const currentScenario = copyPack?.scenarios[safeIndex] || null
  const badges = copyPack?.badges || ['Gercek Veri', 'Ikna Metodu', 'Aksiyon']

  return (
    <div className="w-full h-full p-4 sm:p-6 lg:p-12 flex items-center justify-center relative overflow-hidden bg-transparent font-sans">
      <div className="w-full max-w-6xl min-h-[560px] lg:min-h-[700px] grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-center z-10">
        
        {/* SOL TARAF - Metin ve Açıklamalar */}
        <div className="flex flex-col items-start gap-4 sm:gap-5 max-w-[42rem] min-h-[250px] z-10 relative">
          <div className="p-4 rounded-[20px] bg-white/[0.04] border border-white/12 shadow-[0_12px_30px_rgba(0,0,0,0.28)] relative">
            <section.icon size={34} style={{ color: accent }} className="relative z-10" />
            <div className="absolute inset-0 rounded-[20px] blur-2xl opacity-10" style={{ backgroundColor: accent }} />
          </div>
          <h2 className="text-[2rem] sm:text-[2.45rem] lg:text-[3.1rem] font-semibold text-white leading-[1.06] tracking-tight">
            <span className="font-bold text-[#F3F8FF]">{section.title}</span>
            <br />
            <span className="font-bold" style={{ color: accent }}>
              {copyPack?.subHeadline || `${MERCHANT_SECTIONS_DATA.length} Menu • Sablon`}
            </span>
          </h2>
          <p className="text-[#DCEBFF] text-[14px] sm:text-[16px] font-medium leading-relaxed mt-1 max-w-[38rem]">
            {copyPack?.intro || 'Bu menu isletmeci akisinin kritik aksiyonlarini tasir. Sekme secerek onerilen stratejiyi uygularsin.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-[11px] font-bold text-white/85"
              >
                {badge}
              </span>
            ))}
          </div>

          {/* Sol Alttaki Nöro-Pazarlama Açıklama Kutusu */}
          {currentScenario && (
             <motion.div 
               key={`desc-${currentScenario.metricLabel}`}
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
               className="mt-4 bg-[#0F172A]/80 border border-white/10 rounded-2xl p-5 shadow-xl max-w-[38rem] backdrop-blur-md"
             >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
                  <span className="text-white font-bold text-[13px] tracking-wide uppercase">Strateji: {currentScenario.method}</span>
                </div>
                <p className="text-white/65 text-[12px] leading-relaxed mb-2">{currentScenario.useCase}</p>
                <p className="text-white/80 text-[13px] leading-relaxed mb-3">{currentScenario.pitch}</p>
                <div className="bg-black/25 border border-white/5 rounded-xl p-3 mb-3">
                  <span className="text-white/40 text-[10px] font-black tracking-widest uppercase block mb-1">Hazır Reklam Metni</span>
                  <span className="text-white/85 text-[12px]">{currentScenario.script}</span>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                  <span className="text-white/40 text-[10px] font-black tracking-widest uppercase block mb-1">Tavsiye Edilen Aksiyon</span>
                  <span className="text-white font-semibold text-[13px]">{currentScenario.action}</span>
                </div>
             </motion.div>
          )}
        </div>

        {/* SAĞ TARAF - Simülasyon Telefon Ekranı */}
        <div className="w-full max-w-[320px] sm:max-w-[360px] lg:min-w-[360px] lg:max-w-[360px] h-[560px] sm:h-[620px] lg:h-[640px] bg-[#0F172A] rounded-[36px] sm:rounded-[44px] border-[8px] sm:border-[10px] border-[#1E293B] shadow-[0_42px_80px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden relative shrink-0">
          
          <div className="px-4 pt-6 pb-4 border-b border-white/10 bg-[#121A2B] shrink-0">
            <span className="text-white font-black text-[18px] tracking-tight block">{section.title}</span>
            <span className="text-white/60 text-[12px] font-semibold">{copyPack?.screenLabel || 'Simülasyon Paneli'}</span>
          </div>

          {/* Sekmeye Göre Değişen Dinamik İçerik Alanı */}
          <AnimatePresence mode="wait">
             <motion.div
               key={`${section.id}-${safeIndex}`}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.3 }}
               className="flex-1 flex flex-col"
             >
                {renderScreenSimulation({ sectionId: section.id, accent, scenario: currentScenario, activeIndex: safeIndex })}
             </motion.div>
          </AnimatePresence>

          {/* Alt Sabit Navbar (Menüler Arası Geçiş Hissiyatı İçin) */}
          <div className="h-[70px] bg-[#121A2B] border-t border-white/10 flex justify-between items-center px-6 shrink-0">
             <Store size={22} className={section.id === 'merchant-pulse' ? 'text-white' : 'text-white/30'} />
             <Tag size={22} className={section.id === 'merchant-coupon' ? 'text-white' : 'text-white/30'} />
             <PieChart size={22} className={section.id === 'merchant-revenue' ? 'text-white' : 'text-white/30'} />
             <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
               <span className="text-white font-bold text-[12px]">YZ</span>
             </div>
          </div>

        </div>
      </div>
    </div>
  )
}
