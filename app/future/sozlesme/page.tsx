import Link from 'next/link'
import { FUTURE_USER_MEMBERSHIP_TERMS_TEXT, FUTURE_USER_MEMBERSHIP_TERMS_VERSION } from '@/lib/future-legal-documents'

export default function FutureTermsPage() {
  return (
    <main className="min-h-screen bg-[#050811] text-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/future"
          className="inline-flex items-center rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-xs font-bold tracking-wide text-white/80 hover:border-white/30 hover:text-white"
        >
          Future Sayfasına Dön
        </Link>

        <div className="mt-4 rounded-[22px] border border-white/12 bg-white/[0.03] p-5 sm:p-7 backdrop-blur-xl">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Kullanıcı Üyelik ve Hizmet Sözleşmesi</h1>
          <p className="mt-2 text-xs font-semibold tracking-wide text-white/60">Versiyon: {FUTURE_USER_MEMBERSHIP_TERMS_VERSION}</p>

          <article className="mt-6 whitespace-pre-wrap text-[13px] leading-relaxed text-white/84 sm:text-[14px]">
            {FUTURE_USER_MEMBERSHIP_TERMS_TEXT}
          </article>
        </div>
      </div>
    </main>
  )
}
