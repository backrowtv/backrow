import { ResetPasswordForm } from './ResetPasswordForm'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/shared/Logo'
import { Heading, Text } from '@/components/ui/typography'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // User must be authenticated (via the reset token) to reset password
  if (!user) {
    redirect('/forgot-password')
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--background)' }}>
      <Card className="w-full max-w-[450px]">
        <CardHeader className="text-center space-y-2">
          <Logo variant="icon" size="lg" className="mx-auto h-12 w-12" />
          <Heading level={1}>Set new password</Heading>
          <Text size="small" muted>Enter your new password below</Text>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}

