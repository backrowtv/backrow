'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Heading, Text } from '@/components/ui/typography'
import { Check, FilmReel, Star, Trophy } from '@phosphor-icons/react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const tiers = [
  {
    name: 'Free',
    tagline: 'Perfect for getting started',
    price: '$0',
    period: 'forever',
    icon: FilmReel,
    color: 'zinc',
    features: [
      '3 clubs',
      'Standard festival modes',
      'Basic ratings & reviews',
      'Community discussions',
      'Activity feed',
    ],
    cta: 'Current Plan',
    ctaVariant: 'outline' as const,
    disabled: true,
  },
  {
    name: 'Spotlight',
    tagline: 'For serious movie clubs',
    price: '$3',
    period: 'month',
    icon: Star,
    color: 'rose',
    popular: true,
    features: [
      'Unlimited clubs',
      'Custom mode access',
      'Advanced statistics',
      'Extended reviews',
      'Custom role powers',
      'Export data',
    ],
    cta: 'Upgrade to Spotlight',
    ctaVariant: 'primary' as const,
    annualPrice: '$30/year',
  },
  {
    name: "Director's Cut",
    tagline: 'For power users and creators',
    price: '$9',
    period: 'month',
    icon: Trophy,
    color: 'teal',
    features: [
      'Everything in Spotlight',
      'API access',
      'Priority support',
      'Early access to features',
      'Custom integrations',
      'White-label options',
      '[Additional feature placeholder]',
    ],
    cta: 'Upgrade to Director\'s Cut',
    ctaVariant: 'primary' as const,
    annualPrice: '$90/year',
  },
]

interface ProFeaturesModalProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ProFeaturesModal({ trigger, open: controlledOpen, onOpenChange }: ProFeaturesModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen

  const defaultTrigger = (
    <button
      className="text-sm font-medium transition-colors"
      style={{ color: 'var(--primary)' }}
    >
      Unlock more
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-5xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Choose Your Plan
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Pick the perfect tier for your movie club experience. Upgrade or downgrade anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Pricing Tiers Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {tiers.map((tier) => {
              const Icon = tier.icon
              return (
                <div
                  key={tier.name}
                  className={cn(
                    "relative flex flex-col rounded-xl border p-6 transition-all",
                    tier.popular
                      ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20 scale-105"
                      : "border-[var(--border)] bg-[var(--surface-1)]"
                  )}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Tier Header */}
                  <div className="text-center mb-6">
                    <div className={cn(
                      "inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3",
                      tier.color === 'rose' && "bg-[var(--primary)]/10 border border-[var(--primary)]/30",
                      tier.color === 'teal' && "bg-teal-400/10 border border-teal-400/30",
                      tier.color === 'zinc' && "bg-[var(--surface-2)] border border-[var(--border)]"
                    )}>
                      <Icon className={cn(
                        "h-6 w-6",
                        tier.color === 'rose' && "text-[var(--primary)]",
                        tier.color === 'teal' && "text-teal-400",
                        tier.color === 'zinc' && "text-[var(--text-secondary)]"
                      )} />
                    </div>
                    <Heading level={3} className="text-xl font-bold mb-1">
                      {tier.name}
                    </Heading>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {tier.tagline}
                    </p>
                  </div>

                  {/* Pricing */}
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold">{tier.price}</span>
                      {tier.period !== 'forever' && (
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          /{tier.period}
                        </span>
                      )}
                    </div>
                    {tier.annualPrice && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {tier.annualPrice}
                      </p>
                    )}
                  </div>

                  {/* Features List */}
                  <ul className="space-y-3 flex-1 mb-6">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className={cn(
                          "h-5 w-5 flex-shrink-0 mt-0.5",
                          tier.color === 'rose' && "text-[var(--primary)]",
                          tier.color === 'teal' && "text-teal-400",
                          tier.color === 'zinc' && "text-[var(--text-secondary)]"
                        )} />
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    variant={tier.ctaVariant}
                    size="lg"
                    className="w-full"
                    disabled={tier.disabled}
                    onClick={() => {
                      if (!tier.disabled) {
                        setOpen(false)
                      }
                    }}
                    asChild={!tier.disabled}
                  >
                    {tier.disabled ? (
                      tier.cta
                    ) : (
                      <Link href="/sign-up">
                        {tier.cta}
                      </Link>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Footer Note */}
          <div className="text-center pt-4 border-t" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
            <Text size="small" muted>
              All plans include a 14-day free trial. Cancel anytime. No hidden fees.
            </Text>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
