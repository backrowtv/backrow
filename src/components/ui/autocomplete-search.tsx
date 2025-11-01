'use client'

import { useState, useEffect, useRef, KeyboardEvent, startTransition } from 'react'
import { Input } from './input'
import { cn } from '@/lib/utils'

interface AutocompleteOption {
  id: string
  label: string
  value: string
  icon?: React.ReactNode
}

interface AutocompleteSearchProps {
  placeholder?: string
  options: AutocompleteOption[]
  onSelect: (option: AutocompleteOption) => void
  onSearch?: (query: string) => void
  recentSearches?: string[]
  maxRecentSearches?: number
  className?: string
  debounceMs?: number
}

export function AutocompleteSearch({
  placeholder = 'Search...',
  options,
  onSelect,
  onSearch,
  recentSearches = [],
  maxRecentSearches = 5,
  className,
  debounceMs = 300,
}: AutocompleteSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [filteredOptions, setFilteredOptions] = useState<AutocompleteOption[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    if (query.trim()) {
      const filtered = options.filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase()) ||
        option.value.toLowerCase().includes(query.toLowerCase())
      )
      startTransition(() => {
        setFilteredOptions(filtered.slice(0, 10))
        setIsOpen(filtered.length > 0)
      })
    } else {
      startTransition(() => {
        setFilteredOptions([])
        setIsOpen(false)
      })
    }
  }, [query, options])

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (onSearch && query.trim()) {
        onSearch(query)
      }
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, onSearch, debounceMs])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(option: AutocompleteOption) {
    onSelect(option)
    setQuery(option.label)
    setIsOpen(false)
    setHighlightedIndex(-1)
    
    // Save to recent searches
    if (typeof window !== 'undefined') {
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]') as string[]
      const updated = [option.label, ...recent.filter((s) => s !== option.label)].slice(0, maxRecentSearches)
      localStorage.setItem('recentSearches', JSON.stringify(updated))
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || filteredOptions.length === 0) {
      if (e.key === 'Enter' && query.trim() && onSearch) {
        onSearch(query)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  const displayRecentSearches = !query.trim() && recentSearches.length > 0 && !isOpen

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => {
          if (filteredOptions.length > 0 || displayRecentSearches) {
            setIsOpen(true)
          }
        }}
        onKeyDown={handleKeyDown}
        className="w-full search-input-debossed"
      />
      
      {(isOpen || displayRecentSearches) && (
        <div className="absolute z-50 w-full mt-2 bg-[var(--popover)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden animate-scale-in max-h-[calc(100vh-120px)] overflow-y-auto">
          {displayRecentSearches ? (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(search)
                    if (onSearch) onSearch(search)
                    setIsOpen(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)] transition-colors rounded"
                >
                  {search}
                </button>
              ))}
            </div>
          ) : filteredOptions.length > 0 ? (
            <div className="py-2 max-h-64 overflow-y-auto">
              {filteredOptions.map((option, index) => (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'w-full px-4 py-3 text-left flex items-center gap-3 transition-colors',
                    index === highlightedIndex
                      ? 'bg-[var(--hover)] text-[var(--primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {option.icon && <span className="text-[var(--text-muted)]">{option.icon}</span>}
                  <span className="flex-1">{option.label}</span>
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="px-4 py-8 text-center text-[var(--text-muted)] text-sm">
              No results found
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

