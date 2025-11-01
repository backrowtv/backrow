/**
 * Avatar System Constants - Single Source of Truth
 *
 * This file contains all avatar-related constants and helper functions.
 * All avatar rendering should use these constants to ensure consistency.
 *
 * ## Avatar Icon Modes
 * The `avatar_icon` field supports these values:
 * - `'letter'` - First letter of display name
 * - `'photo'`  - Use uploaded avatar_url (NO icon generated!)
 * - Icon ID    - e.g. 'popcorn', 'clapperboard', 'masks'
 *
 * ⚠️ CRITICAL: When avatar_icon === 'photo', do NOT call getAvatarIconSrc()
 *    as it will return null.
 *
 * ## Border Colors
 * - `null`     - No border
 * - `-1`       - Site theme color (THEME_BORDER_COLOR_INDEX, admin only)
 * - `0-17`     - Index into AVATAR_COLORS array
 *
 * ## Admin-Only Features
 * - Green color (index 4) - Restricted via getAvailableAvatarColors()
 * - Theme border (-1)     - Shown in DefaultAvatarSelector for admins
 * - Admin emails defined in ADMIN_EMAILS constant
 */

// ============================================================================
// COLOR PALETTE (18 colors: 12 bright + 6 grayscale)
// Used by both user and club avatars
// ============================================================================

export const AVATAR_COLORS = [
  { id: 0, color: "hsl(0, 70%, 50%)", label: "Red" },
  { id: 1, color: "hsl(25, 70%, 50%)", label: "Orange" },
  { id: 2, color: "hsl(45, 70%, 50%)", label: "Gold" },
  { id: 3, color: "hsl(75, 65%, 45%)", label: "Lime" },
  { id: 4, color: "hsl(140, 60%, 40%)", label: "Green" },
  { id: 5, color: "hsl(175, 60%, 45%)", label: "Teal" },
  { id: 6, color: "hsl(200, 70%, 50%)", label: "Sky" },
  { id: 7, color: "hsl(230, 65%, 55%)", label: "Blue" },
  { id: 8, color: "hsl(260, 60%, 55%)", label: "Purple" },
  { id: 9, color: "hsl(290, 55%, 50%)", label: "Violet" },
  { id: 10, color: "hsl(330, 60%, 50%)", label: "Pink" },
  { id: 11, color: "hsl(355, 70%, 45%)", label: "Crimson" },
  // Grayscale colors
  { id: 12, color: "hsl(0, 0%, 95%)", label: "White" },
  { id: 13, color: "hsl(0, 0%, 75%)", label: "Light Gray" },
  { id: 14, color: "hsl(0, 0%, 55%)", label: "Gray" },
  { id: 15, color: "hsl(0, 0%, 40%)", label: "Medium Gray" },
  { id: 16, color: "hsl(0, 0%, 25%)", label: "Dark Gray" },
  { id: 17, color: "hsl(0, 0%, 10%)", label: "Black" },
] as const;

// ============================================================================
// AVATAR ICON TYPES
// ============================================================================

export interface AvatarIcon {
  id: string;
  src: string;
  label: string;
}

// ============================================================================
// USER AVATAR ICONS (15 cinema-themed options)
// ============================================================================

export const USER_ICONS: AvatarIcon[] = [
  { id: "popcorn", src: "/images/avatars/icons/popcorn.png", label: "Popcorn" },
  { id: "3d-glasses", src: "/images/avatars/icons/3d-glasses.png", label: "3D Glasses" },
  { id: "tickets", src: "/images/avatars/icons/tickets.png", label: "Tickets" },
  { id: "bow-tie", src: "/images/avatars/icons/bow-tie.png", label: "Bow Tie" },
  { id: "costume", src: "/images/avatars/icons/costume.png", label: "Costume" },
  { id: "binoculars", src: "/images/avatars/icons/binoculars.png", label: "Opera Glasses" },
  { id: "masks", src: "/images/avatars/icons/masks.png", label: "Drama Masks" },
  { id: "mask-1", src: "/images/avatars/icons/mask-1.png", label: "Comedy Mask" },
  { id: "tragedy", src: "/images/avatars/icons/tragedy.png", label: "Tragedy Mask" },
  { id: "mask", src: "/images/avatars/icons/mask.png", label: "Masquerade Mask" },
  { id: "skull", src: "/images/avatars/icons/skull.png", label: "Skull" },
  { id: "walk-of-fame", src: "/images/avatars/icons/walk-of-fame.png", label: "Walk of Fame" },
  { id: "seat", src: "/images/avatars/icons/seat.png", label: "Theater Seat" },
  { id: "dvd", src: "/images/avatars/icons/dvd.png", label: "DVD" },
  { id: "shutter", src: "/images/avatars/icons/shutter.png", label: "Camera Shutter" },
  { id: "microphone", src: "/images/avatars/icons/microphone.png", label: "Microphone" },
  { id: "megaphone", src: "/images/avatars/icons/megaphone.png", label: "Megaphone" },
  { id: "puppet-show", src: "/images/avatars/icons/puppet-show.png", label: "Puppet Show" },
  { id: "oscar", src: "/images/avatars/icons/oscar.png", label: "Oscar" },
  { id: "award", src: "/images/avatars/icons/award.png", label: "Star Award" },
  { id: "quill", src: "/images/avatars/icons/quill.png", label: "Quill & Ink" },
  { id: "writer", src: "/images/avatars/icons/writer.png", label: "Script & Quill" },
  // Characters (scenic-arts pack)
  { id: "scenic-actor", src: "/images/avatars/icons/scenic-actor.png", label: "Actor" },
  { id: "scenic-actress", src: "/images/avatars/icons/scenic-actress.png", label: "Actress" },
  {
    id: "scenic-operator",
    src: "/images/avatars/icons/scenic-operator.png",
    label: "Camera Operator",
  },
  { id: "scenic-director", src: "/images/avatars/icons/scenic-director.png", label: "Director" },
  { id: "scenic-conductor", src: "/images/avatars/icons/scenic-conductor.png", label: "Conductor" },
  { id: "scenic-musician", src: "/images/avatars/icons/scenic-musician.png", label: "Musician" },
  { id: "scenic-dancer", src: "/images/avatars/icons/scenic-dancer.png", label: "Ballerina" },
  { id: "scenic-acrobat", src: "/images/avatars/icons/scenic-acrobat.png", label: "Acrobat" },
  { id: "scenic-clown", src: "/images/avatars/icons/scenic-clown.png", label: "Clown" },
  { id: "scenic-mime", src: "/images/avatars/icons/scenic-mime.png", label: "Mime" },
  { id: "scenic-phantom", src: "/images/avatars/icons/scenic-phantom.png", label: "Phantom" },
  { id: "scenic-hamlet", src: "/images/avatars/icons/scenic-hamlet.png", label: "Hamlet" },
];

// ============================================================================
// CLUB AVATAR ICONS (all 50 cinema-themed options + 12 characters)
// ============================================================================

export const CLUB_ICONS: AvatarIcon[] = [
  // Filmmaking & Production
  { id: "clapperboard", src: "/images/avatars/icons/clapperboard.png", label: "Clapperboard" },
  { id: "video-camera", src: "/images/avatars/icons/video-camera.png", label: "Video Camera" },
  { id: "projector", src: "/images/avatars/icons/projector.png", label: "Projector" },
  { id: "film-reel", src: "/images/avatars/icons/film-reel.png", label: "Film Reel" },
  { id: "film-strip", src: "/images/avatars/icons/film-strip.png", label: "Film Strip" },
  { id: "photograms", src: "/images/avatars/icons/photograms.png", label: "Photograms" },
  { id: "shutter", src: "/images/avatars/icons/shutter.png", label: "Camera Shutter" },
  { id: "megaphone", src: "/images/avatars/icons/megaphone.png", label: "Megaphone" },
  {
    id: "director-chair",
    src: "/images/avatars/icons/director-chair.png",
    label: "Director Chair",
  },
  { id: "writer", src: "/images/avatars/icons/writer.png", label: "Script & Quill" },
  { id: "quill", src: "/images/avatars/icons/quill.png", label: "Quill & Ink" },
  // Cinema & Viewing
  { id: "popcorn", src: "/images/avatars/icons/popcorn.png", label: "Popcorn" },
  { id: "tickets", src: "/images/avatars/icons/tickets.png", label: "Tickets" },
  { id: "cinema", src: "/images/avatars/icons/cinema.png", label: "Cinema Screen" },
  { id: "seat", src: "/images/avatars/icons/seat.png", label: "Theater Seat" },
  { id: "3d-glasses", src: "/images/avatars/icons/3d-glasses.png", label: "3D Glasses" },
  { id: "dvd", src: "/images/avatars/icons/dvd.png", label: "DVD" },
  { id: "ticket-window", src: "/images/avatars/icons/ticket-window.png", label: "Ticket Window" },
  { id: "placeholder", src: "/images/avatars/icons/placeholder.png", label: "Play Pin" },
  // Theater & Performance
  { id: "masks", src: "/images/avatars/icons/masks.png", label: "Drama Masks" },
  { id: "mask-1", src: "/images/avatars/icons/mask-1.png", label: "Comedy Mask" },
  { id: "tragedy", src: "/images/avatars/icons/tragedy.png", label: "Tragedy Mask" },
  { id: "mask", src: "/images/avatars/icons/mask.png", label: "Masquerade Mask" },
  { id: "stage", src: "/images/avatars/icons/stage.png", label: "Stage Curtains" },
  { id: "theater", src: "/images/avatars/icons/theater.png", label: "Theater" },
  { id: "spotlight", src: "/images/avatars/icons/spotlight.png", label: "Spotlight" },
  { id: "spotlights", src: "/images/avatars/icons/spotlights.png", label: "Spotlights" },
  { id: "puppet-show", src: "/images/avatars/icons/puppet-show.png", label: "Puppet Show" },
  { id: "puppet-show-1", src: "/images/avatars/icons/puppet-show-1.png", label: "Marionette" },
  { id: "ballerina", src: "/images/avatars/icons/ballerina.png", label: "Ballet Shoes" },
  { id: "costume", src: "/images/avatars/icons/costume.png", label: "Costume" },
  // Music & Sound
  { id: "microphone", src: "/images/avatars/icons/microphone.png", label: "Microphone" },
  { id: "piano", src: "/images/avatars/icons/piano.png", label: "Piano" },
  { id: "harp", src: "/images/avatars/icons/harp.png", label: "Harp" },
  { id: "hurdy-gurdy", src: "/images/avatars/icons/hurdy-gurdy.png", label: "Hurdy Gurdy" },
  { id: "levels", src: "/images/avatars/icons/levels.png", label: "Sound Mixer" },
  // Awards & Prestige
  { id: "oscar", src: "/images/avatars/icons/oscar.png", label: "Oscar" },
  { id: "award", src: "/images/avatars/icons/award.png", label: "Star Award" },
  { id: "award-1", src: "/images/avatars/icons/award-1.png", label: "Laurel Wreath" },
  { id: "walk-of-fame", src: "/images/avatars/icons/walk-of-fame.png", label: "Walk of Fame" },
  { id: "olive", src: "/images/avatars/icons/olive.png", label: "Olive Branch" },
  // Fashion & Style
  { id: "bow-tie", src: "/images/avatars/icons/bow-tie.png", label: "Bow Tie" },
  { id: "binoculars", src: "/images/avatars/icons/binoculars.png", label: "Opera Glasses" },
  { id: "bouquet", src: "/images/avatars/icons/bouquet.png", label: "Bouquet" },
  { id: "makeup", src: "/images/avatars/icons/makeup.png", label: "Makeup Table" },
  // Genre & Theme
  { id: "skull", src: "/images/avatars/icons/skull.png", label: "Skull" },
  { id: "column", src: "/images/avatars/icons/column.png", label: "Column" },
  // Misc
  { id: "tags", src: "/images/avatars/icons/tags.png", label: "Tags" },
  { id: "line", src: "/images/avatars/icons/line.png", label: "Velvet Rope" },
  {
    id: "26-prompt-boxsvg",
    src: "/images/avatars/icons/26-prompt-boxsvg.png",
    label: "Prompt Box",
  },
  // Characters (scenic-arts pack)
  { id: "scenic-actor", src: "/images/avatars/icons/scenic-actor.png", label: "Actor" },
  { id: "scenic-actress", src: "/images/avatars/icons/scenic-actress.png", label: "Actress" },
  {
    id: "scenic-operator",
    src: "/images/avatars/icons/scenic-operator.png",
    label: "Camera Operator",
  },
  { id: "scenic-director", src: "/images/avatars/icons/scenic-director.png", label: "Director" },
  { id: "scenic-conductor", src: "/images/avatars/icons/scenic-conductor.png", label: "Conductor" },
  { id: "scenic-musician", src: "/images/avatars/icons/scenic-musician.png", label: "Musician" },
  { id: "scenic-dancer", src: "/images/avatars/icons/scenic-dancer.png", label: "Ballerina" },
  { id: "scenic-acrobat", src: "/images/avatars/icons/scenic-acrobat.png", label: "Acrobat" },
  { id: "scenic-clown", src: "/images/avatars/icons/scenic-clown.png", label: "Clown" },
  { id: "scenic-mime", src: "/images/avatars/icons/scenic-mime.png", label: "Mime" },
  { id: "scenic-phantom", src: "/images/avatars/icons/scenic-phantom.png", label: "Phantom" },
  { id: "scenic-hamlet", src: "/images/avatars/icons/scenic-hamlet.png", label: "Hamlet" },
];

// ============================================================================
// SPECIAL CONSTANTS (defined before functions that use them)
// ============================================================================

/** Special border color index for site theme (admin only) */
export const THEME_BORDER_COLOR_INDEX = -1;

/** Special background color index for site theme color (sage green) */
export const THEME_BG_COLOR_INDEX = -1;

/** Special color index for dark variant of site theme (BackRow featured) */
export const THEME_DARK_COLOR_INDEX = -2;

/** Special icon ID for the BackRow site icon */
export const BACKROW_ICON_ID = "backrow";

/** SVG path for the BackRow theater icon */
export const BACKROW_ICON_PATH = `M468.387,309.37H492c11.028,0,20-8.972,20-20V22.07c0-11.028-8.972-20-20-20h-60.589c-5.522,0-10,4.478-10,10s4.478,10,10,10H492v267.3h-21.466c-2.368-25.804-24.122-46.084-50.534-46.084s-48.167,20.28-50.534,46.084h-62.932c-2.368-25.804-24.122-46.084-50.534-46.084s-48.167,20.28-50.534,46.084h-62.932c-2.368-25.804-24.122-46.084-50.534-46.084s-48.167,20.28-50.534,46.084H20V22.07h320.291c5.522,0,10-4.478,10-10s-4.478-10-10-10H20c-11.028,0-20,8.972-20,20v267.3c0,11.028,8.972,20,20,20h23.613c2.982,9.393,8.624,17.61,16.043,23.76c-14.501,7.945-25.969,21.056-31.58,37.066H20c-11.028,0-20,8.972-20,20v99.735c0,11.028,8.972,20,20,20h472c11.028,0,20-8.972,20-20v-99.735c0-11.028-8.972-20-20-20h-8.07c-3.337-9.572-8.792-18.302-16.052-25.57c-4.642-4.638-9.844-8.509-15.444-11.573C459.808,326.911,465.418,318.724,468.387,309.37z M356.076,370.196H348c-3.645,0-7.054,0.996-10,2.706c-2.946-1.71-6.355-2.706-10-2.706h-8.07c-3.337-9.572-8.792-18.302-16.052-25.57c-4.642-4.638-9.844-8.509-15.444-11.573c7.374-6.141,12.984-14.328,15.954-23.682h67.225c2.982,9.393,8.624,17.61,16.043,23.76C373.155,341.075,361.687,354.186,356.076,370.196z M184,370.196c-3.645,0-7.054,0.996-10,2.706c-2.946-1.71-6.355-2.706-10-2.706h-8.07c-3.337-9.572-8.792-18.302-16.052-25.57c-4.642-4.638-9.844-8.509-15.444-11.573c7.374-6.141,12.984-14.328,15.954-23.682h67.225c2.982,9.393,8.624,17.61,16.043,23.76c-14.501,7.945-25.969,21.056-31.58,37.066H184z M255.979,344.8c0.007,0,0.014,0,0.021,0c0.007,0,0.013,0,0.02,0c12.732,0.005,24.708,4.967,33.715,13.967c3.396,3.399,6.228,7.253,8.44,11.429h-84.326C221.976,354.963,238.11,344.808,255.979,344.8z M256,263.286c16.96,0,30.758,13.798,30.758,30.757c0,16.953-13.787,30.747-30.738,30.757c-0.007,0-0.013,0-0.02,0c-0.007,0-0.014,0-0.021,0c-16.951-0.011-30.737-13.804-30.737-30.757C225.242,277.083,239.04,263.286,256,263.286z M61.242,294.042c0-16.959,13.798-30.757,30.758-30.757s30.758,13.798,30.758,30.757c0,16.953-13.787,30.747-30.738,30.757c-0.007,0-0.013,0-0.02,0c-0.007,0-0.014,0-0.021,0C75.029,324.789,61.242,310.996,61.242,294.042z M91.979,344.8c0.007,0,0.014,0,0.021,0c0.007,0,0.013,0,0.02,0c12.732,0.005,24.708,4.967,33.715,13.967c3.396,3.399,6.228,7.253,8.44,11.429H49.849C57.976,354.963,74.11,344.808,91.979,344.8z M20,398.196a8,8,0,0,1,8-8h128a8,8,0,0,1,8,8v91.735H20V398.196z M184,398.196a8,8,0,0,1,8-8h128a8,8,0,0,1,8,8v91.735H184V398.196z M492,489.931H348V398.196a8,8,0,0,1,8-8h128a8,8,0,0,1,8,8V489.931z M453.734,358.767c3.396,3.399,6.228,7.253,8.44,11.429h-84.326c8.127-15.232,24.261-25.388,42.131-25.396c0.007,0,0.014,0,0.021,0c0.007,0,0.013,0,0.02,0C432.751,344.805,444.727,349.767,453.734,358.767z M420,324.799c-0.007,0-0.014,0-0.021,0c-16.951-0.011-30.737-13.804-30.737-30.757c0-16.959,13.798-30.757,30.758-30.757s30.758,13.798,30.758,30.757c0,16.953-13.787,30.747-30.738,30.757C420.013,324.8,420.007,324.799,420,324.799z`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the CSS color value for a given color index
 * @param colorIndex - Index into AVATAR_COLORS array (0-17), or -1 for theme-aware foreground
 * @returns CSS color string (e.g., 'hsl(140, 60%, 40%)' or 'var(--foreground)')
 */
export function getAvatarColor(colorIndex: number): string {
  // Special case: -1 means use site theme color (sage green)
  if (colorIndex === THEME_BG_COLOR_INDEX) return "var(--primary)";
  // Special case: -2 means use dark variant of site theme
  if (colorIndex === THEME_DARK_COLOR_INDEX) return "hsl(155, 25%, 16%)";
  return AVATAR_COLORS[colorIndex]?.color || AVATAR_COLORS[4].color; // Default to green
}

/**
 * Get the CSS border color value for a given color index
 * @param borderColorIndex - Index into AVATAR_COLORS array (0-17), -1 for theme color, or null/undefined for no border
 * @returns CSS color string or undefined if no border
 */
export function getAvatarBorderColor(
  borderColorIndex: number | null | undefined
): string | undefined {
  if (borderColorIndex === null || borderColorIndex === undefined) return undefined;
  // Special case: -1 means use site theme color
  if (borderColorIndex === THEME_BORDER_COLOR_INDEX) return "var(--primary)";
  // Special case: -2 means use dark variant of site theme
  if (borderColorIndex === THEME_DARK_COLOR_INDEX) return "hsl(155, 25%, 16%)";
  return AVATAR_COLORS[borderColorIndex]?.color;
}

/**
 * Get the image path for an avatar icon ID.
 * Returns null for 'letter', 'photo', or unrecognized IDs (caller should fall back to letter).
 */
export function getAvatarIconSrc(
  icon: string | null,
  iconSet: "user" | "club" = "user"
): string | null {
  if (!icon || icon === "letter" || icon === "photo") return null;

  const icons = iconSet === "club" ? CLUB_ICONS : USER_ICONS;
  const match = icons.find((i) => i.id === icon);
  if (match) return match.src;

  // Also check the other set as a fallback (e.g., user with a club icon ID after migration)
  const otherIcons = iconSet === "club" ? USER_ICONS : CLUB_ICONS;
  const otherMatch = otherIcons.find((i) => i.id === icon);
  if (otherMatch) return otherMatch.src;

  return null;
}

/**
 * Get the display icon for an avatar — returns first letter of name.
 * Used as fallback when no icon image is available.
 */
export function getAvatarLetterFallback(name: string): string {
  return name?.charAt(0)?.toUpperCase() || "?";
}

/**
 * Get a softened/desaturated version of an avatar color for backgrounds
 * Returns both the color and its HSL components for CSS custom properties
 * @param colorIndex - Index into AVATAR_COLORS array (0-17)
 * @returns Object with color string and HSL components, or null if no index
 */
export function getAvatarColorForGlow(
  colorIndex: number | null | undefined
): { color: string; h: number; s: number; l: number } | null {
  if (colorIndex === null || colorIndex === undefined) return null;
  const avatarColor = AVATAR_COLORS[colorIndex];
  if (!avatarColor) return null;

  // Parse the HSL value from the color string
  const hslMatch = avatarColor.color.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
  if (!hslMatch) return null;

  const h = parseInt(hslMatch[1], 10);
  const s = parseInt(hslMatch[2], 10);
  const l = parseInt(hslMatch[3], 10);

  return { color: avatarColor.color, h, s, l };
}

// ============================================================================
// ADMIN-ONLY COLORS
// Green (index 4) is reserved for site admins only
// ============================================================================

/** Color indexes that are restricted to admin users */
export const ADMIN_ONLY_COLOR_INDEXES = [4] as const;

/** Admin email addresses that can use restricted colors */
export const ADMIN_EMAILS = ["stephen@backrow.tv"] as const;

/**
 * Check if a color index is admin-only
 * @param colorIndex - The color index to check
 * @returns true if the color is restricted to admins
 */
export function isAdminOnlyColor(colorIndex: number): boolean {
  return ADMIN_ONLY_COLOR_INDEXES.includes(colorIndex as (typeof ADMIN_ONLY_COLOR_INDEXES)[number]);
}

/**
 * Check if a user email is an admin
 * @param email - The user's email address
 * @returns true if the user is an admin
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase() as (typeof ADMIN_EMAILS)[number]);
}

/**
 * Filter avatar colors based on admin status
 * @param isAdmin - Whether the user is an admin
 * @returns Array of colors available to the user
 */
export function getAvailableAvatarColors(isAdmin: boolean): (typeof AVATAR_COLORS)[number][] {
  if (isAdmin) return [...AVATAR_COLORS];
  return AVATAR_COLORS.filter((c) => !isAdminOnlyColor(c.id));
}
