import { MERCHANT_SECTIONS_DATA, type SpatialSection } from '../../../constants/spatialData'

const getFallbackMerchantSection = (): SpatialSection => {
  const fallback = MERCHANT_SECTIONS_DATA[0]
  if (!fallback) {
    throw new Error('MERCHANT_SECTIONS_DATA cannot be empty')
  }
  return fallback
}

export const getMerchantSectionById = (sectionId: string): SpatialSection => {
  const matched = MERCHANT_SECTIONS_DATA.find((section) => section.id === sectionId)
  return matched ?? getFallbackMerchantSection()
}
