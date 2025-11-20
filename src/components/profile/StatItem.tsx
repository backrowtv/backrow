interface StatItemProps {
  label: string
  value: string | number
}

export function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="flex flex-col min-w-[80px]">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

