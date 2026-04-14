'use client'

import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import NumberFlow from '@/components/ui/number-flow'

interface StatCardProps {
  title: string
  value: number | string
  illustration: ReactNode
  delay?: number
  className?: string
}

export function StatCard({
  title,
  value,
  illustration,
  delay = 0,
  className,
}: StatCardProps) {
  return (
    <ScrollReveal direction="up" delay={delay}>
      <Card
        variant="default"
        hover
        className={cn('relative overflow-hidden group', className)}
      >
        {/* Illustration background */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity">
          {illustration}
        </div>

        <CardContent className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                {title}
              </p>
              <div className="text-2xl sm:text-3xl md:text-4xl font-black" style={{ color: 'var(--text-primary)' }}>
                {typeof value === 'number' ? (
                  <NumberFlow value={value} />
                ) : !isNaN(parseFloat(value)) ? (
                  <NumberFlow
                    value={parseFloat(value)}
                    format={{
                      minimumFractionDigits: value.includes('.') ? value.split('.')[1]?.length || 0 : 0,
                      maximumFractionDigits: value.includes('.') ? value.split('.')[1]?.length || 0 : 0,
                    }}
                  />
                ) : (
                  value
                )}
              </div>
            </div>
            <div className="w-12 h-12 transition-colors" style={{ color: 'var(--text-muted)' }}>
              {illustration}
            </div>
          </div>
        </CardContent>
      </Card>
    </ScrollReveal>
  )
}

