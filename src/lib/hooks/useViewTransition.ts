'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export function useViewTransition() {
  const router = useRouter()

  const navigateWithTransition = useCallback(
    (href: string) => {
      if (typeof document !== 'undefined' && 'startViewTransition' in document) {
        ;(document as { startViewTransition?: (callback: () => void) => void }).startViewTransition?.(() => {
          router.push(href)
        })
      } else {
        router.push(href)
      }
    },
    [router]
  )

  return { navigateWithTransition }
}

