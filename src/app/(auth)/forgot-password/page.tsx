import { ForgotPasswordForm } from './ForgotPasswordForm'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/shared/Logo'
import { Heading, Text } from '@/components/ui/typography'

export default async function ForgotPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    redirect('/')
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--background)' }}>
      <Card className="w-full max-w-[450px]">
        <CardHeader className="text-center space-y-2">
          <Logo variant="icon" size="lg" className="mx-auto h-12 w-12" />
          <Heading level={1}>Reset your password</Heading>
          <Text size="small" muted>Enter your email address and we&apos;ll send you a link to reset your password</Text>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}

