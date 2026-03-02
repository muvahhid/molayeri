'use client'
import { SPATIAL } from '../../constants/spatialData'

const LOGO_URL =
  'https://xhfyzlrkdvcuasprqtxw.supabase.co/storage/v1/object/public/landingpagevideos/logo.png'

export const SpatialFooter = () => (
  <footer className="relative z-20 px-4 pb-10 sm:px-6 lg:px-20 lg:pl-32">
    <div className={`mx-auto w-full max-w-[1200px] rounded-[22px] p-6 ${SPATIAL.glassContainer}`}>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center">
          <img src={LOGO_URL} alt="Molayeri Logo" className="h-8 w-auto object-contain" draggable={false} />
        </div>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <a href="#" className="px-3 py-1.5 rounded-[12px] border border-white/10 hover:border-white/20 hover:text-white transition-colors">Sözleşme</a>
          <a href="#" className="px-3 py-1.5 rounded-[12px] border border-white/10 hover:border-white/20 hover:text-white transition-colors">KVKK</a>
        </div>
      </div>
    </div>
  </footer>
)
