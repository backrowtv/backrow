// Festival results structure as stored in festival_results.results JSONB column

export interface FestivalResultsNomination {
  nomination_id: string
  tmdb_id: number | null
  movie_title: string | null
  average_rating: number
  rating_count: number
  nominator_user_id: string | null
}

export interface FestivalResultsStandingsEntry {
  user_id: string
  user_name: string
  points: number
}

export interface FestivalResultsGuesser {
  user_id: string
  user_name: string
  guesses: Record<string, string> // nomination_id -> guessed_user_id
  correct_count: number
  total_guessed: number
  accuracy: number // percentage
}

export interface FestivalResultsGuesses {
  guessers: FestivalResultsGuesser[]
  stats: {
    total_guessers: number
    total_guesses: number
    total_correct: number
    average_accuracy: number
  }
  nominator_reveals: Record<string, string> // nomination_id -> actual nominator user_id
}

export interface FestivalResults {
  nominations: FestivalResultsNomination[]
  standings: FestivalResultsStandingsEntry[]
  guesses: FestivalResultsGuesses
  calculated_at: string
  member_count_at_creation: number
}

