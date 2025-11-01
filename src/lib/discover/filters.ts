// Club filter types
export interface DiscoverFiltersState {
  privacy: string[]
  minMembers: number
}

export const PRIVACY_OPTIONS = [
  { value: 'public_open', label: 'Open' },
  { value: 'public_moderated', label: 'Moderated' },
]

export const PRIVACY_LABELS: Record<string, string> = {
  public_open: 'Open',
  public_moderated: 'Moderated',
  private: 'Private',
}

export const MEMBER_COUNT_OPTIONS = [
  { value: 0, label: 'Any' },
  { value: 5, label: '5+ members' },
  { value: 10, label: '10+ members' },
  { value: 25, label: '25+ members' },
  { value: 50, label: '50+ members' },
  { value: 100, label: '100+ members' },
]

export function parseFiltersFromURL(searchParams: URLSearchParams): DiscoverFiltersState {
  const privacyParam = searchParams.get('privacy')
  const privacy = privacyParam ? privacyParam.split(',').filter(Boolean) : []

  const minMembersParam = searchParams.get('minMembers')
  const minMembers = minMembersParam ? parseInt(minMembersParam, 10) : 0

  return {
    privacy,
    minMembers: isNaN(minMembers) ? 0 : minMembers,
  }
}

export function serializeFiltersToURL(filters: DiscoverFiltersState): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.privacy.length > 0) {
    params.set('privacy', filters.privacy.join(','))
  }

  if (filters.minMembers > 0) {
    params.set('minMembers', filters.minMembers.toString())
  }

  return params
}
