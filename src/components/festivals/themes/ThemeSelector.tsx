'use client'

import { Database } from '@/types/database'

type Theme = Database['public']['Tables']['theme_pool']['Row']

interface ThemeSelectorProps {
  themes: Theme[]
  selectedThemeId?: string
  onSelect: (themeId: string) => void
  disabled?: boolean
}

export function ThemeSelector({
  themes,
  selectedThemeId,
  onSelect,
  disabled = false,
}: ThemeSelectorProps) {
  const availableThemes = themes.filter((t) => !t.is_used)

  if (availableThemes.length === 0) {
    return (
      <div 
        className="rounded-md p-3 text-sm"
        style={{
          background: 'var(--warning)',
          opacity: 0.1,
          border: '1px solid rgba(237, 137, 54, 0.2)',
          color: 'var(--warning)'
        }}
      >
        No themes available. Add themes to the theme pool first.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {availableThemes.map((theme) => (
        <button
          key={theme.id}
          type="button"
          onClick={() => onSelect(theme.id)}
          disabled={disabled}
          className="w-full text-left rounded-lg p-4 border transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          style={{
            borderColor: selectedThemeId === theme.id ? 'var(--primary)' : 'var(--border)',
            background: selectedThemeId === theme.id ? 'var(--surface-2)' : 'var(--surface-1)'
          }}
          onMouseEnter={(e) => {
            if (!disabled && selectedThemeId !== theme.id) {
              e.currentTarget.style.borderColor = 'var(--border-hover)'
            }
          }}
          onMouseLeave={(e) => {
            if (selectedThemeId !== theme.id) {
              e.currentTarget.style.borderColor = 'var(--border)'
            }
          }}
        >
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {theme.theme_name}
          </div>
        </button>
      ))}
    </div>
  )
}

