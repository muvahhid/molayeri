import Link from 'next/link'

import {
  HISTORAI_LEGAL_LINKS,
  HISTORAI_SUPPORT_EMAIL,
} from '@/lib/historai-legal-documents'
import { HistoraiLegalShell } from './_components/HistoraiLegalShell'

export default function HistoraiLegalIndexPage() {
  return (
    <HistoraiLegalShell
      eyebrow="Legal Center"
      title="HistorAI legal pages"
      subtitle="These pages are the public release surfaces for privacy, terms, support, and account deletion. Turkish and English are the authoritative versions."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Link href={HISTORAI_LEGAL_LINKS.privacyPolicy} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-cyan-400/30 hover:bg-white/[0.06]">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/76">Privacy</p>
          <h2 className="mt-3 text-xl font-black text-white">Privacy Policy</h2>
          <p className="mt-3 text-sm leading-7 text-white/68">Public privacy notice for App Store Connect and Google Play.</p>
        </Link>
        <Link href={HISTORAI_LEGAL_LINKS.termsOfUse} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-cyan-400/30 hover:bg-white/[0.06]">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/76">Terms</p>
          <h2 className="mt-3 text-xl font-black text-white">Terms of Use</h2>
          <p className="mt-3 text-sm leading-7 text-white/68">Public service terms for subscriptions, usage, and AI-assisted outputs.</p>
        </Link>
        <Link href={HISTORAI_LEGAL_LINKS.accountDeletion} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-cyan-400/30 hover:bg-white/[0.06]">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/76">Deletion</p>
          <h2 className="mt-3 text-xl font-black text-white">Account Deletion</h2>
          <p className="mt-3 text-sm leading-7 text-white/68">Public deletion instructions required for Google Play user data compliance.</p>
        </Link>
      </div>

      <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm leading-7 text-white/72">
        Contact: <a className="text-cyan-200 hover:text-white" href={`mailto:${HISTORAI_SUPPORT_EMAIL}`}>{HISTORAI_SUPPORT_EMAIL}</a>
      </div>
    </HistoraiLegalShell>
  )
}
