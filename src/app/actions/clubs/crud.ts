/**
 * Club CRUD Actions (Backwards Compatibility)
 *
 * Re-exports from split files for backwards compatibility.
 * New imports should use specific modules:
 * - @/app/actions/clubs/create
 * - @/app/actions/clubs/update
 * - @/app/actions/clubs/archive
 * - @/app/actions/clubs/admin
 */

export { createClub } from "./create";
export { updateClub } from "./update";
export { archiveClub } from "./archive";
export { fixClubSlug, fixAllClubSlugs } from "./admin";
