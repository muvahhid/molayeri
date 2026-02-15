'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Brush,
  Check,
  Fuel,
  GripVertical,
  Loader2,
  Move,
  Palette,
  Plus,
  Search,
  Sparkles,
  Store,
  Trash2,
  Upload,
  Wrench,
  WandSparkles,
  Zap,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/browser-client'
import { ModuleTitle } from '../_components/module-title'
import {
  buildStoragePath,
  inferMenuModules,
  type MerchantBusiness,
  type MerchantMenuModule,
} from '../_lib/helpers'
import {
  fetchBusinessCategoryNames,
  fetchOwnedBusinesses,
  requireCurrentUserId,
} from '../_lib/queries'

type CampaignImage = {
  id: string
  image_url: string | null
  text: string | null
  is_active: boolean | null
  created_at?: string | null
}

type MenuItem = {
  id: string
  category_id: string
  name: string
  price: number | null
  image_url: string | null
  description: string | null
}

type MenuCategory = {
  id: string
  name: string
  business_menu_items: MenuItem[]
}

type StoreItem = {
  id: string
  name: string
  floor_info: string | null
  logo_url: string | null
}

type ServiceItem = {
  id: string
  name: string
  price: number | null
}

type ChargingItem = {
  id: string
  type: string
  socket_count: number | null
  price_kw: number | null
}

const MODULE_LABELS: Record<MerchantMenuModule, string> = {
  campaign: 'Kampanya (A4)',
  fuel: 'Yakıt Fiyatları',
  menu: 'Menü',
  stores: 'Mağazalar',
  services: 'Hizmetler',
  charging: 'Şarj',
}

const MAX_A4_CAMPAIGN = 5
const A4_CANVAS_WIDTH = 700
const A4_CANVAS_HEIGHT = 990

const CAMPAIGN_TEXT_COLORS = ['#ffffff', '#fef08a', '#dbeafe', '#fecdd3', '#dcfce7', '#ffedd5']

const CAMPAIGN_EMOJIS = ['🔥', '⚡', '💥', '🎉', '🎁', '⛽', '🍔', '☕', '🚀', '✨']

const CAMPAIGN_FILTERS = [
  { id: 'none', label: 'Temiz', css: 'none', canvas: 'none' },
  { id: 'vivid', label: 'Canlı', css: 'saturate(1.28) contrast(1.08)', canvas: 'saturate(1.28) contrast(1.08)' },
  { id: 'warm', label: 'Sıcak', css: 'sepia(0.18) saturate(1.12) contrast(1.06)', canvas: 'sepia(0.18) saturate(1.12) contrast(1.06)' },
  { id: 'cool', label: 'Serin', css: 'hue-rotate(10deg) saturate(1.06) contrast(1.05)', canvas: 'hue-rotate(10deg) saturate(1.06) contrast(1.05)' },
  { id: 'mono', label: 'Mono', css: 'grayscale(0.95) contrast(1.1)', canvas: 'grayscale(0.95) contrast(1.1)' },
] as const

const CAMPAIGN_OVERLAYS = [
  {
    id: 'deep-navy',
    label: 'Lacivert',
    start: 'rgba(15,23,42,0.9)',
    end: 'rgba(15,23,42,0.3)',
    accent: 'rgba(37,99,235,0.25)',
  },
  {
    id: 'emerald',
    label: 'Zümrüt',
    start: 'rgba(6,78,59,0.9)',
    end: 'rgba(6,78,59,0.3)',
    accent: 'rgba(16,185,129,0.28)',
  },
  {
    id: 'sunset',
    label: 'Günbatımı',
    start: 'rgba(124,45,18,0.9)',
    end: 'rgba(124,45,18,0.28)',
    accent: 'rgba(251,146,60,0.26)',
  },
] as const

const CAMPAIGN_BACKGROUND_THEMES = [
  { id: 'midnight', label: 'Midnight', start: '#0f172a', end: '#1e293b' },
  { id: 'sunset', label: 'Sunset', start: '#7c2d12', end: '#fb923c' },
  { id: 'ocean', label: 'Ocean', start: '#0c4a6e', end: '#38bdf8' },
  { id: 'forest', label: 'Forest', start: '#14532d', end: '#4ade80' },
  { id: 'royal', label: 'Royal', start: '#312e81', end: '#818cf8' },
] as const

type CampaignFilterId = (typeof CAMPAIGN_FILTERS)[number]['id']
type CampaignOverlayId = (typeof CAMPAIGN_OVERLAYS)[number]['id']
type CampaignBackgroundThemeId = (typeof CAMPAIGN_BACKGROUND_THEMES)[number]['id']
type CampaignLayerKey = 'headline' | 'subline' | 'emoji'
type FuelKey = 'benzin' | 'motorin' | 'lpg'

type CampaignLayerConfig = {
  x: number
  y: number
  rotation: number
  size: number
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
) {
  const imageRatio = image.width / image.height
  const targetRatio = width / height

  let sx = 0
  let sy = 0
  let sw = image.width
  let sh = image.height

  if (imageRatio > targetRatio) {
    sw = image.height * targetRatio
    sx = (image.width - sw) / 2
  } else {
    sh = image.width / targetRatio
    sy = (image.height - sh) / 2
  }

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height)
}

function measureWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) {
    lines.push(current)
  }

  return lines
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('file-read-failed'))
    reader.readAsDataURL(file)
  })
}

function loadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image-load-failed'))
    image.src = source
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('canvas-export-failed'))
        return
      }
      resolve(blob)
    }, 'image/jpeg', 0.94)
  })
}

function formatFuelPreview(value: string): string {
  const numericValue = Number(value.replace(',', '.'))
  if (Number.isNaN(numericValue) || numericValue <= 0) {
    return 'Güncel değil'
  }
  return `${numericValue.toFixed(2)} ₺`
}

function toPriceText(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0.00 TL'
  }
  return `${value.toFixed(2)} TL`
}

export default function MerchantMenuPage() {
  const supabase = useMemo(() => getBrowserSupabase(), [])
  const campaignFileInput = useRef<HTMLInputElement | null>(null)
  const campaignBackgroundInput = useRef<HTMLInputElement | null>(null)
  const campaignCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const campaignPreviewRef = useRef<HTMLDivElement | null>(null)
  const moduleProgressIntervalRef = useRef<number | null>(null)
  const moduleProgressDoneTimeoutRef = useRef<number | null>(null)
  const dragRef = useRef<{
    layer: CampaignLayerKey
    offsetX: number
    offsetY: number
  } | null>(null)

  const [loading, setLoading] = useState(true)
  const [moduleLoading, setModuleLoading] = useState(false)
  const [moduleLoadingProgress, setModuleLoadingProgress] = useState(0)
  const [savingFuel, setSavingFuel] = useState(false)
  const [savingCampaign, setSavingCampaign] = useState(false)
  const [publishingCampaigns, setPublishingCampaigns] = useState(false)

  const [businesses, setBusinesses] = useState<MerchantBusiness[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')

  const [modules, setModules] = useState<MerchantMenuModule[]>([])
  const [activeModule, setActiveModule] = useState<MerchantMenuModule>('campaign')

  const [campaignImages, setCampaignImages] = useState<CampaignImage[]>([])
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([])
  const [draggingCampaignId, setDraggingCampaignId] = useState<string | null>(null)
  const [campaignNotice, setCampaignNotice] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [campaignBackgroundData, setCampaignBackgroundData] = useState('')
  const [campaignBackgroundThemeId, setCampaignBackgroundThemeId] = useState<CampaignBackgroundThemeId>('midnight')
  const [campaignHeadline, setCampaignHeadline] = useState('')
  const [campaignSubline, setCampaignSubline] = useState('')
  const [campaignEmoji, setCampaignEmoji] = useState('🔥')
  const [campaignTextColor, setCampaignTextColor] = useState(CAMPAIGN_TEXT_COLORS[0])
  const [campaignStrokeColor, setCampaignStrokeColor] = useState('#0f172a')
  const [campaignStrokeWidth, setCampaignStrokeWidth] = useState(2)
  const [activeLayer, setActiveLayer] = useState<CampaignLayerKey>('headline')
  const [headlineLayer, setHeadlineLayer] = useState<CampaignLayerConfig>({
    x: 160,
    y: 420,
    rotation: 0,
    size: 78,
  })
  const [sublineLayer, setSublineLayer] = useState<CampaignLayerConfig>({
    x: 350,
    y: 760,
    rotation: 0,
    size: 40,
  })
  const [emojiLayer, setEmojiLayer] = useState<CampaignLayerConfig>({
    x: 160,
    y: 240,
    rotation: 0,
    size: 88,
  })
  const [campaignFilterId, setCampaignFilterId] = useState<CampaignFilterId>('none')
  const [campaignOverlayId, setCampaignOverlayId] = useState<CampaignOverlayId>('deep-navy')

  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([])
  const [menuDescription, setMenuDescription] = useState('')
  const [stores, setStores] = useState<StoreItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [chargingStations, setChargingStations] = useState<ChargingItem[]>([])

  const [menuCategoryName, setMenuCategoryName] = useState('')
  const [menuSearch, setMenuSearch] = useState('')
  const [menuActiveCategoryId, setMenuActiveCategoryId] = useState('')
  const [itemCategoryId, setItemCategoryId] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [itemImageFile, setItemImageFile] = useState<File | null>(null)

  const [storeName, setStoreName] = useState('')
  const [storeFloor, setStoreFloor] = useState('')
  const [storeLogoFile, setStoreLogoFile] = useState<File | null>(null)
  const [storeSearch, setStoreSearch] = useState('')

  const [serviceName, setServiceName] = useState('')
  const [servicePrice, setServicePrice] = useState('')
  const [serviceSearch, setServiceSearch] = useState('')

  const [chargingType, setChargingType] = useState('')
  const [chargingSocketCount, setChargingSocketCount] = useState('')
  const [chargingSearch, setChargingSearch] = useState('')
  const [fuelNotice, setFuelNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [fuelPrices, setFuelPrices] = useState({
    benzin: '',
    motorin: '',
    lpg: '',
  })

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId) || null
  const selectedCampaignFilter = useMemo(
    () => CAMPAIGN_FILTERS.find((item) => item.id === campaignFilterId) || CAMPAIGN_FILTERS[0],
    [campaignFilterId]
  )
  const selectedCampaignOverlay = useMemo(
    () => CAMPAIGN_OVERLAYS.find((item) => item.id === campaignOverlayId) || CAMPAIGN_OVERLAYS[0],
    [campaignOverlayId]
  )
  const selectedCampaignBackgroundTheme = useMemo(
    () =>
      CAMPAIGN_BACKGROUND_THEMES.find((item) => item.id === campaignBackgroundThemeId) ||
      CAMPAIGN_BACKGROUND_THEMES[0],
    [campaignBackgroundThemeId]
  )
  const activeCampaignCount = campaignImages.filter((item) => item.is_active).length
  const selectedCampaignCount = selectedCampaignIds.length

  const applyStoredCampaignOrder = (items: CampaignImage[], businessId: string): CampaignImage[] => {
    try {
      const raw = window.localStorage.getItem(`merchant_campaign_order_${businessId}`)
      if (!raw) {
        return items
      }

      const order = JSON.parse(raw) as string[]
      if (!Array.isArray(order) || order.length === 0) {
        return items
      }

      const indexMap = new Map(order.map((id, index) => [id, index]))
      return [...items].sort((left, right) => {
        const leftIndex = indexMap.get(left.id)
        const rightIndex = indexMap.get(right.id)
        if (typeof leftIndex === 'number' && typeof rightIndex === 'number') {
          return leftIndex - rightIndex
        }
        if (typeof leftIndex === 'number') {
          return -1
        }
        if (typeof rightIndex === 'number') {
          return 1
        }
        return 0
      })
    } catch {
      return items
    }
  }

  const persistCampaignOrder = (items: CampaignImage[], businessId: string) => {
    try {
      const orderedIds = items.map((item) => item.id)
      window.localStorage.setItem(`merchant_campaign_order_${businessId}`, JSON.stringify(orderedIds))
    } catch {
      // Intentionally ignored: ordering persistence is best-effort.
    }
  }

  const currentLayer = useMemo<CampaignLayerConfig>(() => {
    if (activeLayer === 'headline') {
      return headlineLayer
    }

    if (activeLayer === 'subline') {
      return sublineLayer
    }

    return emojiLayer
  }, [activeLayer, headlineLayer, sublineLayer, emojiLayer])

  const updateLayer = (
    layer: CampaignLayerKey,
    updater: (current: CampaignLayerConfig) => CampaignLayerConfig
  ) => {
    if (layer === 'headline') {
      setHeadlineLayer((current) => updater(current))
      return
    }

    if (layer === 'subline') {
      setSublineLayer((current) => updater(current))
      return
    }

    setEmojiLayer((current) => updater(current))
  }

  const handlePreviewDragStart = (layer: CampaignLayerKey, event: React.PointerEvent<HTMLButtonElement>) => {
    const preview = campaignPreviewRef.current
    if (!preview) {
      return
    }

    const rect = preview.getBoundingClientRect()
    const layerConfig = layer === 'headline' ? headlineLayer : layer === 'subline' ? sublineLayer : emojiLayer
    const px = (layerConfig.x / A4_CANVAS_WIDTH) * rect.width
    const py = (layerConfig.y / A4_CANVAS_HEIGHT) * rect.height

    dragRef.current = {
      layer,
      offsetX: event.clientX - (rect.left + px),
      offsetY: event.clientY - (rect.top + py),
    }

    setActiveLayer(layer)
    event.preventDefault()
  }

  const uploadToBusinessPhotos = async (file: File, folder: string): Promise<string | null> => {
    const path = buildStoragePath(folder, file.name)
    const { error } = await supabase.storage.from('business-photos').upload(path, file)

    if (error) {
      return null
    }

    const { data } = supabase.storage.from('business-photos').getPublicUrl(path)
    return data.publicUrl
  }

  const drawCampaignPreview = async () => {
    const canvas = campaignCanvasRef.current
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    canvas.width = A4_CANVAS_WIDTH
    canvas.height = A4_CANVAS_HEIGHT

    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    if (campaignBackgroundData) {
      try {
        const backgroundImage = await loadImageElement(campaignBackgroundData)
        ctx.filter = selectedCampaignFilter.canvas
        drawImageCover(ctx, backgroundImage, width, height)
        ctx.filter = 'none'
      } catch {
        const fallbackGradient = ctx.createLinearGradient(0, 0, width, height)
        fallbackGradient.addColorStop(0, selectedCampaignBackgroundTheme.start)
        fallbackGradient.addColorStop(1, selectedCampaignBackgroundTheme.end)
        ctx.fillStyle = fallbackGradient
        ctx.fillRect(0, 0, width, height)
      }
    } else {
      const baseGradient = ctx.createLinearGradient(0, 0, width, height)
      baseGradient.addColorStop(0, selectedCampaignBackgroundTheme.start)
      baseGradient.addColorStop(1, selectedCampaignBackgroundTheme.end)
      ctx.fillStyle = baseGradient
      ctx.fillRect(0, 0, width, height)
    }

    const overlayGradient = ctx.createLinearGradient(0, height, 0, 0)
    overlayGradient.addColorStop(0, selectedCampaignOverlay.start)
    overlayGradient.addColorStop(0.62, selectedCampaignOverlay.end)
    overlayGradient.addColorStop(1, 'rgba(15,23,42,0.08)')
    ctx.fillStyle = overlayGradient
    ctx.fillRect(0, 0, width, height)

    const drawLayerText = (
      text: string,
      layer: CampaignLayerConfig,
      options: { weight: number; color: string; family: string; maxLines: number }
    ) => {
      if (!text.trim()) {
        return
      }

      const textMaxWidth = width - 160
      const rotationRad = (layer.rotation * Math.PI) / 180

      ctx.save()
      ctx.translate(layer.x, layer.y)
      ctx.rotate(rotationRad)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.font = `${options.weight} ${layer.size}px ${options.family}`
      ctx.fillStyle = options.color
      ctx.strokeStyle = campaignStrokeColor
      ctx.lineWidth = campaignStrokeWidth
      ctx.lineJoin = 'round'
      ctx.miterLimit = 2

      const lines = measureWrappedLines(ctx, text, textMaxWidth).slice(0, options.maxLines)
      let currentY = 0
      const lineHeight = layer.size + 8

      for (const line of lines) {
        if (campaignStrokeWidth > 0) {
          ctx.strokeText(line, 0, currentY)
        }
        ctx.fillText(line, 0, currentY)
        currentY += lineHeight
      }

      ctx.restore()
    }

    drawLayerText(campaignEmoji.trim().slice(0, 2), emojiLayer, {
      weight: 700,
      color: campaignTextColor,
      family: '"Segoe UI Emoji", "Apple Color Emoji", sans-serif',
      maxLines: 1,
    })

    drawLayerText(campaignHeadline.trim() || 'Kampanya Başlığı', headlineLayer, {
      weight: 800,
      color: campaignTextColor,
      family: '"Poppins", "Inter", sans-serif',
      maxLines: 4,
    })

    drawLayerText(
      campaignSubline.trim() || (selectedBusiness ? selectedBusiness.name : 'MolaYeri App'),
      sublineLayer,
      {
        weight: 600,
        color: campaignTextColor,
        family: '"Poppins", "Inter", sans-serif',
        maxLines: 2,
      }
    )

    ctx.save()
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.font = '700 27px "Poppins", "Inter", sans-serif'
    ctx.fillStyle = 'rgba(226,232,240,0.94)'
    ctx.fillText('A4 Kampanya Broşürü', 80, height - 70)
    ctx.restore()
  }

  const loadFuelPrices = async () => {
    if (!selectedBusiness) {
      setFuelPrices({ benzin: '', motorin: '', lpg: '' })
      return
    }

    const { data, error } = await supabase
      .from('business_products')
      .select('name, price')
      .eq('business_id', selectedBusiness.id)

    if (error) {
      setFuelPrices({ benzin: '', motorin: '', lpg: '' })
      return
    }

    const nextValues = { benzin: '', motorin: '', lpg: '' }

    for (const row of (data || []) as { name: string; price: number | string | null }[]) {
      const name = (row.name || '').toUpperCase()
      const value = row.price == null ? '' : String(row.price)

      if (name.includes('BENZIN') || name.includes('BENZİN')) {
        nextValues.benzin = value
      }
      if (name.includes('MOTORIN') || name.includes('MOTORİN')) {
        nextValues.motorin = value
      }
      if (name.includes('LPG')) {
        nextValues.lpg = value
      }
    }

    setFuelPrices(nextValues)
  }

  const saveSingleFuelPrice = async (name: string, value: string) => {
    const numericPrice = Number(value.replace(',', '.'))
    if (!selectedBusiness || Number.isNaN(numericPrice) || numericPrice <= 0) {
      return
    }

    const { data: existing, error: existingError } = await supabase
      .from('business_products')
      .select('id')
      .eq('business_id', selectedBusiness.id)
      .eq('name', name)
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    if (existing && (existing as { id?: string }).id) {
      const { error: updateError } = await supabase
        .from('business_products')
        .update({ price: numericPrice })
        .eq('id', (existing as { id: string }).id)

      if (updateError) {
        throw updateError
      }

      return
    }

    const { error: insertError } = await supabase.from('business_products').insert({
      business_id: selectedBusiness.id,
      name,
      price: numericPrice,
      image_url: null,
    })

    if (insertError) {
      throw insertError
    }
  }

  const handleSaveFuelPrices = async () => {
    if (!selectedBusiness) {
      return
    }

    setFuelNotice(null)
    setSavingFuel(true)

    try {
      await saveSingleFuelPrice('BENZİN (95)', fuelPrices.benzin)
      await saveSingleFuelPrice('MOTORİN', fuelPrices.motorin)
      await saveSingleFuelPrice('LPG / OTOGAZ', fuelPrices.lpg)
      setFuelNotice({ type: 'success', message: 'Yakıt fiyatları kaydedildi.' })
      await loadFuelPrices()
    } catch {
      setFuelNotice({ type: 'error', message: 'Yakıt fiyatları kaydedilemedi. Tekrar deneyin.' })
    } finally {
      setSavingFuel(false)
    }
  }

  const adjustFuelPrice = (key: FuelKey, delta: number) => {
    setFuelPrices((current) => {
      const currentValue = Number(current[key].replace(',', '.'))
      const safeCurrent = Number.isNaN(currentValue) ? 0 : currentValue
      const next = Math.max(0, safeCurrent + delta)
      return {
        ...current,
        [key]: next.toFixed(2),
      }
    })
  }

  const loadBusinesses = async () => {
    setLoading(true)
    const userId = await requireCurrentUserId(supabase)

    if (!userId) {
      setLoading(false)
      return
    }

    const ownedBusinesses = await fetchOwnedBusinesses(supabase, userId)
    setBusinesses(ownedBusinesses)
    setSelectedBusinessId((current) => current || ownedBusinesses[0]?.id || '')
    setLoading(false)
  }

  const resolveModulesForBusiness = async (business: MerchantBusiness | null) => {
    if (!business) {
      setModules(['campaign'])
      setActiveModule('campaign')
      return
    }

    const categoryNames = await fetchBusinessCategoryNames(supabase, business.id)
    const inferred = inferMenuModules({
      businessType: business.type,
      categoryNames,
    })

    setModules(inferred)
    setActiveModule((current) => (inferred.includes(current) ? current : inferred[0]))
  }

  const clearModuleLoadingTimers = () => {
    if (moduleProgressIntervalRef.current !== null) {
      window.clearInterval(moduleProgressIntervalRef.current)
      moduleProgressIntervalRef.current = null
    }

    if (moduleProgressDoneTimeoutRef.current !== null) {
      window.clearTimeout(moduleProgressDoneTimeoutRef.current)
      moduleProgressDoneTimeoutRef.current = null
    }
  }

  const startModuleLoadingProgress = () => {
    clearModuleLoadingTimers()
    setModuleLoading(true)
    setModuleLoadingProgress(6)

    moduleProgressIntervalRef.current = window.setInterval(() => {
      setModuleLoadingProgress((current) => {
        if (current >= 92) {
          return current
        }

        if (current < 45) {
          return Math.min(current + 9, 92)
        }

        if (current < 70) {
          return Math.min(current + 5, 92)
        }

        return Math.min(current + 2, 92)
      })
    }, 120)
  }

  const finishModuleLoadingProgress = async () => {
    if (moduleProgressIntervalRef.current !== null) {
      window.clearInterval(moduleProgressIntervalRef.current)
      moduleProgressIntervalRef.current = null
    }

    setModuleLoadingProgress(100)

    await new Promise<void>((resolve) => {
      moduleProgressDoneTimeoutRef.current = window.setTimeout(() => {
        moduleProgressDoneTimeoutRef.current = null
        resolve()
      }, 180)
    })

    setModuleLoading(false)
    setModuleLoadingProgress(0)
  }

  const loadActiveModuleData = async () => {
    if (!selectedBusiness) {
      return
    }

    startModuleLoadingProgress()

    try {
      if (activeModule === 'campaign') {
        const { data } = await supabase
          .from('business_campaigns')
          .select('id, image_url, text, is_active, created_at')
          .eq('business_id', selectedBusiness.id)
          .order('created_at', { ascending: false })

        const withImage = ((data || []) as CampaignImage[]).filter((campaign) => Boolean(campaign.image_url))
        const ordered = applyStoredCampaignOrder(withImage, selectedBusiness.id)
        setCampaignImages(ordered)
        setSelectedCampaignIds((current) => current.filter((id) => ordered.some((item) => item.id === id)))
      }

      if (activeModule === 'fuel') {
        await loadFuelPrices()
      }

      if (activeModule === 'menu') {
        const [categoriesRes, businessRes] = await Promise.all([
          supabase
            .from('business_menu_categories')
            .select('*, business_menu_items(*)')
            .eq('business_id', selectedBusiness.id)
            .order('sort_order'),
          supabase.from('businesses').select('menu_description').eq('id', selectedBusiness.id).maybeSingle(),
        ])

        const categories = (categoriesRes.data || []) as MenuCategory[]
        setMenuCategories(categories)
        setMenuDescription(
          ((businessRes.data as { menu_description?: string | null } | null)?.menu_description || '')
        )
        setItemCategoryId((current) => current || categories[0]?.id || '')
        setMenuActiveCategoryId((current) => current || categories[0]?.id || '')
      }

      if (activeModule === 'stores') {
        const { data } = await supabase
          .from('business_stores')
          .select('*')
          .eq('business_id', selectedBusiness.id)

        setStores((data || []) as StoreItem[])
      }

      if (activeModule === 'services') {
        const { data } = await supabase
          .from('business_services')
          .select('*')
          .eq('business_id', selectedBusiness.id)

        setServices((data || []) as ServiceItem[])
      }

      if (activeModule === 'charging') {
        const { data } = await supabase
          .from('business_charging_stations')
          .select('*')
          .eq('business_id', selectedBusiness.id)

        setChargingStations((data || []) as ChargingItem[])
      }
    } finally {
      await finishModuleLoadingProgress()
    }
  }

  const applyCampaignBackground = async (file: File) => {
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setCampaignBackgroundData(dataUrl)
      setCampaignNotice(null)
    } catch {
      setCampaignNotice({ type: 'error', message: 'Görsel yüklenemedi. Farklı bir dosya deneyin.' })
    }
  }

  const addCampaignImage = async (file: File) => {
    if (!selectedBusiness) {
      return
    }

    if (campaignImages.length >= MAX_A4_CAMPAIGN) {
      window.alert(`Maksimum ${MAX_A4_CAMPAIGN} kampanya görseli ekleyebilirsiniz.`)
      return
    }

    const imageUrl = await uploadToBusinessPhotos(file, 'camp')
    if (!imageUrl) {
      setCampaignNotice({ type: 'error', message: 'Görsel yüklenemedi. Tekrar deneyin.' })
      return
    }

    await supabase.from('business_campaigns').insert({
      business_id: selectedBusiness.id,
      image_url: imageUrl,
      text: campaignHeadline.trim() || null,
      is_active: false,
    })

    setCampaignNotice({ type: 'success', message: 'Kampanya görseli kaydedildi.' })
    await loadActiveModuleData()
  }

  const saveCampaignDesign = async () => {
    if (!selectedBusiness) {
      return
    }

    if (campaignImages.length >= MAX_A4_CAMPAIGN) {
      setCampaignNotice({
        type: 'error',
        message: `Maksimum ${MAX_A4_CAMPAIGN} kampanya görseli kaydedebilirsiniz.`,
      })
      return
    }

    const canvas = campaignCanvasRef.current
    if (!canvas) {
      setCampaignNotice({ type: 'error', message: 'Kanvas hazır değil. Yenileyip tekrar deneyin.' })
      return
    }

    setSavingCampaign(true)
    setCampaignNotice(null)

    try {
      const blob = await canvasToBlob(canvas)
      const file = new File([blob], `a4-campaign-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      })
      const imageUrl = await uploadToBusinessPhotos(file, 'camp-a4')

      if (!imageUrl) {
        throw new Error('campaign-image-upload-failed')
      }

      await supabase.from('business_campaigns').insert({
        business_id: selectedBusiness.id,
        image_url: imageUrl,
        text: campaignHeadline.trim() || selectedBusiness.name,
        is_active: false,
      })

      await loadActiveModuleData()
      setCampaignNotice({ type: 'success', message: 'A4 kampanya broşürü kaydedildi.' })
    } catch {
      setCampaignNotice({
        type: 'error',
        message: 'Kampanya kaydedilemedi. Görsel boyutunu küçültüp tekrar deneyin.',
      })
    } finally {
      setSavingCampaign(false)
    }
  }

  const toggleCampaignPublish = async (campaign: CampaignImage) => {
    if (!selectedBusiness) {
      return
    }

    setCampaignNotice(null)

    if (campaign.is_active) {
      await supabase.from('business_campaigns').update({ is_active: false }).eq('id', campaign.id)
      setCampaignNotice({ type: 'success', message: 'Kampanya yayından kaldırıldı.' })
      await loadActiveModuleData()
      return
    }

    await supabase
      .from('business_campaigns')
      .update({ is_active: false })
      .eq('business_id', selectedBusiness.id)

    await supabase.from('business_campaigns').update({ is_active: true }).eq('id', campaign.id)
    setCampaignNotice({ type: 'success', message: 'Kampanya A4 menüsünde yayına alındı.' })
    await loadActiveModuleData()
  }

  const publishSelectedCampaigns = async () => {
    if (!selectedBusiness || selectedCampaignIds.length === 0) {
      return
    }

    setCampaignNotice(null)
    setPublishingCampaigns(true)
    try {
      await supabase
        .from('business_campaigns')
        .update({ is_active: false })
        .eq('business_id', selectedBusiness.id)

      await supabase
        .from('business_campaigns')
        .update({ is_active: true })
        .in('id', selectedCampaignIds)

      setCampaignNotice({ type: 'success', message: `${selectedCampaignIds.length} kampanya yayına alındı.` })
      await loadActiveModuleData()
    } catch {
      setCampaignNotice({ type: 'error', message: 'Yayın sırasında bir hata oluştu.' })
    } finally {
      setPublishingCampaigns(false)
    }
  }

  const toggleCampaignSelection = (campaignId: string) => {
    setSelectedCampaignIds((current) =>
      current.includes(campaignId)
        ? current.filter((id) => id !== campaignId)
        : [...current, campaignId]
    )
  }

  const reorderCampaignCards = (sourceId: string, targetId: string) => {
    if (!selectedBusiness || sourceId === targetId) {
      return
    }

    setCampaignImages((current) => {
      const sourceIndex = current.findIndex((item) => item.id === sourceId)
      const targetIndex = current.findIndex((item) => item.id === targetId)
      if (sourceIndex < 0 || targetIndex < 0) {
        return current
      }

      const next = [...current]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, moved)
      persistCampaignOrder(next, selectedBusiness.id)
      return next
    })
  }

  const deleteCampaignImage = async (campaignId: string) => {
    await supabase.from('business_campaigns').delete().eq('id', campaignId)
    setCampaignNotice({ type: 'success', message: 'Kampanya silindi.' })
    setSelectedCampaignIds((current) => current.filter((id) => id !== campaignId))
    await loadActiveModuleData()
  }

  const addMenuCategory = async () => {
    if (!selectedBusiness || !menuCategoryName.trim()) {
      return
    }

    await supabase.from('business_menu_categories').insert({
      business_id: selectedBusiness.id,
      name: menuCategoryName.trim(),
    })

    setMenuCategoryName('')
    await loadActiveModuleData()
  }

  const addMenuItem = async () => {
    if (!itemCategoryId || !itemName.trim()) {
      return
    }

    let imageUrl: string | null = null
    if (itemImageFile) {
      imageUrl = await uploadToBusinessPhotos(itemImageFile, 'menu')
    }

    await supabase.from('business_menu_items').insert({
      category_id: itemCategoryId,
      name: itemName.trim(),
      price: Number(itemPrice.replace(',', '.')) || 0,
      image_url: imageUrl,
      description: itemDescription.trim() || null,
    })

    setItemName('')
    setItemPrice('')
    setItemDescription('')
    setItemImageFile(null)
    await loadActiveModuleData()
  }

  const saveMenuDescription = async () => {
    if (!selectedBusiness) {
      return
    }

    await supabase
      .from('businesses')
      .update({ menu_description: menuDescription.trim() })
      .eq('id', selectedBusiness.id)
  }

  const deleteMenuCategory = async (categoryId: string) => {
    await supabase.from('business_menu_items').delete().eq('category_id', categoryId)
    await supabase.from('business_menu_categories').delete().eq('id', categoryId)
    await loadActiveModuleData()
  }

  const deleteMenuItem = async (itemId: string) => {
    await supabase.from('business_menu_items').delete().eq('id', itemId)
    await loadActiveModuleData()
  }

  const addStore = async () => {
    if (!selectedBusiness || !storeName.trim()) {
      return
    }

    let logoUrl: string | null = null
    if (storeLogoFile) {
      logoUrl = await uploadToBusinessPhotos(storeLogoFile, 'logos')
    }

    await supabase.from('business_stores').insert({
      business_id: selectedBusiness.id,
      name: storeName.trim(),
      floor_info: storeFloor.trim() || null,
      logo_url: logoUrl,
    })

    setStoreName('')
    setStoreFloor('')
    setStoreLogoFile(null)
    await loadActiveModuleData()
  }

  const deleteStore = async (storeId: string) => {
    await supabase.from('business_stores').delete().eq('id', storeId)
    await loadActiveModuleData()
  }

  const addService = async () => {
    if (!selectedBusiness || !serviceName.trim()) {
      return
    }

    await supabase.from('business_services').insert({
      business_id: selectedBusiness.id,
      name: serviceName.trim(),
      price: Number(servicePrice.replace(',', '.')) || 0,
    })

    setServiceName('')
    setServicePrice('')
    await loadActiveModuleData()
  }

  const deleteService = async (serviceId: string) => {
    await supabase.from('business_services').delete().eq('id', serviceId)
    await loadActiveModuleData()
  }

  const addCharging = async () => {
    if (!selectedBusiness || !chargingType.trim()) {
      return
    }

    const parsedSocketCount = Number.parseInt(chargingSocketCount, 10)
    const socketCountValue =
      Number.isNaN(parsedSocketCount) || parsedSocketCount < 1 ? 1 : parsedSocketCount

    await supabase.from('business_charging_stations').insert({
      business_id: selectedBusiness.id,
      type: chargingType.trim(),
      price_kw: 0,
      socket_count: socketCountValue,
    })

    setChargingType('')
    setChargingSocketCount('')
    await loadActiveModuleData()
  }

  const deleteCharging = async (chargingId: string) => {
    await supabase.from('business_charging_stations').delete().eq('id', chargingId)
    await loadActiveModuleData()
  }

  useEffect(() => {
    loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    resolveModulesForBusiness(selectedBusiness)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId])

  useEffect(() => {
    if (selectedBusiness && modules.length > 0) {
      loadActiveModuleData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule, selectedBusinessId])

  useEffect(() => {
    setFuelNotice(null)
    setCampaignNotice(null)
    setSelectedCampaignIds([])
    setDraggingCampaignId(null)
  }, [activeModule, selectedBusinessId])

  useEffect(() => {
    if (menuCategories.length === 0) {
      setMenuActiveCategoryId('')
      return
    }

    if (!menuCategories.some((category) => category.id === menuActiveCategoryId)) {
      setMenuActiveCategoryId(menuCategories[0].id)
    }
  }, [menuCategories, menuActiveCategoryId])

  useEffect(() => {
    return () => {
      if (moduleProgressIntervalRef.current !== null) {
        window.clearInterval(moduleProgressIntervalRef.current)
        moduleProgressIntervalRef.current = null
      }

      if (moduleProgressDoneTimeoutRef.current !== null) {
        window.clearTimeout(moduleProgressDoneTimeoutRef.current)
        moduleProgressDoneTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (activeModule !== 'campaign') {
      return
    }

    void drawCampaignPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeModule,
    campaignBackgroundData,
    campaignHeadline,
    campaignSubline,
    campaignEmoji,
    campaignTextColor,
    campaignStrokeColor,
    campaignStrokeWidth,
    headlineLayer,
    sublineLayer,
    emojiLayer,
    campaignBackgroundThemeId,
    campaignFilterId,
    campaignOverlayId,
    selectedBusiness?.name,
  ])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const preview = campaignPreviewRef.current
      const drag = dragRef.current
      if (!preview || !drag) {
        return
      }

      const rect = preview.getBoundingClientRect()
      const rawX = event.clientX - rect.left - drag.offsetX
      const rawY = event.clientY - rect.top - drag.offsetY
      const x = Math.max(60, Math.min(A4_CANVAS_WIDTH - 60, (rawX / rect.width) * A4_CANVAS_WIDTH))
      const y = Math.max(60, Math.min(A4_CANVAS_HEIGHT - 60, (rawY / rect.height) * A4_CANVAS_HEIGHT))

      updateLayer(drag.layer, (current) => ({
        ...current,
        x,
        y,
      }))
    }

    const handlePointerUp = () => {
      dragRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  const renderModuleContent = () => {
    if (moduleLoading) {
      return (
        <div className="min-h-[220px] flex items-center justify-center">
          <div className="w-full max-w-xl rounded-2xl border border-slate-100 bg-[linear-gradient(145deg,#ffffff_0%,#f7faff_100%)] p-5 shadow-[0_18px_26px_-20px_rgba(15,23,42,0.6)] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">
                {activeModule === 'campaign' ? 'A4 kampanya verileri hazırlanıyor' : 'Modül verileri hazırlanıyor'}
              </p>
              <span className="text-sm font-bold text-blue-700">{moduleLoadingProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#10b981_100%)] transition-all duration-200 ease-out"
                style={{ width: `${moduleLoadingProgress}%` }}
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
              Lütfen bekleyin...
            </div>
          </div>
        </div>
      )
    }

    if (activeModule === 'campaign') {
      return (
        <div className="grid grid-cols-1 gap-5">
          <section className="rounded-[24px] p-5 bg-[linear-gradient(165deg,#ffffff_0%,#f8fbff_100%)] border border-white shadow-[0_18px_26px_-20px_rgba(15,23,42,0.6)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-widest uppercase text-slate-600">A4 Kampanya Stüdyosu</h3>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-slate-600 shadow-sm">
                {campaignImages.length}/{MAX_A4_CAMPAIGN}
              </span>
            </div>

            <div className="rounded-[20px] p-3 bg-[#eaf0fb] shadow-[inset_5px_5px_14px_rgba(148,163,184,0.28),inset_-6px_-6px_14px_rgba(255,255,255,0.92)]">
              <div className="mx-auto max-w-[380px]">
                <div
                  ref={campaignPreviewRef}
                  className="relative rounded-[18px] overflow-hidden aspect-[210/297] bg-slate-100 shadow-[0_20px_26px_-20px_rgba(15,23,42,0.55)] touch-none"
                >
                  <canvas ref={campaignCanvasRef} className="w-full h-full" />

                  <button
                    type="button"
                    onPointerDown={(event) => handlePreviewDragStart('headline', event)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                      activeLayer === 'headline' ? 'bg-blue-600 text-white' : 'bg-white/90 text-slate-700'
                    }`}
                    style={{
                      left: `${(headlineLayer.x / A4_CANVAS_WIDTH) * 100}%`,
                      top: `${(headlineLayer.y / A4_CANVAS_HEIGHT) * 100}%`,
                    }}
                  >
                    Başlık
                  </button>

                  <button
                    type="button"
                    onPointerDown={(event) => handlePreviewDragStart('subline', event)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                      activeLayer === 'subline' ? 'bg-emerald-600 text-white' : 'bg-white/90 text-slate-700'
                    }`}
                    style={{
                      left: `${(sublineLayer.x / A4_CANVAS_WIDTH) * 100}%`,
                      top: `${(sublineLayer.y / A4_CANVAS_HEIGHT) * 100}%`,
                    }}
                  >
                    Alt Başlık
                  </button>

                  <button
                    type="button"
                    onPointerDown={(event) => handlePreviewDragStart('emoji', event)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                      activeLayer === 'emoji' ? 'bg-amber-500 text-white' : 'bg-white/90 text-slate-700'
                    }`}
                    style={{
                      left: `${(emojiLayer.x / A4_CANVAS_WIDTH) * 100}%`,
                      top: `${(emojiLayer.y / A4_CANVAS_HEIGHT) * 100}%`,
                    }}
                  >
                    Emoji
                  </button>
                </div>
              </div>

              <p className="mt-2 text-[11px] font-semibold text-slate-500 inline-flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5" />
                Katman etiketlerini sürükleyerek konumlandır.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Başlık
                <input
                  value={campaignHeadline}
                  onChange={(event) => setCampaignHeadline(event.target.value)}
                  maxLength={55}
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white text-sm font-semibold text-slate-700 shadow-sm"
                  placeholder="Örn: Bu Hafta Özel İndirim"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Alt Başlık
                <input
                  value={campaignSubline}
                  onChange={(event) => setCampaignSubline(event.target.value)}
                  maxLength={65}
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white text-sm font-semibold text-slate-700 shadow-sm"
                  placeholder="Örn: 20 Şubat'a kadar geçerli"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => campaignBackgroundInput.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white shadow-[0_12px_16px_-12px_rgba(15,23,42,0.75)]"
              >
                <Brush className="w-4 h-4" />
                Tasarım için Dikey A4 Foto Yükle
              </button>
              <button
                type="button"
                onClick={() => setCampaignBackgroundData('')}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white shadow-sm"
              >
                Fotoğrafı Kaldır
              </button>
              <input
                ref={campaignBackgroundInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void applyCampaignBackground(file)
                    event.target.value = ''
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Hazır Arka Planlar</div>
              <div className="flex flex-wrap gap-2">
                {CAMPAIGN_BACKGROUND_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      setCampaignBackgroundData('')
                      setCampaignBackgroundThemeId(theme.id)
                    }}
                    className={`px-2 py-2 rounded-xl border transition-all ${
                      campaignBackgroundThemeId === theme.id
                        ? 'border-slate-700 ring-2 ring-slate-200'
                        : 'border-slate-200'
                    }`}
                    title={theme.label}
                  >
                    <span
                      className="block w-14 h-7 rounded-md"
                      style={{ background: `linear-gradient(135deg, ${theme.start}, ${theme.end})` }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-2xl p-3 bg-[#f6f9ff] border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Katman Kontrolü</div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: 'headline', label: 'Başlık' },
                    { key: 'subline', label: 'Alt Başlık' },
                    { key: 'emoji', label: 'Emoji' },
                  ] as { key: CampaignLayerKey; label: string }[]
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveLayer(item.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                      activeLayer === item.key
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  Boyut
                  <input
                    type="range"
                    min={activeLayer === 'emoji' ? 48 : 32}
                    max={activeLayer === 'emoji' ? 140 : 110}
                    value={currentLayer.size}
                    onChange={(event) =>
                      updateLayer(activeLayer, (current) => ({
                        ...current,
                        size: Number(event.target.value),
                      }))
                    }
                    className="mt-2 w-full"
                  />
                </label>

                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  Döndür (Hafif)
                  <input
                    type="range"
                    min={-35}
                    max={35}
                    value={currentLayer.rotation}
                    onChange={(event) =>
                      updateLayer(activeLayer, (current) => ({
                        ...current,
                        rotation: Number(event.target.value),
                      }))
                    }
                    className="mt-2 w-full"
                  />
                </label>

                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  Stroke
                  <input
                    type="range"
                    min={0}
                    max={12}
                    value={campaignStrokeWidth}
                    onChange={(event) => setCampaignStrokeWidth(Number(event.target.value))}
                    className="mt-2 w-full"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  Stroke Rengi
                  <input
                    type="color"
                    value={campaignStrokeColor}
                    onChange={(event) => setCampaignStrokeColor(event.target.value)}
                    className="w-8 h-8 rounded-md border border-slate-200 bg-white p-0.5"
                  />
                </label>

                <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 bg-white text-xs font-semibold text-slate-600 shadow-sm">
                  <Palette className="w-3.5 h-3.5" />
                  {currentLayer.size}px / {currentLayer.rotation}deg
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Filtre</div>
              <div className="flex flex-wrap gap-2">
                {CAMPAIGN_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setCampaignFilterId(filter.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      campaignFilterId === filter.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Yazı Rengi</div>
              <div className="flex flex-wrap gap-2">
                {CAMPAIGN_TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setCampaignTextColor(color)}
                    className={`w-8 h-8 rounded-full border-2 shadow-sm ${
                      campaignTextColor === color ? 'border-slate-700 scale-110' : 'border-white'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Renk ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Vurgu Teması</div>
              <div className="flex flex-wrap gap-2">
                {CAMPAIGN_OVERLAYS.map((overlay) => (
                  <button
                    key={overlay.id}
                    type="button"
                    onClick={() => setCampaignOverlayId(overlay.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      campaignOverlayId === overlay.id
                        ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    {overlay.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Emoji</div>
              <div className="flex flex-wrap gap-2">
                {CAMPAIGN_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setCampaignEmoji(emoji)}
                    className={`w-9 h-9 rounded-xl text-lg bg-white shadow-sm border ${
                      campaignEmoji === emoji ? 'border-blue-300' : 'border-slate-200'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {campaignNotice ? (
              <div
                className={`rounded-xl px-3 py-2 text-xs font-semibold border ${
                  campaignNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {campaignNotice.message}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveCampaignDesign}
                disabled={savingCampaign || !selectedBusiness}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingCampaign ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {savingCampaign ? 'Kaydediliyor...' : 'Tasarımı Kaydet'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCampaignHeadline('Haftanın Fırsatı')
                  setCampaignSubline('Bu kampanya sınırlı süre için geçerli')
                  setCampaignEmoji('🔥')
                  setHeadlineLayer((current) => ({ ...current, x: 350, y: 340, rotation: -8, size: 72 }))
                  setSublineLayer((current) => ({ ...current, x: 350, y: 730, rotation: 10, size: 38 }))
                  setEmojiLayer((current) => ({ ...current, x: 180, y: 200, rotation: -16, size: 86 }))
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white shadow-sm"
              >
                <WandSparkles className="w-4 h-4" />
                Hazır Şablon
              </button>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => campaignFileInput.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  Direkt Görsel Kaydet
                </button>
                <p className="text-[11px] text-slate-500">
                  Stüdyoyu kullanmadan direkt cihazındaki tasarımı bu butonla yükleyebilirsin.
                </p>
              </div>

              <input
                ref={campaignFileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void addCampaignImage(file)
                    event.target.value = ''
                  }
                }}
              />
            </div>
          </section>

          <section className="rounded-[24px] p-5 bg-[linear-gradient(160deg,#ffffff_0%,#f8fbff_100%)] border border-white shadow-[0_18px_26px_-20px_rgba(15,23,42,0.6)]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 className="text-sm font-semibold tracking-widest uppercase text-slate-600">Yayın ve Arşiv</h3>
              <div className="inline-flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  Yayında: {activeCampaignCount}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-slate-600 shadow-sm">
                  Toplam: {campaignImages.length}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                type="button"
                onClick={publishSelectedCampaigns}
                disabled={selectedCampaignCount === 0 || publishingCampaigns}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {publishingCampaigns ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Seçilenleri Yayınla ({selectedCampaignCount})
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedCampaignIds((current) =>
                    current.length === campaignImages.length ? [] : campaignImages.map((item) => item.id)
                  )
                }
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 shadow-sm"
              >
                {selectedCampaignCount === campaignImages.length ? 'Seçimi Temizle' : 'Tümünü Seç'}
              </button>
              <span className="text-[11px] font-semibold text-slate-500">
                Bu ekranda yayın sadece seçili işletme için yapılır.
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Kartları sürükleyerek sıralayabilirsin.
              </span>
            </div>

            {campaignImages.length === 0 ? (
              <div className="rounded-2xl p-6 text-center text-sm text-slate-500 bg-[#f2f6fd] border border-slate-200">
                Henüz kayıtlı A4 kampanya yok.
              </div>
            ) : (
              <div
                className="grid gap-3 max-h-[980px] overflow-auto pr-1"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(Math.max(campaignImages.length, 1), 5)}, minmax(0, 1fr))`,
                }}
              >
                {campaignImages.map((campaign) => (
                  <article
                    key={campaign.id}
                    draggable
                    onDragStart={() => setDraggingCampaignId(campaign.id)}
                    onDragEnd={() => setDraggingCampaignId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggingCampaignId) {
                        reorderCampaignCards(draggingCampaignId, campaign.id)
                      }
                      setDraggingCampaignId(null)
                    }}
                    className={`rounded-2xl p-2.5 bg-white border shadow-sm transition-all ${
                      selectedCampaignIds.includes(campaign.id)
                        ? 'border-blue-400 ring-2 ring-blue-200'
                        : 'border-slate-200'
                    } ${draggingCampaignId === campaign.id ? 'opacity-60' : ''} cursor-grab active:cursor-grabbing`}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100">
                        <GripVertical className="w-3 h-3" />
                        Sürükle
                      </span>
                    </div>
                    <div className="rounded-xl overflow-hidden bg-slate-100 aspect-[210/297]">
                      <img
                        src={campaign.image_url || ''}
                        alt="Kampanya görseli"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="mt-2.5 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-700 line-clamp-1">
                          {campaign.text || 'A4 Kampanya'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {campaign.created_at
                            ? new Date(campaign.created_at).toLocaleDateString('tr-TR')
                            : '-'}
                        </p>
                      </div>
                      {campaign.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                          <Check className="w-3.5 h-3.5" />
                          Yayında
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                          Taslak
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 grid grid-cols-[1fr_auto_auto] gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleCampaignSelection(campaign.id)}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center justify-center gap-1 ${
                          selectedCampaignIds.includes(campaign.id)
                            ? 'bg-blue-600 text-white shadow-[0_10px_14px_-12px_rgba(37,99,235,0.85)]'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {selectedCampaignIds.includes(campaign.id) ? <Check className="w-3 h-3" /> : null}
                        {selectedCampaignIds.includes(campaign.id) ? 'Seçildi' : 'Seç'}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCampaignPublish(campaign)}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold ${
                          campaign.is_active
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {campaign.is_active ? 'Kaldır' : 'Yayınla'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCampaignImage(campaign.id)}
                        className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )
    }

    if (activeModule === 'menu') {
      const normalizedMenuSearch = menuSearch.trim().toLowerCase()
      const activeMenuCategory =
        menuCategories.find((category) => category.id === menuActiveCategoryId) ||
        menuCategories[0] ||
        null
      const visibleMenuCategories = normalizedMenuSearch
        ? menuCategories.filter((category) => {
            const inCategory = category.name.toLowerCase().includes(normalizedMenuSearch)
            const inItems = category.business_menu_items?.some((item) => {
              const haystack = `${item.name || ''} ${item.description || ''}`.toLowerCase()
              return haystack.includes(normalizedMenuSearch)
            })
            return inCategory || inItems
          })
        : menuCategories
      const activeCategoryItems = activeMenuCategory?.business_menu_items || []
      const visibleCategoryItems = normalizedMenuSearch
        ? activeCategoryItems.filter((item) => {
            const haystack = `${item.name || ''} ${item.description || ''}`.toLowerCase()
            return haystack.includes(normalizedMenuSearch)
          })
        : activeCategoryItems
      const totalMenuItems = menuCategories.reduce(
        (total, category) => total + (category.business_menu_items?.length || 0),
        0
      )
      const visibleMenuItems = visibleMenuCategories.reduce(
        (total, category) => total + (category.business_menu_items?.length || 0),
        0
      )

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_12px_20px_-18px_rgba(15,23,42,0.7)]">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">Kategori</p>
              <p className="mt-1 text-xl font-bold text-slate-800">{menuCategories.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_12px_20px_-18px_rgba(15,23,42,0.7)]">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">Toplam Ürün</p>
              <p className="mt-1 text-xl font-bold text-slate-800">{totalMenuItems}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_12px_20px_-18px_rgba(15,23,42,0.7)]">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">Filtre Sonucu</p>
              <p className="mt-1 text-xl font-bold text-slate-800">{visibleMenuItems}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_12px_20px_-18px_rgba(15,23,42,0.7)]">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">Aktif Kategori</p>
              <p className="mt-1 text-sm font-bold text-slate-800 truncate">{activeMenuCategory?.name || '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1fr] gap-4">
            <section className="space-y-4">
              <div className="rounded-2xl p-4 bg-[linear-gradient(145deg,#ffffff_0%,#f7faff_100%)] border border-slate-100 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.68)]">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Menü Notu</div>
                <textarea
                  value={menuDescription}
                  onChange={(event) => setMenuDescription(event.target.value)}
                  maxLength={200}
                  className="w-full min-h-24 rounded-xl p-3 bg-white text-sm font-semibold text-slate-700 shadow-sm"
                  placeholder="Menü hakkında kısa açıklama"
                />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-slate-400">{menuDescription.length}/200</p>
                  <button
                    type="button"
                    onClick={saveMenuDescription}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900"
                  >
                    Notu Kaydet
                  </button>
                </div>
              </div>

              <div className="rounded-2xl p-4 bg-white border border-slate-100 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.68)] space-y-3">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Kategori Yönetimi</div>
                <div className="flex gap-2">
                  <input
                    value={menuCategoryName}
                    onChange={(event) => setMenuCategoryName(event.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 text-sm font-semibold text-slate-700 border border-slate-200"
                    placeholder="Yeni kategori adı"
                  />
                  <button
                    type="button"
                    onClick={addMenuCategory}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ekle
                  </button>
                </div>

                {menuCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {menuCategories.map((category) => {
                      const isActive = activeMenuCategory?.id === category.id
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => {
                            setMenuActiveCategoryId(category.id)
                            setItemCategoryId(category.id)
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                            isActive
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {category.name} ({category.business_menu_items?.length || 0})
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-slate-500">Henüz kategori yok.</p>
                )}
              </div>

              <div className="rounded-2xl p-4 bg-white border border-slate-100 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.68)] space-y-3">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Ürün Ekle</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <select
                    value={itemCategoryId}
                    onChange={(event) => setItemCategoryId(event.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-slate-50 text-sm font-semibold text-slate-700 border border-slate-200"
                  >
                    <option value="">Kategori seç</option>
                    {menuCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={itemName}
                    onChange={(event) => setItemName(event.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-slate-50 text-sm font-semibold text-slate-700 border border-slate-200"
                    placeholder="Ürün adı"
                  />
                  <input
                    value={itemPrice}
                    onChange={(event) => setItemPrice(event.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-slate-50 text-sm font-semibold text-slate-700 border border-slate-200"
                    placeholder="Fiyat (örn: 185.00)"
                  />
                  <input
                    value={itemDescription}
                    onChange={(event) => setItemDescription(event.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-slate-50 text-sm font-semibold text-slate-700 border border-slate-200"
                    placeholder="Kısa açıklama"
                  />
                  <label className="md:col-span-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-500 cursor-pointer inline-flex items-center justify-between">
                    <span>{itemImageFile ? itemImageFile.name : 'Ürün görseli ekle (opsiyonel)'}</span>
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setItemImageFile(event.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={addMenuItem}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Ürünü Kaydet
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-2xl p-4 bg-white border border-slate-100 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.68)]">
                <label className="relative block">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={menuSearch}
                    onChange={(event) => setMenuSearch(event.target.value)}
                    className="w-full pl-11 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700"
                    placeholder="Kategori veya ürün ara"
                  />
                </label>
              </div>

              <div className="rounded-2xl p-4 bg-white border border-slate-100 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.68)] space-y-3">
                {visibleMenuCategories.length === 0 ? (
                  <div className="text-sm font-semibold text-slate-500">Arama kriterine uyan kategori/ürün yok.</div>
                ) : !activeMenuCategory ? (
                  <div className="text-sm font-semibold text-slate-500">Kategori seçerek ürünleri görüntüleyin.</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-800">{activeMenuCategory.name}</h3>
                        <p className="text-xs font-semibold text-slate-500">
                          {visibleCategoryItems.length} ürün gösteriliyor
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteMenuCategory(activeMenuCategory.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-100 text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Kategoriyi Sil
                      </button>
                    </div>

                    {visibleCategoryItems.length === 0 ? (
                      <div className="rounded-xl p-4 bg-slate-50 text-xs font-semibold text-slate-500">
                        Bu kategoride ürün yok.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
                        {visibleCategoryItems.map((item) => (
                          <div key={item.id} className="rounded-xl p-3 border border-slate-200 bg-slate-50/70">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                                <p className="text-xs font-semibold text-slate-500 mt-0.5">{toPriceText(item.price)}</p>
                                {item.description ? (
                                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteMenuItem(item.id)}
                                className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      )
    }

    if (activeModule === 'fuel') {
      const fuelCards: { key: FuelKey; label: string; tone: string }[] = [
        { key: 'benzin', label: 'Benzin (95)', tone: 'from-amber-100/80 to-orange-100/90' },
        { key: 'motorin', label: 'Motorin', tone: 'from-sky-100/80 to-blue-100/90' },
        { key: 'lpg', label: 'LPG / Otogaz', tone: 'from-emerald-100/80 to-teal-100/90' },
      ]
      const hasAnyFuelValue = fuelCards.some((card) => Number(fuelPrices[card.key].replace(',', '.')) > 0)

      return (
        <div className="space-y-4">
          <section className="rounded-[24px] border border-slate-100 bg-[linear-gradient(145deg,#ffffff_0%,#f7faff_100%)] p-5 shadow-[0_20px_30px_-24px_rgba(15,23,42,0.62)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.22),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
                <Fuel className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold">Yakıt Fiyat Yönetimi</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    hasAnyFuelValue ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {hasAnyFuelValue ? 'Güncelleme Hazır' : 'Fiyat Bekleniyor'}
                </span>
                <button
                  type="button"
                  onClick={handleSaveFuelPrices}
                  disabled={!selectedBusiness || savingFuel}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingFuel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fuel className="w-4 h-4" />}
                  {savingFuel ? 'Kaydediliyor...' : 'Fiyatları Kaydet'}
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {fuelCards.map((card) => (
                <article
                  key={card.key}
                  className={`rounded-2xl border border-white bg-gradient-to-br ${card.tone} p-4 shadow-[0_16px_26px_-22px_rgba(15,23,42,0.72)]`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold tracking-widest uppercase text-slate-600">{card.label}</h3>
                    <span className="text-xs font-semibold text-slate-600">{formatFuelPreview(fuelPrices[card.key])}</span>
                  </div>
                  <input
                    inputMode="decimal"
                    className="mt-3 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-lg font-bold text-slate-800 placeholder:text-slate-400 shadow-[0_12px_18px_-16px_rgba(15,23,42,0.82)] focus:border-emerald-400 focus:outline-none"
                    value={fuelPrices[card.key]}
                    onChange={(event) =>
                      setFuelPrices((current) => ({ ...current, [card.key]: event.target.value }))
                    }
                    placeholder="0.00"
                    disabled={!selectedBusiness}
                  />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => adjustFuelPrice(card.key, -0.1)}
                      className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 shadow-sm"
                    >
                      -0.10
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustFuelPrice(card.key, 0.1)}
                      className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 shadow-sm"
                    >
                      +0.10
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustFuelPrice(card.key, 0.5)}
                      className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 shadow-sm"
                    >
                      +0.50
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {fuelNotice ? (
            <div
              className={`rounded-xl px-3 py-2 text-xs font-semibold border ${
                fuelNotice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {fuelNotice.message}
            </div>
          ) : null}
        </div>
      )
    }

    if (activeModule === 'stores') {
      const normalizedStoreSearch = storeSearch.trim().toLowerCase()
      const visibleStores = normalizedStoreSearch
        ? stores.filter((store) =>
            `${store.name || ''} ${store.floor_info || ''}`.toLowerCase().includes(normalizedStoreSearch)
          )
        : stores

      return (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
          <section className="rounded-[24px] border border-slate-100 bg-[linear-gradient(145deg,#ffffff_0%,#f6faff_100%)] p-5 shadow-[0_20px_30px_-24px_rgba(15,23,42,0.62)] space-y-3">
            <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.22),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
              <Store className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold">Yeni Mağaza</span>
            </div>
            <input
              value={storeName}
              onChange={(event) => setStoreName(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
              placeholder="Mağaza adı"
            />
            <input
              value={storeFloor}
              onChange={(event) => setStoreFloor(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
              placeholder="Kat / No"
            />
            <label className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 cursor-pointer inline-flex items-center justify-between">
              <span className="truncate pr-2">{storeLogoFile ? storeLogoFile.name : 'Logo yükle (opsiyonel)'}</span>
              <Upload className="w-4 h-4 shrink-0" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setStoreLogoFile(event.target.files?.[0] || null)}
              />
            </label>
            <button
              type="button"
              onClick={addStore}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Mağazayı Ekle
            </button>
          </section>

          <section className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_20px_30px_-24px_rgba(15,23,42,0.62)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.22),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
                <Store className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold">Mağaza Listesi</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {visibleStores.length}/{stores.length}
              </span>
            </div>

            <label className="relative block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={storeSearch}
                onChange={(event) => setStoreSearch(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-3 text-sm font-semibold text-slate-700"
                placeholder="Mağaza ara"
              />
            </label>

            {visibleStores.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                {stores.length === 0 ? 'Henüz mağaza kaydı yok.' : 'Aramaya uygun mağaza bulunamadı.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {visibleStores.map((store) => (
                  <article
                    key={store.id}
                    className="rounded-2xl border border-slate-100 bg-[linear-gradient(145deg,#ffffff_0%,#f8fbff_100%)] p-3.5 shadow-[0_16px_26px_-24px_rgba(15,23,42,0.72)]"
                  >
                    <div className="aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
                      {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <Store className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">{store.name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{store.floor_info || 'Konum girilmedi'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteStore(store.id)}
                        className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )
    }

    if (activeModule === 'services') {
      const normalizedServiceSearch = serviceSearch.trim().toLowerCase()
      const visibleServices = normalizedServiceSearch
        ? services.filter((service) =>
            `${service.name || ''} ${toPriceText(service.price)}`.toLowerCase().includes(normalizedServiceSearch)
          )
        : services

      return (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
          <section className="rounded-[24px] border border-slate-100 bg-[linear-gradient(145deg,#ffffff_0%,#f6faff_100%)] p-5 shadow-[0_20px_30px_-24px_rgba(15,23,42,0.62)] space-y-3">
            <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.22),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
              <Wrench className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-semibold">Yeni Hizmet</span>
            </div>
            <input
              value={serviceName}
              onChange={(event) => setServiceName(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
              placeholder="Hizmet adı"
            />
            <input
              value={servicePrice}
              onChange={(event) => setServicePrice(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
              placeholder="Fiyat"
            />
            <button
              type="button"
              onClick={addService}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              <Plus className="w-4 h-4" />
              Hizmet Ekle
            </button>
          </section>

          <section className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_20px_30px_-24px_rgba(15,23,42,0.62)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.22),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
                <Wrench className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-semibold">Hizmet Listesi</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {visibleServices.length}/{services.length}
              </span>
            </div>

            <label className="relative block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={serviceSearch}
                onChange={(event) => setServiceSearch(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-3 text-sm font-semibold text-slate-700"
                placeholder="Hizmet ara"
              />
            </label>

            {visibleServices.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                {services.length === 0 ? 'Henüz hizmet kaydı yok.' : 'Aramaya uygun hizmet bulunamadı.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleServices.map((service) => (
                  <article
                    key={service.id}
                    className="rounded-2xl border border-slate-100 bg-[linear-gradient(145deg,#ffffff_0%,#f8fbff_100%)] p-3.5 shadow-[0_16px_26px_-24px_rgba(15,23,42,0.72)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">{service.name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{toPriceText(service.price)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteService(service.id)}
                        className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )
    }

    const normalizedChargingSearch = chargingSearch.trim().toLowerCase()
    const visibleChargingStations = normalizedChargingSearch
      ? chargingStations.filter((station) =>
          `${station.type || ''} ${station.socket_count ?? 1}`.toLowerCase().includes(normalizedChargingSearch)
        )
      : chargingStations
    const chargingFormIsValid =
      chargingType.trim().length > 0 &&
      Number.parseInt(chargingSocketCount, 10) > 0

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        <section className="rounded-[24px] border border-slate-100 bg-[linear-gradient(145deg,#ffffff_0%,#f6faff_100%)] p-5 shadow-[0_20px_30px_-24px_rgba(15,23,42,0.62)] space-y-3">
          <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.22),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
            <Zap className="w-4 h-4 text-cyan-600" />
            <span className="text-sm font-semibold">Yeni Soket Ekle</span>
          </div>
          <input
            value={chargingType}
            onChange={(event) => setChargingType(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
            placeholder="Soket başlığı"
          />
          <input
            value={chargingSocketCount}
            onChange={(event) => setChargingSocketCount(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
            placeholder="Soket sayısı"
            inputMode="numeric"
          />
          <button
            type="button"
            onClick={addCharging}
            disabled={!chargingFormIsValid}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-55 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            Kaydet
          </button>
        </section>

        <section className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_20px_30px_-24px_rgba(15,23,42,0.62)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-[#edf3fb] text-slate-700 shadow-[inset_4px_4px_10px_rgba(148,163,184,0.22),inset_-4px_-4px_10px_rgba(255,255,255,0.95)]">
              <Zap className="w-4 h-4 text-cyan-600" />
              <span className="text-sm font-semibold">İstasyon Özeti</span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              {visibleChargingStations.length}/{chargingStations.length}
            </span>
          </div>

          <label className="relative block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={chargingSearch}
              onChange={(event) => setChargingSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-3 text-sm font-semibold text-slate-700"
              placeholder="Şarj tipi ara"
            />
          </label>

          {visibleChargingStations.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
              {chargingStations.length === 0 ? 'Henüz şarj noktası kaydı yok.' : 'Aramaya uygun şarj noktası bulunamadı.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleChargingStations.map((station) => (
                <article
                  key={station.id}
                  className="rounded-2xl border border-slate-100 bg-[linear-gradient(145deg,#ffffff_0%,#f8fbff_100%)] p-3.5 shadow-[0_16px_26px_-24px_rgba(15,23,42,0.72)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{station.type}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Soket: {station.socket_count ?? 1}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteCharging(station.id)}
                      className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] p-5 md:p-6 bg-[linear-gradient(145deg,#ffffff_0%,#f5f8ff_100%)] shadow-[0_20px_30px_-24px_rgba(15,23,42,0.62)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-500">İçerik Stüdyosu</p>
            <ModuleTitle title="Menü ve İçerik Yönetimi" />
          </div>

          {selectedBusiness ? (
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#edf3fb] text-slate-700 shadow-[inset_3px_3px_8px_rgba(148,163,184,0.22),inset_-3px_-3px_8px_rgba(255,255,255,0.92)]">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold">{selectedBusiness.name}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-[28px] p-5 md:p-6 bg-[linear-gradient(145deg,#ffffff_0%,#f3f7ff_100%)] shadow-[0_20px_28px_-22px_rgba(15,23,42,0.55)] space-y-5">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
          İşletme Seç
          <select
            className="mt-2 w-full px-4 py-3 rounded-xl bg-white text-slate-700 font-bold shadow-sm"
            value={selectedBusinessId}
            onChange={(event) => setSelectedBusinessId(event.target.value)}
          >
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </label>

        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : !selectedBusiness ? (
          <div className="text-sm text-slate-500">İşletme seçin.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
              {modules.map((moduleType) => {
                const Icon =
                  moduleType === 'campaign'
                    ? Brush
                    : moduleType === 'fuel'
                      ? Fuel
                      : moduleType === 'menu'
                        ? Palette
                        : moduleType === 'stores'
                          ? Store
                          : moduleType === 'services'
                            ? Wrench
                            : Zap
                const moduleCount =
                  moduleType === 'campaign'
                    ? campaignImages.length
                    : moduleType === 'menu'
                      ? menuCategories.reduce(
                          (total, category) => total + (category.business_menu_items?.length || 0),
                          0
                        )
                      : moduleType === 'stores'
                        ? stores.length
                        : moduleType === 'services'
                          ? services.length
                          : moduleType === 'charging'
                            ? chargingStations.length
                            : 0

                return (
                  <button
                    key={moduleType}
                    type="button"
                    onClick={() => setActiveModule(moduleType)}
                    className={`group w-full rounded-2xl border px-3 py-2.5 text-left transition-all ${
                      activeModule === moduleType
                        ? 'border-blue-300 bg-[linear-gradient(145deg,#f6f9ff_0%,#eaf1ff_100%)] text-slate-800 shadow-[0_16px_24px_-18px_rgba(37,99,235,0.45)]'
                        : 'border-slate-200 bg-white text-slate-700 shadow-[0_12px_20px_-18px_rgba(15,23,42,0.7)] hover:border-blue-200 hover:text-blue-700'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${
                          activeModule === moduleType ? 'bg-blue-100' : 'bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${activeModule === moduleType ? 'text-blue-700' : 'text-slate-600'}`} />
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          activeModule === moduleType ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {moduleCount}
                      </span>
                    </span>
                    <span className="mt-2 block text-xs font-semibold">{MODULE_LABELS[moduleType]}</span>
                  </button>
                )
              })}
            </div>

            <div className="rounded-[24px] p-4 md:p-5 bg-[#edf3fb] shadow-[inset_4px_4px_12px_rgba(148,163,184,0.22),inset_-4px_-4px_12px_rgba(255,255,255,0.95)]">
              <div className="rounded-[22px] p-4 md:p-5 bg-white shadow-[0_18px_28px_-24px_rgba(15,23,42,0.62)]">
                {renderModuleContent()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
