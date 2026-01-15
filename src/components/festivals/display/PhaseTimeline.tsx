'use client'

import { Check, Trophy } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { DateDisplay } from '@/components/ui/date-display'

type Phase = 'theme_selection' | 'nomination' | 'watch_rate' | 'results'

interface PhaseTimelineProps {
  phase: Phase
  nominationDeadline?: string
  watchDeadline?: string
  ratingDeadline?: string
  resultsDate?: string
}

// Map actual phases to timeline phases:
// Phase 1 (Nominations): theme_selection or nomination
// Phase 2 (Voting): watch_rate
// Phase 3 (Results): results
function getTimelinePhase(phase: Phase): number {
  if (phase === 'theme_selection' || phase === 'nomination') return 1
  if (phase === 'watch_rate') return 2
  if (phase === 'results') return 3
  return 1
}

export function PhaseTimeline({
  phase,
  nominationDeadline,
  watchDeadline,
  ratingDeadline,
  resultsDate,
}: PhaseTimelineProps) {
  const currentPhase = getTimelinePhase(phase)
  
  const phases = [
    {
      number: 1,
      label: 'Nominations',
      date: nominationDeadline,
      icon: Check,
    },
    {
      number: 2,
      label: 'Voting',
      date: watchDeadline || ratingDeadline,
      icon: Check,
    },
    {
      number: 3,
      label: 'Results',
      date: resultsDate,
      icon: Trophy,
    },
  ]

  return (
    <div className="flex items-center justify-between mb-4">
      {phases.map((p, index) => {
        const isActive = currentPhase >= p.number
        const Icon = p.icon
        
        return (
          <div key={p.number} className="flex items-center flex-1">
            <div className="text-center flex-1">
              <div
                className={cn(
                  'w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {isActive ? (
                  <Icon className="h-6 w-6" />
                ) : (
                  <span className="text-sm font-medium">{p.number}</span>
                )}
              </div>
              <div className="text-sm font-medium">{p.label}</div>
              {p.date && (
                <div className="text-xs text-[var(--text-muted)]">
                  <DateDisplay date={p.date} format="date" />
                </div>
              )}
            </div>
            
            {index < phases.length - 1 && (
              <div className="flex-1 h-0.5 bg-muted -mt-6 mx-2">
                <div
                  className={cn(
                    'h-full bg-primary transition-all',
                    currentPhase > p.number ? 'w-full' : 'w-0'
                  )}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

