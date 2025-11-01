import { Database } from '@/types/database'

// Types for Supabase queries with relations

export type NominationWithFestival = Database['public']['Tables']['nominations']['Row'] & {
  festivals?: Database['public']['Tables']['festivals']['Row'] | Database['public']['Tables']['festivals']['Row'][] | null
}

export type RatingWithNomination = Database['public']['Tables']['ratings']['Row'] & {
  nominations?: Database['public']['Tables']['nominations']['Row'] | null
  users?: Database['public']['Tables']['users']['Row'] | null
}

export type FestivalResultsData = {
  festival_id: string
  festival_theme: string
  results_date: string | null
  member_count_at_creation: number
  points: number
  rank: number
}

