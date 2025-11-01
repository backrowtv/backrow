import React from 'react'

interface BrandTextProps {
  children: React.ReactNode
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div'
  className?: string
  style?: React.CSSProperties
}

/**
 * BrandText component that automatically styles "BackRow", "Back", and "Row" 
 * with the Righteous font (brand font).
 * 
 * Usage:
 * <BrandText>Welcome to BackRow!</BrandText>
 * // Renders: "Welcome to " + <span style="font-brand">BackRow</span> + "!"
 * 
 * <BrandText as="h1">BackRow Movie Clubs</BrandText>
 * // Brand terms automatically styled with Righteous font
 */
export function BrandText({ 
  children, 
  as: Component = 'span', 
  className = '',
  style 
}: BrandTextProps) {
  // If children is not a string, render as-is
  if (typeof children !== 'string') {
    return <Component className={className} style={style}>{children}</Component>
  }

  // Pattern matches "BackRow", "Back", or "Row" as whole words
  // Uses word boundaries to avoid matching partial words
  const brandPattern = /\b(BackRow|Back|Row)\b/g
  
  const parts = children.split(brandPattern)
  
  if (parts.length === 1) {
    // No brand terms found, render as-is
    return <Component className={className} style={style}>{children}</Component>
  }

  return (
    <Component className={className} style={style}>
      {parts.map((part, index) => {
        // Check if this part is a brand term
        if (part === 'BackRow' || part === 'Back' || part === 'Row') {
          return (
            <span 
              key={index} 
              style={{ fontFamily: 'var(--font-brand)' }}
            >
              {part}
            </span>
          )
        }
        return part
      })}
    </Component>
  )
}

/**
 * Inline brand span for manual usage when you need more control.
 * Wraps text in the brand font (Righteous).
 * 
 * Usage:
 * <BrandSpan>BackRow</BrandSpan>
 */
export function BrandSpan({ 
  children, 
  className = '',
  style 
}: { 
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span 
      className={className}
      style={{ fontFamily: 'var(--font-brand)', ...style }}
    >
      {children}
    </span>
  )
}

