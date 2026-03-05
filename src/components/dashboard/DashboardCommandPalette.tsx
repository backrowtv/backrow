'use client'

import { useRouter } from 'next/navigation'
import { CommandPalette } from '@/components/ui/command-palette'
import { useState, useEffect } from 'react'

export function DashboardCommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const commandItems = [
    {
      id: 'dashboard',
      label: 'Go to Dashboard',
      keywords: ['home', 'main'],
      group: 'Navigation',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      onSelect: () => router.push('/'),
    },
    {
      id: 'discover',
      label: 'Discover Clubs',
      keywords: ['search', 'find', 'browse'],
      group: 'Navigation',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      onSelect: () => router.push('/discover'),
    },
    {
      id: 'create-club',
      label: 'Create Club',
      keywords: ['new', 'add'],
      group: 'Actions',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      onSelect: () => router.push('/create-club'),
    },
    {
      id: 'profile',
      label: 'View Profile',
      keywords: ['account', 'settings'],
      group: 'Navigation',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      onSelect: () => router.push('/profile'),
    },
    {
      id: 'faq',
      label: 'FAQ',
      keywords: ['help', 'questions'],
      group: 'Navigation',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      onSelect: () => router.push('/faq'),
    },
  ]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return <CommandPalette items={commandItems} open={open} onOpenChange={setOpen} />
}

