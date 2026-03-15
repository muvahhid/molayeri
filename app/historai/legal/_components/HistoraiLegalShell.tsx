import Link from 'next/link'
import type { ReactNode } from 'react'

import {
  HISTORAI_LEGAL_LINKS,
  HISTORAI_SUPPORT_EMAIL,
  type HistoraiLegalDoc,
} from '@/lib/historai-legal-documents'

export function HistoraiLegalShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#132132_0%,#0b1016_45%,#06090d_100%)] text-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-3">
            <Link
              href={HISTORAI_LEGAL_LINKS.index}
              className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/76 transition hover:border-white/24 hover:text-white"
            >
              HistorAI Legal
            </Link>
            <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-[11px] font-semibold tracking-[0.18em] text-cyan-100/90">
              {eyebrow}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 backdrop-blur-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-100/75">HistorAI</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-[15px]">{subtitle}</p>
            </section>

            <aside className="rounded-[26px] border border-white/10 bg-black/20 p-6 backdrop-blur-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/46">Quick Links</p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-white/74">
                <Link className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-white/20 hover:text-white" href={HISTORAI_LEGAL_LINKS.privacyPolicy}>
                  Privacy Policy
                </Link>
                <Link className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-white/20 hover:text-white" href={HISTORAI_LEGAL_LINKS.termsOfUse}>
                  Terms of Use
                </Link>
                <Link className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-white/20 hover:text-white" href={HISTORAI_LEGAL_LINKS.accountDeletion}>
                  Account Deletion
                </Link>
                <a className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-white/20 hover:text-white" href={`mailto:${HISTORAI_SUPPORT_EMAIL}`}>
                  {HISTORAI_SUPPORT_EMAIL}
                </a>
              </div>
            </aside>
          </div>

          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  )
}

export function HistoraiLegalArticle({ doc }: { doc: HistoraiLegalDoc }) {
  return (
    <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/46">Effective</p>
      <p className="mt-2 text-sm text-white/68">{doc.effectiveDate}</p>
      <p className="mt-6 text-[15px] leading-8 text-white/78">{doc.intro}</p>

      <div className="mt-8 space-y-8">
        {doc.sections.map((section) => (
          <section key={section.title} className="border-t border-white/8 pt-6 first:border-t-0 first:pt-0">
            <h2 className="text-xl font-black tracking-tight text-white">{section.title}</h2>
            {section.body?.map((paragraph) => (
              <p key={paragraph} className="mt-4 text-[15px] leading-8 text-white/74">
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="mt-4 space-y-3 pl-5 text-[15px] leading-8 text-white/74">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {section.ordered ? (
              <ol className="mt-4 space-y-3 pl-5 text-[15px] leading-8 text-white/74">
                {section.ordered.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  )
}
