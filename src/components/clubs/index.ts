/**
 * Club Components - Unified Export
 *
 * This module provides centralized access to all club-related components.
 * Components are organized by domain for better discoverability.
 *
 * ## Organization
 *
 * - **announcements/** - Announcement creation, display, and management
 * - **polls/** - Poll creation and voting
 * - **members/** - Member cards, lists, and roles
 * - **settings/** - Club configuration and forms
 * - **seasons/** - Season management and year-in-review
 * - **wizard/** - Club creation wizard
 * - **moderation/** - User blocking and word blacklists
 * - **ownership/** - Transfer, archive, and delete operations
 * - **common/** - Shared components (navigation, backgrounds)
 *
 * ## Usage
 *
 * Import from domain for organized imports:
 * ```ts
 * import { AnnouncementsList, AnnouncementForm } from '@/components/clubs/announcements'
 * import { MemberCard, RoleBadge } from '@/components/clubs/members'
 * ```
 *
 * Or import directly from clubs for backward compatibility:
 * ```ts
 * import { ClubNavigation, AnnouncementsList } from '@/components/clubs'
 * ```
 */

// Re-export from domains
export * from "./announcements";
export * from "./polls";
export * from "./members";
export * from "./settings";
export * from "./seasons";
export * from "./wizard";
export * from "./moderation";
export * from "./ownership";

export * from "./common";
