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
import { ModuleTitle } from '../_components/module-title'
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

const toneMap: Record<MetricTone, string> = {
  blue: 'from-blue-600 to-indigo-600 shadow-[0_14px_22px_-16px_rgba(37,99,235,0.75)]',
  sky: 'from-sky-500 to-cyan-500 shadow-[0_14px_22px_-16px_rgba(14,165,233,0.75)]',
  emerald:
    'from-emerald-500 to-green-500 shadow-[0_14px_22px_-16px_rgba(16,185,129,0.75)]',
  violet:
    'from-violet-500 to-purple-600 shadow-[0_14px_22px_-16px_rgba(139,92,246,0.75)]',
  amber:
    'from-amber-500 to-orange-500 shadow-[0_14px_22px_-16px_rgba(245,158,11,0.75)]',
  slate:
    'from-slate-500 to-slate-600 shadow-[0_14px_22px_-16px_rgba(71,85,105,0.75)]',
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
    <div className="space-y-4">
      <ModuleTitle title="Kasa Programı" />

      <section className="rounded-[26px] border border-sky-100 bg-[linear-gradient(135deg,#f8fbff_0%,#e7f0ff_55%,#e0f7ff_100%)] p-5 text-slate-800 shadow-[0_16px_30px_-24px_rgba(14,116,144,0.35)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/85 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700">
              <Sparkles size={12} />
              Premium Kasa
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight text-slate-700">Kupon + Ödeme akışınız tek panelde</h2>
            <p className="mt-2 text-sm text-slate-600">
              Tarih, tahsilat, net gelir ve komisyon trendini anlık takip edin.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-white/85 px-4 py-3 backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.14em] text-sky-700">Seçili Aralık</p>
            <p className="mt-1 text-sm font-bold text-slate-700">
              {new Date(`${fromDate}T00:00:00`).toLocaleDateString('tr-TR')} -{' '}
              {new Date(`${toDate}T00:00:00`).toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveModule('kasa')}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeModule === 'kasa'
                ? 'bg-[linear-gradient(90deg,#2563eb_0%,#0ea5e9_100%)] text-white shadow-[0_12px_22px_-16px_rgba(37,99,235,0.85)]'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Kasa Analitiği
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('iyzico')}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeModule === 'iyzico'
                ? 'bg-[linear-gradient(90deg,#2563eb_0%,#0ea5e9_100%)] text-white shadow-[0_12px_22px_-16px_rgba(37,99,235,0.85)]'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            iyzico Kurulum
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className={`grid grid-cols-1 gap-3 ${activeModule === 'kasa' ? 'md:grid-cols-4' : 'md:grid-cols-2'}`}>
          <label className="text-sm font-semibold text-slate-700">
            İşletme
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
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
              <label className="text-sm font-semibold text-slate-700">
                Başlangıç
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Bitiş
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setToDate(defaultDate(0))}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <CalendarRange size={14} />
                  Bugün
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs font-semibold text-blue-700">
              Seçtiğiniz işletme için iyzico ödeme bilgilerini tamamlayın.
            </div>
          )}
        </div>
      </section>

      {activeModule === 'kasa' ? (
        <>
          {loading ? (
            <section className="rounded-2xl border border-slate-200 bg-white/85 p-10 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" />
            </section>
          ) : null}

          {error ? (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</section>
          ) : null}

          {summary ? (
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <MetricCard label="İşlem" value={String(summary.tx_count)} icon={ReceiptText} tone="slate" />
              <MetricCard
                label="Tahsilat"
                value={toMoney(summary.collected_amount)}
                icon={Wallet}
                tone="blue"
              />
              <MetricCard
                label="Komisyon"
                value={toMoney(summary.commission_amount)}
                icon={CircleDollarSign}
                tone="violet"
              />
              <MetricCard label="Net" value={toMoney(summary.merchant_net_amount)} icon={TrendingUp} tone="emerald" />
              <MetricCard
                label="İndirim"
                value={toMoney(summary.discount_amount)}
                icon={ArrowUpRight}
                tone="amber"
              />
            </section>
          ) : null}

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Günlük Tahsilat Trendi</h2>
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : <RefreshCcw className="h-4 w-4 text-slate-400" />}
              </div>

              {dailySeries.length === 0 ? (
                <p className="text-sm text-slate-500">Seçili aralıkta trend verisi bulunamadı.</p>
              ) : (
                <div className="space-y-2">
                  {dailySeries.map((item) => {
                    const width = Math.max(ratio(item.collected, maxDailyCollected), item.collected > 0 ? 3 : 0)
                    return (
                      <div key={item.key} className="grid grid-cols-[68px_minmax(0,1fr)_110px] items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#38bdf8_100%)]"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className="text-right text-xs font-bold text-slate-700">{toMoney(item.collected)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">Kasa Nabzı</h2>
              <div className="mt-3 space-y-3">
                <PulseRow label="Ortalama fiş" value={toMoney(averageTicket)} progress={Math.min(100, averageTicket / 2)} />
                <PulseRow label="İndirim oranı" value={`${discountRate.toFixed(1)}%`} progress={discountRate} />
                <PulseRow
                  label="Efektif komisyon"
                  value={`${effectiveCommissionRate.toFixed(1)}%`}
                  progress={effectiveCommissionRate}
                />
                <PulseRow label="Ödeme+Kupon" value={`${paymentFlowRatio.toFixed(1)}%`} progress={paymentFlowRatio} />
                <PulseRow label="Hizmet Kuponu" value={`${serviceFlowRatio.toFixed(1)}%`} progress={serviceFlowRatio} />
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Son İşlemler</h2>
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {transactions.length} kayıt
              </span>
            </div>

            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500">Seçili aralıkta işlem bulunamadı.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-2 pr-2">Tarih</th>
                      <th className="py-2 pr-2">Akış</th>
                      <th className="py-2 pr-2">Kupon</th>
                      <th className="py-2 pr-2">Tahsilat</th>
                      <th className="py-2 pr-2">Komisyon</th>
                      <th className="py-2 pr-2">Net</th>
                      <th className="py-2">Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const isService = tx.flow_type === 'service_coupon'
                      return (
                        <tr key={tx.id} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50/70">
                          <td className="py-2 pr-2">{tx.used_at ? new Date(tx.used_at).toLocaleString('tr-TR') : '-'}</td>
                          <td className="py-2 pr-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${
                                isService ? 'bg-cyan-50 text-cyan-700' : 'bg-indigo-50 text-indigo-700'
                              }`}
                            >
                              {flowLabel(tx.flow_type)}
                            </span>
                          </td>
                          <td className="py-2 pr-2 font-semibold">{tx.coupon_code || '-'}</td>
                          <td className="py-2 pr-2 font-bold text-slate-800">{toMoney(tx.final_amount)}</td>
                          <td className="py-2 pr-2">{toMoney(tx.commission_amount)}</td>
                          <td className="py-2 pr-2 font-bold text-emerald-700">{toMoney(tx.merchant_net_amount)}</td>
                          <td className="py-2 text-slate-500">{tx.payment_reference || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
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
  icon: React.ComponentType<{ size?: number; className?: string }>
  tone: MetricTone
}) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/95 p-3 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.7)]">
      <div className={`absolute right-0 top-0 h-14 w-14 rounded-bl-2xl bg-gradient-to-br ${toneMap[tone]} opacity-90`} />
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
        <Icon size={16} />
      </span>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-800">{value}</p>
    </article>
  )
}

function PulseRow({ label, value, progress }: { label: string; value: string; progress: number }) {
  const width = Math.max(0, Math.min(100, progress))

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-[linear-gradient(90deg,#0ea5e9_0%,#2563eb_100%)]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
