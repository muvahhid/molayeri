export const PLATFORM_OWNER_NAME = 'Muharrem'

export const USER_MEMBERSHIP_TERMS_VERSION = 'uyelik-v1.0.0-2026-02-21'
export const KVKK_TERMS_VERSION = 'kvkk-v1.0.0-2026-02-21'
export const BUSINESS_MEMBERSHIP_TERMS_VERSION = 'isletme-v1.0.0-2026-02-21'
export const BUSINESS_KVKK_TERMS_VERSION = 'isletme-kvkk-v1.0.0-2026-02-21'

export const USER_MEMBERSHIP_TERMS_TEXT = `
MOLAYERI KULLANICI ÜYELİK SÖZLEŞMESİ
Versiyon: ${USER_MEMBERSHIP_TERMS_VERSION}
Yürürlük Tarihi: 21.02.2026

1) Taraflar
- Platform Sahibi: ${PLATFORM_OWNER_NAME}
- Ticari Unvan: ______________________________
- MERSİS/VKN: ______________________________
- Adres: ______________________________
- E-posta: ______________________________
- Telefon: ______________________________
- Üye: Uygulamaya kayıt olan gerçek kişi.

2) Konu
Bu sözleşme; Molayeri servislerinin (kupon, cüzdan, kampanya, mesajlaşma, konvoy, sesli kanal, ödeme/indirim akışları dahil) kullanım koşullarını belirler.

3) Üyelik ve Hesap
- Üye, hesap bilgilerini doğru ve güncel tutmakla yükümlüdür.
- Hesabın ve cihaz güvenliğinin sorumluluğu üyeye aittir.
- Hukuka aykırı, yanıltıcı veya suistimal niteliğindeki kullanım yasaktır.

4) Sorumluluk ve Delil
- Platform teknik kesintisiz/hatasız hizmet garantisi vermez.
- Uyuşmazlıklarda sistem logları, veritabanı kayıtları ve zaman damgaları delil niteliğindedir.

5) Yürürlük
- Üye, uygulama içindeki elektronik onay işlemiyle bu metni kabul etmiş sayılır.
- Bu sözleşme kabul edilmeden üyelik akışları tamamlanmaz.
`.trim()

export const KVKK_TERMS_TEXT = `
MOLAYERI KVKK AYDINLATMA METNİ
Versiyon: ${KVKK_TERMS_VERSION}
Yürürlük Tarihi: 21.02.2026

1) Veri Sorumlusu
Veri sorumlusu: ${PLATFORM_OWNER_NAME} adına faaliyet gösteren işletme.

2) İşlenen Veri Kategorileri
- Kimlik ve iletişim: ad-soyad, e-posta, telefon
- Hesap/güvenlik kayıtları: oturum, cihaz ve hata logları
- İşlem verileri: kupon, cüzdan, ödeme ve kampanya kayıtları
- Konum/zaman verileri: rota ve eşleşme süreçleri kapsamında

3) İşleme Amaçları
- Üyelik kurulması ve hesap yönetimi
- Güvenli kimlik doğrulama/yetkilendirme
- Ticari akışların (kupon/ödeme/cüzdan) işletilmesi
- Suistimal önleme ve mevzuat uyumu

4) Hukuki Sebep ve Haklar
Veriler KVKK m.5/m.6 kapsamındaki hukuki sebeplere dayanılarak işlenir. İlgili kişi, KVKK m.11 kapsamındaki haklarını kullanabilir.

5) Onay
Kullanıcı, uygulama içindeki açık onay aksiyonu ile metni okuduğunu ve kabul ettiğini beyan eder.
`.trim()

export const BUSINESS_MEMBERSHIP_TERMS_TEXT = `
MOLAYERI İŞLETME ÜYELİK VE HİZMET SÖZLEŞMESİ
Versiyon: ${BUSINESS_MEMBERSHIP_TERMS_VERSION}
Yürürlük Tarihi: 21.02.2026

1) Taraflar
- Platform Sahibi: ${PLATFORM_OWNER_NAME}
- İşletme Ünvanı: ______________________________
- İşletme Yetkilisi: ______________________________

2) Konu
Bu sözleşme, işletmenin Molayeri üzerinde profil açması, kampanya/kupon yayınlaması, ödeme-cüzdan süreçlerine katılması ve kullanıcı etkileşimlerini kapsar.

3) İşletme Beyanları
- İşletme; girilen tüm bilgi ve belgelerin doğru, güncel ve hukuka uygun olduğunu beyan eder.
- Yayınlanan kampanya/kupon koşullarının açık, doğru ve ifa edilebilir olması işletmenin sorumluluğundadır.

4) Ödeme ve Operasyon
- Ödeme altyapısı kurallarına uyum zorunludur.
- Şüpheli işlem, sahtecilik veya mevzuat riski halinde işlemler kısıtlanabilir.

5) Tazmin ve Delil
- İşletmenin ihlalinden doğan idari/adli/ticari taleplerden işletme sorumludur.
- Sistem logları ve kayıtları delil niteliğindedir.

6) Yürürlük
- İşletme, uygulama içindeki elektronik onay ile metni kabul eder.
- Onay verilmeden işletme kaydı tamamlanmaz.
`.trim()

export const BUSINESS_KVKK_TERMS_TEXT = `
MOLAYERI İŞLETME KVKK AYDINLATMA METNİ
Versiyon: ${BUSINESS_KVKK_TERMS_VERSION}
Yürürlük Tarihi: 21.02.2026

1) Kapsam
Bu metin; işletme yetkilisine ait kimlik/iletişim verileri ile finansal ve operasyonel kayıtların işlenmesine ilişkin esasları düzenler.

2) Amaç
- İşletme hesabı açılışı ve doğrulama
- Kampanya/kupon/ödeme süreçlerinin işletilmesi
- Güvenlik, denetim, suistimal önleme ve mevzuat uyumu

3) Hukuki Sebep ve Haklar
KVKK m.5 kapsamındaki hukuki sebepler doğrultusunda işleme yapılır. İşletme yetkilisi KVKK m.11 kapsamındaki haklarını kullanabilir.

4) Onay
İşletme, elektronik onay aksiyonu ile bu metni okuduğunu ve kabul ettiğini beyan eder.
`.trim()

