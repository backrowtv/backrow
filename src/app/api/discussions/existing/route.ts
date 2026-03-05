import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const clubId = searchParams.get('clubId')
  const tmdbId = searchParams.get('tmdbId')
  const personTmdbId = searchParams.get('personTmdbId')

  if (!clubId) {
    return NextResponse.json({ error: 'Club ID is required' }, { status: 400 })
  }

  if (!tmdbId && !personTmdbId) {
    return NextResponse.json({ error: 'Either tmdbId or personTmdbId is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    // Security: Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Security: Verify user is a member of the club
    const { data: membership, error: memberError } = await supabase
      .from('club_members')
      .select('id')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Not a member of this club' }, { status: 403 })
    }

    let query = supabase
      .from('discussion_threads')
      .select(`
        id,
        slug,
        title,
        comment_count,
        author:author_id(display_name)
      `)
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (tmdbId) {
      query = query.eq('tmdb_id', parseInt(tmdbId))
    } else if (personTmdbId) {
      query = query.eq('person_tmdb_id', parseInt(personTmdbId))
    }

    const { data: threads, error } = await query

    if (error) {
      console.error('Error fetching existing threads:', error)
      return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 })
    }

    return NextResponse.json({ threads: threads || [] })
  } catch (err) {
    console.error('Error in existing threads API:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

