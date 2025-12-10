type Role = 'producer' | 'director' | 'critic'

interface RoleBadgeProps {
  role: Role
  className?: string
  size?: 'sm' | 'default'
}

export function RoleBadge({ role, className = '', size = 'default' }: RoleBadgeProps) {
  // Role styles with good contrast and visibility
  const roleStyles: Record<Role, { bg: string; text: string; border: string }> = {
    producer: {
      bg: 'hsl(38 92% 50% / 0.15)',  // amber/gold tint
      text: 'hsl(38 92% 40%)',        // darker amber for readability
      border: 'hsl(38 92% 50% / 0.4)'
    },
    director: {
      bg: 'hsl(var(--primary-500) / 0.15)',
      text: 'hsl(var(--primary-600))',
      border: 'hsl(var(--primary-500) / 0.4)'
    },
    critic: {
      bg: 'var(--surface-1)',
      text: 'var(--text-secondary)',
      border: 'var(--border)'
    },
  }

  const roleLabels = {
    producer: 'Producer',
    director: 'Director',
    critic: 'Critic',
  }

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px]'
    : 'px-3 py-1 text-xs'

  return (
    <span
      className={`rounded-full ${sizeClasses} font-medium border ${className}`}
      style={{
        background: roleStyles[role].bg,
        color: roleStyles[role].text,
        borderColor: roleStyles[role].border
      }}
    >
      {roleLabels[role]}
    </span>
  )
}

