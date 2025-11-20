'use client'

import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'

interface MobileBackButtonProps {
  href: string
  label: string
  className?: string
}

export function MobileBackButton({ href, label, className }: MobileBackButtonProps) {
  return (
    <Link
      href={href}
      className={`md:hidden inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4 ${className || ''}`}
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{label}</span>
    </Link>
  )
}

