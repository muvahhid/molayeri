'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertCircle, BadgeCheck, Building2, Landmark, Loader2, MapPin, Save, ShieldCheck, UserRound } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'

type ProfileForm = {
  submerchantType: 'PERSONAL' | 'PRIVATE_COMPANY' | 'LIMITED_OR_JOINT_STOCK_COMPANY'
  contactName: string
  contactSurname: string
  email: string
  gsmNumber: string
  iban: string
  identityNumber: string
  taxNumber: string
  taxOffice: string
  legalCompanyTitle: string
  address: string
  city: string
  country: string
  onboardingStatus: string
  isReady: boolean
  missingFields: string[]
  iyzicoStatus: string
  iyzicoSubMerchantKey: string
}

const EMPTY_PROFILE: ProfileForm = {
  submerchantType: 'PERSONAL',
  contactName: '',
  contactSurname: '',
  email: '',
  gsmNumber: '',
  iban: '',
  identityNumber: '',
  taxNumber: '',
  taxOffice: '',
  legalCompanyTitle: '',
  address: '',
  city: '',
  country: 'TR',
  onboardingStatus: 'draft',
  isReady: false,
  missingFields: [],
  iyzicoStatus: '',
  iyzicoSubMerchantKey: '',
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function asString(value: unknown, fallback = ''): string {
  const text = String(value ?? '').trim()
  return text || fallback
}

function asBool(value: unknown): boolean {
  return value === true
}

function onlyDigits(value: string): string {
  return value.replace(/\D+/g, '')
}

function normalizeProfile(profile: ProfileForm): ProfileForm {
  return {
    ...profile,
    contactName: profile.contactName.trim(),
    contactSurname: profile.contactSurname.trim(),
    email: profile.email.trim().toLowerCase(),
    gsmNumber: onlyDigits(profile.gsmNumber),
    iban: profile.iban.replace(/\s+/g, '').toUpperCase(),
    identityNumber: onlyDigits(profile.identityNumber),
    taxNumber: onlyDigits(profile.taxNumber),
    taxOffice: profile.taxOffice.trim(),
    legalCompanyTitle: profile.legalCompanyTitle.trim(),
    address: profile.address.trim(),
    city: profile.city.trim(),
    country: profile.country.trim().toUpperCase() || 'TR',
  }
}

function validateProfile(profile: ProfileForm, markReady: boolean): string | null {
  if (profile.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(profile.email)) {
    return 'E-posta formatı geçersiz. Örn: ad@firma.com'
  }

  if (profile.gsmNumber && ![10, 11, 12].includes(profile.gsmNumber.length)) {
    return 'Telefon numarası 10-12 hane olmalıdır.'
  }

  if (profile.iban && !/^TR[0-9]{24}$/.test(profile.iban)) {
    return 'IBAN formatı geçersiz. TR ile başlamalı ve 26 karakter olmalıdır.'
  }

  if (!markReady) return null

  const missing: string[] = []
  const pushIfBlank = (label: string, value: string) => {
    if (!value.trim()) missing.push(label)
  }

  pushIfBlank('Yetkili adı', profile.contactName)
  pushIfBlank('Yetkili soyadı', profile.contactSurname)
  pushIfBlank('E-posta', profile.email)
  pushIfBlank('Telefon (GSM)', profile.gsmNumber)
  pushIfBlank('IBAN', profile.iban)
  pushIfBlank('Açık adres', profile.address)
  pushIfBlank('Şehir', profile.city)
  pushIfBlank('Ülke', profile.country)

  if (profile.submerchantType === 'PERSONAL') {
    if (!profile.identityNumber) {
      missing.push('T.C. kimlik numarası')
    } else if (profile.identityNumber.length !== 11) {
      return 'T.C. kimlik numarası 11 hane olmalıdır.'
    }
  } else {
    if (!profile.taxNumber) {
      missing.push('Vergi numarası')
    } else if (profile.taxNumber.length < 10) {
      return 'Vergi numarası en az 10 hane olmalıdır.'
    }
    pushIfBlank('Vergi dairesi', profile.taxOffice)
    pushIfBlank('Şirket ünvanı', profile.legalCompanyTitle)
  }

  if (missing.length > 0) {
    return `Satışa hazır için zorunlu alanları tamamlayın: ${missing.join(', ')}`
  }

  return null
}

// Ortak Donanım Kartı Kapsayıcısı
const HardwarePanel = ({ children, className = "" }: { children: ReactNode, className?: string }) => (
  <div className={`relative bg-[#16181d] border border-[#2d313a] rounded-md shadow-lg ${className}`}>
    <div className="absolute top-2 left-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute bottom-2 left-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    {children}
  </div>
)

type InputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  helperText?: string
  type?: string
  rows?: number
  requiredField?: boolean
  maxLength?: number
  autoComplete?: string
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  type = 'text',
  rows = 1,
  requiredField = false,
  maxLength,
  autoComplete,
  inputMode,
}: InputProps) {
  return (
    <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
      <span className="inline-flex items-center gap-1">
        {label}
        {requiredField ? <span className="text-[#38bdf8]">*</span> : null}
      </span>
      {rows > 1 ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] text-[#e2e8f0] text-sm font-mono border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569] transition-colors resize-none custom-scrollbar"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          maxLength={maxLength}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] text-[#e2e8f0] text-sm font-mono border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 placeholder:text-[#475569] transition-colors"
        />
      )}
      {helperText ? <p className="mt-1.5 text-[9px] font-mono tracking-widest text-[#475569] uppercase">{helperText}</p> : null}
    </label>
  )
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="rounded border border-[#2d313a] bg-[#16181d] p-5 space-y-4">
      <div className="flex items-start gap-3 border-b border-[#1e232b] pb-3 mb-4">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#2d313a] bg-[#0a0c10] text-[#38bdf8] shrink-0">
          <Icon size={16} strokeWidth={1.5} />
        </span>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0]">{title}</p>
          <p className="mt-1 text-[9px] font-mono uppercase tracking-widest text-[#64748b] leading-relaxed">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export function IyzicoSetupModule({ businessId }: { businessId: string }) {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [profile, setProfile] = useState<ProfileForm>(EMPTY_PROFILE)

  const loadProfile = useCallback(async () => {
    if (!businessId) {
      setProfile(EMPTY_PROFILE)
      setError('')
      return
    }

    setLoading(true)
    setError('')
    try {
      const { data, error: rpcError } = await supabase.rpc('get_merchant_payment_profile_v1', {
        p_business_id: businessId,
      })
      if (rpcError) throw rpcError

      const map = asObject(data)
      const status = asString(map.status, 'error')
      if (status !== 'ok') {
        throw new Error(asString(map.detail, 'Profil bilgisi alınamadı.'))
      }

      const rawProfile = asObject(map.profile)
      const missingRaw = map.missing_fields
      const missing = Array.isArray(missingRaw) ? missingRaw.map((item) => String(item)) : []

      setProfile({
        submerchantType: asString(rawProfile.submerchant_type, 'PERSONAL') as ProfileForm['submerchantType'],
        contactName: asString(rawProfile.contact_name),
        contactSurname: asString(rawProfile.contact_surname),
        email: asString(rawProfile.email),
        gsmNumber: asString(rawProfile.gsm_number),
        iban: asString(rawProfile.iban),
        identityNumber: asString(rawProfile.identity_number),
        taxNumber: asString(rawProfile.tax_number),
        taxOffice: asString(rawProfile.tax_office),
        legalCompanyTitle: asString(rawProfile.legal_company_title),
        address: asString(rawProfile.address),
        city: asString(rawProfile.city),
        country: asString(rawProfile.country, 'TR'),
        onboardingStatus: asString(map.onboarding_status, asString(rawProfile.onboarding_status, 'draft')),
        isReady: asBool(map.is_ready) || asBool(rawProfile.is_ready),
        missingFields: missing,
        iyzicoStatus: asString(rawProfile.iyzico_status),
        iyzicoSubMerchantKey: asString(rawProfile.iyzico_sub_merchant_key),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profil bilgisi alınamadı.')
    } finally {
      setLoading(false)
    }
  }, [businessId, supabase])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const updateField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
    if (error) setError('')
  }

  const saveProfile = async (markReady: boolean) => {
    if (!businessId || saving) return

    const normalized = normalizeProfile(profile)
    setProfile(normalized)

    const validationError = validateProfile(normalized, markReady)
    if (validationError) {
      setError(validationError)
      setInfo('')
      return
    }

    setSaving(true)
    setError('')
    setInfo('')
    try {
      const { data, error: rpcError } = await supabase.rpc('upsert_merchant_payment_profile_v1', {
        p_business_id: businessId,
        p_submerchant_type: normalized.submerchantType,
        p_contact_name: normalized.contactName,
        p_contact_surname: normalized.contactSurname,
        p_email: normalized.email,
        p_gsm_number: normalized.gsmNumber,
        p_iban: normalized.iban,
        p_identity_number: normalized.identityNumber,
        p_tax_number: normalized.taxNumber,
        p_tax_office: normalized.taxOffice,
        p_legal_company_title: normalized.legalCompanyTitle,
        p_address: normalized.address,
        p_city: normalized.city,
        p_country: normalized.country || 'TR',
        p_mark_ready: markReady,
      })
      if (rpcError) throw rpcError

      const map = asObject(data)
      const status = asString(map.status, 'error')
      if (status !== 'ok') {
        const missingRaw = map.missing_fields
        const missing = Array.isArray(missingRaw) ? missingRaw.map((item) => String(item)) : []
        setProfile((prev) => ({ ...prev, missingFields: missing }))
        throw new Error(asString(map.detail, 'Profil kaydedilemedi.'))
      }

      if (markReady) {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('iyzico-submerchant-v1', {
          body: { business_id: businessId },
        })
        if (fnError) throw fnError

        const fnMap = asObject(fnData)
        const fnStatus = asString(fnMap.status, 'error')
        if (fnStatus !== 'ok') {
          const profileMap = asObject(fnMap.profile)
          const nestedProfile = asObject(profileMap.profile)
          const missingRaw = profileMap.missing_fields
          const missing = Array.isArray(missingRaw)
            ? missingRaw.map((item) => String(item))
            : normalized.missingFields

          setProfile((prev) => ({
            ...prev,
            onboardingStatus: asString(profileMap.onboarding_status, prev.onboardingStatus),
            isReady: asBool(profileMap.is_ready) || prev.isReady,
            iyzicoStatus: asString(nestedProfile.iyzico_status, prev.iyzicoStatus),
            iyzicoSubMerchantKey: asString(nestedProfile.iyzico_sub_merchant_key, prev.iyzicoSubMerchantKey),
            missingFields: missing,
          }))

          throw new Error(asString(fnMap.detail, 'iyzico aktivasyonu başarısız.'))
        }

        setInfo('Profil iyzico ile doğrulandı ve satışa hazır hale getirildi.')
      } else {
        setInfo('Profil taslak olarak kaydedildi.')
      }

      await loadProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profil kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const isPersonal = profile.submerchantType === 'PERSONAL'

  return (
    <HardwarePanel className="p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#2d313a] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest bg-[#153445] border border-[#226785] text-[#38bdf8]">
            <ShieldCheck className="w-3.5 h-3.5" />
            iyzico Kurulum
          </div>
          <h2 className="mt-3 text-[14px] font-medium tracking-wide text-[#e2e8f0] uppercase">İşletme Ödeme Profili</h2>
          <p className="mt-1.5 text-[11px] font-mono text-[#94a3b8] leading-relaxed">
            Kurulum tamamlandığında tek QR ile ödeme + kupon tahsilatı aktif olur.
          </p>
          <div className="mt-3 flex items-center gap-4">
            <p className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
              DURUM: <span className="text-[#e2e8f0]">{profile.onboardingStatus}</span>
            </p>
            {profile.iyzicoStatus ? (
              <p className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                IYZICO DURUMU: <span className="text-[#38bdf8]">{profile.iyzicoStatus}</span>
              </p>
            ) : null}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border ${
            profile.isReady ? 'border-emerald-900/50 bg-emerald-950/30 text-emerald-400' : 'border-amber-900/50 bg-amber-950/30 text-amber-400'
          }`}
        >
          {profile.isReady ? <BadgeCheck className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {profile.isReady ? 'SATIŞA HAZIR' : 'HAZIR DEĞİL'}
        </span>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#38bdf8]" />
        </div>
      ) : null}

      {!loading ? (
        <div className="mt-6 space-y-5">
          {error ? (
            <div className="rounded border border-rose-900/50 bg-rose-950/20 p-4 text-[11px] font-mono text-rose-400 uppercase tracking-wide flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> [HATA] {error}
            </div>
          ) : null}

          {info ? (
            <div className="rounded border border-emerald-900/50 bg-emerald-950/20 p-4 text-[11px] font-mono text-emerald-400 uppercase tracking-wide flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 shrink-0" /> [SİSTEM] {info}
            </div>
          ) : null}

          {profile.missingFields.length > 0 ? (
            <div className="rounded border border-amber-900/50 bg-amber-950/20 p-4 text-[11px] font-mono text-amber-400 uppercase tracking-wide flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> [UYARI] EKSİK ALANLAR: {profile.missingFields.join(', ')}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-5">
            <SectionCard
              icon={ShieldCheck}
              title="1. Alt üye tipi"
              subtitle="İşletme statünüze göre doğru profili seçin."
            >
              <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Alt Üye Tipi <span className="text-[#38bdf8]">*</span>
                <select
                  className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] text-[#e2e8f0] text-sm font-mono border border-[#2d313a] outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
                  value={profile.submerchantType}
                  onChange={(event) =>
                    updateField('submerchantType', event.target.value as ProfileForm['submerchantType'])
                  }
                >
                  <option value="PERSONAL">BİREYSEL</option>
                  <option value="PRIVATE_COMPANY">ŞAHIS ŞİRKETİ</option>
                  <option value="LIMITED_OR_JOINT_STOCK_COMPANY">LİMİTED / A.Ş.</option>
                </select>
              </label>
            </SectionCard>

            <SectionCard
              icon={UserRound}
              title="2. Yetkili bilgileri"
              subtitle="Doğrulama ve sözleşme tarafında kullanılan iletişim bilgileri."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InputField
                  label="Yetkili Adı"
                  value={profile.contactName}
                  onChange={(value) => updateField('contactName', value)}
                  placeholder="Ad"
                  requiredField
                  autoComplete="given-name"
                />
                <InputField
                  label="Yetkili Soyadı"
                  value={profile.contactSurname}
                  onChange={(value) => updateField('contactSurname', value)}
                  placeholder="Soyad"
                  requiredField
                  autoComplete="family-name"
                />
                <InputField
                  label="E-posta"
                  value={profile.email}
                  onChange={(value) => updateField('email', value)}
                  type="email"
                  placeholder="ornek@firma.com"
                  requiredField
                  autoComplete="email"
                />
                <InputField
                  label="Telefon (GSM)"
                  value={profile.gsmNumber}
                  onChange={(value) => updateField('gsmNumber', onlyDigits(value))}
                  placeholder="905XXXXXXXXX"
                  helperText="Sadece rakam girin."
                  requiredField
                  maxLength={12}
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </div>
            </SectionCard>

            <SectionCard icon={Landmark} title="3. Ödeme hesabı" subtitle="Tahsilatların aktarılacağı hesap bilgisi.">
              <InputField
                label="IBAN"
                value={profile.iban}
                onChange={(value) => updateField('iban', value.toUpperCase())}
                placeholder="TRXXXXXXXXXXXXXXXXXXXXXXXX"
                helperText="TR ile başlamalı, toplam 26 karakter olmalıdır."
                requiredField
                maxLength={34}
                autoComplete="off"
              />
            </SectionCard>

            {isPersonal ? (
              <SectionCard icon={UserRound} title="4. Bireysel kimlik" subtitle="Bireysel alt üye açılışı için zorunludur.">
                <InputField
                  label="T.C. Kimlik Numarası"
                  value={profile.identityNumber}
                  onChange={(value) => updateField('identityNumber', onlyDigits(value))}
                  placeholder="11 hane"
                  requiredField
                  maxLength={11}
                  inputMode="numeric"
                />
              </SectionCard>
            ) : (
              <SectionCard icon={Building2} title="4. Kurumsal vergi bilgileri" subtitle="Şirket alt üye kaydı için zorunlu alanlar.">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InputField
                    label="Vergi Numarası"
                    value={profile.taxNumber}
                    onChange={(value) => updateField('taxNumber', onlyDigits(value))}
                    requiredField
                    maxLength={16}
                    inputMode="numeric"
                  />
                  <InputField
                    label="Vergi Dairesi"
                    value={profile.taxOffice}
                    onChange={(value) => updateField('taxOffice', value)}
                    requiredField
                  />
                  <InputField
                    label="Şirket Ünvanı"
                    value={profile.legalCompanyTitle}
                    onChange={(value) => updateField('legalCompanyTitle', value)}
                    requiredField
                  />
                </div>
              </SectionCard>
            )}

            <SectionCard icon={MapPin} title="5. Adres bilgileri" subtitle="İşletmenin resmi adresi ve ülke bilgisi.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InputField
                  label="Açık Adres"
                  value={profile.address}
                  onChange={(value) => updateField('address', value)}
                  rows={3}
                  placeholder="Mahalle, cadde, bina no"
                  requiredField
                />
                <div className="space-y-4">
                  <InputField
                    label="Şehir"
                    value={profile.city}
                    onChange={(value) => updateField('city', value)}
                    placeholder="İstanbul"
                    requiredField
                  />
                  <InputField
                    label="Ülke"
                    value={profile.country}
                    onChange={(value) => updateField('country', value.toUpperCase())}
                    placeholder="TR"
                    requiredField
                    maxLength={2}
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-5 border-t border-[#2d313a]">
            <button
              type="button"
              onClick={() => void saveProfile(false)}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded border border-[#2d313a] bg-[#0a0c10] text-[#94a3b8] text-[11px] font-mono uppercase tracking-widest hover:bg-[#1a1d24] hover:text-[#e2e8f0] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Taslak Kaydet
            </button>
            <button
              type="button"
              onClick={() => void saveProfile(true)}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] text-[11px] font-mono uppercase tracking-widest border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Satışa Hazır Yap
            </button>
          </div>
        </div>
      ) : null}
    </HardwarePanel>
  )
}