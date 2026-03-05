'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Select } from '@/components/ui/select'

const PAGE_SIZE_OPTIONS = [
  { value: '15', label: '15' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
]

interface PageSizeSelectorProps {
  currentSize: number
}

export function PageSizeSelector({ currentSize }: PageSizeSelectorProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    params.set('size', newSize)
    // Reset to page 1 when changing size
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--text-muted)]">Show</span>
      <Select 
        value={String(currentSize)} 
        onChange={handleSizeChange}
        className="h-8 w-[70px] text-xs"
      >
        {PAGE_SIZE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  )
}
