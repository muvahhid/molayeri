export type MerchantBusiness = {
  id: string
  owner_id: string
  name: string
  type: string | null
  status: string | null
  lat?: number | null
  lng?: number | null
  is_open?: boolean | null
  description?: string | null
  phone?: string | null
  address_text?: string | null
  created_at?: string | null
  menu_description?: string | null
  image_url?: string | null
}

export type MerchantMenuModule = 'campaign' | 'fuel' | 'menu' | 'stores' | 'services' | 'charging'

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
}

export function categorySlugFromName(name: string): string {
  const n = normalizeText(name).replaceAll(' ', '').replaceAll('.', '')

  if (
    n.includes('yakit') ||
    n.includes('akaryak') ||
    n.includes('benzin') ||
    n.includes('petrol') ||
    n.includes('fuel') ||
    n.includes('istasyon')
  ) {
    return 'yakit'
  }

  if (n.includes('sarj') || n.includes('elektrik') || n.includes('charge') || n.includes('ev')) {
    return 'sarj'
  }

  if (
    n.includes('yemek') ||
    n.includes('restoran') ||
    n.includes('food') ||
    n.includes('lokanta') ||
    n.includes('kebap') ||
    n.includes('pizza') ||
    n.includes('burger')
  ) {
    return 'yemek'
  }

  if (
    n.includes('market') ||
    n.includes('bufe') ||
    n.includes('tekel') ||
    n.includes('bakkal') ||
    n.includes('shop') ||
    n.includes('store')
  ) {
    return 'market'
  }

  if (n.includes('kafe') || n.includes('kahve') || n.includes('cafe') || n.includes('coffee')) {
    return 'kafe'
  }

  if (n.includes('otel') || n.includes('hotel') || n.includes('konak')) {
    return 'otel'
  }

  if (
    n.includes('servis') ||
    n.includes('tamir') ||
    n.includes('oto') ||
    n.includes('lastik') ||
    n.includes('service')
  ) {
    return 'servis'
  }

  return 'other'
}

export function inferMenuModules(input: {
  businessType?: string | null
  categoryNames?: string[]
}): MerchantMenuModule[] {
  const detected = new Set<string>()
  const detectedFromCategories = new Set<string>()

  if (input.businessType) {
    detected.add(normalizeText(input.businessType))
  }

  for (const name of input.categoryNames || []) {
    const normalizedName = normalizeText(name)
    const slug = categorySlugFromName(name)

    detected.add(normalizedName)
    detected.add(slug)
    detectedFromCategories.add(normalizedName)
    detectedFromCategories.add(slug)
  }

  const detectedText = Array.from(detected).join(' ')
  const categoryText = Array.from(detectedFromCategories).join(' ')

  const modules: MerchantMenuModule[] = ['campaign']

  if (
    categoryText.includes('yakit') ||
    categoryText.includes('akaryak') ||
    categoryText.includes('benzin') ||
    categoryText.includes('petrol') ||
    categoryText.includes('fuel') ||
    categoryText.includes('istasyon')
  ) {
    modules.push('fuel')
  }

  if (
    detectedText.includes('food') ||
    detectedText.includes('restoran') ||
    detectedText.includes('cafe') ||
    detectedText.includes('kafe') ||
    detectedText.includes('yemek') ||
    detectedText.includes('lokanta')
  ) {
    modules.push('menu')
  }

  if (
    detectedText.includes('avm') ||
    detectedText.includes('mall') ||
    detectedText.includes('alisveris') ||
    detectedText.includes('carsi')
  ) {
    modules.push('stores')
  }

  if (
    detectedText.includes('servis') ||
    detectedText.includes('tamir') ||
    detectedText.includes('oto') ||
    detectedText.includes('lastik') ||
    detectedText.includes('service')
  ) {
    modules.push('services')
  }

  if (
    detectedText.includes('sarj') ||
    detectedText.includes('charging') ||
    detectedText.includes('elektrik')
  ) {
    modules.push('charging')
  }

  return modules
}

export function buildStoragePath(folder: string, fileName: string): string {
  const safeName = fileName.replaceAll(/\s+/g, '_').replaceAll(/[^a-zA-Z0-9._-]/g, '')
  return `${folder}/${Date.now()}_${safeName}`
}
