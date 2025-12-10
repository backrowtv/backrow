import Link from 'next/link'
import { cn } from '@/lib/utils'
import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface NavigationCardProps {
  href: string
  title: string
  description?: string
  icon?: React.ReactNode
  badge?: string | number | null
  isActive?: boolean
  className?: string
}

export function NavigationCard({
  href,
  title,
  description,
  icon,
  badge,
  isActive = false,
  className = '',
}: NavigationCardProps) {
  return (
    <Link href={href} className={cn('group relative block', className)}>
      <Card
        variant="default"
        hover
        className={cn(
          'transition-all duration-300 group',
          isActive && 'ring-2 ring-[var(--club-accent,var(--primary))]'
        )}
        style={{
          ...(isActive && {
            background: 'var(--surface-2)',
            borderColor: 'var(--club-accent, var(--primary))',
          })
        }}
      >
        <CardContent>
          <div className="flex items-start gap-4">
        {icon && (
          <div
            className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300 border"
            style={{
              backgroundColor: isActive ? 'var(--surface-2)' : 'var(--surface-1)',
              borderColor: isActive ? 'var(--club-accent, var(--primary))' : 'var(--border)',
            }}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3
              className="text-base font-semibold transition-colors"
              style={{
                color: isActive ? 'var(--club-accent, var(--primary))' : 'var(--text-primary)'
              }}
            >
              {title}
            </h3>
            {badge !== null && badge !== undefined && (
              <Badge variant="primary" size="sm">
                {badge}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
          )}
        </div>
      </div>
        </CardContent>
      </Card>
    </Link>
  )
}

