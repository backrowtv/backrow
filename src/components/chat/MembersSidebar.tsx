'use client'

import { Avatar } from '@/components/ui/avatar'
import { Database } from '@/types/database'

type ClubMember = Database['public']['Tables']['club_members']['Row']
type User = Database['public']['Tables']['users']['Row']

interface MemberWithUser extends ClubMember {
  users: User | null
}

interface MembersSidebarProps {
  members: MemberWithUser[]
  onlineCount: number
}

export function MembersSidebar({ members, onlineCount }: MembersSidebarProps) {
  // Group members by role
  const producers = members.filter((m) => m.role === 'producer')
  const directors = members.filter((m) => m.role === 'director')
  const critics = members.filter((m) => m.role === 'critic')

  const getMemberName = (member: MemberWithUser) => {
    return member.users?.display_name || member.users?.email || 'Unknown User'
  }

  const getMemberAvatar = (member: MemberWithUser) => {
    return member.users?.avatar_url || undefined
  }

  return (
    <aside className="hidden xl:block w-60 border-l p-4" style={{ borderColor: 'var(--border)' }}>
      <h3 className="font-semibold mb-4">Online — {onlineCount}</h3>
      <div className="space-y-3">
        {producers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Producers
            </h4>
            <div className="space-y-2">
              {producers.map((member) => (
                <div key={member.user_id} className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar
                      src={getMemberAvatar(member)}
                      alt={getMemberName(member)}
                      size="sm"
                    />
                  </div>
                  <span className="text-sm">{getMemberName(member)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {directors.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Directors
            </h4>
            <div className="space-y-2">
              {directors.map((member) => (
                <div key={member.user_id} className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar
                      src={getMemberAvatar(member)}
                      alt={getMemberName(member)}
                      size="sm"
                    />
                  </div>
                  <span className="text-sm">{getMemberName(member)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {critics.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Critics
            </h4>
            <div className="space-y-2">
              {critics.map((member) => (
                <div key={member.user_id} className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar
                      src={getMemberAvatar(member)}
                      alt={getMemberName(member)}
                      size="sm"
                    />
                  </div>
                  <span className="text-sm">{getMemberName(member)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

