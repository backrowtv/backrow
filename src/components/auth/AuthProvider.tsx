'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
})

export function useAuth() {
  return useContext(AuthContext)
}

interface AuthProviderProps {
  children: ReactNode
  initialUser: User | null
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  // Start with server-provided user
  const [user, setUser] = useState<User | null>(initialUser)
  // If no initial user, we need to check auth state
  const [isLoading, setIsLoading] = useState(!initialUser)

  useEffect(() => {
    const supabase = createClient()

    // If we don't have an initial user, fetch the current session
    // This handles the Suspense fallback case where initialUser is null
    if (!initialUser) {
      supabase.auth.getUser().then(({ data: { user: fetchedUser } }) => {
        setUser(fetchedUser)
        setIsLoading(false)
      })
    }

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [initialUser])

  // Update user if initialUser changes (when Suspense resolves)
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser)
      setIsLoading(false)
    }
  }, [initialUser])

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

