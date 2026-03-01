'use client'
import { SPATIAL } from '../../constants/spatialData'

export const SpatialFooter = () => (
  <footer className="relative z-20 px-4 pb-10 sm:px-6 lg:px-20 lg:pl-32">
    <div className={`mx-auto w-full max-w-[1200px] rounded-[2rem] p-8 ${SPATIAL.glassContainer}`}>
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4 text-white font-bold text-xl">
          MOLAYERİ
        </div>
        <div className="flex gap-6 text-sm text-white/60">
          <a href="#" className="hover:text-white transition-colors">Sözleşme</a>
          <a href="#" className="hover:text-white transition-colors">KVKK</a>
        </div>
      </div>
    </div>
  </footer>
)