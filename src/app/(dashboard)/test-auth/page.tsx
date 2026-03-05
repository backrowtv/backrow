'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TestAuthClient } from './TestAuthClient'
import { isAdmin } from '@/app/actions/admin'

export default async function TestAuthPage() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    redirect('/')
  }

  // Gate behind admin auth
  const adminUser = await isAdmin()
  if (!adminUser) {
    redirect('/')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <TestAuthClient currentUser={user} />
}

