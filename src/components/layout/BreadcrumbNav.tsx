'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { CaretRight } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useMemo, useRef } from 'react'
import { BrandText } from '@/components/ui/brand-text'

interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[]
  className?: string
}

export function BreadcrumbNav({ items, className }: BreadcrumbNavProps) {
  const pathname = usePathname()
  const prevItemsRef = useRef<BreadcrumbItem[]>([])
  
  // Track which breadcrumb items should animate (only changed items)
  // Moved before early return to satisfy rules-of-hooks
  const animatedItems = useMemo(() => {
    if (items.length <= 1) return []
    
    const prev = prevItemsRef.current
    const current = items
    
    // Find common prefix (items that haven't changed)
    let commonPrefixLength = 0
    for (let i = 0; i < Math.min(prev.length, current.length); i++) {
      if (prev[i]?.href === current[i]?.href) {
        commonPrefixLength = i + 1
      } else {
        break
      }
    }
    
    // Update ref for next comparison
    prevItemsRef.current = current
    
    // Return array indicating which items should animate
    return current.map((_, index) => index >= commonPrefixLength)
  }, [items])
  
  if (items.length <= 1) {
    return null // Don't show breadcrumbs if there's only one item
  }
  
  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn(
        "flex items-center px-3 py-2.5 border-b border-[var(--border)]",
        "bg-[var(--sidebar)]",
        className
      )}
    >
      <ol className="flex items-center gap-1.5 text-xs">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const shouldAnimate = animatedItems[index]
          
          return (
            <li
              key={`${index}-${item.href}-${item.label}`}
              className="flex items-center gap-1.5 min-w-0"
              style={shouldAnimate ? {
                animation: 'fadeInSlideRight 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'opacity, transform'
              } : undefined}
            >
              {index > 0 && (
                <CaretRight className="h-3 w-3 text-[var(--text-muted)] flex-shrink-0" weight="bold" />
              )}
              {isLast ? (
                <span 
                  className={cn(
                    "font-medium truncate max-w-[180px]",
                    isActive ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "transition-colors hover:text-[var(--primary)] truncate max-w-[120px]",
                    "text-[var(--text-muted)]"
                  )}
                >
                  <BrandText>{item.label}</BrandText>
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

