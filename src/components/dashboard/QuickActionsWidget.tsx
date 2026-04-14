import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, MagnifyingGlass, User } from '@phosphor-icons/react/dist/ssr'

export function QuickActionsWidget() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle style={{ color: 'var(--text-muted)' }}>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Link href="/create-club" className="block">
          <Button variant="secondary" className="w-full justify-start" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Club
          </Button>
        </Link>
        <Link href="/discover" className="block">
          <Button variant="secondary" className="w-full justify-start" size="sm">
            <MagnifyingGlass className="mr-2 h-4 w-4" />
            Discover Clubs
          </Button>
        </Link>
        <Link href="/profile" className="block">
          <Button variant="secondary" className="w-full justify-start" size="sm">
            <User className="mr-2 h-4 w-4" />
            View Profile
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

