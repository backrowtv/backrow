'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heading, Text } from '@/components/ui/typography'
import { useEffect, useState } from 'react'
import { movieHeadlinesFeeds } from '@/data/film-news'

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

interface FilmNewsFeedProps {
  feed: FeedData
}

export function FilmNewsFeed({ feed }: FilmNewsFeedProps) {
  const [logoErrors, setLogoErrors] = useState<Record<string, boolean>>({})
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  useEffect(() => {
    // Check for dark mode
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    
    checkDarkMode()
    
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    
    return () => observer.disconnect()
  }, [])
  
  if (!feed || feed.items.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <Heading
            level={2}
            className="text-left text-3xl font-bold tracking-tight md:text-4xl"
          >
            What&apos;s happening
            <br />
            in movies right now.
          </Heading>
        </div>
        <div className="text-center py-8">
          <Text size="small" muted>
            No news available at the moment.
          </Text>
        </div>
      </div>
    )
  }
  
  // Show first 5 items
  const displayItems = feed.items.slice(0, 5)
  
  // Get sources that actually appear in the feed
  const activeSources = feed.sources || []
  
  // Helper to get source info by name
  const getSourceByName = (name: string) => {
    if (name === '/Film') return movieHeadlinesFeeds.find(s => s.name === 'SlashFilm')
    return movieHeadlinesFeeds.find(s => s.name === name)
  }
  
  return (
    <div>
      <div className="mb-6">
        <Heading
          level={2}
          className="text-left text-3xl font-bold tracking-tight md:text-4xl"
        >
          What&apos;s happening
          <br />
          in movies right now.
        </Heading>
      </div>
      <div className="space-y-0 mb-0.5">
        {displayItems.map((item, index) => (
          <Link
            key={index}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2.5 py-2 px-1 border-b border-[var(--border)] last:border-0 rounded-none hover:bg-[var(--surface-1)] transition-colors"
            style={{ borderBottomColor: 'var(--border)' }}
            onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = 'rgba(45, 212, 191, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = 'var(--border)'}
          >
            {/* Smaller poster thumbnail */}
            {item.imageUrl ? (
              <div className="flex-shrink-0 w-10 h-10 relative rounded overflow-hidden bg-[var(--surface-1)]">
                <Image
                  src={item.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="40px"
                  unoptimized
                  onError={(e) => {
                    // Hide image on error
                    const target = e.target as HTMLImageElement
                    if (target.parentElement) {
                      target.parentElement.style.display = 'none'
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-10 h-10 rounded bg-[var(--surface-1)]" />
            )}
            
            {/* Title */}
            <Text size="small" className="flex-1 line-clamp-1">
              {item.title}
            </Text>
          </Link>
        ))}
      </div>
      
      {/* More news link - right aligned, text above logos for better mobile layout */}
      {activeSources.length > 0 && (
        <div className="flex flex-col items-end gap-1 pt-0.5">
          <Text size="small" muted className="text-right">
            More news on
          </Text>
          <div className="flex items-center justify-end gap-2">
            {activeSources.map((sourceName, idx) => {
              const source = getSourceByName(sourceName)
              if (!source) return null
              
              return (
                <Link
                  key={source.name}
                  href={source.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center hover:opacity-70 transition-opacity"
                >
                  {source.name === 'Screen Rant' && !logoErrors['Screen Rant'] ? (
                    <Image
                      src="https://static0.srcdn.com/assets/images/sr-logo-full-colored-light.svg"
                      alt="Screen Rant"
                      width={58}
                      height={14}
                      className="h-[14px] w-auto screenrant-logo-light"
                      style={{
                        filter: isDarkMode ? 'none' : undefined,
                      }}
                      unoptimized
                      onError={() => setLogoErrors(prev => ({ ...prev, 'Screen Rant': true }))}
                    />
                  ) : source.name === 'Collider' && !logoErrors['Collider'] ? (
                    <Image
                      src="https://static0.colliderimages.com/assets/images/cl-logo-full-colored-light.svg"
                      alt="Collider"
                      width={48}
                      height={14}
                      className="h-[14px] w-auto collider-logo-light"
                      style={{
                        filter: isDarkMode ? 'none' : undefined,
                      }}
                      unoptimized
                      onError={() => setLogoErrors(prev => ({ ...prev, 'Collider': true }))}
                    />
                  ) : source.name === 'SlashFilm' && !logoErrors['SlashFilm'] ? (
                    <Image
                      src="https://www.slashfilm.com/img/slashfilm-logo.svg"
                      alt="/Film"
                      width={38}
                      height={14}
                      className="h-[14px] w-auto"
                      unoptimized
                      onError={() => setLogoErrors(prev => ({ ...prev, 'SlashFilm': true }))}
                    />
                  ) : null}
                  {logoErrors[source.name] && (
                    <Text size="small" className="font-medium">
                      {source.name === 'SlashFilm' ? '/Film' : source.name}
                    </Text>
                  )}
                  {idx < activeSources.length - 1 && (
                    <span className="mx-1 text-[var(--text-muted)]">•</span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

