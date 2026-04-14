'use client'

import { useRouter } from 'next/navigation'
import { useKeyboardShortcuts, registerGlobalShortcut } from '@/lib/hooks/useKeyboardShortcuts'
import { useEffect, useState } from 'react'
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help'

export function DashboardShortcuts() {
  const router = useRouter()
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    // Register global shortcuts
    registerGlobalShortcut({
      key: 'd',
      meta: true,
      callback: () => router.push('/'),
      description: 'Navigate to Dashboard',
    })
    
    registerGlobalShortcut({
      key: 'c',
      meta: true,
      shift: true,
      callback: () => router.push('/create-club'),
      description: 'Create new club',
    })
    
    registerGlobalShortcut({
      key: 'f',
      meta: true,
      callback: () => router.push('/discover'),
      description: 'Navigate to Discover',
    })
    
    registerGlobalShortcut({
      key: 'p',
      meta: true,
      callback: () => router.push('/profile'),
      description: 'Navigate to Profile',
    })
    
    registerGlobalShortcut({
      key: '/',
      callback: () => {
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      },
      description: 'Focus search',
    })
    
    registerGlobalShortcut({
      key: '?',
      callback: () => setHelpOpen(true),
      description: 'Show keyboard shortcuts',
    })
  }, [router])

  useKeyboardShortcuts([
    {
      key: '?',
      callback: () => setHelpOpen(!helpOpen),
      description: 'Show keyboard shortcuts',
    },
  ])

  return <KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
}

