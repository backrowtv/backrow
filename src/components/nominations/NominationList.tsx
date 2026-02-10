import { NominationCard } from "./NominationCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { Database } from "@/types/database";

type Nomination = Database["public"]["Tables"]["nominations"]["Row"];
type Movie = Database["public"]["Tables"]["movies"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

interface NominationListProps {
  nominations: (Nomination & {
    movies: Movie | null;
    users: User | null;
  })[];
  currentUserId?: string;
  watchedCounts?: Record<string, number>;
  onEdit?: (nominationId: string) => void;
  onDelete?: (nominationId: string) => void;
}

export function NominationList({
  nominations,
  currentUserId,
  watchedCounts,
  onEdit,
  onDelete,
}: NominationListProps) {
  if (nominations.length === 0) {
    return (
      <EmptyState
        icon={Plus}
        title="No nominations yet"
        message="Be the first to nominate a movie for this festival!"
        variant="inline"
      />
    );
  }

  return (
    <div className="space-y-6">
      {nominations.map((nomination) => (
        <NominationCard
          key={nomination.id}
          nomination={nomination}
          isOwnNomination={nomination.user_id === currentUserId}
          watchedCount={watchedCounts?.[nomination.id]}
          onEdit={onEdit ? () => onEdit(nomination.id) : undefined}
          onDelete={onDelete ? () => onDelete(nomination.id) : undefined}
        />
      ))}
    </div>
  );
}
