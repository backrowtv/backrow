/**
 * useDebounce Hook
 *
 * Debounces a value for a specified delay.
 * Useful for search inputs and other high-frequency updates
 * to improve INP (Interaction to Next Paint).
 */

import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
