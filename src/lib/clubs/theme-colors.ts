/**
 * Club Theme Color Utilities
 *
 * This file contains shared utilities for theme colors that can be used
 * by both server and client components.
 */

// Theme color options - soft, readable colors for headings and accents
export const CLUB_THEME_COLORS = [
  { id: 'none', name: 'Default', color: null, description: 'Use the default site theme' },
  { id: 'sage', name: 'Sage', color: '#609f7d', description: 'Site signature green' },
  { id: 'rose', name: 'Rose', color: '#be6b7b', description: 'Warm dusty rose' },
  { id: 'coral', name: 'Coral', color: '#cd8b76', description: 'Soft terracotta' },
  { id: 'amber', name: 'Amber', color: '#b8924c', description: 'Warm golden' },
  { id: 'teal', name: 'Teal', color: '#4a9e96', description: 'Ocean calm' },
  { id: 'sky', name: 'Sky', color: '#5b9fc9', description: 'Clear and open' },
  { id: 'blue', name: 'Blue', color: '#6b8cbe', description: 'Soft indigo' },
  { id: 'violet', name: 'Violet', color: '#8b7dbe', description: 'Gentle lavender' },
  { id: 'plum', name: 'Plum', color: '#a07ba8', description: 'Rich and soft' },
  { id: 'pink', name: 'Pink', color: '#c48ba0', description: 'Dusty blush' },
  { id: 'slate', name: 'Slate', color: '#6b7a8a', description: 'Sophisticated neutral' },
] as const

export type ClubThemeColorId = typeof CLUB_THEME_COLORS[number]['id']

// Helper to get theme color by ID
export function getClubThemeColor(colorId: string | null | undefined): string | null {
  if (!colorId || colorId === 'none') return null
  const theme = CLUB_THEME_COLORS.find(c => c.id === colorId)
  return theme?.color || null
}

// Generate CSS variables from theme color
export function getClubThemeCSS(colorId: string | null | undefined): Record<string, string> {
  const color = getClubThemeColor(colorId)
  if (!color) return {}

  return {
    '--club-accent': color,
    '--club-accent-muted': `${color}15`,
    '--club-accent-light': `${color}30`,
  }
}

/**
 * Convert theme color to HSL components for background tinting
 * Similar to getAvatarColorForGlow but works with hex colors
 * @param themeColorId - Theme color ID (e.g., 'rose', 'blue')
 * @returns Object with HSL components for use in hsla() backgrounds, or null if no theme color
 */
export function getClubThemeColorForGlow(themeColorId: string | null | undefined): { h: number; s: number; l: number } | null {
  const hexColor = getClubThemeColor(themeColorId)
  if (!hexColor) return null

  // Parse hex color
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor)
  if (!result) return null

  // Convert hex to RGB (0-1 range)
  const r = parseInt(result[1], 16) / 255
  const g = parseInt(result[2], 16) / 255
  const b = parseInt(result[3], 16) / 255

  // Convert RGB to HSL
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}
