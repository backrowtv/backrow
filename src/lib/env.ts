/**
 * Environment Variable Validation
 *
 * This module validates that required environment variables are set at runtime.
 * Using Zod for type-safe validation and helpful error messages.
 *
 * Usage:
 * - Import `env` for validated environment variables
 * - Errors will be thrown at startup if required variables are missing
 */

import { z } from 'zod'

/**
 * Schema for public environment variables (exposed to client)
 * These are prefixed with NEXT_PUBLIC_
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required',
  }),
})

/**
 * Schema for server-only environment variables
 * These should never be exposed to the client
 */
const serverEnvSchema = z.object({
  // TMDB API (required for movie data)
  TMDB_API_KEY: z.string().min(1).optional(),

  // Supabase Service Role (for admin operations)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Cron job authentication
  CRON_SECRET: z.string().min(1).optional(),

  // Optional: Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

/**
 * Combined schema for all environment variables
 */
const envSchema = publicEnvSchema.merge(serverEnvSchema)

/**
 * Validate and parse environment variables
 * This runs at module load time
 */
function validateEnv() {
  // Only validate on server side
  if (typeof window !== 'undefined') {
    // On client, only validate public env vars
    const result = publicEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })

    if (!result.success) {
      console.error('Invalid public environment variables:', result.error.format())
      throw new Error('Invalid environment variables. Check the console for details.')
    }

    return result.data as z.infer<typeof envSchema>
  }

  // On server, validate all env vars
  const result = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  })

  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format())
    throw new Error('Invalid environment variables. Check the console for details.')
  }

  return result.data
}

/**
 * Validated environment variables
 * Import this instead of using process.env directly
 */
export const env = validateEnv()

/**
 * Type for the validated environment
 */
export type Env = z.infer<typeof envSchema>

/**
 * Helper to check if a specific env var is set
 * Useful for optional features
 */
export function hasEnvVar(key: keyof Env): boolean {
  return env[key] !== undefined && env[key] !== ''
}

/**
 * Get Supabase URL (convenience export)
 */
export function getSupabaseUrl(): string {
  return env.NEXT_PUBLIC_SUPABASE_URL
}

/**
 * Get Supabase anon key (convenience export)
 */
export function getSupabaseAnonKey(): string {
  return env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development'
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production'
}
