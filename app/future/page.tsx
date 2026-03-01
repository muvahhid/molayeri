'use client'
import React, { useEffect, useState } from 'react'
import { useScroll, useSpring } from 'framer-motion'

import { THEME, SECTIONS_DATA } from '../../constants/spatialData'
import { PremiumHighwayLine } from '../../components/layout/PremiumHighwayLine'
import { CommandCenterNav } from '../../components/layout/CommandCenterNav'
import { SpatialFooter } from '../../components/layout/SpatialFooter'
import { HeroSection } from '../../components/sections/HeroSection'
import { StickyScrollContainer } from '../../components/sections/StickyScrollContainer'

// Geliştirilmiş Modüllerin Importları
import { RadarFeature } from '../../components/features/RadarFeature'
import { WalletFeature } from '../../components/features/WalletFeature'
import { ConvoyFeature } from '../../components/features/ConvoyFeature'
import LongRoadFeature from '../../components/features/LongRoadFeature'
import PanicFeature from '../../components/features/PanicFeature'

export default function FutureLanding() {
  const [activeSection, setActiveSection] = useState('hero')
  const { scrollYProgress } = useScroll()
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 50, damping: 20, restDelta: 0.001 })

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight * 0.5
      const currentSection = SECTIONS_DATA.find((sec) => {
        const el = document.getElementById(sec.id)
        return !!el && scrollPos >= el.offsetTop && scrollPos < el.offsetTop + el.offsetHeight
      })
      setActiveSection(currentSection?.id ?? 'hero')
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <main className={`min-h-screen ${THEME.bg} font-sans selection:bg-[#FF7043]/30 selection:text-white pb-32`}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(29,78,216,0.16)_0%,rgba(29,78,216,0)_42%),radial-gradient(circle_at_86%_82%,rgba(255,112,67,0.14)_0%,rgba(255,112,67,0)_40%)]" />
      </div>

      <PremiumHighwayLine progress={smoothProgress} />
      <CommandCenterNav activeSection={activeSection} progress={smoothProgress} />
      
      <HeroSection />

      {/* SORUNUN ÇÖZÜLDÜĞÜ YER: Tek bir net Child render ediyoruz */}
      {SECTIONS_DATA.map((data) => {
        let ActiveComponent = null;
        
        switch (data.id) {
          case 'radar': ActiveComponent = <RadarFeature />; break;
          case 'wallet': ActiveComponent = <WalletFeature />; break;
          case 'convoy': ActiveComponent = <ConvoyFeature />; break;
          case 'long-road': ActiveComponent = <LongRoadFeature />; break;
          case 'panic': ActiveComponent = <PanicFeature />; break;
        }

        return (
          <StickyScrollContainer key={data.id} data={data}>
            {ActiveComponent}
          </StickyScrollContainer>
        )
      })}

      <SpatialFooter />
    </main>
  )
}
