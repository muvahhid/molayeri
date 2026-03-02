'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  CalendarRange,
  CircleDollarSign,
  Loader2,
  ReceiptText,
  RefreshCcw,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { PanelTitle } from '../_components/panel-title'
import { fetchOwnedBusinesses, requireCurrentUserId } from '../_lib/queries'
import type { MerchantBusiness } from '../_lib/helpers'
import { IyzicoSetupModule } from './_components/iyzico-setup-module'

type KasaSummary = {
  tx_count: number
  gross_amount: number
  discount_amount: number
  collected_amount: number
  commission_amount: number
  merchant_net_amount: number
  payment_coupon_count: number
  service_coupon_count: number
}

type KasaTx = {
  id: string
  used_at: string
  flow_type: string
  coupon_code: string | null
  final_amount: number
  commission_amount: number
  merchant_net_amount: number
  payment_reference: string | null
}

type DailySeries = {
  key: string
  label: string
  collected: number
  commission: number
  net: number
  count: number
}

type MetricTone = 'blue' | 'sky' | 'emerald' | 'violet' | 'amber' | 'slate'

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

function flowLabel(flowType: string): string {
  return flowType === 'service_coupon' ? 'Hizmet Kuponu' : 'Ödeme + Kupon'
}

function buildDailySeries(items: KasaTx[]): DailySeries[] {
  const map = new Map<string, DailySeries>()

  for (const tx of items) {
    if (!tx.used_at) continue
    const date = new Date(tx.used_at)
    if (Number.isNaN(date.getTime())) continue

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const key = `${year}-${month}-${day}`

    let row = map.get(key)
    if (!row) {
      row = {
        key,
        label: date.toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: 'short',
        }),
        collected: 0,
        commission: 0,
        net: 0,
        count: 0,
      }
      map.set(key, row)
    }

    row.collected += tx.final_amount
    row.commission += tx.commission_amount
    row.net += tx.merchant_net_amount
    row.count += 1
  }

  const list = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
  return list.length > 14 ? list.slice(list.length - 14) : list
}

function ratio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0
  return Math.max(0, Math.min(100, (numerator / denominator) * 100))
}

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

export default function MerchantKasaPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])

  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [fromDate, setFromDate] = useState(defaultDate(-7))
  const [toDate, setToDate] = useState(defaultDate(0))
  const [activeModule, setActiveModule] = useState<'kasa' | 'iyzico'>('kasa')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<KasaSummary | null>(null)
  const [transactions, setTransactions] = useState<KasaTx[]>([])

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      setLoading(true)
      setError('')
      try {
        const uid = await requireCurrentUserId(supabase)
        if (!uid) {
          throw new Error('Oturum bulunamadı.')
        }

        const rows = await fetchOwnedBusinesses(supabase, uid)
        if (!active) return
        setBusinesses(rows)
        if (rows.length > 0) {
          setSelectedBusinessId((current) => current || rows[0].id)
        }
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Kasa verisi yüklenemedi.')
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
    if (activeModule !== 'kasa') return
    if (!selectedBusinessId) return
    let active = true

    const load = async () => {
      setRefreshing(true)
      setError('')
      try {
        const fromIso = new Date(`${fromDate}T00:00:00`).toISOString()
        const toIso = new Date(`${toDate}T23:59:59`).toISOString()

        const { data: summaryRaw, error: summaryError } = await supabase.rpc('get_merchant_kasa_summary_v1', {
          p_business_id: selectedBusinessId,
          p_from: fromIso,
          p_to: toIso,
        })
        if (summaryError) throw summaryError

        const summaryMap =
          summaryRaw && typeof summaryRaw === 'object' ? (summaryRaw as Record<string, unknown>) : {}
        if ((summaryMap.status || '') !== 'ok') {
          throw new Error(String(summaryMap.detail || summaryMap.status || 'Kasa özeti alınamadı.'))
        }

        const { data: txRaw, error: txError } = await supabase.rpc('list_merchant_kasa_transactions_v1', {
          p_business_id: selectedBusinessId,
          p_from: fromIso,
          p_to: toIso,
          p_limit: 100,
          p_offset: 0,
        })
        if (txError) throw txError

        const txMap = txRaw && typeof txRaw === 'object' ? (txRaw as Record<string, unknown>) : {}
        if ((txMap.status || '') !== 'ok') {
          throw new Error(String(txMap.detail || txMap.status || 'Kasa işlemleri alınamadı.'))
        }

        const items = Array.isArray(txMap.items) ? txMap.items : []
        const parsed = items
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map((item) => ({
            id: String(item.id || ''),
            used_at: String(item.used_at || ''),
            flow_type: String(item.flow_type || ''),
            coupon_code: item.coupon_code ? String(item.coupon_code) : null,
            final_amount: toNumber(item.final_amount),
            commission_amount: toNumber(item.commission_amount),
            merchant_net_amount: toNumber(item.merchant_net_amount),
            payment_reference: item.payment_reference ? String(item.payment_reference) : null,
          }))

        if (!active) return

        setSummary({
          tx_count: toCount(summaryMap.tx_count),
          gross_amount: toNumber(summaryMap.gross_amount),
          discount_amount: toNumber(summaryMap.discount_amount),
          collected_amount: toNumber(summaryMap.collected_amount),
          commission_amount: toNumber(summaryMap.commission_amount),
          merchant_net_amount: toNumber(summaryMap.merchant_net_amount),
          payment_coupon_count: toCount(summaryMap.payment_coupon_count),
          service_coupon_count: toCount(summaryMap.service_coupon_count),
        })
        setTransactions(parsed)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Kasa verisi alınamadı.')
      } finally {
        if (active) setRefreshing(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [activeModule, fromDate, selectedBusinessId, supabase, toDate])

  const dailySeries = useMemo(() => buildDailySeries(transactions), [transactions])
  const maxDailyCollected = useMemo(() => {
    const max = Math.max(0, ...dailySeries.map((item) => item.collected))
    return max > 0 ? max : 1
  }, [dailySeries])

  const averageTicket = useMemo(() => {
    if (!summary || summary.tx_count <= 0) return 0
    return summary.collected_amount / summary.tx_count
  }, [summary])

  const discountRate = useMemo(() => {
    if (!summary || summary.gross_amount <= 0) return 0
    return ratio(summary.discount_amount, summary.gross_amount)
  }, [summary])

  const effectiveCommissionRate = useMemo(() => {
    if (!summary || summary.collected_amount <= 0) return 0
    return ratio(summary.commission_amount, summary.collected_amount)
  }, [summary])

  const paymentFlowRatio = useMemo(() => {
    if (!summary || summary.tx_count <= 0) return 0
    return ratio(summary.payment_coupon_count, summary.tx_count)
  }, [summary])

  const serviceFlowRatio = useMemo(() => {
    if (!summary || summary.tx_count <= 0) return 0
    return ratio(summary.service_coupon_count, summary.tx_count)
  }, [summary])

  return (
    <div className="space-y-6">
      <div className="border-b border-[#2d313a] pb-4">
        <PanelTitle title="Kasa Programı" />
        <p className="text-[10px] font-mono tracking-widest uppercase text-[#64748b] mt-2">
          Finansal işlemlerinizi, komisyon oranlarını ve nakit akışını takip edin.
        </p>
      </div>

      <HardwarePanel className="p-5 md:p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-[#2d313a] pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest bg-[#153445] border border-[#226785] text-[#38bdf8]">
              <Sparkles className="w-3.5 h-3.5" />
              Premium Kasa Aktif
            </div>
            <h2 className="mt-3 text-[14px] font-medium tracking-wide text-[#e2e8f0] uppercase">Kupon + Ödeme Akışınız Tek Panelde</h2>
            <p className="mt-1.5 text-[11px] font-mono text-[#94a3b8] leading-relaxed">
              Tarih, tahsilat, net gelir ve komisyon trendini anlık takip edin.
            </p>
          </div>
          <div className="rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-3 shrink-0">
            <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">Seçili Aralık</p>
            <p className="mt-1 text-[12px] font-mono text-[#e2e8f0]">
              {new Date(`${fromDate}T00:00:00`).toLocaleDateString('tr-TR')} -{' '}
              {new Date(`${toDate}T00:00:00`).toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>

        <div className="inline-flex rounded border border-[#2d313a] p-1 bg-[#0a0c10]">
          <button
            type="button"
            onClick={() => setActiveModule('kasa')}
            className={`px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest transition-colors ${
              activeModule === 'kasa'
                ? 'bg-[#153445] border border-[#226785] text-[#38bdf8]'
                : 'text-[#64748b] hover:text-[#94a3b8]'
            }`}
          >
            Kasa Analitiği
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('iyzico')}
            className={`px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest transition-colors ${
              activeModule === 'iyzico'
                ? 'bg-[#153445] border border-[#226785] text-[#38bdf8]'
                : 'text-[#64748b] hover:text-[#94a3b8]'
            }`}
          >
            iyzico Kurulum
          </button>
        </div>

        <div className={`grid grid-cols-1 gap-3 ${activeModule === 'kasa' ? 'md:grid-cols-4' : 'md:grid-cols-2'}`}>
          <label className="text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
            İşletme
            <select
              className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm outline-none focus:border-[#38bdf8]/50 appearance-none uppercase"
              value={selectedBusinessId}
              onChange={(event) => setSelectedBusinessId(event.target.value)}
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>

          {activeModule === 'kasa' ? (
            <>
              <label className="text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Başlangıç
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="mt-2 w-full px-4 py-3 rounded bg-[#0a0c10] border border-[#2d313a] text-[#e2e8f0] font-mono text-sm outline-none focus:border-[#38bdf8]/50 [color-scheme:dark]"
                />
              </label>
              <label className="text-[10px] font-mono font-semibold text-[#64748b] uppercase tracking-widest">
                Bitiş
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
                  <CalendarRange className="w-3.5 h-3.5 text-[#64748b]" />
                  Bugün
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-end">
              <div className="w-full rounded border border-[#226785] bg-[#153445]/50 px-4 py-3 text-[10px] font-mono tracking-widest uppercase text-[#38bdf8]">
                Seçtiğiniz işletme için iyzico ödeme bilgilerini tamamlayın.
              </div>
            </div>
          )}
        </div>
      </HardwarePanel>

      {activeModule === 'kasa' ? (
        <>
          {loading ? (
            <div className="h-24 flex items-center justify-center border border-[#2d313a] rounded-md bg-[#0a0c10]">
              <Loader2 className="w-6 h-6 animate-spin text-[#38bdf8]" />
            </div>
          ) : null}

          {error ? (
            <div className="rounded border border-rose-900/50 bg-rose-950/20 p-4 text-[11px] font-mono text-rose-400 uppercase tracking-wide">
              [HATA] {error}
            </div>
          ) : null}

          {summary ? (
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <MetricCard label="İşlem" value={String(summary.tx_count)} icon={ReceiptText} tone="slate" />
              <MetricCard label="Tahsilat" value={toMoney(summary.collected_amount)} icon={Wallet} tone="blue" />
              <MetricCard label="Komisyon" value={toMoney(summary.commission_amount)} icon={CircleDollarSign} tone="violet" />
              <MetricCard label="Net" value={toMoney(summary.merchant_net_amount)} icon={TrendingUp} tone="emerald" />
              <MetricCard label="İndirim" value={toMoney(summary.discount_amount)} icon={ArrowUpRight} tone="amber" />
            </section>
          ) : null}

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <HardwarePanel className="p-5">
              <div className="mb-4 flex items-center justify-between border-b border-[#1e232b] pb-3">
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0]">Günlük Tahsilat Trendi</h2>
                {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#38bdf8]" /> : <RefreshCcw className="h-3.5 w-3.5 text-[#64748b]" />}
              </div>

              {dailySeries.length === 0 ? (
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] text-center py-6">
                  SEÇİLİ ARALIKTA TREND VERİSİ BULUNAMADI.
                </p>
              ) : (
                <div className="space-y-3">
                  {dailySeries.map((item) => {
                    const width = Math.max(ratio(item.collected, maxDailyCollected), item.collected > 0 ? 3 : 0)
                    return (
                      <div key={item.key} className="grid grid-cols-[68px_minmax(0,1fr)_110px] items-center gap-3">
                        <span className="text-[10px] font-mono tracking-widest text-[#94a3b8] uppercase">{item.label}</span>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#16181d] border border-[#2d313a]">
                          <div
                            className="h-full bg-[#38bdf8] transition-all"
                            style={{ width: `${width}%`, boxShadow: '0 0 8px rgba(56,189,248,0.5)' }}
                          />
                        </div>
                        <span className="text-right text-[11px] font-mono text-[#e2e8f0] tracking-widest">{toMoney(item.collected)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </HardwarePanel>

            <HardwarePanel className="p-5">
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0] mb-4 border-b border-[#1e232b] pb-3">
                Kasa Nabzı
              </h2>
              <div className="space-y-4">
                <PulseRow label="Ortalama fiş" value={toMoney(averageTicket)} progress={Math.min(100, averageTicket / 2)} />
                <PulseRow label="İndirim oranı" value={`${discountRate.toFixed(1)}%`} progress={discountRate} />
                <PulseRow label="Efektif komisyon" value={`${effectiveCommissionRate.toFixed(1)}%`} progress={effectiveCommissionRate} />
                <PulseRow label="Ödeme+Kupon" value={`${paymentFlowRatio.toFixed(1)}%`} progress={paymentFlowRatio} />
                <PulseRow label="Hizmet Kuponu" value={`${serviceFlowRatio.toFixed(1)}%`} progress={serviceFlowRatio} />
              </div>
            </HardwarePanel>
          </section>

          <HardwarePanel className="p-0 overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-[#2d313a] bg-[#101419]">
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-[#e2e8f0]">Son İşlemler</h2>
              <span className="inline-flex rounded border border-[#226785] bg-[#153445] px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest text-[#38bdf8]">
                {transactions.length} KAYIT
              </span>
            </div>

            {transactions.length === 0 ? (
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#64748b] text-center py-8 bg-[#0a0c10]">
                SEÇİLİ ARALIKTA İŞLEM BULUNAMADI.
              </p>
            ) : (
              <div className="overflow-x-auto bg-[#16181d]">
                <table className="min-w-full text-left border-collapse">
                  <thead className="bg-[#101419] border-b border-[#2d313a]">
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Tarih</th>
                      <th className="px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Akış</th>
                      <th className="px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Kupon</th>
                      <th className="px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Tahsilat</th>
                      <th className="px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Komisyon</th>
                      <th className="px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Net</th>
                      <th className="px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-[#64748b]">Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e232b]">
                    {transactions.map((tx) => {
                      const isService = tx.flow_type === 'service_coupon'
                      return (
                        <tr key={tx.id} className="hover:bg-[#1a1d24] transition-colors">
                          <td className="px-5 py-3 text-[11px] font-mono text-[#cbd5e1] tracking-widest">
                            {tx.used_at ? new Date(tx.used_at).toLocaleString('tr-TR') : '-'}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex rounded border px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest ${
                                isService ? 'bg-cyan-950/30 border-cyan-900/50 text-cyan-400' : 'bg-indigo-950/30 border-indigo-900/50 text-indigo-400'
                              }`}
                            >
                              {flowLabel(tx.flow_type)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-[11px] font-mono text-[#38bdf8] tracking-widest">{tx.coupon_code || '-'}</td>
                          <td className="px-5 py-3 text-[11px] font-mono text-[#e2e8f0] tracking-widest">{toMoney(tx.final_amount)}</td>
                          <td className="px-5 py-3 text-[11px] font-mono text-[#94a3b8] tracking-widest">{toMoney(tx.commission_amount)}</td>
                          <td className="px-5 py-3 text-[11px] font-mono text-emerald-400 tracking-widest">{toMoney(tx.merchant_net_amount)}</td>
                          <td className="px-5 py-3 text-[10px] font-mono text-[#64748b] tracking-widest">{tx.payment_reference || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </HardwarePanel>
        </>
      ) : (
        <IyzicoSetupModule businessId={selectedBusinessId} />
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  tone: MetricTone
}) {
  const hoverStyles: Record<MetricTone, string> = {
    blue: 'group-hover:bg-[#38bdf8]/50',
    sky: 'group-hover:bg-[#38bdf8]/50',
    emerald: 'group-hover:bg-emerald-500/50',
    violet: 'group-hover:bg-indigo-500/50',
    amber: 'group-hover:bg-amber-500/50',
    slate: 'group-hover:bg-[#94a3b8]/50',
  }

  const iconColors: Record<MetricTone, string> = {
    blue: 'text-[#38bdf8]',
    sky: 'text-[#38bdf8]',
    emerald: 'text-emerald-400',
    violet: 'text-indigo-400',
    amber: 'text-amber-400',
    slate: 'text-[#94a3b8]',
  }

  return (
    <div className="rounded border border-[#2d313a] bg-[#0a0c10] p-4 relative overflow-hidden group transition-colors hover:border-[#475569]">
      <div className={`absolute top-0 left-0 w-full h-[1px] bg-transparent ${hoverStyles[tone]} transition-colors duration-300`} />
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] uppercase tracking-widest font-mono text-[#64748b]">{label}</p>
        <Icon className={`w-4 h-4 ${iconColors[tone]}`} strokeWidth={1.5} />
      </div>
      <p className="text-xl font-mono text-[#e2e8f0]">{value}</p>
    </div>
  )
}

function PulseRow({ label, value, progress }: { label: string; value: string; progress: number }) {
  const width = Math.max(0, Math.min(100, progress))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#94a3b8]">
        <span>{label}</span>
        <span className="text-[#e2e8f0]">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#16181d] border border-[#2d313a]">
        <div
          className="h-full bg-[#38bdf8] transition-all"
          style={{ width: `${width}%`, boxShadow: '0 0 8px rgba(56,189,248,0.5)' }}
        />
      </div>
    </div>
  )
}
