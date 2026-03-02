'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Loader2, RefreshCcw, Save } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { ModuleTitle } from '../../merchant/_components/module-title'

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

// Ortak Donanım Kartı Kapsayıcısı
const HardwarePanel = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative bg-[#16181d] border border-[#2d313a] rounded-md shadow-lg ${className}`}>
    <div className="absolute top-2 left-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute bottom-2 left-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    <div className="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-[#0a0c10] border border-[#2d313a]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
    {children}
  </div>
)

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
    <div className="space-y-6">
      <div className="border-b border-[#2d313a] pb-4">
        <ModuleTitle title="Admin Kasa" />
        <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b] mt-2">
          Isletme bazinda, kategori bazinda ve toplam kupon/odeme hareketlerini buradan yonetebilirsiniz.
        </p>
      </div>

      <HardwarePanel className="p-5 md:p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
            Isletme
            <select
              className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
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
          <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
            Kategori
            <select
              className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
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
          <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
            Baslangic
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm outline-none focus:border-[#38bdf8]/50 [color-scheme:dark]"
            />
          </label>
          <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
            Bitis
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm outline-none focus:border-[#38bdf8]/50 [color-scheme:dark]"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setToDate(defaultDate(0))}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded border border-[#2d313a] bg-[#16181d] text-[#e2e8f0] text-[10px] font-mono uppercase tracking-widest hover:bg-[#1a1d24] transition-colors"
            >
              <RefreshCcw size={14} className="text-[#64748b]" />
              Bugun
            </button>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportTransactionsCsv}
            disabled={exportingTxCsv || loading || refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded border border-[#2d313a] bg-[#16181d] text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] disabled:opacity-50 transition-colors"
          >
            {exportingTxCsv ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            CSV Islemler
          </button>
          <button
            type="button"
            onClick={exportBusinessCsv}
            disabled={exportingBusinessCsv || loading || refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded border border-[#2d313a] bg-[#16181d] text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] disabled:opacity-50 transition-colors"
          >
            {exportingBusinessCsv ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            CSV Isletme Ozeti
          </button>
          <button
            type="button"
            onClick={exportCategoryCsv}
            disabled={exportingCategoryCsv || loading || refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded border border-[#2d313a] bg-[#16181d] text-[10px] font-mono uppercase tracking-widest text-[#94a3b8] hover:bg-[#1a1d24] hover:text-[#e2e8f0] disabled:opacity-50 transition-colors"
          >
            {exportingCategoryCsv ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            CSV Kategori Ozeti
          </button>
        </div>
      </HardwarePanel>

      {loading ? (
        <HardwarePanel className="p-10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#38bdf8]" />
        </HardwarePanel>
      ) : null}

      {error ? (
        <div className="rounded border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-[11px] font-mono uppercase tracking-widest text-rose-400">
          [HATA] {error}
        </div>
      ) : null}

      {overview && !loading ? (
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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

      {!loading && (
        <HardwarePanel className="p-5">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] border-b border-[#1e232b] pb-3 mb-4">Gunluk Tahsilat Trendi</h2>
          <p className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest mb-5">Secili tarih araliginda gun gun tahsilat dagilimi.</p>
          {dailySeries.length === 0 ? (
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] text-center py-6">Trend verisi bulunamadi.</p>
          ) : (
            <div className="space-y-3">
              {dailySeries.map((row) => {
                const ratio = Math.max((row.collected_amount / maxDailyAmount) * 100, row.collected_amount > 0 ? 3 : 0)
                return (
                  <div key={row.day} className="grid grid-cols-[72px_minmax(0,1fr)_120px] items-center gap-3">
                    <span className="text-[10px] font-mono tracking-widest text-[#94a3b8] uppercase">{formatDayLabel(row.day)}</span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#16181d] border border-[#2d313a]">
                      <div className="h-full bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.5)] transition-all" style={{ width: `${ratio}%` }} />
                    </div>
                    <span className="text-right text-[11px] font-mono text-[#e2e8f0] tracking-widest">{toMoney(row.collected_amount)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </HardwarePanel>
      )}

      {!loading && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <HardwarePanel className="p-5">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] border-b border-[#1e232b] pb-3 mb-4">Kategori Dagilimi</h2>
            {overview && overview.byCategory.length > 0 ? (
              <div className="space-y-3">
                {overview.byCategory.slice(0, 8).map((row) => {
                  const ratio = Math.max((row.collected_amount / maxCategoryAmount) * 100, row.collected_amount > 0 ? 3 : 0)
                  return (
                    <div key={row.category_key || row.category_label} className="grid grid-cols-[130px_minmax(0,1fr)_110px] items-center gap-3">
                      <span className="truncate text-[10px] font-mono text-[#cbd5e1] uppercase tracking-widest">{businessTypeLabel(row.category_label)}</span>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#16181d] border border-[#2d313a]">
                        <div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all" style={{ width: `${ratio}%` }} />
                      </div>
                      <span className="text-right text-[11px] font-mono text-[#e2e8f0] tracking-widest">{toMoney(row.collected_amount)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] text-center py-6">Secili filtrede kategori verisi bulunamadi.</p>
            )}
          </HardwarePanel>

          <HardwarePanel className="p-5">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] border-b border-[#1e232b] pb-3 mb-4">Isletme Dagilimi</h2>
            {overview && overview.byBusiness.length > 0 ? (
              <div className="space-y-3">
                {overview.byBusiness.slice(0, 8).map((row) => {
                  const ratio = Math.max((row.collected_amount / maxBusinessAmount) * 100, row.collected_amount > 0 ? 3 : 0)
                  return (
                    <div key={row.business_id} className="grid grid-cols-[160px_minmax(0,1fr)_110px] items-center gap-3">
                      <span className="truncate text-[10px] font-mono text-[#cbd5e1] uppercase tracking-widest">{row.business_name}</span>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#16181d] border border-[#2d313a]">
                        <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all" style={{ width: `${ratio}%` }} />
                      </div>
                      <span className="text-right text-[11px] font-mono text-[#e2e8f0] tracking-widest">{toMoney(row.collected_amount)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] text-center py-6">Secili filtrede isletme verisi bulunamadi.</p>
            )}
          </HardwarePanel>
        </section>
      )}

      {!loading && (
        <>
          <HardwarePanel className="p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[#2d313a] bg-[#0f1115]">
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0]">Kategori Bazli Ozet</h2>
            </div>
            {overview && overview.byCategory.length > 0 ? (
              <div className="overflow-x-auto bg-[#16181d]">
                <table className="min-w-full text-left border-collapse">
                  <thead className="bg-[#101419] border-b border-[#2d313a]">
                    <tr className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                      <th className="px-5 py-3">Kategori</th>
                      <th className="px-5 py-3">Islem</th>
                      <th className="px-5 py-3">Tahsilat</th>
                      <th className="px-5 py-3">Komisyon</th>
                      <th className="px-5 py-3">Net</th>
                      <th className="px-5 py-3">Hizmet Kuponu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e232b]">
                    {overview.byCategory.map((row) => (
                      <tr key={row.category_key || row.category_label} className="hover:bg-[#1a1d24] transition-colors">
                        <td className="px-5 py-3 text-[11px] font-mono text-[#cbd5e1] uppercase tracking-widest">{businessTypeLabel(row.category_label)}</td>
                        <td className="px-5 py-3 text-[11px] font-mono text-[#cbd5e1] tracking-widest">{row.tx_count}</td>
                        <td className="px-5 py-3 text-[11px] font-mono text-[#e2e8f0] tracking-widest">{toMoney(row.collected_amount)}</td>
                        <td className="px-5 py-3 text-[11px] font-mono text-[#94a3b8] tracking-widest">{toMoney(row.commission_amount)}</td>
                        <td className="px-5 py-3 text-[11px] font-mono text-emerald-400 tracking-widest">{toMoney(row.merchant_net_amount)}</td>
                        <td className="px-5 py-3 text-[11px] font-mono text-[#cbd5e1] tracking-widest">{row.service_coupon_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] text-center py-8">Secili filtrede kategori verisi bulunamadi.</p>
            )}
          </HardwarePanel>

          <HardwarePanel className="p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[#2d313a] bg-[#0f1115] flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0]">Isletme Bazli Ozet</h2>
              <span className="text-[9px] font-mono text-[#64748b] tracking-widest uppercase">TOPLAM {overview?.businessTotal || 0} IŞLETME</span>
            </div>
            {overview && overview.byBusiness.length > 0 ? (
              <div className="overflow-x-auto bg-[#16181d] max-h-[500px] custom-scrollbar">
                <table className="min-w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#101419] border-b border-[#2d313a] shadow-sm">
                    <tr className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                      <th className="px-5 py-3">Isletme</th>
                      <th className="px-5 py-3">Kategori</th>
                      <th className="px-5 py-3">Islem</th>
                      <th className="px-5 py-3">Tahsilat</th>
                      <th className="px-5 py-3">Komisyon</th>
                      <th className="px-5 py-3">Net</th>
                      <th className="px-5 py-3">Hizmet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e232b]">
                    {overview.byBusiness.map((row) => (
                      <tr key={row.business_id} className="hover:bg-[#1a1d24] transition-colors">
                        <td className="px-5 py-3 text-[11px] font-medium text-[#e2e8f0] uppercase tracking-wide truncate">{row.business_name}</td>
                        <td className="px-5 py-3 text-[10px] font-mono text-[#94a3b8] uppercase tracking-widest">{businessTypeLabel(row.business_type)}</td>
                        <td className="px-5 py-3 text-[11px] font-mono text-[#cbd5e1] tracking-widest">{row.tx_count}</td>
                        <td className="px-5 py-3 text-[11px] font-mono text-[#e2e8f0] tracking-widest">{toMoney(row.collected_amount)}</td>
                        <td className="px-5 py-3 text-[11px] font-mono text-[#94a3b8] tracking-widest">{toMoney(row.commission_amount)}</td>
                        <td className="px-5 py-3 text-[11px] font-mono text-emerald-400 tracking-widest">{toMoney(row.merchant_net_amount)}</td>
                        <td className="px-5 py-3 text-[11px] font-mono text-[#cbd5e1] tracking-widest">{row.service_coupon_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] text-center py-8">Secili filtrede isletme verisi bulunamadi.</p>
            )}
          </HardwarePanel>

          <HardwarePanel className="p-5 space-y-5">
            <div className="border-b border-[#1e232b] pb-3">
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0]">Komisyon Ayari (Admin)</h2>
              <p className="mt-1.5 text-[10px] font-mono uppercase tracking-widest text-[#38bdf8]">{commissionInfo}</p>
            </div>
            {!selectedBusinessId ? (
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Komisyon tanimlamak icin filtreden bir isletme secin.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                    Oran (%)
                    <input
                      type="text"
                      value={commissionRate}
                      onChange={(event) => setCommissionRate(event.target.value)}
                      className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50"
                    />
                  </label>
                  <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                    Sabit (₺)
                    <input
                      type="text"
                      value={commissionFixed}
                      onChange={(event) => setCommissionFixed(event.target.value)}
                      className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50"
                    />
                  </label>
                  <label className="block text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                    Not
                    <input
                      type="text"
                      value={commissionNote}
                      onChange={(event) => setCommissionNote(event.target.value)}
                      className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] text-sm font-mono outline-none focus:border-[#38bdf8]/50"
                    />
                  </label>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => void saveCommission()}
                    disabled={savingCommission}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded bg-[linear-gradient(180deg,#1e6b8a_0%,#134e68_100%)] text-[#f8fafc] text-[11px] font-mono uppercase tracking-widest border border-[#2e8fac]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    {savingCommission ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    KOMISYONU KAYDET
                  </button>
                </div>
              </>
            )}
          </HardwarePanel>

          <HardwarePanel className="p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[#2d313a] bg-[#0f1115] flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0]">Son Islemler</h2>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#64748b]">TOPLAM {txTotal} KAYIT</span>
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin text-[#38bdf8]" /> : null}
              </div>
            </div>

            {transactions.length === 0 ? (
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] text-center py-8">Secili filtrede islem bulunamadi.</p>
            ) : (
              <div className="overflow-x-auto bg-[#16181d] max-h-[600px] custom-scrollbar">
                <table className="min-w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#101419] border-b border-[#2d313a] shadow-sm">
                    <tr className="text-[10px] font-mono uppercase tracking-widest text-[#64748b]">
                      <th className="px-5 py-3">Tarih</th>
                      <th className="px-5 py-3">Isletme</th>
                      <th className="px-5 py-3">Akis</th>
                      <th className="px-5 py-3">Kupon</th>
                      <th className="px-5 py-3">Tahsilat</th>
                      <th className="px-5 py-3">Komisyon</th>
                      <th className="px-5 py-3">Net</th>
                      <th className="px-5 py-3">Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e232b]">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#1a1d24] transition-colors">
                        <td className="px-5 py-3 text-[11px] font-mono text-[#cbd5e1] tracking-widest">{tx.used_at ? new Date(tx.used_at).toLocaleString('tr-TR') : '-'}</td>
                        <td className="px-5 py-3 align-top">
                          <p className="text-[12px] font-medium text-[#e2e8f0] uppercase tracking-wide truncate">{tx.business_name}</p>
                          <p className="mt-1 text-[9px] font-mono text-[#64748b] uppercase tracking-widest">{businessTypeLabel(tx.business_type)}</p>
                        </td>
                        <td className="px-5 py-3 text-[10px] font-mono text-[#94a3b8] uppercase tracking-widest">{flowLabel(tx.flow_type)}</td>
                        <td className="px-5 py-3 text-[11px] font-mono text-[#38bdf8] tracking-widest">{tx.coupon_code || '-'}</td>
                        <td className="px-5 py-3 text-[11px] font-mono text-[#e2e8f0] tracking-widest">{toMoney(tx.final_amount)}</td>
                        <td className="px-5 py-3 text-[11px] font-mono text-[#94a3b8] tracking-widest">{toMoney(tx.commission_amount)}</td>
                        <td className="px-5 py-3 text-[11px] font-mono text-emerald-400 tracking-widest">{toMoney(tx.merchant_net_amount)}</td>
                        <td className="px-5 py-3 text-[10px] font-mono text-[#64748b] tracking-widest">{tx.payment_reference || tx.payment_status || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </HardwarePanel>
        </>
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 relative overflow-hidden group hover:border-[#475569] transition-colors">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-[#38bdf8]/0 group-hover:bg-[#38bdf8]/50 transition-colors" />
      <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">{label}</p>
      <p className="mt-2 text-xl font-mono text-[#e2e8f0]">{value}</p>
    </div>
  )
}