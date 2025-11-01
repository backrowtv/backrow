'use client'

import { useOptimistic as useReactOptimistic, useTransition, useCallback } from 'react'

export function useOptimisticUpdate<T>(
  initialValue: T,
  updateFn: (current: T, optimistic: T) => T
) {
  const [isPending, startTransition] = useTransition()
  const [optimisticValue, setOptimisticValue] = useReactOptimistic(
    initialValue,
    updateFn
  )

  const updateOptimistic = useCallback(
    (newValue: T) => {
      startTransition(() => {
        setOptimisticValue(newValue)
      })
    },
    [setOptimisticValue]
  )

  return [optimisticValue, updateOptimistic, isPending] as const
}

