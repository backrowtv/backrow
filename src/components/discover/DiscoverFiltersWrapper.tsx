'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useCallback, useMemo } from 'react'
import { DiscoverSearch } from './DiscoverSearch'
import { parseFiltersFromURL, serializeFiltersToURL, PRIVACY_LABELS, type DiscoverFiltersState } from '@/lib/discover/filters'

export type { DiscoverFiltersState }
export { parseFiltersFromURL, serializeFiltersToURL, PRIVACY_LABELS }

// Re-export the new combined filters component
export { DiscoverFiltersWithDisplay } from './DiscoverFilters'

// Wrapper for DiscoverSearch component (used in main content)
export function DiscoverSearchWrapper({ initialQuery }: { initialQuery?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  
  const filters = useMemo(() => parseFiltersFromURL(searchParams), [searchParams])
  
  const updateURL = useCallback((newFilters: DiscoverFiltersState) => {
    startTransition(() => {
      const params = serializeFiltersToURL(newFilters)
      
      // Preserve search query if it exists
      const currentQuery = searchParams.get('q')
      if (currentQuery) {
        params.set('q', currentQuery)
      }
      
      // Preserve view mode if it exists
      const currentView = searchParams.get('view')
      if (currentView) {
        params.set('view', currentView)
      }
      
      router.push(`/discover?${params.toString()}`)
    })
  }, [router, searchParams])
  
  const handlePrivacyChange = useCallback((privacy: string[]) => {
    updateURL({ ...filters, privacy })
  }, [filters, updateURL])
  
  const handleMinMembersChange = useCallback((minMembers: number) => {
    updateURL({ ...filters, minMembers })
  }, [filters, updateURL])
  
  const handleRemoveFilter = useCallback((filterValue: string) => {
    // Parse filter value to determine type
    if (filterValue.startsWith('privacy:')) {
      const privacyValue = filterValue.replace('privacy:', '')
      handlePrivacyChange(filters.privacy.filter(p => p !== privacyValue))
    } else if (filterValue === 'minMembers') {
      handleMinMembersChange(0)
    }
  }, [filters, handlePrivacyChange, handleMinMembersChange])
  
  // Generate active filter badges for DiscoverSearch
  const activeFilters = useMemo(() => {
    const badges: Array<{ label: string; value: string }> = []
    
    filters.privacy.forEach(p => {
      badges.push({
        label: PRIVACY_LABELS[p] || p,
        value: `privacy:${p}`,
      })
    })
    
    if (filters.minMembers > 0) {
      badges.push({
        label: `Min ${filters.minMembers} members`,
        value: 'minMembers',
      })
    }
    
    return badges
  }, [filters])
  
  return (
    <DiscoverSearch
      initialQuery={initialQuery}
      activeFilters={activeFilters}
      onRemoveFilter={handleRemoveFilter}
    />
  )
}
