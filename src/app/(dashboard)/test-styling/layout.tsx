import { redirect } from 'next/navigation'
import { isAdmin } from '@/app/actions/admin'

export default async function TestStylingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    redirect('/')
  }

  // Gate behind admin auth
  const adminUser = await isAdmin()
  if (!adminUser) {
    redirect('/')
  }

  return <>{children}</>
}
