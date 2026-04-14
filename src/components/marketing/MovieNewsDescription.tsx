'use client'

import { Text } from '@/components/ui/typography'
import { useEffect, useState } from 'react'

export function MovieNewsDescription() {
  const [description, setDescription] = useState<string>('Latest movie headlines.')
  
  useEffect(() => {
    async function loadDescription() {
      try {
        const response = await fetch('/api/film-news')
        if (response.ok) {
          const data = await response.json()
          if (data.description) {
            setDescription(data.description)
          }
        }
      } catch {
        // Silently fail - use default description
      }
    }
    loadDescription()
  }, [])
  
  return (
    <Text size="small" muted>
      {description}
    </Text>
  )
}

