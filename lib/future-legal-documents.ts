export const FUTURE_PLATFORM_OWNER_NAME = '[ŞİRKET VEYA ŞAHIS ADI DOLDURULACAK]'
export const FUTURE_PLATFORM_CONTACT_EMAIL = 'iletisim@molayeri.app'

export const FUTURE_USER_MEMBERSHIP_TERMS_VERSION = 'uyelik-v4.0.0-2026-03-04'
export const FUTURE_KVKK_VERSION = 'kvkk-v4.0.0-2026-03-04'

export const FUTURE_USER_MEMBERSHIP_TERMS_TEXT = `
MOLAYERİ KULLANICI ÜYELİK VE HİZMET SÖZLEŞMESİ
Versiyon: ${FUTURE_USER_MEMBERSHIP_TERMS_VERSION}

1. TARAFLAR VE KONU
1.1. Bu sözleşme, MolaYeri uygulamasını işleten veri sorumlusu/hizmet sağlayıcı ${FUTURE_PLATFORM_OWNER_NAME} (Bundan sonra "Platform" veya "MolaYeri" olarak anılacaktır) ile uygulamayı kullanan gerçek kişi ("Kullanıcı" veya "Üye") arasında akdedilmiştir.
1.2. MolaYeri; dijital konvoy, mola/fırsat keşfi, kullanıcılar arası iletişim (sesli ve yazılı), kampanya/kupon görüntüleme ve cüzdan hizmetleri sunan dijital bir aracı platformdur. MolaYeri, işletmelerin sunduğu mal/hizmetlerin doğrudan satıcısı DEĞİLDİR.

2. YAŞ SINIRI VE KİMLİK BEYANI
2.1. Platform içerisindeki dijital cüzdan, konvoy ve canlı sesli iletişim özellikleri sebebiyle, MolaYeri uygulaması SADECE 18 YAŞINI DOLDURMUŞ bireylerin kullanımına sunulmuştur.
2.2. Kullanıcı, kayıt esnasında verdiği bilgilerin doğruluğunu taahhüt eder. Gerçeğe aykırı yaş veya kimlik beyanından doğacak tüm hukuki/cezai sorumluluk münhasıran Kullanıcı'ya aittir.

3. KONUM, KONVOY VE PANİK ÖZELLİĞİ (SORUMLULUK REDDİ)
3.1. Dijital Konvoy: Konvoy içindeki kullanıcılar; adınızı, rolünüzü, araç bilginizi ve anlık/son bilinen konumunuzu görebilir. MolaYeri, kullanıcıların birbirleriyle fiziksel olarak buluşması veya seyahat etmesinden kaynaklanabilecek hiçbir doğrudan/dolaylı zarardan (kaza, hırsızlık, gasp vb.) sorumlu tutulamaz.
3.2. Panik Özelliği: Bu özellik BİR RESMİ ACİL YARDIM HATTI (112 vb.) DEĞİLDİR. Sadece mevcut konuma en yakın işletme veya mola noktalarını listeler.
3.3. Harita Verileri: MolaYeri, rota işlemlerini üçüncü taraf (Google Maps vb.) API'ler üzerinden sağlar. Rota doğruluğu veya kapalı yollardan doğacak sonuçlar Platform'un sorumluluğunda değildir.

4. İLETİŞİM, CİHAZ İZİNLERİ VE YER SAĞLAYICI BEYANI
4.1. Cihaz İzinleri (Native Compliance): Uygulama; Mikrofon (sesli odalar için), Konum (harita/konvoy için) ve Kamera (QR ödeme için) erişim izinlerini, yalnızca özellik kullanıldığı anlarda işletim sistemi (iOS/Android) kurallarına uygun olarak talep eder.
4.2. Canlı Ses Odaları: Sesli iletişim (LiveKit altyapısı) anlık olarak gerçekleşir ve sunucularımızda SES KAYDI TUTULMAZ.
4.3. İçerik Sorumluluğu: MolaYeri, 5651 sayılı Kanun uyarınca "Yer Sağlayıcı"dır. Yazılı mesajlaşma geçmişi, yasal yükümlülükler gereği otomatik silinme politikalarına (retention) tabi olarak loglanır. Kullanıcıların ürettiği hukuka aykırı içeriklerden Platform sorumlu değildir.

5. SİSTEM GÜVENLİĞİ VE SUİSTİMAL (ANTI-FRAUD)
5.1. MolaYeri altyapısı, yetkisiz erişim (IDOR), çoklu istek (rate-limit) ve tekrar (replay) saldırılarına karşı aktif güvenlik protokolleri ile korunmaktadır.
5.2. Kullanıcının; cüzdan bakiyesini manipüle etmeye çalışması, kupon/kampanya kodlarını otomatik yazılımlarla (bot) veya hileli yollarla tekrar kullanmaya (replay attack) çalışması veya uygulamanın tersine mühendisliğini (reverse engineering) yapması KESİNLİKLE YASAKTIR.
5.3. Bu tarz bir manipülasyon tespit edildiğinde, MolaYeri kullanıcının hesabını (içindeki cüzdan bakiyesi ve kupon hakları dahil olmak üzere) derhal dondurma ve yasal işlem başlatma hakkını saklı tutar.

6. CÜZDAN VE ÖDEMELER
6.1. Platform içi ödeme ve cüzdan yükleme işlemleri, BDDK yetkili ödeme kuruluşu (İyzico) altyapısı ile yürütülür. MolaYeri veritabanlarında KESİNLİKLE ham kredi kartı numarası saklanmaz.

7. UYUŞMAZLIK VE YÜRÜRLÜK
Sözleşme elektronik onayla yürürlüğe girer. Uyuşmazlıklarda Türkiye Cumhuriyeti hukuku uygulanır.
`.trim()

export const FUTURE_KVKK_TEXT = `
MOLAYERİ KVKK AYDINLATMA METNİ VE GİZLİLİK POLİTİKASI
Versiyon: ${FUTURE_KVKK_VERSION}

1. VERİ SORUMLUSU
Veri sorumlusu: ${FUTURE_PLATFORM_OWNER_NAME}
İletişim: ${FUTURE_PLATFORM_CONTACT_EMAIL}

2. İŞLENEN KİŞİSEL VERİLERİNİZ VE İŞLEME AMAÇLARI
- Kimlik ve İletişim: Ad-soyad, telefon numarası.
- Konum Verisi (GPS): Canlı veya son bilinen konumunuz (Konvoy ve panik modu için işlenir).
- Hesap ve İşlem: Yazılı mesajlaşma logları, kupon kullanımları ve cüzdan referans/token kodları (Kredi kartı ham verileriniz MolaYeri tarafından SAKLANMAZ, lisanslı ödeme kuruluşunca işlenir).
- Teknik Veriler: IP adresi, cihaz türü ve erişim logları (Sistem güvenliği ve 5651 sayılı kanun gereği).
*Sesli odalardaki görüşmeleriniz anlıktır ve veritabanlarımızda SES KAYDI OLARAK SAKLANMAZ.*

3. OTOMATİK VERİ İMHASI VE GÜVENLİK STANDARTLARI
MolaYeri, verilerinizi en üst düzey güvenlik standartlarıyla korur.
- Satır Bazlı Güvenlik (RLS): Veritabanımızdaki (Supabase) kişisel verileriniz ve cüzdan hareketleriniz, gelişmiş RLS (Row Level Security) politikalarıyla korunmakta olup, her kullanıcı yalnızca kendi yetkilendirildiği veriye erişebilir.
- Otomatik Silme (Retention): 5651 sayılı Kanun ve ilgili mevzuat uyarınca yasal saklama süreleri dolan log kayıtlarınız ve mesaj geçmişleriniz, sistemlerimizdeki otomatik görevler (cron jobs/retention policies) vasıtasıyla kalıcı ve geri döndürülemez şekilde imha edilir.

4. HUKUKİ SEBEPLER, AKTARIM VE YURT DIŞI (AÇIK RIZA)
Verileriniz, KVKK Madde 5'teki "sözleşmenin ifası" ve "hukuki yükümlülük" şartlarına dayanılarak işlenmektedir.
Platformumuz küresel bulut mimarileri üzerine kuruludur. Veritabanı yönetimi için Supabase'in (yurt dışı) sunucularına ve harita servisleri için Google/Apple sistemlerine veri aktarımı yapılmaktadır. Bu metni onaylayarak KVKK Madde 9 kapsamında verilerinizin yurt dışı merkezli bulut sunucularına aktarılmasına açık rıza göstermiş olursunuz.

5. İLGİLİ KİŞİ HAKLARI (KVKK Madde 11)
Kanun'un 11. maddesi kapsamındaki haklarınızı (öğrenme, düzeltme, silme, vb.) kullanmak için ${FUTURE_PLATFORM_CONTACT_EMAIL} adresine başvurabilirsiniz.
`.trim()
