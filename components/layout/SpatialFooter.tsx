'use client'
import Link from 'next/link'
import { SPATIAL } from '../../constants/spatialData'

const LOGO_URL = '/logo.png'

const chipClass =
  'inline-flex items-center rounded-[12px] border border-white/10 px-3 py-1.5 text-sm text-white/70 transition-colors hover:border-white/20 hover:text-white'

export const SpatialFooter = () => (
  <footer className="relative z-20 px-4 pb-10 sm:px-6 lg:px-20 lg:pl-32">
    <div className={`mx-auto w-full max-w-[1200px] rounded-[22px] p-6 ${SPATIAL.glassContainer}`}>
      <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="flex items-center justify-center md:justify-start">
          <img src={LOGO_URL} alt="Molayeri Logo" className="h-8 w-auto object-contain" draggable={false} />
        </div>

        <p className="text-center text-xs font-semibold tracking-wide text-white/70">Molayeri® App 2026 • Tüm hakları saklıdır.</p>

        <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
          <Link href="/future/sozlesme" className={chipClass}>
            Sözleşme
          </Link>
          <Link href="/future/kvkk" className={chipClass}>
            KVKK
          </Link>
          <a href="mailto:iletisim@molayeri.app" className={chipClass}>
            İletişim
          </a>
        </div>
      </div>
    </div>
  </footer>
)
