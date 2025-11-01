'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  basePath?: string
  className?: string
}

export function PaginationControls({
  currentPage,
  totalPages,
  basePath = '',
  className,
}: PaginationControlsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  if (totalPages <= 1) {
    return null
  }
  
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      params.delete('page')
    } else {
      params.set('page', page.toString())
    }
    const queryString = params.toString()
    return `${basePath}${queryString ? `?${queryString}` : ''}`
  }
  
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return
    router.push(createPageUrl(page))
  }
  
  return (
    <div className={cn('flex items-center justify-center gap-2 mt-8', className)}>
      <Button
        variant="ghost"
        size="md"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Previous
      </Button>
      
      <div className="flex items-center gap-1 px-4">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          // Show first page, last page, current page, and pages around current
          const showPage =
            page === 1 ||
            page === totalPages ||
            (page >= currentPage - 1 && page <= currentPage + 1)
          
          if (!showPage) {
            // Show ellipsis
            if (
              (page === currentPage - 2 && currentPage > 3) ||
              (page === currentPage + 2 && currentPage < totalPages - 2)
            ) {
              return (
                <span key={page} className="px-2" style={{ color: 'var(--text-muted)' }}>
                  ...
                </span>
              )
            }
            return null
          }
          
          return (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={cn(
                'min-w-[2.5rem] h-10 px-3 rounded-md text-sm font-medium transition-all duration-200',
                currentPage === page
                  ? 'text-white shadow-lg'
                  : ''
              )}
              style={currentPage === page ? {
                backgroundColor: 'var(--primary)',
                color: 'white',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px var(--primary)',
              } : {
                backgroundColor: 'var(--surface-1)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (currentPage !== page) {
                  e.currentTarget.style.backgroundColor = 'var(--surface-2)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== page) {
                  e.currentTarget.style.backgroundColor = 'var(--surface-1)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              {page}
            </button>
          )
        })}
      </div>
      
      <Button
        variant="ghost"
        size="md"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="gap-2"
      >
        Next
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Button>
    </div>
  )
}

