import Link from 'next/link'
import { Megaphone, RadioTower, Sparkles } from 'lucide-react'

type CampaignSubNavProps = {
  active: 'tags' | 'long-haul'
}

function tabClassName(isActive: boolean): string {
  return isActive
    ? 'group inline-flex items-center gap-2 px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest text-[#38bdf8] bg-[#153445] border border-[#226785] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors'
    : 'group inline-flex items-center gap-2 px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest text-[#64748b] border border-transparent hover:text-[#94a3b8] hover:bg-[#12141a] hover:border-[#2d313a] transition-colors'
}

function iconClassName(isActive: boolean): string {
  return isActive
    ? 'h-3.5 w-3.5 text-[#38bdf8] stroke-[1.5]'
    : 'h-3.5 w-3.5 text-[#64748b] group-hover:text-[#94a3b8] stroke-[1.5]'
}

export function CampaignSubNav({ active }: CampaignSubNavProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-md bg-[#0a0c10] border border-[#2d313a]">
      <Link href="/merchant/campaigns" className={tabClassName(active === 'tags')}>
        <Megaphone className={iconClassName(active === 'tags')} />
        <span>Etiket Kampanyası</span>
      </Link>
      <Link href="/merchant/campaigns/long-haul" className={tabClassName(active === 'long-haul')}>
        <RadioTower className={iconClassName(active === 'long-haul')} />
        <span>Uzun Yol Kampanyası</span>
        {active === 'long-haul' ? <Sparkles className="h-3 w-3 text-[#38bdf8]" strokeWidth={1.5} /> : null}
      </Link>
    </div>
  )
}