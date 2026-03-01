'use client'
import { motion, useTransform, type MotionValue } from 'framer-motion'
import { THEME } from '../../constants/spatialData'

export const PremiumHighwayLine = ({ progress }: { progress: MotionValue<number> }) => {
  return (
    <div className="hidden lg:block fixed left-[4%] top-0 h-screen w-[20px] z-0 pointer-events-none flex flex-col items-center">
      <div className="relative w-full h-full flex justify-center">
        <div className="absolute inset-y-0 w-[2px] opacity-10" style={{ backgroundImage: `repeating-linear-gradient(to bottom, #FFF 0, #FFF 20px, transparent 20px, transparent 40px)` }} />
        <motion.div 
          className="absolute top-0 w-[3px] rounded-b-full shadow-lg"
          style={{ height: useTransform(progress, [0, 1], ["0%", "100%"]), backgroundColor: THEME.highwayYellow, boxShadow: `0 0 20px ${THEME.highwayYellowGlow}` }}
        />
        <motion.div 
          className="absolute w-[16px] h-[32px] bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center border border-[#FF7043]"
          style={{ top: useTransform(progress, [0, 1], ["0%", "100%"]), y: "-50%", boxShadow: `0 0 15px ${THEME.highwayYellowGlow}` }}
        >
          <div className="w-[4px] h-[4px] bg-white rounded-full absolute top-1 animate-pulse" />
        </motion.div>
      </div>
    </div>
  )
}