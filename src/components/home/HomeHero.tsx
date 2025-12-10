import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, UsersThree } from '@phosphor-icons/react/dist/ssr'

// BackRow Featured Club slug - excluded from "has clubs" count since all users auto-join it
const BACKROW_FEATURED_SLUG = 'backrow-featured'

async function getUserData(): Promise<{ hasClubs: boolean; displayName: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { hasClubs: false, displayName: '' }
  
  // Get club count (excluding BackRow Featured) and display name in parallel
  const [{ data: memberships }, { data: profile }] = await Promise.all([
    supabase
      .from('club_members')
      .select('club_id, clubs!inner(slug)')
      .eq('user_id', user.id)
      .neq('clubs.slug', BACKROW_FEATURED_SLUG),
    supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()
  ])
  
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User'
  
  // Count clubs excluding BackRow Featured
  const clubCount = memberships?.length || 0
  
  return { hasClubs: clubCount > 0, displayName }
}

/**
 * HomeHero - Welcome message and action buttons overlaid on the theater frame
 * Styled for visibility over movie stills with text shadows
 */
export async function HomeHero() {
  const { hasClubs, displayName } = await getUserData()
  
  return (
      <div className="inline-block">
      {/* Headline */}
        <div className="mb-1.5 sm:mb-3">
          {hasClubs ? (
            <h1
            className="text-base sm:text-2xl lg:text-3xl font-bold text-white"
              style={{ textShadow: '0 2px 6px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.5)' }}
            >
              <span className="block">Welcome <span style={{ fontFamily: 'var(--font-brand)' }}>Back</span>,</span>
              <span className="block">{displayName}</span>
            </h1>
          ) : (
            <>
              <h1
              className="text-base sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2"
                style={{ textShadow: '0 2px 6px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.5)' }}
              >
                Start your film journey
              </h1>
              <p
              className="text-[11px] sm:text-sm text-white/90"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
              >
                Create a club and rally your crew or join a film community.
              </p>
            </>
          )}
        </div>
        
      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/create-club"
          className="relative inline-flex items-center justify-center gap-1 sm:gap-2 h-6 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] backdrop-blur-xl rounded-md sm:rounded-lg overflow-hidden border border-white/20"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15), inset 0 0 20px rgba(96,140,100,0.15)',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            }}
          >
            <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          <Plus className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
            Create Club
          </Link>

          <Link
            href="/discover"
          className="relative inline-flex items-center justify-center gap-1 sm:gap-2 h-6 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] backdrop-blur-xl rounded-md sm:rounded-lg overflow-hidden border border-white/20"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15), inset 0 0 20px rgba(96,140,100,0.15)',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            }}
          >
            <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          <UsersThree className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
            Join
          </Link>
      </div>
    </div>
  )
}
