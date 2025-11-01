'use client'

import { Modal } from './modal'
import { useKeyboardShortcuts, getGlobalShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { useEffect, useState, startTransition } from 'react'

interface KeyboardShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  const [shortcuts, setShortcuts] = useState(getGlobalShortcuts())

  useEffect(() => {
    startTransition(() => {
      setShortcuts(getGlobalShortcuts())
    })
  }, [open])

  useKeyboardShortcuts([
    {
      key: '?',
      callback: () => onOpenChange(!open),
      description: 'Show keyboard shortcuts',
    },
  ])

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const group = shortcut.description?.includes('Navigate') ? 'Navigation' :
                  shortcut.description?.includes('Create') ? 'Actions' :
                  shortcut.description?.includes('Search') ? 'Search' :
                  'Other'
    
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(shortcut)
    return acc
  }, {} as Record<string, typeof shortcuts>)

  function formatKey(shortcut: typeof shortcuts[0]) {
    const parts: string[] = []
    if (shortcut.ctrl || shortcut.meta) parts.push(shortcut.meta ? '⌘' : 'Ctrl')
    if (shortcut.shift) parts.push('Shift')
    if (shortcut.alt) parts.push('Alt')
    parts.push(shortcut.key.toUpperCase())
    return parts.join(' + ')
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Keyboard Shortcuts"
      description="Speed up your workflow with these keyboard shortcuts"
    >
      <div className="space-y-6">
        {Object.entries(groupedShortcuts).map(([group, groupShortcuts]) => (
          <div key={group}>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              {group}
            </h3>
            <div className="space-y-2">
              {groupShortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="text-sm text-zinc-300">{shortcut.description || 'Shortcut'}</span>
                  <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 font-mono text-xs font-medium text-zinc-400">
                    {formatKey(shortcut)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

