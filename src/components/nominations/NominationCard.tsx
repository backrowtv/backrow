'use client'

import { useState } from 'react'
import { Database } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MovieDetails } from '@/components/movies/MovieDetails'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Users } from '@phosphor-icons/react'
import NumberFlow from '@/components/ui/number-flow'

type Nomination = Database['public']['Tables']['nominations']['Row']
type Movie = Database['public']['Tables']['movies']['Row']
type User = Database['public']['Tables']['users']['Row']

interface NominationCardProps {
  nomination: Nomination & {
    movies: Movie | null
    users: User | null
  }
  isOwnNomination?: boolean
  watchedCount?: number
  onEdit?: () => void
  onDelete?: () => void
}

export function NominationCard({
  nomination,
  isOwnNomination = false,
  watchedCount,
  onEdit,
  onDelete,
}: NominationCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const movie = nomination.movies
  const user = nomination.users
  const userName =
    user?.display_name || user?.email || 'Unknown User'

  function handleDeleteClick() {
    setShowDeleteConfirm(true)
  }

  function handleConfirmDelete() {
    onDelete?.()
    setShowDeleteConfirm(false)
  }

  if (!movie) {
    return (
      <Card>
        <CardContent>
          <p style={{ color: 'var(--text-secondary)' }}>
            Movie data not available
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>
                {movie.title}
                {movie.year && (
                  <span 
                    className="ml-2 font-normal"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    ({movie.year})
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-3 mt-1">
                <p 
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Nominated by {userName}
                </p>
                {watchedCount !== undefined && watchedCount > 0 && (
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Users className="w-3 h-3" />
                    <span><NumberFlow value={watchedCount} /> {watchedCount === 1 ? 'member' : 'members'} watched before nomination</span>
                  </div>
                )}
              </div>
            </div>
            {isOwnNomination && (onEdit || onDelete) && (
              <div className="flex gap-2">
                {onEdit && (
                  <button
                    onClick={onEdit}
                    aria-label={`Edit nomination for ${movie.title}`}
                    className="text-sm min-h-[44px] min-w-[44px] px-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 rounded"
                    style={{ color: 'var(--primary)' }}
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDeleteClick}
                    aria-label={`Delete nomination for ${movie.title}`}
                    className="text-sm min-h-[44px] min-w-[44px] px-2 focus:outline-none focus:ring-2 focus:ring-[var(--error)] focus:ring-offset-2 rounded"
                    style={{ color: 'var(--error)' }}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <MovieDetails movie={movie} />
          
          {nomination.pitch && (
            <div
              className="mt-4 pt-4 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <p
                className="text-xs break-words"
                style={{ color: 'var(--text-secondary)' }}
              >
                {nomination.pitch}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Nomination?"
        description={
          <span>
            Are you sure you want to remove <strong>{movie.title}</strong> from this festival? This action cannot be undone.
          </span>
        }
        confirmText="Delete Nomination"
        onConfirm={handleConfirmDelete}
        variant="danger"
      />
    </>
  )
}
