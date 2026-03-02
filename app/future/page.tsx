'use client'
import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useScroll, useSpring } from 'framer-motion'

import { THEME, SECTIONS_DATA, MERCHANT_SECTIONS_DATA } from '../../constants/spatialData'
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
import MerchantTemplateFeature from '../../components/features/MerchantTemplateFeature'
import FutureMobileView from '../../components/sections/FutureMobileView'

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'

const subscribeDesktopQuery = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {}
  const media = window.matchMedia(DESKTOP_MEDIA_QUERY)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

const getDesktopSnapshot = () => {
  if (typeof window === 'undefined') return true
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
}

const getDesktopServerSnapshot = () => true

export default function FutureLanding() {
  const isDesktop = useSyncExternalStore(subscribeDesktopQuery, getDesktopSnapshot, getDesktopServerSnapshot)
  const [activeSection, setActiveSection] = useState('hero')
  const [audienceMode, setAudienceMode] = useState<'user' | 'merchant'>('user')
  const [mobileSectionId, setMobileSectionId] = useState('home')
  const [mobileFeatureIndex, setMobileFeatureIndex] = useState(0)
  const { scrollYProgress } = useScroll()
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 50, damping: 20, restDelta: 0.001 })
  const activeSections = audienceMode === 'merchant' ? MERCHANT_SECTIONS_DATA : SECTIONS_DATA
  const mobileSelectedSection = activeSections.find((section) => section.id === mobileSectionId) ?? activeSections[0]

  const mobilePreview = useMemo(() => {
    if (mobileSectionId === 'home') {
      return (
        <div className="lg:hidden">
          <HeroSection embedded />
        </div>
      )
    }

    if (!mobileSelectedSection) return null
    if (audienceMode === 'merchant') {
      return <MerchantTemplateFeature section={mobileSelectedSection} activeIndex={mobileFeatureIndex} />
    }

    switch (mobileSelectedSection.id) {
      case 'radar':
        return <RadarFeature activeIndex={mobileFeatureIndex} />
      case 'wallet':
        return <WalletFeature activeIndex={mobileFeatureIndex} />
      case 'convoy':
        return <ConvoyFeature activeIndex={mobileFeatureIndex} />
      case 'long-road':
        return <LongRoadFeature activeIndex={mobileFeatureIndex} />
      case 'panic':
        return <PanicFeature activeIndex={mobileFeatureIndex} />
      default:
        return null
    }
  }, [audienceMode, mobileFeatureIndex, mobileSectionId, mobileSelectedSection])

  const switchAudienceMode = (nextMode: 'user' | 'merchant') => {
    setAudienceMode(nextMode)
    setActiveSection('hero')
    setMobileSectionId('home')
    setMobileFeatureIndex(0)
  }

  useEffect(() => {
    if (!isDesktop) return
    const handleScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight * 0.5
      const currentSection = activeSections.find((sec) => {
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
  }, [activeSections, isDesktop])

  return (
    <main className={`min-h-screen ${THEME.bg} font-sans selection:bg-[#FF7043]/30 selection:text-white pb-32`}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(29,78,216,0.16)_0%,rgba(29,78,216,0)_42%),radial-gradient(circle_at_86%_82%,rgba(255,112,67,0.14)_0%,rgba(255,112,67,0)_40%)]" />
      </div>

      {isDesktop ? (
        <>
          <PremiumHighwayLine progress={smoothProgress} />
          <CommandCenterNav
            activeSection={activeSection}
            progress={smoothProgress}
            sections={activeSections}
            audienceMode={audienceMode}
            onToggleAudience={() => switchAudienceMode(audienceMode === 'user' ? 'merchant' : 'user')}
          />

          <HeroSection />

          {activeSections.map((data) => {
            let ActiveComponent = null

            if (audienceMode === 'merchant') {
              ActiveComponent = <MerchantTemplateFeature section={data} />
            } else {
              switch (data.id) {
                case 'radar': ActiveComponent = <RadarFeature />; break
                case 'wallet': ActiveComponent = <WalletFeature />; break
                case 'convoy': ActiveComponent = <ConvoyFeature />; break
                case 'long-road': ActiveComponent = <LongRoadFeature />; break
                case 'panic': ActiveComponent = <PanicFeature />; break
              }
            }

            if (!ActiveComponent) return null

            return (
              <StickyScrollContainer key={data.id} data={data}>
                {ActiveComponent}
              </StickyScrollContainer>
            )
          })}
        </>
      ) : (
        <FutureMobileView
          sections={activeSections}
          audienceMode={audienceMode}
          onToggleAudience={() => switchAudienceMode(audienceMode === 'user' ? 'merchant' : 'user')}
          selectedSectionId={mobileSectionId}
          onSelectSection={(sectionId) => {
            setMobileSectionId(sectionId)
            setMobileFeatureIndex(0)
          }}
          selectedFeatureIndex={mobileFeatureIndex}
          onSelectFeatureIndex={setMobileFeatureIndex}
          preview={mobilePreview}
        />
      )}
      <SpatialFooter />
    </main>
  )
}
