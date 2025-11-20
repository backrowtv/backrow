'use client'

import { cn } from '@/lib/utils'

interface PasswordStrengthMeterProps {
  password: string
  className?: string
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  // Calculate password strength (0-4)
  const getPasswordStrength = (pwd: string): number => {
    if (!pwd) return 0
    
    let strength = 0
    
    // At least 8 characters
    if (pwd.length >= 8) strength++
    
    // At least one uppercase letter
    if (/[A-Z]/.test(pwd)) strength++
    
    // At least one number
    if (/[0-9]/.test(pwd)) strength++
    
    // At least one special character
    if (/[^A-Za-z0-9]/.test(pwd)) strength++
    
    return strength
  }

  const strength = getPasswordStrength(password)
  
  // Check individual requirements
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password)

  return (
    <div className={cn('space-y-2', className)}>
      {/* Strength segments */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className={cn(
              'h-1 flex-1 rounded-full',
              strength >= segment 
                ? 'bg-[var(--primary)]' 
                : 'bg-[var(--surface-2)]'
            )}
          />
        ))}
      </div>
      
      {/* Requirements list */}
      <ul className="text-xs space-y-1">
        <li className={hasMinLength ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}>
          {hasMinLength ? '✓' : '○'} At least 8 characters
        </li>
        <li className={hasUppercase ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}>
          {hasUppercase ? '✓' : '○'} At least one uppercase letter
        </li>
        <li className={hasNumber ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}>
          {hasNumber ? '✓' : '○'} At least one number
        </li>
        <li className={hasSpecialChar ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}>
          {hasSpecialChar ? '✓' : '○'} At least one special character
        </li>
      </ul>
    </div>
  )
}

