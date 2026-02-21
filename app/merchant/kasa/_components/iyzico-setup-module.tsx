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
    <label className="block text-sm font-semibold text-slate-700">
      <span className="inline-flex items-center gap-1">
        {label}
        {requiredField ? <span className="text-rose-600">*</span> : null}
      </span>
      {rows > 1 ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
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
          className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
      )}
      {helperText ? <p className="mt-1 text-[11px] font-semibold text-slate-500">{helperText}</p> : null}
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-3 flex items-start gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
          <Icon size={15} />
        </span>
        <div>
          <p className="text-sm font-extrabold text-slate-800">{title}</p>
          <p className="text-xs font-semibold text-slate-500">{subtitle}</p>
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
    <section className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">
            <ShieldCheck size={12} />
            iyzico Kurulum
          </p>
          <h2 className="mt-2 text-lg font-black text-slate-800">İşletme Ödeme Profili</h2>
          <p className="mt-1 text-sm text-slate-600">Kurulum tamamlandığında tek QR ile ödeme + kupon tahsilatı aktif olur.</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Durum: {profile.onboardingStatus}</p>
          {profile.iyzicoStatus ? (
            <p className="mt-1 text-xs font-semibold text-slate-500">iyzico durumu: {profile.iyzicoStatus}</p>
          ) : null}
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
            profile.isReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {profile.isReady ? <BadgeCheck size={14} /> : <AlertCircle size={14} />}
          {profile.isReady ? 'Satışa Hazır' : 'Hazır Değil'}
        </span>
      </div>

      {loading ? (
        <div className="py-10 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-500" />
        </div>
      ) : null}

      {!loading ? (
        <div className="mt-4 space-y-4">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>
          ) : null}

          {info ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
              {info}
            </div>
          ) : null}

          {profile.missingFields.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
              Eksik alanlar: {profile.missingFields.join(', ')}
            </div>
          ) : null}

          <SectionCard
            icon={ShieldCheck}
            title="1. Alt üye tipi"
            subtitle="İşletme statünüze göre doğru profili seçin."
          >
            <label className="block text-sm font-semibold text-slate-700">
              Alt Üye Tipi <span className="text-rose-600">*</span>
              <select
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                value={profile.submerchantType}
                onChange={(event) =>
                  updateField('submerchantType', event.target.value as ProfileForm['submerchantType'])
                }
              >
                <option value="PERSONAL">Bireysel</option>
                <option value="PRIVATE_COMPANY">Şahıs Şirketi</option>
                <option value="LIMITED_OR_JOINT_STOCK_COMPANY">Limited / A.Ş.</option>
              </select>
            </label>
          </SectionCard>

          <SectionCard
            icon={UserRound}
            title="2. Yetkili bilgileri"
            subtitle="Doğrulama ve sözleşme tarafında kullanılan iletişim bilgileri."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <InputField
                label="Açık Adres"
                value={profile.address}
                onChange={(value) => updateField('address', value)}
                rows={3}
                placeholder="Mahalle, cadde, bina no"
                requiredField
              />
              <div className="space-y-3">
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

          <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => void saveProfile(false)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={14} />
              Taslak Kaydet
            </button>
            <button
              type="button"
              onClick={() => void saveProfile(true)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(90deg,#0f766e_0%,#0284c7_100%)] px-4 py-2 text-sm font-bold text-white shadow-[0_14px_24px_-16px_rgba(2,132,199,0.65)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              Satışa Hazır Yap
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
