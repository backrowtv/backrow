'use client'

import Link from 'next/link'

interface RSSItem {
  title: string
  link: string
  description: string
  pubDate: string
  imageUrl?: string
}

interface FeedData {
  items: RSSItem[]
  sources?: string[]
}

interface SimpleAwardsNewsProps {
  feed: FeedData
}

export function SimpleAwardsNews({ feed }: SimpleAwardsNewsProps) {
  if (!feed || feed.items.length === 0) {
    return null
  }
  
  // Show first 5 items
  const displayItems = feed.items.slice(0, 5)
  
  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-4">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Awards Season
        </span>
      </div>

      {/* News list - simple text only */}
      <div className="space-y-0">
        {displayItems.map((item, index) => (
          <Link
            key={index}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block py-2.5 border-b border-[var(--border)] last:border-0 group hover:bg-[var(--surface-1)] -mx-2 px-2 rounded transition-colors"
          >
            <p className="text-sm text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors line-clamp-2">
              {item.title}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {item.pubDate}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

