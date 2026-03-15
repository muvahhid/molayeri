export type HistoraiLegalDoc = {
  title: string
  effectiveDate: string
  intro: string
  sections: Array<{
    title: string
    body?: string[]
    bullets?: string[]
    ordered?: string[]
  }>
}

export const HISTORAI_SUPPORT_EMAIL = 'historai@molayeri.app'

export const HISTORAI_LEGAL_LINKS = {
  index: '/historai/legal',
  privacyPolicy: '/historai/legal/privacy-policy',
  termsOfUse: '/historai/legal/terms-of-use',
  accountDeletion: '/historai/legal/account-deletion',
} as const

export const HISTORAI_PRIVACY_POLICY_EN: HistoraiLegalDoc = {
  title: 'HistorAI Privacy Policy',
  effectiveDate: '15 March 2026',
  intro:
    'HistorAI is operated by Muharrem Akkaya. This Privacy Policy explains how we collect, use, store, share, and delete personal data when you use the HistorAI mobile application and related services.',
  sections: [
    {
      title: '1. Scope',
      body: [
        'This Privacy Policy applies to the HistorAI iOS and Android applications, account creation and authentication services, location and historical discovery features, inscription and object/building analysis, archive and discussion features, and customer support and account deletion requests.',
      ],
    },
    {
      title: '2. Data We Collect',
      bullets: [
        'Account and identity data such as first name, last name, email address, account identifier, and Apple or Google sign-in provider data.',
        'Membership and profile data such as selected theme, membership tier, role, quota, feature usage, and editor application data.',
        'Location data when you use the Location History feature.',
        'User content such as uploaded photos, audio, images, PDFs, discussion attachments, saved records, and archive entries.',
        'Technical request data and limited operational logs required for security, abuse prevention, and troubleshooting.',
      ],
    },
    {
      title: '3. How We Use Data',
      bullets: [
        'To create and manage your account.',
        'To authenticate you and secure access to your profile.',
        'To provide location-based historical discovery and AI-assisted analysis.',
        'To save records, archive entries, discussion content, and saved places.',
        'To enforce quotas, roles, moderation, and abuse prevention.',
        'To respond to support requests and comply with legal obligations.',
      ],
    },
    {
      title: '4. Legal Bases',
      body: [
        'Where applicable law requires a legal basis, we rely on contract, consent, legitimate interests, and legal obligation depending on the relevant processing activity.',
      ],
    },
    {
      title: '5. Third Parties and Processors',
      body: [
        'Depending on feature usage, data may be processed by Supabase, Apple, Google, OpenAI, and public historical reference sources such as OpenStreetMap, Wikimedia, and Wikipedia. We share data only to the extent necessary to provide the requested feature or to operate the service securely and lawfully.',
      ],
    },
    {
      title: '6. International Transfers',
      body: [
        'Because our infrastructure and processors may operate in multiple countries, your data may be transferred and processed outside your country of residence. Where required, we use reasonable safeguards.',
      ],
    },
    {
      title: '7. Data Retention',
      bullets: [
        'Account data is generally kept while your account remains active.',
        'Saved records and uploaded content are generally kept until you delete them or delete your account.',
        'Operational logs are kept for a limited period reasonably necessary for security and maintenance.',
      ],
    },
    {
      title: '8. Account Deletion',
      body: [
        `You can request deletion directly inside the app. For web-based deletion support or questions, contact ${HISTORAI_SUPPORT_EMAIL}.`,
      ],
    },
    {
      title: '9. Your Rights',
      body: [
        'Depending on your jurisdiction, you may have rights including access, correction, deletion, restriction, objection, consent withdrawal, and complaint rights.',
      ],
    },
    {
      title: '10. Children',
      body: [
        'HistorAI is not directed to children below the minimum age required by applicable law to consent to personal data processing in their jurisdiction.',
      ],
    },
    {
      title: '11. Security',
      body: [
        'We use reasonable technical and organizational measures to protect personal data. No service can guarantee absolute security.',
      ],
    },
    {
      title: '12. Changes',
      body: [
        'We may update this Privacy Policy from time to time. Material changes will be reflected by updating the effective date and, where appropriate, through in-app or service notices.',
      ],
    },
    {
      title: '13. Contact',
      body: [`Muharrem Akkaya | HistorAI | ${HISTORAI_SUPPORT_EMAIL}`],
    },
  ],
}

export const HISTORAI_PRIVACY_POLICY_TR: HistoraiLegalDoc = {
  title: 'HistorAI Gizlilik Politikası',
  effectiveDate: '15 Mart 2026',
  intro:
    'HistorAI, Muharrem Akkaya tarafından işletilmektedir. Bu Gizlilik Politikası, HistorAI mobil uygulamasını ve bağlantılı hizmetleri kullanırken hangi kişisel verileri topladığımızı, nasıl kullandığımızı, nasıl sakladığımızı, kimlerle paylaştığımızı ve nasıl sildiğimizi açıklar.',
  sections: [
    {
      title: '1. Kapsam',
      body: [
        'Bu politika, HistorAI iOS ve Android uygulamaları, hesap oluşturma ve kimlik doğrulama hizmetleri, konum ve tarihsel keşif özellikleri, yazıt ile obje/yapı analizi, arşiv ve tartışma özellikleri ile destek ve hesap silme talepleri için geçerlidir.',
      ],
    },
    {
      title: '2. Topladığımız Veriler',
      bullets: [
        'Ad, soyad, e-posta adresi, hesap tanımlayıcısı ve Apple/Google ile giriş sağlayıcı verileri.',
        'Tema, üyelik paketi, rol, kullanım kotası, özellik kullanımı ve editör başvuru verileri.',
        'Konum Tarihi özelliği için cihaz konumu.',
        'Yüklediğiniz fotoğraflar, sesler, görseller, PDF dosyaları, tartışma ekleri, kayıtlar ve arşiv içerikleri.',
        'Güvenlik, kötüye kullanım önleme ve hata çözümü için gerekli sınırlı teknik ve operasyonel kayıtlar.',
      ],
    },
    {
      title: '3. Verileri Nasıl Kullanıyoruz',
      bullets: [
        'Hesabınızı oluşturmak ve yönetmek.',
        'Kimlik doğrulamak ve profil erişimini güvenceye almak.',
        'Konuma dayalı tarihsel keşif ve yapay zeka destekli analiz sunmak.',
        'Kayıtlarınızı, arşivlerinizi, tartışma içeriklerinizi ve kaydettiğiniz yerleri saklamak.',
        'Kota, rol, moderasyon ve kötüye kullanım önleme süreçlerini yürütmek.',
        'Destek taleplerini yanıtlamak ve hukuki yükümlülüklere uymak.',
      ],
    },
    {
      title: '4. Hukuki Dayanaklar',
      body: [
        'Uygulanabilir hukuk gerektiriyorsa, ilgili işleme faaliyetinin niteliğine göre sözleşmenin ifası, açık rıza, meşru menfaat ve hukuki yükümlülük dayanaklarına dayanırız.',
      ],
    },
    {
      title: '5. Üçüncü Taraflar ve Hizmet Sağlayıcılar',
      body: [
        'Özellik kullanımına bağlı olarak veriler Supabase, Apple, Google, OpenAI ve OpenStreetMap, Wikimedia ile Wikipedia gibi kamuya açık tarihsel referans kaynakları tarafından işlenebilir. Veriler yalnızca hizmeti sunmak veya sistemi güvenli ve hukuka uygun şekilde işletmek için gerekli olduğu ölçüde paylaşılır.',
      ],
    },
    {
      title: '6. Uluslararası Veri Aktarımları',
      body: [
        'Altyapımız ve hizmet sağlayıcılarımız farklı ülkelerde bulunabildiği için verileriniz ikamet ettiğiniz ülke dışında aktarılabilir ve işlenebilir. Gerekli olduğunda makul koruma tedbirleri kullanırız.',
      ],
    },
    {
      title: '7. Saklama Süreleri',
      bullets: [
        'Hesap verileri genelde hesabınız aktif kaldığı sürece saklanır.',
        'Kayıtlar ve yüklediğiniz içerikler genelde siz silene veya hesabınızı silene kadar saklanır.',
        'Operasyon kayıtları güvenlik ve bakım için makul ve sınırlı bir süre tutulur.',
      ],
    },
    {
      title: '8. Hesap Silme',
      body: [
        `Silme talebini uygulama içinden gönderebilirsiniz. Web üzerinden destek veya sorular için ${HISTORAI_SUPPORT_EMAIL} adresine yazabilirsiniz.`,
      ],
    },
    {
      title: '9. Haklarınız',
      body: [
        'Bulunduğunuz ülkeye göre erişim, düzeltme, silme, kısıtlama, itiraz, rızayı geri çekme ve şikayet haklarınız olabilir.',
      ],
    },
    {
      title: '10. Çocuklar',
      body: [
        'HistorAI, ilgili hukuk bakımından gerekli minimum yaşın altındaki çocuklara yönelik değildir.',
      ],
    },
    {
      title: '11. Güvenlik',
      body: [
        'Kişisel verileri korumak için makul teknik ve idari tedbirler uygularız. Hiçbir sistem mutlak güvenlik garanti edemez.',
      ],
    },
    {
      title: '12. Değişiklikler',
      body: [
        'Bu politika zaman zaman güncellenebilir. Önemli değişiklikler tarih güncellemesi ve gerektiğinde uygulama içi bildirimlerle duyurulur.',
      ],
    },
    {
      title: '13. İletişim',
      body: [`Muharrem Akkaya | HistorAI | ${HISTORAI_SUPPORT_EMAIL}`],
    },
  ],
}

export const HISTORAI_TERMS_EN: HistoraiLegalDoc = {
  title: 'HistorAI Terms of Use',
  effectiveDate: '15 March 2026',
  intro:
    'These Terms govern your use of the HistorAI app and related services operated by Muharrem Akkaya.',
  sections: [
    { title: '1. Service Description', body: ['HistorAI provides historical discovery, location-based historical context, inscription reading, object and building analysis, archives, and discussion features.'] },
    { title: '2. Accounts', body: ['You are responsible for accurate account information, account security, activity performed through your account, and compliance with applicable laws and platform rules.'] },
    { title: '3. User Content', body: ['You retain ownership of your content. You grant HistorAI a limited license to store, process, display, transmit, and use that content only as necessary to provide the service.'] },
    { title: '4. Acceptable Use', body: ['You may not abuse the service, upload unlawful or harmful content, bypass quotas or access controls, impersonate others, or interfere with service operation.'] },
    { title: '5. AI and Historical Content Disclaimer', body: ['AI-assisted and public-source outputs may be incomplete, inaccurate, or context-dependent. You should independently verify critical information.'] },
    { title: '6. Paid Plans and Billing', body: ['If paid plans are enabled, billing, renewal, cancellation, refunds, and payment processing are governed by the applicable app store or payment platform rules.'] },
    { title: '7. Availability', body: ['We may modify, suspend, limit, or discontinue features, quotas, plans, or integrations where reasonably necessary.'] },
    { title: '8. Termination', body: ['We may suspend or terminate access for violations, abuse, legal risk, or material interference with service operation.'] },
    { title: '9. Limitation of Liability', body: ['To the maximum extent permitted by law, HistorAI is provided "as is" and liability is limited as stated in these Terms.'] },
    { title: '10. Governing Law', body: ['These Terms are governed by the laws of the Republic of Türkiye, except where mandatory consumer law requires otherwise.'] },
    { title: '11. Changes', body: ['We may update these Terms from time to time. Continued use after an update becomes effective constitutes acceptance of the revised Terms where permitted by law.'] },
    { title: '12. Contact', body: [`Muharrem Akkaya | HistorAI | ${HISTORAI_SUPPORT_EMAIL}`] },
  ],
}

export const HISTORAI_TERMS_TR: HistoraiLegalDoc = {
  title: 'HistorAI Kullanım Şartları',
  effectiveDate: '15 Mart 2026',
  intro:
    'Bu Şartlar, Muharrem Akkaya tarafından işletilen HistorAI uygulamasını ve bağlantılı hizmetleri kullanımınızı düzenler.',
  sections: [
    { title: '1. Hizmet Tanımı', body: ['HistorAI; tarihsel keşif, konum bağlamı, yazıt okuma, obje ve yapı analizi, arşiv ve tartışma özellikleri sunar.'] },
    { title: '2. Hesaplar', body: ['Doğru hesap bilgisi sağlamak, hesabınızın güvenliğini korumak, hesabınız üzerinden gerçekleşen faaliyetler ve hukuka ile platform kurallarına uyum sizin sorumluluğunuzdadır.'] },
    { title: '3. Kullanıcı İçeriği', body: ['İçeriğin mülkiyeti sizde kalır. HistorAI\'ye, hizmeti sunmak için gerekli olduğu ölçüde, bu içeriği saklama, işleme, gösterme, iletme ve kullanma yönünde sınırlı bir lisans verirsiniz.'] },
    { title: '4. Kabul Edilebilir Kullanım', body: ['Hizmeti kötüye kullanamaz, hukuka aykırı veya zararlı içerik yükleyemez, kotaları aşmaya çalışamaz, başkalarını taklit edemez veya hizmetin işleyişine zarar veremezsiniz.'] },
    { title: '5. Yapay Zeka ve Tarihsel İçerik Uyarısı', body: ['Yapay zeka destekli ve kamu kaynağına dayalı çıktılar eksik, hatalı veya bağlama bağlı olabilir. Kritik bilgileri bağımsız şekilde doğrulamalısınız.'] },
    { title: '6. Ücretli Planlar ve Faturalama', body: ['Ücretli planlar açılırsa, faturalama, yenileme, iptal ve iade süreçleri ilgili mağaza veya ödeme platformunun kurallarına tabi olur.'] },
    { title: '7. Erişilebilirlik', body: ['Gerekli olduğu ölçüde özellikleri, kotaları, planları veya entegrasyonları değiştirebilir, sınırlandırabilir veya durdurabiliriz.'] },
    { title: '8. Sonlandırma', body: ['İhlal, kötüye kullanım, hukuki risk veya hizmet işleyişine ciddi müdahale halinde erişimi askıya alabilir veya sonlandırabiliriz.'] },
    { title: '9. Sorumluluğun Sınırlandırılması', body: ['Hukukun izin verdiği ölçüde HistorAI "olduğu gibi" sunulur ve sorumluluk, bu Şartlardaki çerçeve içinde sınırlandırılır.'] },
    { title: '10. Uygulanacak Hukuk', body: ['Zorunlu tüketici hukuku hükümleri saklı kalmak üzere Türkiye Cumhuriyeti hukuku uygulanır.'] },
    { title: '11. Değişiklikler', body: ['Bu Şartlar zaman zaman güncellenebilir. Kullanıma devam etmeniz, hukuken izin verilen ölçüde güncel Şartları kabul ettiğiniz anlamına gelir.'] },
    { title: '12. İletişim', body: [`Muharrem Akkaya | HistorAI | ${HISTORAI_SUPPORT_EMAIL}`] },
  ],
}

export const HISTORAI_ACCOUNT_DELETION_EN: HistoraiLegalDoc = {
  title: 'HistorAI Account Deletion',
  effectiveDate: '15 March 2026',
  intro: 'HistorAI provides in-app account deletion.',
  sections: [
    {
      title: 'How to delete your account',
      ordered: [
        'Open My Account.',
        'Go to the account actions area.',
        'Choose the account deletion action.',
        'Confirm the deletion request.',
      ],
    },
    {
      title: 'What happens when your account is deleted',
      body: [
        'When deletion completes, HistorAI deletes or de-identifies account data and user-owned stored content, subject to legal retention obligations and technical limitations.',
      ],
    },
    {
      title: 'Support',
      body: [`If you cannot access the app and still need deletion assistance, contact ${HISTORAI_SUPPORT_EMAIL}.`],
    },
  ],
}

export const HISTORAI_ACCOUNT_DELETION_TR: HistoraiLegalDoc = {
  title: 'HistorAI Hesap Silme',
  effectiveDate: '15 Mart 2026',
  intro: 'HistorAI uygulama içinden hesap silme imkanı sunar.',
  sections: [
    {
      title: 'Hesap nasıl silinir',
      ordered: [
        'Hesabım ekranını açın.',
        'Hesap işlemleri alanına gidin.',
        'Hesap silme seçeneğini seçin.',
        'Silme talebini onaylayın.',
      ],
    },
    {
      title: 'Hesap silindiğinde ne olur',
      body: [
        'Silme tamamlandığında, hukuki saklama yükümlülükleri ve teknik sınırlamalar saklı kalmak üzere, HistorAI hesabınıza bağlı verileri ve size ait içerikleri siler veya kimliksizleştirir.',
      ],
    },
    {
      title: 'Destek',
      body: [`Uygulamaya erişemiyorsanız ve yine de hesap silme desteğine ihtiyaç duyuyorsanız ${HISTORAI_SUPPORT_EMAIL} adresine yazın.`],
    },
  ],
}
