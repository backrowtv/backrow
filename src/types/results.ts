import { Database } from '@/types/database'

// Types matching what Supabase returns with relations
export type NominationWithRelations = Database['public']['Tables']['nominations']['Row'] & {
  movies?: Database['public']['Tables']['movies']['Row'] | null
  users?: Database['public']['Tables']['users']['Row'] | null
}

export type RatingWithRelations = Database['public']['Tables']['ratings']['Row'] & {
  users?: Database['public']['Tables']['users']['Row'] | null
}

export type GuessWithRelations = {
  id: string
  user_id: string | null
  guesses: Record<string, string>
  users?: Database['public']['Tables']['users']['Row'] | null
}

// Member type for results (only what's queried from getResultsData)
export type MemberForResults = {
  user_id: string
  users?: {
    id: string
    display_name: string | null
    email: string
  } | null
}

