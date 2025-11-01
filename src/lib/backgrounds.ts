// Background image types and utilities
// Separate from server actions to allow non-async exports

export type EntityType = 'site_page' | 'club' | 'festival' | 'profile'
export type HeightPreset = 'compact' | 'default' | 'tall' | 'custom'

export interface BackgroundImage {
  id: string
  entity_type: EntityType
  entity_id: string
  image_url: string
  height_preset: HeightPreset
  height_px: number | null
  opacity: number
  object_position: string
  scale: number // 1 = 100%, 1.5 = 150%, etc.
  vignette_opacity: number // 0-1, opacity of dark vignette at bottom (0 = none, 0.4 = default)
  extend_past_content: boolean // When true, image extends beyond max-w-7xl on wide screens
  // Mobile-specific overrides (null = use desktop value)
  mobile_height_preset: HeightPreset | null
  mobile_height_px: number | null
  mobile_scale: number | null
  mobile_object_position: string | null
  mobile_opacity: number | null // Mobile-specific opacity (null = use desktop value)
  credit_title: string | null
  credit_year: number | null
  credit_studio: string | null
  credit_actor: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BackgroundInput {
  entity_type: EntityType
  entity_id: string
  image_url: string
  height_preset: HeightPreset
  height_px?: number | null
  opacity: number
  object_position: string
  scale?: number
  vignette_opacity?: number // 0-1, defaults to 0.4
  extend_past_content?: boolean // When true, image extends beyond max-w-7xl on wide screens
  // Mobile-specific overrides (null/undefined = use desktop value)
  mobile_height_preset?: HeightPreset | null
  mobile_height_px?: number | null
  mobile_scale?: number | null
  mobile_object_position?: string | null
  mobile_opacity?: number | null // Mobile-specific opacity (null = use desktop value)
  credit_title?: string | null
  credit_year?: number | null
  credit_studio?: string | null
  credit_actor?: string | null
  is_active?: boolean
}

// Height preset values - now in viewport height percentage (vh)
// This ensures backgrounds scale proportionally with screen size
export const HEIGHT_PRESETS_VH: Record<HeightPreset, number> = {
  compact: 18,   // 18vh
  default: 30,   // 30vh - shows good amount of image on all screens
  tall: 45,      // 45vh
  custom: 0,     // Use height_px value (still in pixels for custom)
}

// Legacy pixel presets for backwards compatibility and custom heights
export const HEIGHT_PRESETS: Record<HeightPreset, number> = {
  compact: 140,
  default: 250,
  tall: 400,
  custom: 0,
}

// Get the computed height for a background in pixels (legacy, for custom heights)
export function getBackgroundHeight(background: BackgroundImage): number {
  if (background.height_preset === 'custom' && background.height_px) {
    return background.height_px
  }
  return HEIGHT_PRESETS[background.height_preset] || HEIGHT_PRESETS.default
}

// Get viewport height percentage for a background
export function getBackgroundHeightVh(background: BackgroundImage | null, fallbackHeight: HeightPreset = 'default'): number {
  if (background?.height_preset === 'custom' && background.height_px) {
    // Convert custom pixel height to approximate vh (assuming 800px viewport as baseline)
    return Math.round((background.height_px / 800) * 100)
  }
  
  const preset = background?.height_preset || fallbackHeight
  return HEIGHT_PRESETS_VH[preset] || HEIGHT_PRESETS_VH.default
}

// Get responsive height CSS value
// Returns a CSS value string (e.g., "30vh" or "250px" for custom)
export function getBackgroundHeightCss(background: BackgroundImage | null, fallbackHeight: HeightPreset = 'default'): string {
  if (background?.height_preset === 'custom' && background.height_px) {
    return `${background.height_px}px`
  }
  
  const vh = getBackgroundHeightVh(background, fallbackHeight)
  return `${vh}vh`
}

// Legacy function for backwards compatibility
export function getResponsiveHeights(background: BackgroundImage | null, fallbackHeight: HeightPreset = 'default'): {
  mobile: number
  desktop: number
} {
  const baseHeight = background 
    ? getBackgroundHeight(background)
    : HEIGHT_PRESETS[fallbackHeight]
  
  return {
    mobile: baseHeight,
    desktop: baseHeight, // Now same - vh handles responsiveness
  }
}

// Get mobile-specific height in vh
export function getMobileBackgroundHeightVh(background: BackgroundImage | null, fallbackHeight: HeightPreset = 'default'): number {
  if (!background) {
    return HEIGHT_PRESETS_VH[fallbackHeight] || HEIGHT_PRESETS_VH.default
  }
  
  // Use mobile-specific if set, otherwise fall back to desktop
  const mobilePreset = background.mobile_height_preset ?? background.height_preset
  const mobileHeightPx = background.mobile_height_px ?? background.height_px
  
  if (mobilePreset === 'custom' && mobileHeightPx) {
    return Math.round((mobileHeightPx / 800) * 100)
  }
  
  return HEIGHT_PRESETS_VH[mobilePreset] || HEIGHT_PRESETS_VH.default
}

// Get mobile-specific scale
export function getMobileScale(background: BackgroundImage | null): number {
  if (!background) return 1
  return background.mobile_scale ?? background.scale ?? 1
}

// Get mobile-specific object position
export function getMobileObjectPosition(background: BackgroundImage | null): string {
  if (!background) return 'center center'
  return background.mobile_object_position ?? background.object_position ?? 'center center'
}

// Get mobile-specific opacity
export function getMobileOpacity(background: BackgroundImage | null, fallbackOpacity: number = 1.0): number {
  if (!background) return fallbackOpacity
  return background.mobile_opacity ?? background.opacity ?? fallbackOpacity
}

