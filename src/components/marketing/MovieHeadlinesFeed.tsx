'use client'

import Link from 'next/link'
import { Text } from '@/components/ui/typography'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

interface RSSItem {
  title: string
  link: string
  pubDate: string
}

/**
 * MovieHeadlinesFeed - Displays 5 headlines from ComingSoon.net and SlashFilm
 * Simple headline-only format for quick movie news scanning
 */
export function MovieHeadlinesFeed() {
  const [items, setItems] = useState<RSSItem[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function loadHeadlines() {
      try {
        const response = await fetch('/api/movie-headlines')
        if (response.ok) {
          const data = await response.json()
          setItems(data.items || [])
        }
      } catch (error) {
        console.error('Movie headlines feed error:', error)
      } finally {
        setLoading(false)
      }
    }
    loadHeadlines()
  }, [])
  
  if (loading) {
    return (
      <div className="text-center py-4">
        <Text size="small" muted>
          Loading headlines...
        </Text>
      </div>
    )
  }
  
  if (items.length === 0) {
    return (
      <div className="text-center py-4">
        <Text size="small" muted>
          No headlines available at the moment.
        </Text>
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <Link
          key={`${item.link}-${index}`}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-2 py-2 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors px-2 -mx-2 rounded"
        >
          <div className="flex-1 min-w-0">
            <Text size="small" className="font-medium group-hover:text-[var(--primary)] transition-colors line-clamp-1">
              {item.title}
            </Text>
          </div>
          <ArrowSquareOut className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0 mt-1.5" style={{ color: 'var(--text-muted)' }} />
        </Link>
      ))}
    </div>
  )
}

