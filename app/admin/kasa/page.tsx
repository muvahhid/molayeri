'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Loader2, RefreshCcw, Save } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'

type AdminBusiness = {
  id: string
  name: string
  type: string | null
}

type KasaTotals = {
  tx_count: number
  gross_amount: number
  discount_amount: number
  collected_amount: number
  commission_amount: number
  merchant_net_amount: number
  payment_coupon_count: number
  service_coupon_count: number
  business_count: number
  campaign_count: number
}

type CategoryRow = {
  category_key: string
  category_label: string
  tx_count: number
  collected_amount: number
  discount_amount: number
  commission_amount: number
  merchant_net_amount: number
  payment_coupon_count: number
  service_coupon_count: number
}

type BusinessRow = {
  business_id: string
  business_name: string
  business_type: string
  tx_count: number
  gross_amount: number
  discount_amount: number
  collected_amount: number
  commission_amount: number
  merchant_net_amount: number
  payment_coupon_count: number
  service_coupon_count: number
}

type TxRow = {
  id: string
  used_at: string
  business_name: string
  business_type: string
  flow_type: string
  coupon_code: string | null
  final_amount: number
  commission_amount: number
  merchant_net_amount: number
  payment_status: string | null
  payment_reference: string | null
}

type DailyRow = {
  day: string
  tx_count: number
  collected_amount: number
  commission_amount: number
  merchant_net_amount: number
}

type KasaOverview = {
  totals: KasaTotals
  byCategory: CategoryRow[]
  byBusiness: BusinessRow[]
  businessTotal: number
}

function toMoney(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toCount(value: unknown): number {
  return Math.trunc(toNumber(value))
}

function defaultDate(daysDelta: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysDelta)
  return d.toISOString().slice(0, 10)
}

function businessTypeLabel(raw: string | null | undefined): string {
  const value = (raw || '').trim().toLowerCase()
  if (value === 'yakit') return 'Yakit'
  if (value === 'sarj') return 'Sarj'
  if (value === 'yemek') return 'Yemek'
  if (value === 'market') return 'Market'
  if (value === 'kafe') return 'Kafe'
  if (value === 'otel') return 'Otel'
  if (value === 'servis') return 'Servis'
  if (!value) return 'Diger'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function flowLabel(flowType: string): string {
  return flowType === 'service_coupon' ? 'Hizmet Kuponu' : 'Odeme + Kupon'
}

function formatDayLabel(raw: string): string {
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value)
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

function buildCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines: string[] = []
  lines.push(headers.map(csvCell).join(','))
  for (const row of rows) {
    lines.push(row.map(csvCell).join(','))
  }
  return lines.join('\n')
}

function downloadCsv(filename: string, csvContent: string): void {
  if (typeof window === 'undefined') return
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function parseTxItems(rawItems: unknown[]): TxRow[] {
  return rawItems
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      id: String(item.id || ''),
      used_at: String(item.used_at || ''),
      business_name: String(item.business_name || 'Isletme'),
      business_type: String(item.business_type || 'diger'),
      flow_type: String(item.flow_type || ''),
      coupon_code: item.coupon_code ? String(item.coupon_code) : null,
      final_amount: toNumber(item.final_amount),
      commission_amount: toNumber(item.commission_amount),
      merchant_net_amount: toNumber(item.merchant_net_amount),
      payment_status: item.payment_status ? String(item.payment_status) : null,
      payment_reference: item.payment_reference ? String(item.payment_reference) : null,
    }))
}

const TX_CSV_LIMIT = 50000

export default function AdminKasaPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [businesses, setBusinesses] = useState<AdminBusiness[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [fromDate, setFromDate] = useState(defaultDate(-7))
  const [toDate, setToDate] = useState(defaultDate(0))

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  const [overview, setOverview] = useState<KasaOverview | null>(null)
  const [dailySeries, setDailySeries] = useState<DailyRow[]>([])
  const [transactions, setTransactions] = useState<TxRow[]>([])
  const [txTotal, setTxTotal] = useState(0)

  const [commissionRate, setCommissionRate] = useState('0')
  const [commissionFixed, setCommissionFixed] = useState('0')
  const [commissionNote, setCommissionNote] = useState('')
  const [commissionInfo, setCommissionInfo] = useState('Isletme secilmedi.')
  const [savingCommission, setSavingCommission] = useState(false)

  const [exportingTxCsv, setExportingTxCsv] = useState(false)
  const [exportingBusinessCsv, setExportingBusinessCsv] = useState(false)
  const [exportingCategoryCsv, setExportingCategoryCsv] = useState(false)

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      setLoading(true)
      setError('')
      try {
        const { data, error: bizError } = await supabase
          .from('businesses')
          .select('id, name, type')
          .order('created_at', { ascending: false })
          .limit(5000)
        if (bizError) throw bizError

        const parsed = (Array.isArray(data) ? data : [])
          .map((item) => ({
            id: String(item?.id || ''),
            name: String(item?.name || 'Isletme'),
            type: typeof item?.type === 'string' ? item.type : null,
          }))
          .filter((item) => item.id)

        if (!active) return
        setBusinesses(parsed)
        setReady(true)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Admin kasa verisi yuklenemedi.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void bootstrap()

    return () => {
      active = false
    }
  }, [supabase])

  useEffect(() => {
    if (!ready) return
    let active = true

    const loadData = async () => {
      setRefreshing(true)
      setError('')
      try {
        const fromIso = new Date(`${fromDate}T00:00:00`).toISOString()
        const toIso = new Date(`${toDate}T23:59:59`).toISOString()

        const overviewParams = {
          p_from: fromIso,
          p_to: toIso,
          p_business_id: selectedBusinessId || null,
          p_category: selectedCategory || null,
          p_limit: 200,
          p_offset: 0,
        }

        const txParams = {
          p_from: fromIso,
          p_to: toIso,
          p_business_id: selectedBusinessId || null,
          p_category: selectedCategory || null,
          p_limit: 200,
          p_offset: 0,
        }

        const dailyParams = {
          p_from: fromIso,
          p_to: toIso,
          p_business_id: selectedBusinessId || null,
          p_category: selectedCategory || null,
        }

        const [overviewResp, txResp, dailyResp] = await Promise.all([
          supabase.rpc('admin_get_kasa_overview_v1', overviewParams),
          supabase.rpc('admin_list_kasa_transactions_v1', txParams),
          supabase.rpc('admin_get_kasa_daily_series_v1', dailyParams),
        ])

        if (overviewResp.error) throw overviewResp.error
        if (txResp.error) throw txResp.error
        if (dailyResp.error) throw dailyResp.error

        const overviewMap =
          overviewResp.data && typeof overviewResp.data === 'object'
            ? (overviewResp.data as Record<string, unknown>)
            : {}
        if ((overviewMap.status || '') !== 'ok') {
          throw new Error(String(overviewMap.detail || overviewMap.status || 'Kasa ozeti alinamadi.'))
        }

        const totalsRaw =
          overviewMap.totals && typeof overviewMap.totals === 'object'
            ? (overviewMap.totals as Record<string, unknown>)
            : {}
        const byCategoryRaw = Array.isArray(overviewMap.by_category) ? overviewMap.by_category : []
        const byBusinessRaw = Array.isArray(overviewMap.by_business) ? overviewMap.by_business : []

        const byCategory: CategoryRow[] = byCategoryRaw
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map((item) => ({
            category_key: String(item.category_key || ''),
            category_label: String(item.category_label || 'diger'),
            tx_count: toCount(item.tx_count),
            collected_amount: toNumber(item.collected_amount),
            discount_amount: toNumber(item.discount_amount),
            commission_amount: toNumber(item.commission_amount),
            merchant_net_amount: toNumber(item.merchant_net_amount),
            payment_coupon_count: toCount(item.payment_coupon_count),
            service_coupon_count: toCount(item.service_coupon_count),
          }))

        const byBusiness: BusinessRow[] = byBusinessRaw
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map((item) => ({
            business_id: String(item.business_id || ''),
            business_name: String(item.business_name || 'Isletme'),
            business_type: String(item.business_type || 'diger'),
            tx_count: toCount(item.tx_count),
            gross_amount: toNumber(item.gross_amount),
            discount_amount: toNumber(item.discount_amount),
            collected_amount: toNumber(item.collected_amount),
            commission_amount: toNumber(item.commission_amount),
            merchant_net_amount: toNumber(item.merchant_net_amount),
            payment_coupon_count: toCount(item.payment_coupon_count),
            service_coupon_count: toCount(item.service_coupon_count),
          }))

        const txMap = txResp.data && typeof txResp.data === 'object' ? (txResp.data as Record<string, unknown>) : {}
        if ((txMap.status || '') !== 'ok') {
          throw new Error(String(txMap.detail || txMap.status || 'Kasa islemleri alinamadi.'))
        }
        const txItemsRaw = Array.isArray(txMap.items) ? txMap.items : []
        const txItems = parseTxItems(txItemsRaw)

        const dailyMap =
          dailyResp.data && typeof dailyResp.data === 'object'
            ? (dailyResp.data as Record<string, unknown>)
            : {}
        if ((dailyMap.status || '') !== 'ok') {
          throw new Error(String(dailyMap.detail || dailyMap.status || 'Gunluk trend alinamadi.'))
        }
        const dailyItemsRaw = Array.isArray(dailyMap.items) ? dailyMap.items : []
        const dailyItems: DailyRow[] = dailyItemsRaw
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map((item) => ({
            day: String(item.day || ''),
            tx_count: toCount(item.tx_count),
            collected_amount: toNumber(item.collected_amount),
            commission_amount: toNumber(item.commission_amount),
            merchant_net_amount: toNumber(item.merchant_net_amount),
          }))

        if (!active) return
        setOverview({
          totals: {
            tx_count: toCount(totalsRaw.tx_count),
            gross_amount: toNumber(totalsRaw.gross_amount),
            discount_amount: toNumber(totalsRaw.discount_amount),
            collected_amount: toNumber(totalsRaw.collected_amount),
            commission_amount: toNumber(totalsRaw.commission_amount),
            merchant_net_amount: toNumber(totalsRaw.merchant_net_amount),
            payment_coupon_count: toCount(totalsRaw.payment_coupon_count),
            service_coupon_count: toCount(totalsRaw.service_coupon_count),
            business_count: toCount(totalsRaw.business_count),
            campaign_count: toCount(totalsRaw.campaign_count),
          },
          byCategory,
          byBusiness,
          businessTotal: toCount(overviewMap.business_total),
        })
        setDailySeries(dailyItems)
        setTransactions(txItems)
        setTxTotal(toCount(txMap.total))
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Admin kasa verisi alinamadi.')
      } finally {
        if (active) setRefreshing(false)
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [fromDate, ready, selectedBusinessId, selectedCategory, supabase, toDate])

  useEffect(() => {
    if (!ready) return
    if (!selectedBusinessId) {
      setCommissionRate('0')
      setCommissionFixed('0')
      setCommissionNote('')
      setCommissionInfo('Komisyon tanimlamak icin bir isletme secin.')
      return
    }
    let active = true

    const loadRule = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('admin_get_active_merchant_commission_rule_v1', {
          p_business_id: selectedBusinessId,
        })
        if (rpcError) throw rpcError

        const map = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
        if ((map.status || '') !== 'ok') {
          throw new Error(String(map.detail || map.status || 'Komisyon kurali alinamadi.'))
        }

        const rule = map.rule && typeof map.rule === 'object' ? (map.rule as Record<string, unknown>) : null
        if (!active) return

        if (!rule) {
          setCommissionRate('0')
          setCommissionFixed('0')
          setCommissionNote('')
          setCommissionInfo('Aktif komisyon kurali yok.')
          return
        }

        const rate = toNumber(rule.rate_percent)
        const fixed = toNumber(rule.fixed_fee)
        setCommissionRate(rate.toFixed(2))
        setCommissionFixed(fixed.toFixed(2))
        setCommissionNote(String(rule.note || ''))
        const validFrom = rule.valid_from ? new Date(String(rule.valid_from)).toLocaleDateString('tr-TR') : '-'
        const validUntil = rule.valid_until ? new Date(String(rule.valid_until)).toLocaleDateString('tr-TR') : 'Suresiz'
        setCommissionInfo(`Aktif kural: %${rate.toFixed(2)} + ${fixed.toFixed(2)}₺ (${validFrom} - ${validUntil})`)
      } catch (err) {
        if (!active) return
        setCommissionInfo(err instanceof Error ? err.message : 'Komisyon kurali alinamadi.')
      }
    }

    void loadRule()

    return () => {
      active = false
    }
  }, [ready, selectedBusinessId, supabase])

  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    for (const item of businesses) {
      if (item.type && item.type.trim()) set.add(item.type.trim().toLowerCase())
    }
    if (overview) {
      for (const item of overview.byCategory) {
        if (item.category_key) set.add(item.category_key.trim().toLowerCase())
      }
    }
    return Array.from(set).sort()
  }, [businesses, overview])

  const maxDailyAmount = useMemo(() => {
    const max = Math.max(0, ...dailySeries.map((item) => item.collected_amount))
    return max > 0 ? max : 1
  }, [dailySeries])

  const maxCategoryAmount = useMemo(() => {
    const source = overview?.byCategory || []
    const max = Math.max(0, ...source.map((item) => item.collected_amount))
    return max > 0 ? max : 1
  }, [overview])

  const maxBusinessAmount = useMemo(() => {
    const source = overview?.byBusiness || []
    const max = Math.max(0, ...source.map((item) => item.collected_amount))
    return max > 0 ? max : 1
  }, [overview])

  const saveCommission = async () => {
    if (!selectedBusinessId || savingCommission) return
    setSavingCommission(true)
    setError('')
    try {
      const rate = Number(commissionRate.replace(',', '.'))
      const fixed = Number(commissionFixed.replace(',', '.'))
      if (!Number.isFinite(rate) || !Number.isFinite(fixed) || rate < 0 || rate > 100 || fixed < 0) {
        throw new Error('Komisyon degerleri gecersiz.')
      }

      const { data, error: rpcError } = await supabase.rpc('set_merchant_commission_rule_v1', {
        p_business_id: selectedBusinessId,
        p_rate_percent: Number(rate.toFixed(4)),
        p_fixed_fee: Number(fixed.toFixed(2)),
        p_note: commissionNote.trim(),
        p_valid_from: null,
        p_valid_until: null,
      })
      if (rpcError) throw rpcError

      const map = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
      if ((map.status || '') !== 'ok') {
        throw new Error(String(map.detail || map.status || 'Komisyon kaydedilemedi.'))
      }

      setCommissionRate(rate.toFixed(2))
      setCommissionFixed(fixed.toFixed(2))
      setCommissionInfo(`Aktif kural: %${rate.toFixed(2)} + ${fixed.toFixed(2)}₺`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Komisyon kaydedilemedi.')
    } finally {
      setSavingCommission(false)
    }
  }

  const exportTransactionsCsv = async () => {
    if (exportingTxCsv) return
    setExportingTxCsv(true)
    setError('')
    try {
      const fromIso = new Date(`${fromDate}T00:00:00`).toISOString()
      const toIso = new Date(`${toDate}T23:59:59`).toISOString()
      const pageSize = 300
      let offset = 0
      let total = Number.POSITIVE_INFINITY
      const allItems: TxRow[] = []

      while (offset < total) {
        const { data, error: rpcError } = await supabase.rpc('admin_list_kasa_transactions_v1', {
          p_from: fromIso,
          p_to: toIso,
          p_business_id: selectedBusinessId || null,
          p_category: selectedCategory || null,
          p_limit: pageSize,
          p_offset: offset,
        })
        if (rpcError) throw rpcError

        const map = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
        if ((map.status || '') !== 'ok') {
          throw new Error(String(map.detail || map.status || 'CSV icin islem verisi alinamadi.'))
        }

        total = toCount(map.total)
        const pageRaw = Array.isArray(map.items) ? map.items : []
        const parsed = parseTxItems(pageRaw)
        if (parsed.length === 0) break

        allItems.push(...parsed)
        offset += parsed.length

        if (allItems.length > TX_CSV_LIMIT) {
          throw new Error(`CSV limiti asildi. Maksimum ${TX_CSV_LIMIT} satir indirilebilir.`)
        }
      }

      if (allItems.length === 0) {
        throw new Error('Secili filtrede export edilecek islem yok.')
      }

      const csvRows = allItems.map((item) => [
        item.used_at ? new Date(item.used_at).toLocaleString('tr-TR') : '-',
        item.business_name,
        businessTypeLabel(item.business_type),
        flowLabel(item.flow_type),
        item.coupon_code || '-',
        item.final_amount.toFixed(2),
        item.commission_amount.toFixed(2),
        item.merchant_net_amount.toFixed(2),
        item.payment_status || '-',
        item.payment_reference || '-',
      ])

      const csv = buildCsv(
        [
          'Tarih',
          'Isletme',
          'Kategori',
          'Akis',
          'Kupon',
          'Tahsilat',
          'Komisyon',
          'Net',
          'Odeme Durumu',
          'Referans',
        ],
        csvRows
      )
      downloadCsv(`admin_kasa_islemler_${fromDate}_${toDate}.csv`, csv)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV olusturulamadi.')
    } finally {
      setExportingTxCsv(false)
    }
  }

  const exportBusinessCsv = () => {
    if (exportingBusinessCsv) return
    setExportingBusinessCsv(true)
    setError('')
    try {
      const rows = (overview?.byBusiness || []).map((item) => [
        item.business_name,
        businessTypeLabel(item.business_type),
        item.tx_count,
        item.gross_amount.toFixed(2),
        item.discount_amount.toFixed(2),
        item.collected_amount.toFixed(2),
        item.commission_amount.toFixed(2),
        item.merchant_net_amount.toFixed(2),
        item.payment_coupon_count,
        item.service_coupon_count,
      ])

      if (rows.length === 0) {
        throw new Error('Export edilecek isletme ozeti yok.')
      }

      const csv = buildCsv(
        [
          'Isletme',
          'Kategori',
          'Islem',
          'Brut',
          'Indirim',
          'Tahsilat',
          'Komisyon',
          'Net',
          'Odeme+Kupon',
          'Hizmet Kuponu',
        ],
        rows
      )
      downloadCsv(`admin_kasa_isletme_ozeti_${fromDate}_${toDate}.csv`, csv)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV olusturulamadi.')
    } finally {
      setExportingBusinessCsv(false)
    }
  }

  const exportCategoryCsv = () => {
    if (exportingCategoryCsv) return
    setExportingCategoryCsv(true)
    setError('')
    try {
      const rows = (overview?.byCategory || []).map((item) => [
        businessTypeLabel(item.category_label),
        item.tx_count,
        item.discount_amount.toFixed(2),
        item.collected_amount.toFixed(2),
        item.commission_amount.toFixed(2),
        item.merchant_net_amount.toFixed(2),
        item.payment_coupon_count,
        item.service_coupon_count,
      ])

      if (rows.length === 0) {
        throw new Error('Export edilecek kategori ozeti yok.')
      }

      const csv = buildCsv(
        ['Kategori', 'Islem', 'Indirim', 'Tahsilat', 'Komisyon', 'Net', 'Odeme+Kupon', 'Hizmet Kuponu'],
        rows
      )
      downloadCsv(`admin_kasa_kategori_ozeti_${fromDate}_${toDate}.csv`, csv)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV olusturulamadi.')
    } finally {
      setExportingCategoryCsv(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">Admin Kasa</h1>
        <p className="mt-1 text-sm text-slate-500">
          Isletme bazinda, kategori bazinda ve toplam kupon/odeme hareketlerini buradan yonetebilirsiniz.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <label className="text-sm font-semibold text-slate-700">
            Isletme
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={selectedBusinessId}
              onChange={(event) => setSelectedBusinessId(event.target.value)}
            >
              <option value="">Tum Isletmeler</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Kategori
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              <option value="">Tum Kategoriler</option>
              {categoryOptions.map((categoryKey) => (
                <option key={categoryKey} value={categoryKey}>
                  {businessTypeLabel(categoryKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Baslangic
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Bitis
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setToDate(defaultDate(0))}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw size={14} />
              Bugun
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportTransactionsCsv}
            disabled={exportingTxCsv || loading || refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {exportingTxCsv ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            CSV Islemler
          </button>
          <button
            type="button"
            onClick={exportBusinessCsv}
            disabled={exportingBusinessCsv || loading || refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {exportingBusinessCsv ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            CSV Isletme Ozeti
          </button>
          <button
            type="button"
            onClick={exportCategoryCsv}
            disabled={exportingCategoryCsv || loading || refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {exportingCategoryCsv ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            CSV Kategori Ozeti
          </button>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white/85 p-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" />
        </section>
      ) : null}

      {error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</section>
      ) : null}

      {overview ? (
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <MetricCard label="Toplam Islem" value={String(overview.totals.tx_count)} />
          <MetricCard label="Toplam Tahsilat" value={toMoney(overview.totals.collected_amount)} />
          <MetricCard label="Toplam Komisyon" value={toMoney(overview.totals.commission_amount)} />
          <MetricCard label="Toplam Net" value={toMoney(overview.totals.merchant_net_amount)} />
          <MetricCard label="Toplam Indirim" value={toMoney(overview.totals.discount_amount)} />
          <MetricCard label="Aktif Isletme" value={String(overview.totals.business_count)} />
          <MetricCard label="Kullanilan Kampanya" value={String(overview.totals.campaign_count)} />
          <MetricCard label="Odeme+Kupon" value={String(overview.totals.payment_coupon_count)} />
          <MetricCard label="Hizmet Kuponu" value={String(overview.totals.service_coupon_count)} />
          <MetricCard label="Brut" value={toMoney(overview.totals.gross_amount)} />
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Gunluk Tahsilat Trendi</h2>
        <p className="mt-1 text-xs text-slate-500">Secili tarih araliginda gun gun tahsilat dagilimi.</p>
        {dailySeries.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Trend verisi bulunamadi.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {dailySeries.map((row) => {
              const ratio = Math.max((row.collected_amount / maxDailyAmount) * 100, row.collected_amount > 0 ? 3 : 0)
              return (
                <div key={row.day} className="grid grid-cols-[72px_minmax(0,1fr)_120px] items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">{formatDayLabel(row.day)}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-sky-500" style={{ width: `${ratio}%` }} />
                  </div>
                  <span className="text-right text-xs font-semibold text-slate-700">{toMoney(row.collected_amount)}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <article className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">Kategori Dagilimi</h2>
          {overview && overview.byCategory.length > 0 ? (
            <div className="mt-3 space-y-2">
              {overview.byCategory.slice(0, 8).map((row) => {
                const ratio = Math.max((row.collected_amount / maxCategoryAmount) * 100, row.collected_amount > 0 ? 3 : 0)
                return (
                  <div key={row.category_key || row.category_label} className="grid grid-cols-[130px_minmax(0,1fr)_110px] items-center gap-2">
                    <span className="truncate text-xs font-semibold text-slate-700">{businessTypeLabel(row.category_label)}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${ratio}%` }} />
                    </div>
                    <span className="text-right text-xs font-semibold text-slate-700">{toMoney(row.collected_amount)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Secili filtrede kategori verisi bulunamadi.</p>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">Isletme Dagilimi</h2>
          {overview && overview.byBusiness.length > 0 ? (
            <div className="mt-3 space-y-2">
              {overview.byBusiness.slice(0, 8).map((row) => {
                const ratio = Math.max((row.collected_amount / maxBusinessAmount) * 100, row.collected_amount > 0 ? 3 : 0)
                return (
                  <div key={row.business_id} className="grid grid-cols-[160px_minmax(0,1fr)_110px] items-center gap-2">
                    <span className="truncate text-xs font-semibold text-slate-700">{row.business_name}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${ratio}%` }} />
                    </div>
                    <span className="text-right text-xs font-semibold text-slate-700">{toMoney(row.collected_amount)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Secili filtrede isletme verisi bulunamadi.</p>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Kategori Bazli Ozet</h2>
        {overview && overview.byCategory.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-2">Kategori</th>
                  <th className="py-2 pr-2">Islem</th>
                  <th className="py-2 pr-2">Tahsilat</th>
                  <th className="py-2 pr-2">Komisyon</th>
                  <th className="py-2 pr-2">Net</th>
                  <th className="py-2">Hizmet Kuponu</th>
                </tr>
              </thead>
              <tbody>
                {overview.byCategory.map((row) => (
                  <tr key={row.category_key || row.category_label} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 pr-2">{businessTypeLabel(row.category_label)}</td>
                    <td className="py-2 pr-2">{row.tx_count}</td>
                    <td className="py-2 pr-2">{toMoney(row.collected_amount)}</td>
                    <td className="py-2 pr-2">{toMoney(row.commission_amount)}</td>
                    <td className="py-2 pr-2">{toMoney(row.merchant_net_amount)}</td>
                    <td className="py-2">{row.service_coupon_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Secili filtrede kategori verisi bulunamadi.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Isletme Bazli Ozet</h2>
        <p className="mt-1 text-xs text-slate-500">Toplam {overview?.businessTotal || 0} isletme</p>
        {overview && overview.byBusiness.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-2">Isletme</th>
                  <th className="py-2 pr-2">Kategori</th>
                  <th className="py-2 pr-2">Islem</th>
                  <th className="py-2 pr-2">Tahsilat</th>
                  <th className="py-2 pr-2">Komisyon</th>
                  <th className="py-2 pr-2">Net</th>
                  <th className="py-2">Hizmet</th>
                </tr>
              </thead>
              <tbody>
                {overview.byBusiness.map((row) => (
                  <tr key={row.business_id} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 pr-2 font-semibold">{row.business_name}</td>
                    <td className="py-2 pr-2">{businessTypeLabel(row.business_type)}</td>
                    <td className="py-2 pr-2">{row.tx_count}</td>
                    <td className="py-2 pr-2">{toMoney(row.collected_amount)}</td>
                    <td className="py-2 pr-2">{toMoney(row.commission_amount)}</td>
                    <td className="py-2 pr-2">{toMoney(row.merchant_net_amount)}</td>
                    <td className="py-2">{row.service_coupon_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Secili filtrede isletme verisi bulunamadi.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Komisyon Ayari (Admin)</h2>
        <p className="mt-1 text-xs text-slate-500">{commissionInfo}</p>
        {!selectedBusinessId ? (
          <p className="mt-3 text-sm text-slate-600">Komisyon tanimlamak icin filtreden bir isletme secin.</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="text-sm font-semibold text-slate-700">
                Oran (%)
                <input
                  type="text"
                  value={commissionRate}
                  onChange={(event) => setCommissionRate(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Sabit (₺)
                <input
                  type="text"
                  value={commissionFixed}
                  onChange={(event) => setCommissionFixed(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Not
                <input
                  type="text"
                  value={commissionNote}
                  onChange={(event) => setCommissionNote(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={saveCommission}
                disabled={savingCommission}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingCommission ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Komisyonu Kaydet
              </button>
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Son Islemler</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Toplam {txTotal}</span>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
          </div>
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-slate-500">Secili filtrede islem bulunamadi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-2">Tarih</th>
                  <th className="py-2 pr-2">Isletme</th>
                  <th className="py-2 pr-2">Akis</th>
                  <th className="py-2 pr-2">Kupon</th>
                  <th className="py-2 pr-2">Tahsilat</th>
                  <th className="py-2 pr-2">Komisyon</th>
                  <th className="py-2 pr-2">Net</th>
                  <th className="py-2">Ref</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 pr-2">{tx.used_at ? new Date(tx.used_at).toLocaleString('tr-TR') : '-'}</td>
                    <td className="py-2 pr-2">
                      <div className="font-semibold">{tx.business_name}</div>
                      <div className="text-xs text-slate-500">{businessTypeLabel(tx.business_type)}</div>
                    </td>
                    <td className="py-2 pr-2">{flowLabel(tx.flow_type)}</td>
                    <td className="py-2 pr-2">{tx.coupon_code || '-'}</td>
                    <td className="py-2 pr-2 font-semibold">{toMoney(tx.final_amount)}</td>
                    <td className="py-2 pr-2">{toMoney(tx.commission_amount)}</td>
                    <td className="py-2 pr-2 font-semibold">{toMoney(tx.merchant_net_amount)}</td>
                    <td className="py-2">{tx.payment_reference || tx.payment_status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white/85 p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-800">{value}</p>
    </article>
  )
}
