/**
 * Repository Pattern Types
 *
 * Base types and interfaces for the repository pattern.
 * Repositories abstract database access, making queries reusable and testable.
 */

import type { Database } from "@/types/database";
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";

// Type aliases for cleaner code
export type Tables = Database["public"]["Tables"];
export type TableName = keyof Tables;

// Extract Row type from a table
export type Row<T extends TableName> = Tables[T]["Row"];
export type Insert<T extends TableName> = Tables[T]["Insert"];
export type Update<T extends TableName> = Tables[T]["Update"];

// Common entity types
export type Club = Row<"clubs">;
export type ClubMember = Row<"club_members">;
export type Festival = Row<"festivals">;
export type Season = Row<"seasons">;
export type User = Row<"users">;
// Movie type extended with fields added in migrations but not yet in generated types
export type Movie = Row<"movies"> & {
  slug?: string | null;
  backdrop_url?: string | null;
  overview?: string | null;
  tagline?: string | null;
};
export type Nomination = Row<"nominations">;
export type Rating = Row<"ratings">;

// Supabase client type
export type DbClient = SupabaseClient<Database>;

// Query result type
export type QueryResult<T> = {
  data: T | null;
  error: string | null;
};

// List query result type
export type ListResult<T> = {
  data: T[];
  error: string | null;
  count?: number;
};

// Common query options
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface SortOptions<T> {
  column: keyof T;
  ascending?: boolean;
}

// Club with related data
export interface ClubWithProducer extends Club {
  users: User | null;
}

export interface ClubWithMembers extends Club {
  club_members: (ClubMember & { user: User | null })[];
}

// Festival with related data
export interface FestivalWithClub extends Festival {
  clubs: Club | null;
}

export interface FestivalWithNominations extends Festival {
  nominations: (Nomination & {
    movies: Movie | null;
    users: User | null;
  })[];
}

// Member with user data
export interface MemberWithUser extends ClubMember {
  user: User | null;
}

// Nomination with full data
export interface NominationWithDetails extends Nomination {
  movie: Pick<
    Movie,
    "tmdb_id" | "title" | "year" | "poster_url" | "runtime" | "director" | "genres"
  > | null;
  nominator: Pick<User, "id" | "display_name" | "avatar_url"> | null;
}

// Error handling helpers — consolidate repeated try/catch patterns across repositories
export function handleQueryError<T>(error: PostgrestError, context: string): QueryResult<T> {
  console.error(`[repo] ${context}:`, error.message);
  return { data: null, error: error.message };
}

export function handleListError<T>(error: PostgrestError, context: string): ListResult<T> {
  console.error(`[repo] ${context}:`, error.message);
  return { data: [], error: error.message };
}
