import { Database } from '@/types/database'
import { RoleBadge } from './RoleBadge'
import { Text } from '@/components/ui/typography'

type ClubMember = Database['public']['Tables']['club_members']['Row']
type User = Database['public']['Tables']['users']['Row']

interface MemberListProps {
  members: (ClubMember & {
    users: User | null
  })[]
  currentUserRole?: string
  currentUserId?: string
  onUpdateRole?: (userId: string, newRole: 'critic' | 'director') => Promise<void>
  onRemoveMember?: (userId: string) => Promise<void>
}

export function MemberList({
  members,
  currentUserRole,
  currentUserId,
  onUpdateRole,
  onRemoveMember,
}: MemberListProps) {
  const canManageMembers =
    currentUserRole === 'producer' || currentUserRole === 'director'

  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">No members yet</p>
      ) : (
        members.map((member) => {
          const displayName =
            member.club_display_name ||
            member.users?.display_name ||
            member.users?.email ||
            'Unknown User'
          const isCurrentUser = member.user_id === currentUserId
          const canEdit =
            canManageMembers &&
            !isCurrentUser &&
            member.role !== 'producer' &&
            (currentUserRole === 'producer' ||
              (currentUserRole === 'director' && member.role === 'critic'))

          return (
            <div
              key={member.user_id}
              className="flex items-center justify-between rounded-lg p-4 transition-colors"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(245, 101, 101, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            >
              <div className="flex items-center gap-4">
                <div>
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {displayName}
                  </div>
                  {member.users?.email && (
                    <Text size="sm" muted>
                      {member.users.email}
                    </Text>
                  )}
                </div>
                <RoleBadge role={member.role as 'producer' | 'director' | 'critic'} />
              </div>
              
              {canEdit && (
                <div className="flex items-center gap-2">
                  {member.role === 'critic' &&
                    currentUserRole === 'director' && (
                      <button
                        onClick={() =>
                          onUpdateRole?.(member.user_id, 'director')
                        }
                        className="text-sm transition-colors"
                        style={{ color: 'var(--primary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--primary-300)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--primary)'
                        }}
                      >
                        Promote
                      </button>
                    )}
                  {currentUserRole === 'producer' && member.role === 'critic' && (
                    <button
                      onClick={() => onUpdateRole?.(member.user_id, 'director')}
                      className="text-sm transition-colors"
                      style={{ color: 'var(--primary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--primary-300)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--primary)'
                      }}
                    >
                      Promote
                    </button>
                  )}
                  {currentUserRole === 'producer' && member.role === 'director' && (
                    <button
                      onClick={() => onUpdateRole?.(member.user_id, 'critic')}
                      className="text-sm transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }}
                    >
                      Demote
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveMember?.(member.user_id)}
                    className="text-sm transition-colors"
                    style={{ color: 'var(--error)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--error)'
                      e.currentTarget.style.opacity = '0.8'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1'
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

