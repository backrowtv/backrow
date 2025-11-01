'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface GlassButtonProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  className?: string
  /** 'overlay' for variable images (strong shadows), 'surface' for consistent backgrounds (lighter) */
  variant?: 'overlay' | 'surface'
  /** Button size */
  size?: 'sm' | 'default' | 'lg'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const sizeStyles = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  default: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-sm gap-2',
}

const variantStyles = {
  // For buttons over variable/photographic backgrounds - strong text shadows
  overlay: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2), inset 0 0 20px rgba(96,140,100,0.15)',
    textShadow: '0 2px 4px rgba(0,0,0,1), 0 1px 2px rgba(0,0,0,1)',
    iconShadow: 'drop-shadow-[0_2px_3px_rgba(0,0,0,1)]',
  },
  // For buttons over consistent dark backgrounds - lighter shadows
  surface: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.2), 0 1px 4px rgba(0,0,0,0.15), inset 0 0 16px rgba(96,140,100,0.1)',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    iconShadow: 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]',
  },
}

export function GlassButton({
  children,
  href,
  onClick,
  className,
  variant = 'surface',
  size = 'default',
  disabled = false,
  type = 'button',
}: GlassButtonProps) {
  const styles = variantStyles[variant]
  
  const baseClassName = cn(
    'relative inline-flex items-center justify-center font-semibold text-[var(--glass-text)]',
    'transition-transform duration-200 ease-out hover:scale-[1.03] active:scale-[0.97]',
    'backdrop-blur-xl rounded-lg overflow-hidden border border-[var(--glass-border)]',
    sizeStyles[size],
    disabled && 'opacity-50 cursor-not-allowed hover:scale-100 active:scale-100',
    className
  )
  
  const content = (
    <>
      {/* Top highlight - smooth gradient */}
      <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      {/* Apply icon shadow to any Phosphor icons passed as children */}
      <span className={cn('contents', styles.iconShadow)}>
        {children}
      </span>
    </>
  )
  
  const inlineStyles = {
    background: styles.background,
    boxShadow: styles.boxShadow,
    textShadow: styles.textShadow,
  }
  
  if (href && !disabled) {
    return (
      <Link href={href} className={baseClassName} style={inlineStyles}>
        {content}
      </Link>
    )
  }
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={baseClassName}
      style={inlineStyles}
    >
      {content}
    </button>
  )
}

