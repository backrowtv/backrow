'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Check if text contains any blacklisted words for a club
 * Returns error message if blacklisted word found, null otherwise
 */
export async function validateBlacklist(clubId: string, text: string): Promise<string | null> {
  if (!text || !text.trim()) {
    return null
  }

  const supabase = await createClient()
  
  // Get all blacklisted words for this club
  const { data: blacklistWords, error } = await supabase
    .from('club_word_blacklist')
    .select('word')
    .eq('club_id', clubId)
  
  if (error) {
    console.error('Error fetching blacklist:', error)
    return null // Don't block on error, but log it
  }
  
  if (!blacklistWords || blacklistWords.length === 0) {
    return null // No blacklist words, allow
  }
  
  // Normalize text for comparison (lowercase, trim)
  const normalizedText = text.toLowerCase().trim()
  
  // Check if any blacklisted word appears in the text
  for (const blacklistWord of blacklistWords) {
    const word = blacklistWord.word.toLowerCase().trim()
    
    // Check for exact word match or word as substring
    // Use word boundaries to avoid false positives (e.g., "ass" matching "class")
    // Simple check: word must be surrounded by non-word characters or start/end of string
    const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    
    if (wordRegex.test(normalizedText)) {
      return `Content contains a blacklisted word: "${word}". Please remove it and try again.`
    }
  }
  
  return null // No blacklisted words found
}

