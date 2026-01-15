import Image from 'next/image'
import { Database } from '@/types/database'

type Movie = Database['public']['Tables']['movies']['Row']

interface MovieDetailsProps {
  movie: Movie
}

export function MovieDetails({ movie }: MovieDetailsProps) {
  return (
    <div className="flex flex-col md:flex-row gap-6">
      {movie.poster_url && (
        <div className="flex-shrink-0">
          <div className="aspect-[2/3] w-48 relative rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--surface-1)' }}>
            <Image
              src={movie.poster_url}
              alt={movie.title}
              fill
              className="object-cover"
              sizes="192px"
            />
          </div>
        </div>
      )}
      
      <div className="flex-1">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          {movie.title}
          {movie.year && <span className="ml-2" style={{ color: 'var(--text-muted)' }}>({movie.year})</span>}
        </h2>
        
        <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {movie.director && (
            <div>
              <span className="font-medium">Director:</span> {movie.director}
            </div>
          )}
          
          {movie.runtime && (
            <div>
              <span className="font-medium">Runtime:</span> {movie.runtime} minutes
            </div>
          )}
          
          {movie.genres && movie.genres.length > 0 && (
            <div>
              <span className="font-medium">Genres:</span>{' '}
              {movie.genres.join(', ')}
            </div>
          )}
          
          {movie.cast && movie.cast.length > 0 && (
            <div>
              <span className="font-medium">Cast:</span>{' '}
              {movie.cast.slice(0, 5).join(', ')}
              {movie.cast.length > 5 && ` +${movie.cast.length - 5} more`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

