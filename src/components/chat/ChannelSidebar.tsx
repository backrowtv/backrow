'use client'

import { Hash } from '@phosphor-icons/react/dist/ssr'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface Channel {
  id: string
  name: string
  unreadCount?: number
}

interface DirectMessageMember {
  id: string
  name: string
  avatar?: string
}

interface ChannelSidebarProps {
  channels: Channel[]
  directMessages?: DirectMessageMember[]
  activeChannel?: string
  onChannelSelect?: (channelId: string) => void
  onDirectMessageSelect?: (userId: string) => void
}

export function ChannelSidebar({
  channels,
  directMessages = [],
  activeChannel,
  onChannelSelect,
  onDirectMessageSelect,
}: ChannelSidebarProps) {
  return (
    <aside className="w-60 border-r" style={{ backgroundColor: 'var(--surface-0)' }}>
      <div className="p-4">
        <h2 className="font-semibold mb-4">Channels</h2>
        <div className="space-y-1">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onChannelSelect?.(channel.id)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md flex items-center gap-2 transition-colors',
                activeChannel === channel.id
                  ? 'bg-[var(--surface-2)]'
                  : 'hover:bg-[var(--surface-1)]'
              )}
            >
              <Hash className="h-4 w-4" />
              <span className="flex-1">{channel.name}</span>
              {channel.unreadCount && channel.unreadCount > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {channel.unreadCount}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {directMessages.length > 0 && (
          <>
            <h2 className="font-semibold mb-4 mt-6">Direct Messages</h2>
            <div className="space-y-1">
              {directMessages.map((member) => (
                <button
                  key={member.id}
                  onClick={() => onDirectMessageSelect?.(member.id)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--surface-1)] flex items-center gap-2 transition-colors"
                >
                  <div className="relative">
                    <Avatar
                      src={member.avatar}
                      alt={member.name}
                      size="tiny"
                    />
                  </div>
                  <span className="text-sm">{member.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

