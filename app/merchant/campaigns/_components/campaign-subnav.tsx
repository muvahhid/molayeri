import Link from 'next/link'
import { Megaphone, RadioTower, Sparkles } from 'lucide-react'

type CampaignSubNavProps = {
  active: 'tags' | 'long-haul'
}

function tabClassName(isActive: boolean): string {
  return isActive
    ? 'group inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-extrabold tracking-[0.01em] text-slate-900 bg-[linear-gradient(145deg,#ffffff_0%,#eef5ff_100%)] border border-white/90 shadow-[0_10px_24px_-16px_rgba(37,99,235,0.85),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-blue-200/70'
    : 'group inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold tracking-[0.01em] text-slate-600 border border-transparent hover:text-slate-900 hover:bg-white/70 hover:border-slate-200/85 hover:shadow-[0_10px_20px_-18px_rgba(15,23,42,0.75)]'
}

function iconClassName(isActive: boolean): string {
  return isActive
    ? 'h-4 w-4 text-blue-600 drop-shadow-[0_2px_4px_rgba(37,99,235,0.35)]'
    : 'h-4 w-4 text-slate-500 group-hover:text-slate-700'
}

export function CampaignSubNav({ active }: CampaignSubNavProps) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-2xl p-2 bg-[linear-gradient(155deg,#e9eef8_0%,#dde7f5_100%)] border border-slate-200/85 shadow-[inset_5px_5px_12px_rgba(148,163,184,0.28),inset_-5px_-5px_12px_rgba(255,255,255,0.95),0_10px_24px_-20px_rgba(15,23,42,0.75)]">
      <Link href="/merchant/campaigns" className={tabClassName(active === 'tags')}>
        <Megaphone className={iconClassName(active === 'tags')} />
        <span>Etiket Kampanyası</span>
      </Link>
      <Link href="/merchant/campaigns/long-haul" className={tabClassName(active === 'long-haul')}>
        <RadioTower className={iconClassName(active === 'long-haul')} />
        <span>Uzun Yol Kampanyası</span>
        {active === 'long-haul' ? <Sparkles className="h-3.5 w-3.5 text-sky-500" /> : null}
      </Link>
    </div>
  )
}
