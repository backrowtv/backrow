"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { applyStylingChanges } from "@/app/actions/apply-styling-changes";
import { FilmSlate, User } from "@phosphor-icons/react/dist/ssr";
import { CLUB_ACTIVITY_TYPES, MEMBER_ACTIVITY_TYPES } from "@/lib/activity/activity-types";
import {
  CLUB_SUBFILTER_ACTIONS,
  MEMBER_SUBFILTER_ACTIONS,
  CLUB_SUBFILTER_LABELS,
  MEMBER_SUBFILTER_LABELS,
  type ClubActivitySubFilter,
  type MemberActivitySubFilter,
} from "@/lib/activity/activity-filters";
import { formatActivityVerbiage, type ActivityDetails } from "@/lib/activity/activity-verbiage";
import { getActivityDisplayType } from "@/lib/activity/activity-display";

// Default background values
const DEFAULT_LIGHT_BG = { hue: 40, sat: 4, light: 98 };
const DEFAULT_DARK_BG = { hue: 0, sat: 0, light: 4 };

// Font options for headings - organized by category
const headingFonts = [
  // Current
  {
    name: "Space Grotesk",
    family: "'Space Grotesk', sans-serif",
    description: "Current - Geometric, modern",
    category: "current",
  },

  // Sans-Serif - Modern/Geometric
  {
    name: "Inter",
    family: "'Inter', sans-serif",
    description: "Highly readable, neutral",
    category: "sans",
  },
  {
    name: "Poppins",
    family: "'Poppins', sans-serif",
    description: "Modern geometric, friendly",
    category: "sans",
  },
  {
    name: "Montserrat",
    family: "'Montserrat', sans-serif",
    description: "Clean, professional",
    category: "sans",
  },
  {
    name: "Outfit",
    family: "'Outfit', sans-serif",
    description: "Geometric, contemporary",
    category: "sans",
  },
  {
    name: "Sora",
    family: "'Sora', sans-serif",
    description: "Geometric, modern tech",
    category: "sans",
  },
  {
    name: "Manrope",
    family: "'Manrope', sans-serif",
    description: "Modern, distinctive",
    category: "sans",
  },
  {
    name: "Plus Jakarta Sans",
    family: "'Plus Jakarta Sans', sans-serif",
    description: "Fresh, contemporary",
    category: "sans",
  },
  {
    name: "Urbanist",
    family: "'Urbanist', sans-serif",
    description: "Geometric, clean",
    category: "sans",
  },
  {
    name: "Figtree",
    family: "'Figtree', sans-serif",
    description: "Friendly geometric",
    category: "sans",
  },
  {
    name: "Onest",
    family: "'Onest', sans-serif",
    description: "Modern, approachable",
    category: "sans",
  },
  {
    name: "Geist",
    family: "'Geist', sans-serif",
    description: "Vercel's modern font",
    category: "sans",
  },

  // Sans-Serif - Humanist/Warm
  {
    name: "Nunito",
    family: "'Nunito', sans-serif",
    description: "Friendly, rounded",
    category: "sans",
  },
  {
    name: "Quicksand",
    family: "'Quicksand', sans-serif",
    description: "Rounded, friendly",
    category: "sans",
  },
  {
    name: "Raleway",
    family: "'Raleway', sans-serif",
    description: "Elegant sans-serif",
    category: "sans",
  },
  { name: "Cabin", family: "'Cabin', sans-serif", description: "Humanist, warm", category: "sans" },
  {
    name: "Karla",
    family: "'Karla', sans-serif",
    description: "Grotesque, friendly",
    category: "sans",
  },

  // Sans-Serif - Technical/Bold
  {
    name: "Archivo",
    family: "'Archivo', sans-serif",
    description: "Bold, impactful",
    category: "sans",
  },
  {
    name: "Lexend",
    family: "'Lexend', sans-serif",
    description: "Optimized for reading",
    category: "sans",
  },
  {
    name: "Rubik",
    family: "'Rubik', sans-serif",
    description: "Slightly rounded",
    category: "sans",
  },
  {
    name: "Barlow",
    family: "'Barlow', sans-serif",
    description: "Slightly condensed",
    category: "sans",
  },
  {
    name: "Exo 2",
    family: "'Exo 2', sans-serif",
    description: "Futuristic, geometric",
    category: "sans",
  },
  {
    name: "Orbitron",
    family: "'Orbitron', sans-serif",
    description: "Sci-fi, futuristic",
    category: "sans",
  },

  // Serif - Elegant/Editorial
  {
    name: "Playfair Display",
    family: "'Playfair Display', serif",
    description: "Elegant serif, editorial",
    category: "serif",
  },
  {
    name: "DM Serif Display",
    family: "'DM Serif Display', serif",
    description: "Refined, elegant",
    category: "serif",
  },
  {
    name: "Fraunces",
    family: "'Fraunces', serif",
    description: "Soft serif, quirky",
    category: "serif",
  },
  {
    name: "Libre Baskerville",
    family: "'Libre Baskerville', serif",
    description: "Classic, readable",
    category: "serif",
  },
  {
    name: "Cormorant Garamond",
    family: "'Cormorant Garamond', serif",
    description: "Elegant, display serif",
    category: "serif",
  },
  { name: "Lora", family: "'Lora', serif", description: "Contemporary serif", category: "serif" },
  {
    name: "Merriweather",
    family: "'Merriweather', serif",
    description: "Screen-optimized serif",
    category: "serif",
  },
  { name: "Bitter", family: "'Bitter', serif", description: "Slab serif, bold", category: "serif" },
  {
    name: "Roboto Slab",
    family: "'Roboto Slab', serif",
    description: "Geometric slab serif",
    category: "serif",
  },
  {
    name: "Josefin Slab",
    family: "'Josefin Slab', serif",
    description: "Elegant slab serif",
    category: "serif",
  },

  // Display/Decorative
  {
    name: "Righteous",
    family: "'Righteous', cursive",
    description: "BackRow brand font",
    category: "display",
  },
  {
    name: "Bebas Neue",
    family: "'Bebas Neue', sans-serif",
    description: "All-caps, impactful",
    category: "display",
  },
  {
    name: "Oswald",
    family: "'Oswald', sans-serif",
    description: "Condensed, bold",
    category: "display",
  },
  {
    name: "Anton",
    family: "'Anton', sans-serif",
    description: "Bold display",
    category: "display",
  },
  {
    name: "Dela Gothic One",
    family: "'Dela Gothic One', cursive",
    description: "Heavy, impactful",
    category: "display",
  },
  {
    name: "Staatliches",
    family: "'Staatliches', cursive",
    description: "Condensed display",
    category: "display",
  },
  {
    name: "Teko",
    family: "'Teko', sans-serif",
    description: "Condensed, sporty",
    category: "display",
  },
  {
    name: "Audiowide",
    family: "'Audiowide', cursive",
    description: "Tech/gaming style",
    category: "display",
  },
  {
    name: "Bungee",
    family: "'Bungee', cursive",
    description: "Bold, playful",
    category: "display",
  },
];

// Font options for body text
const bodyFonts = [
  // Current
  {
    name: "Space Grotesk",
    family: "'Space Grotesk', sans-serif",
    description: "Current - Geometric, modern",
    category: "current",
  },

  // Top Picks for Readability
  {
    name: "Inter",
    family: "'Inter', sans-serif",
    description: "Excellent readability",
    category: "recommended",
  },
  {
    name: "Source Sans 3",
    family: "'Source Sans 3', sans-serif",
    description: "Adobe's workhorse",
    category: "recommended",
  },
  {
    name: "IBM Plex Sans",
    family: "'IBM Plex Sans', sans-serif",
    description: "Technical, precise",
    category: "recommended",
  },
  {
    name: "DM Sans",
    family: "'DM Sans', sans-serif",
    description: "Low contrast, friendly",
    category: "recommended",
  },
  {
    name: "Geist",
    family: "'Geist', sans-serif",
    description: "Vercel's modern font",
    category: "recommended",
  },

  // Sans-Serif - Clean
  {
    name: "Roboto",
    family: "'Roboto', sans-serif",
    description: "Google's workhorse",
    category: "sans",
  },
  {
    name: "Open Sans",
    family: "'Open Sans', sans-serif",
    description: "Neutral, versatile",
    category: "sans",
  },
  { name: "Lato", family: "'Lato', sans-serif", description: "Warm, stable", category: "sans" },
  {
    name: "Nunito",
    family: "'Nunito', sans-serif",
    description: "Friendly, rounded",
    category: "sans",
  },
  {
    name: "Work Sans",
    family: "'Work Sans', sans-serif",
    description: "Geometric, modern",
    category: "sans",
  },
  {
    name: "Poppins",
    family: "'Poppins', sans-serif",
    description: "Modern geometric",
    category: "sans",
  },
  {
    name: "Outfit",
    family: "'Outfit', sans-serif",
    description: "Geometric, clean",
    category: "sans",
  },
  {
    name: "Plus Jakarta Sans",
    family: "'Plus Jakarta Sans', sans-serif",
    description: "Fresh, modern",
    category: "sans",
  },
  {
    name: "Manrope",
    family: "'Manrope', sans-serif",
    description: "Modern, distinctive",
    category: "sans",
  },
  {
    name: "Figtree",
    family: "'Figtree', sans-serif",
    description: "Friendly geometric",
    category: "sans",
  },
  {
    name: "Lexend",
    family: "'Lexend', sans-serif",
    description: "Optimized for reading",
    category: "sans",
  },
  {
    name: "Urbanist",
    family: "'Urbanist', sans-serif",
    description: "Clean geometric",
    category: "sans",
  },
  {
    name: "Onest",
    family: "'Onest', sans-serif",
    description: "Modern, approachable",
    category: "sans",
  },

  // Sans-Serif - Humanist
  { name: "Cabin", family: "'Cabin', sans-serif", description: "Humanist, warm", category: "sans" },
  {
    name: "Karla",
    family: "'Karla', sans-serif",
    description: "Grotesque, friendly",
    category: "sans",
  },
  {
    name: "Quicksand",
    family: "'Quicksand', sans-serif",
    description: "Rounded, soft",
    category: "sans",
  },
  {
    name: "Rubik",
    family: "'Rubik', sans-serif",
    description: "Slightly rounded",
    category: "sans",
  },
  {
    name: "Barlow",
    family: "'Barlow', sans-serif",
    description: "Slightly condensed",
    category: "sans",
  },
  { name: "Mukta", family: "'Mukta', sans-serif", description: "Clean, modern", category: "sans" },
  { name: "Hind", family: "'Hind', sans-serif", description: "Clean, versatile", category: "sans" },
  {
    name: "Mulish",
    family: "'Mulish', sans-serif",
    description: "Minimalist, clean",
    category: "sans",
  },
  {
    name: "Albert Sans",
    family: "'Albert Sans', sans-serif",
    description: "Geometric, modern",
    category: "sans",
  },
  { name: "Sora", family: "'Sora', sans-serif", description: "Geometric, tech", category: "sans" },

  // Serif - For elegant body text
  { name: "Lora", family: "'Lora', serif", description: "Contemporary serif", category: "serif" },
  {
    name: "Merriweather",
    family: "'Merriweather', serif",
    description: "Screen-optimized",
    category: "serif",
  },
  {
    name: "Libre Baskerville",
    family: "'Libre Baskerville', serif",
    description: "Classic, readable",
    category: "serif",
  },
  {
    name: "Crimson Text",
    family: "'Crimson Text', serif",
    description: "Elegant book text",
    category: "serif",
  },
  {
    name: "Source Serif 4",
    family: "'Source Serif 4', serif",
    description: "Adobe's serif",
    category: "serif",
  },
  {
    name: "PT Serif",
    family: "'PT Serif', serif",
    description: "Transitional serif",
    category: "serif",
  },
  { name: "Spectral", family: "'Spectral', serif", description: "Google serif", category: "serif" },
  {
    name: "Vollkorn",
    family: "'Vollkorn', serif",
    description: "Warm, readable",
    category: "serif",
  },
  {
    name: "EB Garamond",
    family: "'EB Garamond', serif",
    description: "Classic Garamond",
    category: "serif",
  },
  {
    name: "Literata",
    family: "'Literata', serif",
    description: "Google Books font",
    category: "serif",
  },
];

// Generate Google Fonts URL for all fonts
const allFontNames = [
  ...new Set([...headingFonts.map((f) => f.name), ...bodyFonts.map((f) => f.name)]),
];

const googleFontsUrl = `https://fonts.googleapis.com/css2?${allFontNames
  .map((name) => `family=${name.replace(/ /g, "+")}:wght@300;400;500;600;700`)
  .join("&")}&display=swap`;

// Style type with light and dark mode values
type ModeStyles = {
  light: { bg: string; text: string; border?: string };
  dark: { bg: string; text: string; border?: string };
  description: string;
};

type CardModeStyles = {
  light: { bg: string; border?: string };
  dark: { bg: string; border?: string };
  shadow?: boolean;
  radius: string;
  description: string;
};

// Default button variant styles (with light/dark modes)
const defaultButtonStyles: Record<string, ModeStyles> = {
  primary: {
    light: { bg: "hsl(156 25% 50%)", text: "hsl(0 0% 100%)" },
    dark: { bg: "hsl(156 25% 45%)", text: "hsl(0 0% 100%)" },
    description: "Main action buttons",
  },
  secondary: {
    light: { bg: "hsl(0 0% 90%)", text: "hsl(0 0% 9%)" },
    dark: { bg: "hsl(0 0% 20%)", text: "hsl(0 0% 95%)" },
    description: "Secondary actions",
  },
  ghost: {
    light: { bg: "transparent", text: "hsl(0 0% 9%)" },
    dark: { bg: "transparent", text: "hsl(0 0% 95%)" },
    description: "Subtle, minimal buttons",
  },
  outline: {
    light: { bg: "transparent", text: "hsl(0 0% 9%)", border: "hsl(0 0% 80%)" },
    dark: { bg: "transparent", text: "hsl(0 0% 95%)", border: "hsl(0 0% 30%)" },
    description: "Bordered buttons",
  },
  danger: {
    light: { bg: "hsl(0 72% 51%)", text: "hsl(0 0% 100%)" },
    dark: { bg: "hsl(0 72% 45%)", text: "hsl(0 0% 100%)" },
    description: "Destructive actions",
  },
  "club-accent": {
    light: { bg: "hsl(156 25% 50%)", text: "hsl(0 0% 100%)" },
    dark: { bg: "hsl(156 25% 45%)", text: "hsl(0 0% 100%)" },
    description: "Club-themed solid",
  },
};

// Default badge variant styles (with light/dark modes)
const defaultBadgeStyles: Record<string, ModeStyles> = {
  default: {
    light: { bg: "hsl(156 25% 50%)", text: "hsl(0 0% 100%)" },
    dark: { bg: "hsl(156 25% 45%)", text: "hsl(0 0% 100%)" },
    description: "Primary colored",
  },
  primary: {
    light: { bg: "hsl(156 25% 50%)", text: "hsl(0 0% 100%)" },
    dark: { bg: "hsl(156 25% 45%)", text: "hsl(0 0% 100%)" },
    description: "Primary colored",
  },
  secondary: {
    light: { bg: "hsl(0 0% 90%)", text: "hsl(0 0% 30%)" },
    dark: { bg: "hsl(0 0% 25%)", text: "hsl(0 0% 80%)" },
    description: "Subtle background",
  },
  outline: {
    light: { bg: "transparent", text: "hsl(0 0% 30%)", border: "hsl(0 0% 80%)" },
    dark: { bg: "transparent", text: "hsl(0 0% 80%)", border: "hsl(0 0% 40%)" },
    description: "Border only",
  },
  success: {
    light: { bg: "hsl(142 76% 36%)", text: "hsl(0 0% 100%)" },
    dark: { bg: "hsl(142 76% 30%)", text: "hsl(0 0% 100%)" },
    description: "Green success state",
  },
  danger: {
    light: { bg: "hsl(0 72% 51%)", text: "hsl(0 0% 100%)" },
    dark: { bg: "hsl(0 72% 45%)", text: "hsl(0 0% 100%)" },
    description: "Red error state",
  },
  warning: {
    light: { bg: "hsl(45 93% 47%)", text: "hsl(0 0% 0%)" },
    dark: { bg: "hsl(45 93% 40%)", text: "hsl(0 0% 0%)" },
    description: "Yellow warning state",
  },
};

// Default card variant styles (with light/dark modes)
const defaultCardStyles: Record<string, CardModeStyles> = {
  default: {
    light: { bg: "hsl(0 0% 100%)", border: "hsl(0 0% 90%)" },
    dark: { bg: "hsl(0 0% 10%)", border: "hsl(0 0% 20%)" },
    radius: "8px",
    description: "Standard card with border",
  },
  elevated: {
    light: { bg: "hsl(0 0% 100%)", border: "hsl(0 0% 90%)" },
    dark: { bg: "hsl(0 0% 10%)", border: "hsl(0 0% 20%)" },
    shadow: true,
    radius: "8px",
    description: "Card with shadow",
  },
  outlined: {
    light: { bg: "transparent", border: "hsl(0 0% 90%)" },
    dark: { bg: "transparent", border: "hsl(0 0% 25%)" },
    radius: "8px",
    description: "Transparent with border",
  },
  ghost: {
    light: { bg: "transparent" },
    dark: { bg: "transparent" },
    radius: "8px",
    description: "No background or border",
  },
  "mobile-default": {
    light: { bg: "hsl(0 0% 98%)", border: "hsl(0 0% 90%)" },
    dark: { bg: "hsl(0 0% 12%)", border: "hsl(0 0% 22%)" },
    radius: "16px",
    description: "Mobile-optimized, 16px radius",
  },
  "mobile-elevated": {
    light: { bg: "hsl(0 0% 98%)" },
    dark: { bg: "hsl(0 0% 12%)" },
    shadow: true,
    radius: "16px",
    description: "Mobile with shadow",
  },
  collapsible: {
    light: { bg: "hsl(0 0% 98%)", border: "hsl(0 0% 90%)" },
    dark: { bg: "hsl(0 0% 12%)", border: "hsl(0 0% 22%)" },
    radius: "8px",
    description: "Expandable card",
  },
};

// Button instances found in codebase with their locations (comprehensive list from 174 files)
const buttonInstances = [
  // Auth & User
  {
    id: 1,
    label: "Sign In",
    location: "Auth - Sign In",
    file: "src/app/(auth)/sign-in/SignInForm.tsx",
    currentVariant: "primary",
    category: "auth",
  },
  {
    id: 2,
    label: "Sign Up",
    location: "Auth - Sign Up",
    file: "src/components/auth/SignUpFormFields.tsx",
    currentVariant: "primary",
    category: "auth",
  },
  {
    id: 3,
    label: "Reset Password",
    location: "Auth - Password Reset",
    file: "src/app/(auth)/reset-password/ResetPasswordForm.tsx",
    currentVariant: "primary",
    category: "auth",
  },
  {
    id: 4,
    label: "Forgot Password",
    location: "Auth - Forgot Password",
    file: "src/app/(auth)/forgot-password/ForgotPasswordForm.tsx",
    currentVariant: "primary",
    category: "auth",
  },
  {
    id: 5,
    label: "Change Password",
    location: "Profile - Security",
    file: "src/components/profile/ChangePasswordModal.tsx",
    currentVariant: "primary",
    category: "auth",
  },
  {
    id: 6,
    label: "Delete Account",
    location: "Profile - Danger Zone",
    file: "src/components/profile/DeleteAccountModal.tsx",
    currentVariant: "danger",
    category: "auth",
  },

  // Club Management
  {
    id: 10,
    label: "Save Settings",
    location: "Club Settings",
    file: "src/components/clubs/SettingsForm.tsx",
    currentVariant: "primary",
    category: "clubs",
  },
  {
    id: 11,
    label: "Create Club",
    location: "Club Creation",
    file: "src/components/clubs/ClubCreationWizard.tsx",
    currentVariant: "primary",
    category: "clubs",
  },
  {
    id: 12,
    label: "Join Club",
    location: "Join by Code",
    file: "src/components/discover/JoinByCodeModal.tsx",
    currentVariant: "primary",
    category: "clubs",
  },
  {
    id: 13,
    label: "Request to Join",
    location: "Club Discovery",
    file: "src/components/clubs/JoinRequestButton.tsx",
    currentVariant: "primary",
    category: "clubs",
  },
  {
    id: 14,
    label: "Archive Club",
    location: "Danger Zone",
    file: "src/components/clubs/DeleteClubButton.tsx",
    currentVariant: "danger",
    category: "clubs",
  },
  {
    id: 15,
    label: "Transfer Ownership",
    location: "Ownership Transfer",
    file: "src/components/clubs/TransferOwnershipForm.tsx",
    currentVariant: "danger",
    category: "clubs",
  },
  {
    id: 16,
    label: "Favorite Club",
    location: "Club Card",
    file: "src/components/clubs/FavoriteButton.tsx",
    currentVariant: "ghost",
    category: "clubs",
  },
  {
    id: 17,
    label: "Invite Members",
    location: "Invitation Code",
    file: "src/components/clubs/InvitationCodeDisplay.tsx",
    currentVariant: "secondary",
    category: "clubs",
  },
  {
    id: 18,
    label: "Unblock User",
    location: "Moderation",
    file: "src/components/clubs/UnblockButton.tsx",
    currentVariant: "outline",
    category: "clubs",
  },

  // Festivals
  {
    id: 20,
    label: "Create Festival",
    location: "Festival Wizard",
    file: "src/components/festivals/FestivalWizard.tsx",
    currentVariant: "primary",
    category: "festivals",
  },
  {
    id: 21,
    label: "Start Festival",
    location: "Hero Card",
    file: "src/components/festivals/FestivalHeroCard.tsx",
    currentVariant: "primary",
    category: "festivals",
  },
  {
    id: 22,
    label: "Advance Phase",
    location: "Phase Controls",
    file: "src/components/festivals/AdvancePhaseButton.tsx",
    currentVariant: "outline",
    category: "festivals",
  },
  {
    id: 23,
    label: "End Festival",
    location: "Admin Panel",
    file: "src/components/festivals/FestivalAdminPanel.tsx",
    currentVariant: "danger",
    category: "festivals",
  },
  {
    id: 24,
    label: "View Results",
    location: "Results Modal",
    file: "src/components/results/FestivalResultsModal.tsx",
    currentVariant: "primary",
    category: "festivals",
  },
  {
    id: 25,
    label: "Calculate Results",
    location: "Results",
    file: "src/components/results/CalculateResultsButton.tsx",
    currentVariant: "primary",
    category: "festivals",
  },
  {
    id: 26,
    label: "Share Festival",
    location: "Share Button",
    file: "src/components/festivals/FestivalShareButton.tsx",
    currentVariant: "outline",
    category: "festivals",
  },
  {
    id: 27,
    label: "Add Movie",
    location: "Movie Pool",
    file: "src/components/festivals/MoviePool.tsx",
    currentVariant: "secondary",
    category: "festivals",
  },
  {
    id: 28,
    label: "Add Theme",
    location: "Theme Pool",
    file: "src/components/festivals/ThemePool.tsx",
    currentVariant: "secondary",
    category: "festivals",
  },
  {
    id: 29,
    label: "Remove Movie",
    location: "Movie Pool",
    file: "src/components/festivals/MoviePool.tsx",
    currentVariant: "danger",
    category: "festivals",
  },
  {
    id: 30,
    label: "Vote Theme",
    location: "Theme Voting",
    file: "src/components/festivals/ThemeVoting.tsx",
    currentVariant: "outline",
    category: "festivals",
  },

  // Nominations & Ratings
  {
    id: 35,
    label: "Nominate",
    location: "Nomination Form",
    file: "src/components/nominations/NominationForm.tsx",
    currentVariant: "primary",
    category: "ratings",
  },
  {
    id: 36,
    label: "Submit Rating",
    location: "Rating Modal",
    file: "src/components/ratings/RatingModal.tsx",
    currentVariant: "primary",
    category: "ratings",
  },
  {
    id: 37,
    label: "Random Pick",
    location: "Random Movie",
    file: "src/components/ratings/RandomMoviePick.tsx",
    currentVariant: "secondary",
    category: "ratings",
  },
  {
    id: 38,
    label: "Select Rubric",
    location: "Rubric Selection",
    file: "src/components/ratings/RubricSelectionModal.tsx",
    currentVariant: "primary",
    category: "ratings",
  },
  {
    id: 39,
    label: "Create Rubric",
    location: "Rubric Library",
    file: "src/components/ratings/RubricLibrary.tsx",
    currentVariant: "primary",
    category: "ratings",
  },

  // Messaging & Discussions
  {
    id: 45,
    label: "Send Message",
    location: "DM Button",
    file: "src/components/messages/DirectMessageButton.tsx",
    currentVariant: "primary",
    category: "messaging",
  },
  {
    id: 46,
    label: "Create Thread",
    location: "Discussions",
    file: "src/components/discussions/CreateThreadModal.tsx",
    currentVariant: "primary",
    category: "messaging",
  },
  {
    id: 47,
    label: "Reply",
    location: "Discussion Thread",
    file: "src/components/discussions/DiscussionThread.tsx",
    currentVariant: "primary",
    category: "messaging",
  },

  // Events & Calendar
  {
    id: 50,
    label: "Create Event",
    location: "Event Modal",
    file: "src/components/events/CreateEventModal.tsx",
    currentVariant: "primary",
    category: "events",
  },
  {
    id: 51,
    label: "RSVP",
    location: "Event Card",
    file: "src/components/events/RSVPButton.tsx",
    currentVariant: "outline",
    category: "events",
  },
  {
    id: 52,
    label: "Delete Event",
    location: "Event Card",
    file: "src/components/events/EventCard.tsx",
    currentVariant: "danger",
    category: "events",
  },

  // Navigation & UI
  {
    id: 60,
    label: "Theme Toggle",
    location: "Theme Switcher",
    file: "src/components/ui/theme-toggle.tsx",
    currentVariant: "ghost",
    category: "navigation",
  },
  {
    id: 61,
    label: "Menu Item",
    location: "Sidebar",
    file: "src/components/layout/SidebarItem.tsx",
    currentVariant: "ghost",
    category: "navigation",
  },
  {
    id: 62,
    label: "Club Switch",
    location: "Club Switcher",
    file: "src/components/layout/ClubSwitcher.tsx",
    currentVariant: "ghost",
    category: "navigation",
  },
  {
    id: 63,
    label: "Notifications",
    location: "Notification Bell",
    file: "src/components/layout/NotificationBell.tsx",
    currentVariant: "ghost",
    category: "navigation",
  },

  // Activity & Filters
  {
    id: 70,
    label: "Apply Filters",
    location: "Activity Filters",
    file: "src/components/activity/ActivityFilters.tsx",
    currentVariant: "outline",
    category: "filters",
  },
  {
    id: 71,
    label: "Clear Filters",
    location: "Activity Filters",
    file: "src/components/activity/ActivityFilters.tsx",
    currentVariant: "ghost",
    category: "filters",
  },
  {
    id: 72,
    label: "Search",
    location: "Discover Search",
    file: "src/components/discover/DiscoverSearch.tsx",
    currentVariant: "secondary",
    category: "filters",
  },
  {
    id: 73,
    label: "Filter Festivals",
    location: "Festival Filters",
    file: "src/components/discover/FestivalFilters.tsx",
    currentVariant: "outline",
    category: "filters",
  },

  // Profile & Settings
  {
    id: 80,
    label: "Save Profile",
    location: "Profile Edit",
    file: "src/components/profile/ProfileEditForm.tsx",
    currentVariant: "primary",
    category: "profile",
  },
  {
    id: 81,
    label: "Save Notifications",
    location: "Notification Settings",
    file: "src/components/profile/NotificationSettingsForm.tsx",
    currentVariant: "primary",
    category: "profile",
  },
  {
    id: 82,
    label: "Save Privacy",
    location: "Privacy Settings",
    file: "src/components/profile/PrivacySettingsForm.tsx",
    currentVariant: "primary",
    category: "profile",
  },
  {
    id: 83,
    label: "Add Future Nom",
    location: "Future Nominations",
    file: "src/components/profile/AddFutureNominationModal.tsx",
    currentVariant: "primary",
    category: "profile",
  },
  {
    id: 84,
    label: "Report User",
    location: "User Popup",
    file: "src/components/profile/ReportUserModal.tsx",
    currentVariant: "danger",
    category: "profile",
  },

  // Seasons
  {
    id: 90,
    label: "Create Season",
    location: "Season Modal",
    file: "src/components/seasons/CreateSeasonModal.tsx",
    currentVariant: "primary",
    category: "seasons",
  },
  {
    id: 91,
    label: "Edit Season",
    location: "Season Modal",
    file: "src/components/seasons/EditSeasonModal.tsx",
    currentVariant: "primary",
    category: "seasons",
  },
  {
    id: 92,
    label: "Conclude Season",
    location: "Season Actions",
    file: "src/components/seasons/ConcludeSeasonButton.tsx",
    currentVariant: "danger",
    category: "seasons",
  },

  // Marketing
  {
    id: 95,
    label: "Contact Us",
    location: "Contact Form",
    file: "src/components/marketing/ContactForm.tsx",
    currentVariant: "primary",
    category: "marketing",
  },
  {
    id: 97,
    label: "Get Pro",
    location: "Pro Modal",
    file: "src/components/marketing/ProFeaturesModal.tsx",
    currentVariant: "primary",
    category: "marketing",
  },
];

// Card instances found in codebase (comprehensive list from 95 files)
const cardInstances = [
  // Club Cards
  {
    id: 1,
    label: "Club Card",
    location: "Club listings",
    file: "src/components/clubs/ClubCard.tsx",
    currentVariant: "default",
    component: "Card",
    category: "clubs",
  },
  {
    id: 2,
    label: "Club List Card",
    location: "Club sidebar",
    file: "src/components/clubs/ClubsListCard.tsx",
    currentVariant: "default",
    component: "Card",
    category: "clubs",
  },
  {
    id: 3,
    label: "Modern Club Card",
    location: "Dashboard",
    file: "src/components/dashboard/ModernClubCard.tsx",
    currentVariant: "elevated",
    component: "Card",
    category: "clubs",
  },
  {
    id: 4,
    label: "Navigation Card",
    location: "Club navigation",
    file: "src/components/clubs/NavigationCard.tsx",
    currentVariant: "default",
    component: "Card",
    category: "clubs",
  },
  {
    id: 5,
    label: "Member Card",
    location: "Member lists",
    file: "src/components/clubs/MemberCard.tsx",
    currentVariant: "default",
    component: "Card",
    category: "clubs",
  },

  // Festival Cards
  {
    id: 10,
    label: "Festival Card",
    location: "Festival listings",
    file: "src/components/festivals/FestivalCard.tsx",
    currentVariant: "elevated",
    component: "Card",
    category: "festivals",
  },
  {
    id: 11,
    label: "Festival Hero Card",
    location: "Festival page",
    file: "src/components/festivals/FestivalHeroCard.tsx",
    currentVariant: "elevated",
    component: "Card",
    category: "festivals",
  },
  {
    id: 12,
    label: "Festival Overview",
    location: "Festival panel",
    file: "src/components/festivals/FestivalOverviewPanel.tsx",
    currentVariant: "default",
    component: "Card",
    category: "festivals",
  },
  {
    id: 13,
    label: "Festival Admin",
    location: "Admin panel",
    file: "src/components/festivals/FestivalAdminPanel.tsx",
    currentVariant: "default",
    component: "Card",
    category: "festivals",
  },
  {
    id: 14,
    label: "Festival Workflow",
    location: "Workflow hub",
    file: "src/components/festivals/FestivalWorkflowHub.tsx",
    currentVariant: "default",
    component: "Card",
    category: "festivals",
  },

  // Dashboard Cards
  {
    id: 20,
    label: "Stat Card",
    location: "Dashboard stats",
    file: "src/components/dashboard/StatCard.tsx",
    currentVariant: "elevated",
    component: "Card",
    category: "dashboard",
  },
  {
    id: 21,
    label: "Quick Actions",
    location: "Dashboard",
    file: "src/components/dashboard/QuickActionsWidget.tsx",
    currentVariant: "mobile-default",
    component: "MobileCard",
    category: "dashboard",
  },
  {
    id: 22,
    label: "Recent Activity",
    location: "Dashboard",
    file: "src/components/dashboard/RecentActivity.tsx",
    currentVariant: "default",
    component: "Card",
    category: "dashboard",
  },
  {
    id: 23,
    label: "Upcoming Festivals",
    location: "Dashboard widget",
    file: "src/components/dashboard/UpcomingFestivalsWidget.tsx",
    currentVariant: "default",
    component: "Card",
    category: "dashboard",
  },

  // Profile Cards
  {
    id: 30,
    label: "Profile Stats",
    location: "Profile page",
    file: "src/components/profile/ProfileStats.tsx",
    currentVariant: "default",
    component: "Card",
    category: "profile",
  },
  {
    id: 31,
    label: "Review Grid",
    location: "Profile reviews",
    file: "src/components/profile/ReviewGrid.tsx",
    currentVariant: "default",
    component: "Card",
    category: "profile",
  },
  {
    id: 32,
    label: "Year In Review Stats",
    location: "Year wrap",
    file: "src/components/profile/YearInReviewStats.tsx",
    currentVariant: "elevated",
    component: "Card",
    category: "profile",
  },
  {
    id: 33,
    label: "Movie History",
    location: "Watch history",
    file: "src/components/profile/MovieHistory.tsx",
    currentVariant: "default",
    component: "Card",
    category: "profile",
  },
  {
    id: 34,
    label: "Watch History",
    location: "Profile",
    file: "src/components/profile/WatchHistory.tsx",
    currentVariant: "default",
    component: "Card",
    category: "profile",
  },

  // Event Cards
  {
    id: 40,
    label: "Event Card",
    location: "Events list",
    file: "src/components/events/EventCard.tsx",
    currentVariant: "default",
    component: "Card",
    category: "events",
  },
  {
    id: 41,
    label: "Event List Card",
    location: "Events list",
    file: "src/components/events/EventsList.tsx",
    currentVariant: "default",
    component: "Card",
    category: "events",
  },
  {
    id: 42,
    label: "Past Events",
    location: "Events history",
    file: "src/components/events/PastEventsList.tsx",
    currentVariant: "ghost",
    component: "Card",
    category: "events",
  },

  // Poll Cards
  {
    id: 45,
    label: "Poll Card",
    location: "Polls list",
    file: "src/components/clubs/PollsList.tsx",
    currentVariant: "default",
    component: "Card",
    category: "polls",
  },
  {
    id: 46,
    label: "Past Polls",
    location: "Polls history",
    file: "src/components/clubs/PastPollsList.tsx",
    currentVariant: "ghost",
    component: "Card",
    category: "polls",
  },

  // Search & Results
  {
    id: 50,
    label: "Search Results",
    location: "Search page",
    file: "src/components/search/SearchResults.tsx",
    currentVariant: "default",
    component: "Card",
    category: "search",
  },
  {
    id: 51,
    label: "Nomination Card",
    location: "Nominations",
    file: "src/components/nominations/NominationCard.tsx",
    currentVariant: "default",
    component: "Card",
    category: "search",
  },

  // Messaging
  {
    id: 55,
    label: "DM List Card",
    location: "Messages",
    file: "src/components/messages/DirectMessagesList.tsx",
    currentVariant: "ghost",
    component: "Card",
    category: "messaging",
  },
  {
    id: 56,
    label: "DM View Card",
    location: "Message view",
    file: "src/components/messages/DirectMessageView.tsx",
    currentVariant: "default",
    component: "Card",
    category: "messaging",
  },

  // Ratings
  {
    id: 60,
    label: "Rating Card",
    location: "Rate movies",
    file: "src/components/ratings/RateMoviesList.tsx",
    currentVariant: "default",
    component: "Card",
    category: "ratings",
  },

  // Collapsible Cards
  {
    id: 65,
    label: "Club Resources",
    location: "Club page",
    file: "src/components/clubs/CollapsibleClubResources.tsx",
    currentVariant: "collapsible",
    component: "CollapsibleCard",
    category: "collapsible",
  },
  {
    id: 66,
    label: "Upcoming Dates",
    location: "Home",
    file: "src/components/home/UpcomingDates.tsx",
    currentVariant: "default",
    component: "Card",
    category: "collapsible",
  },
  {
    id: 67,
    label: "Calendar Container",
    location: "Calendar",
    file: "src/components/calendar/UnifiedCalendarContainer.tsx",
    currentVariant: "default",
    component: "Card",
    category: "collapsible",
  },

  // Settings Cards
  {
    id: 70,
    label: "Settings Section",
    location: "Settings",
    file: "src/components/clubs/ClubSettingsReorganized.tsx",
    currentVariant: "default",
    component: "Card",
    category: "settings",
  },
  {
    id: 71,
    label: "Danger Zone",
    location: "Settings",
    file: "src/components/clubs/DangerZoneWrapper.tsx",
    currentVariant: "outlined",
    component: "Card",
    category: "settings",
  },

  // Home Cards
  {
    id: 75,
    label: "Featured Club",
    location: "Home",
    file: "src/components/home/FeaturedClub.tsx",
    currentVariant: "elevated",
    component: "Card",
    category: "home",
  },
  {
    id: 76,
    label: "Movie of Week",
    location: "Home",
    file: "src/components/home/MovieOfWeek.tsx",
    currentVariant: "elevated",
    component: "Card",
    category: "home",
  },
  {
    id: 77,
    label: "Home Activity",
    location: "Home feed",
    file: "src/components/home/HomeActivityItem.tsx",
    currentVariant: "ghost",
    component: "Card",
    category: "home",
  },
];

// Badge instances found in codebase (comprehensive list from 46 files)
const badgeInstances = [
  // Role Badges
  {
    id: 1,
    label: "Owner",
    location: "Member roles",
    file: "src/components/clubs/RoleBadge.tsx",
    currentVariant: "primary",
    category: "roles",
  },
  {
    id: 2,
    label: "Admin",
    location: "Member roles",
    file: "src/components/clubs/RoleBadge.tsx",
    currentVariant: "secondary",
    category: "roles",
  },
  {
    id: 3,
    label: "Member",
    location: "Member roles",
    file: "src/components/clubs/RoleBadge.tsx",
    currentVariant: "outline",
    category: "roles",
  },
  {
    id: 4,
    label: "Critic",
    location: "Member roles",
    file: "src/components/clubs/MemberCard.tsx",
    currentVariant: "secondary",
    category: "roles",
  },

  // Festival Status
  {
    id: 10,
    label: "Active",
    location: "Festival status",
    file: "src/components/festivals/FestivalCard.tsx",
    currentVariant: "success",
    category: "status",
  },
  {
    id: 11,
    label: "Voting",
    location: "Festival phase",
    file: "src/components/festivals/FestivalHeroCard.tsx",
    currentVariant: "secondary",
    category: "status",
  },
  {
    id: 12,
    label: "Rating",
    location: "Festival phase",
    file: "src/components/festivals/FestivalHeroCard.tsx",
    currentVariant: "secondary",
    category: "status",
  },
  {
    id: 13,
    label: "Ended",
    location: "Festival status",
    file: "src/components/festivals/FestivalCard.tsx",
    currentVariant: "secondary",
    category: "status",
  },
  {
    id: 14,
    label: "Phase Badge",
    location: "Home mobile",
    file: "src/components/home/HomeMobileView.tsx",
    currentVariant: "secondary",
    category: "status",
  },

  // Movie Badges
  {
    id: 20,
    label: "Winner",
    location: "Movie carousel",
    file: "src/components/festivals/MovieCarousel.tsx",
    currentVariant: "primary",
    category: "movies",
  },
  {
    id: 21,
    label: "Runner Up",
    location: "Movie carousel",
    file: "src/components/festivals/MovieCarousel.tsx",
    currentVariant: "secondary",
    category: "movies",
  },
  {
    id: 22,
    label: "Your Pick",
    location: "Movie grid",
    file: "src/components/festivals/MovieGridModal.tsx",
    currentVariant: "primary",
    category: "movies",
  },
  {
    id: 23,
    label: "Theme Winner",
    location: "Movie grid",
    file: "src/components/festivals/MovieGridModal.tsx",
    currentVariant: "secondary",
    category: "movies",
  },
  {
    id: 24,
    label: "FYC Pick",
    location: "For Your Consideration",
    file: "src/components/festivals/ForYourConsiderationCarousel.tsx",
    currentVariant: "secondary",
    category: "movies",
  },

  // Progress Indicators
  {
    id: 30,
    label: "Nominations",
    location: "Progress",
    file: "src/components/festivals/FestivalProgressIndicators.tsx",
    currentVariant: "primary",
    category: "progress",
  },
  {
    id: 31,
    label: "Ratings",
    location: "Progress",
    file: "src/components/festivals/FestivalProgressIndicators.tsx",
    currentVariant: "secondary",
    category: "progress",
  },
  {
    id: 32,
    label: "Recently Played",
    location: "Endless settings",
    file: "src/components/festivals/EndlessFestivalSettings.tsx",
    currentVariant: "secondary",
    category: "progress",
  },
  {
    id: 33,
    label: "Current Theme",
    location: "Endless settings",
    file: "src/components/festivals/EndlessFestivalSettings.tsx",
    currentVariant: "primary",
    category: "progress",
  },

  // UI Feature Badges
  {
    id: 40,
    label: "New",
    location: "Sidebar",
    file: "src/components/layout/SidebarItem.tsx",
    currentVariant: "secondary",
    category: "ui",
  },
  {
    id: 41,
    label: "Pro",
    location: "Profile",
    file: "src/components/profile/ProfileSidebar.tsx",
    currentVariant: "warning",
    category: "ui",
  },
  {
    id: 42,
    label: "Verified",
    location: "Profile stats",
    file: "src/components/profile/ProfileStats.tsx",
    currentVariant: "success",
    category: "ui",
  },
  {
    id: 43,
    label: "Unread",
    location: "Messages",
    file: "src/components/messages/DirectMessagesList.tsx",
    currentVariant: "primary",
    category: "ui",
  },
  {
    id: 44,
    label: "Channel Count",
    location: "Chat sidebar",
    file: "src/components/chat/ChannelSidebar.tsx",
    currentVariant: "secondary",
    category: "ui",
  },

  // Event Badges
  {
    id: 50,
    label: "Event Type",
    location: "Event card",
    file: "src/components/events/EventCard.tsx",
    currentVariant: "outline",
    category: "events",
  },
  {
    id: 51,
    label: "Cancelled",
    location: "Past events",
    file: "src/components/events/PastEventsList.tsx",
    currentVariant: "danger",
    category: "events",
  },
  {
    id: 52,
    label: "Watch Party",
    location: "Event detail",
    file: "src/components/events/EventDetailModal.tsx",
    currentVariant: "outline",
    category: "events",
  },

  // Poll Badges
  {
    id: 55,
    label: "Poll Option",
    location: "Poll detail",
    file: "src/components/clubs/PollDetailModal.tsx",
    currentVariant: "secondary",
    category: "polls",
  },
  {
    id: 56,
    label: "Votes",
    location: "Past polls",
    file: "src/components/clubs/PastPollsList.tsx",
    currentVariant: "outline",
    category: "polls",
  },

  // Discussion Badges
  {
    id: 60,
    label: "Thread Tag",
    location: "Discussions",
    file: "src/components/discussions/DiscussionThreadList.tsx",
    currentVariant: "outline",
    category: "discussions",
  },
  {
    id: 61,
    label: "Pinned",
    location: "Discussion thread",
    file: "src/components/discussions/DiscussionThread.tsx",
    currentVariant: "secondary",
    category: "discussions",
  },

  // Calendar Badges
  {
    id: 65,
    label: "Today",
    location: "Calendar",
    file: "src/components/calendar/UnifiedCalendar.tsx",
    currentVariant: "secondary",
    category: "calendar",
  },

  // Admin Badges
  {
    id: 70,
    label: "Admin Badge",
    location: "Admin dashboard",
    file: "src/app/(dashboard)/admin/AdminDashboard.tsx",
    currentVariant: "primary",
    category: "admin",
  },
  {
    id: 71,
    label: "Curated",
    location: "Collections",
    file: "src/components/admin/CuratedCollectionsManager.tsx",
    currentVariant: "secondary",
    category: "admin",
  },

  // Movie Detail Badges
  {
    id: 75,
    label: "Genre",
    location: "Movie page",
    file: "src/app/(dashboard)/movies/[id]/page.tsx",
    currentVariant: "outline",
    category: "movies",
  },
  {
    id: 76,
    label: "History Entry",
    location: "Movie history",
    file: "src/components/movies/MovieFestivalHistory.tsx",
    currentVariant: "secondary",
    category: "movies",
  },
];

// ============================================
// ACTIVITY FEED MOCK DATA
// ============================================

// Mock activity details for each activity type
const ACTIVITY_MOCK_DETAILS: Record<string, ActivityDetails> = {
  // Club Activity - Member Changes
  member_joined: { club_name: "Film Club", club_slug: "film-club" },
  member_left: { club_name: "Film Club", club_slug: "film-club" },

  // Club Activity - Festival Events
  festival_started: {
    club_name: "Film Club",
    club_slug: "film-club",
    festival_theme: "Horror Marathon",
    festival_slug: "horror-marathon",
  },
  festival_phase_changed: {
    club_name: "Film Club",
    club_slug: "film-club",
    new_phase: "watch_rate",
    festival_theme: "Horror Marathon",
  },
  festival_results_revealed: {
    winner_title: "The Shining",
    festival_theme: "Horror Marathon",
    tmdb_id: 694,
    poster_path: "/b6ko0IKC8MdYBBPkkA1aBPLe2yz.jpg",
  },

  // Club Activity - Announcements
  announcement_posted: {
    club_name: "Film Club",
    club_slug: "film-club",
    announcement_title: "Welcome New Members!",
  },

  // Club Activity - Events & Polls
  event_created: {
    club_name: "Film Club",
    club_slug: "film-club",
    event_title: "Watch Party: Dune",
    event_id: "event-1",
  },
  event_cancelled: {
    club_name: "Film Club",
    club_slug: "film-club",
    event_title: "Watch Party: Dune",
    event_id: "event-1",
  },
  event_modified: {
    club_name: "Film Club",
    club_slug: "film-club",
    event_title: "Watch Party: Dune",
    event_id: "event-1",
  },
  poll_created: {
    club_name: "Film Club",
    club_slug: "film-club",
    poll_question: "Best Sci-Fi Movie of 2024?",
  },

  // Club Activity - Club Management
  club_name_changed: { new_name: "Cinema Circle" },
  club_archived: { club_name: "Film Club" },
  club_deleted: { club_name: "Film Club" },
  season_started: { club_name: "Film Club", club_slug: "film-club", season_name: "Summer 2024" },
  season_ended: { club_name: "Film Club", club_slug: "film-club", season_name: "Summer 2024" },
  season_dates_changed: { club_name: "Film Club", club_slug: "film-club" },
  season_renamed: {
    club_name: "Film Club",
    club_slug: "film-club",
    new_name: "Summer Blockbusters",
  },

  // Club Activity - Endless Festival
  endless_movie_added: {
    club_name: "Film Club",
    club_slug: "film-club",
    movie_title: "Inception",
    tmdb_id: 27205,
    poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
  },
  endless_movie_playing: {
    club_name: "Film Club",
    club_slug: "film-club",
    movie_title: "Inception",
    tmdb_id: 27205,
    poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
  },
  endless_movie_completed: {
    club_name: "Film Club",
    club_slug: "film-club",
    movie_title: "Inception",
    tmdb_id: 27205,
    poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
  },

  // Member Activity - Watch & Rate
  user_watched_movie: {
    movie_title: "Oppenheimer",
    tmdb_id: 872585,
    poster_path: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    club_name: "Film Club",
    festival_theme: "Biopics",
  },
  user_rated_movie: {
    movie_title: "Inception",
    tmdb_id: 27205,
    poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    rating: 9,
  },
  user_rating_changed: {
    movie_title: "Inception",
    tmdb_id: 27205,
    poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    rating: 8,
  },

  // Member Activity - Nominations
  user_nominated: {
    movie_title: "Parasite",
    tmdb_id: 496243,
    poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
  },
  user_nomination_removed: {
    movie_title: "Parasite",
    tmdb_id: 496243,
    poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
  },
  user_nomination_edited: {
    movie_title: "Parasite",
    tmdb_id: 496243,
    poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
  },

  // Member Activity - Themes
  user_theme_submitted: { theme_name: "Time Travel Movies" },
  user_theme_removed: { theme_name: "Time Travel Movies" },
  user_theme_edited: { theme_name: "Time Travel Movies" },

  // Member Activity - Movie Pool
  user_movie_pool_added: {
    movie_title: "Dune: Part Two",
    tmdb_id: 693134,
    poster_path: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
  },
  user_movie_pool_removed: {
    movie_title: "Dune: Part Two",
    tmdb_id: 693134,
    poster_path: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
  },

  // Member Activity - Future Nominations
  user_future_nomination_added: {
    movie_title: "Avatar 3",
    tmdb_id: 83533,
    poster_path: "/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
  },
  user_future_nomination_removed: {
    movie_title: "Avatar 3",
    tmdb_id: 83533,
    poster_path: "/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
  },

  // Member Activity - Badges
  user_badge_earned: { badge_name: "Film Critic" },

  // Member Activity - Club Membership
  user_joined_club: { club_name: "Film Club", club_slug: "film-club" },
  user_left_club: { club_name: "Film Club", club_slug: "film-club" },
  user_blocked: { club_name: "Film Club", club_slug: "film-club" },
  user_created_club: { club_name: "Cinema Circle", club_slug: "cinema-circle" },
  user_deleted_club: { club_name: "Cinema Circle" },
  user_archived_club: { club_name: "Cinema Circle" },

  // Combined Activity (generated by grouping)
  user_watched_and_rated: {
    movie_title: "Oppenheimer",
    tmdb_id: 872585,
    poster_path: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    rating: 9,
  },
};

// Helper to get the filter category for an activity type
function getFilterForActivity(
  action: string
): { category: "club" | "member"; filter: string; label: string } | null {
  // Check club filters
  for (const [filter, actions] of Object.entries(CLUB_SUBFILTER_ACTIONS)) {
    if (actions.includes(action)) {
      return {
        category: "club",
        filter,
        label: CLUB_SUBFILTER_LABELS[filter as ClubActivitySubFilter],
      };
    }
  }

  // Check member filters
  for (const [filter, actions] of Object.entries(MEMBER_SUBFILTER_ACTIONS)) {
    if (actions.includes(action)) {
      return {
        category: "member",
        filter,
        label: MEMBER_SUBFILTER_LABELS[filter as MemberActivitySubFilter],
      };
    }
  }

  return null;
}

// Build organized activity data for display
type ActivityShowcaseItem = {
  action: string;
  details: ActivityDetails;
  filterCategory: "club" | "member";
  filterKey: string;
  filterLabel: string;
  isClubActivity: boolean;
};

const ORGANIZED_ACTIVITIES: ActivityShowcaseItem[] = [
  // Club Activities
  ...CLUB_ACTIVITY_TYPES.map((action) => {
    const filterInfo = getFilterForActivity(action);
    return {
      action,
      details: ACTIVITY_MOCK_DETAILS[action] || {},
      filterCategory: "club" as const,
      filterKey: filterInfo?.filter || "unknown",
      filterLabel: filterInfo?.label || "Unknown",
      isClubActivity: true,
    };
  }),
  // Member Activities
  ...MEMBER_ACTIVITY_TYPES.map((action) => {
    const filterInfo = getFilterForActivity(action);
    return {
      action,
      details: ACTIVITY_MOCK_DETAILS[action] || {},
      filterCategory: "member" as const,
      filterKey: filterInfo?.filter || "unknown",
      filterLabel: filterInfo?.label || "Unknown",
      isClubActivity: false,
    };
  }),
  // Combined Activity (special case)
  {
    action: "user_watched_and_rated",
    details: ACTIVITY_MOCK_DETAILS["user_watched_and_rated"],
    filterCategory: "member" as const,
    filterKey: "watch_rate",
    filterLabel: "Watch & Rate (Combined)",
    isClubActivity: false,
  },
];

// Group activities by filter
function groupActivitiesByFilter(activities: ActivityShowcaseItem[]) {
  const groups: Record<string, ActivityShowcaseItem[]> = {};

  for (const activity of activities) {
    const key = `${activity.filterCategory}:${activity.filterKey}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(activity);
  }

  return groups;
}

export default function TestStylingPage() {
  // Background colors (HSL format)
  const [lightBgHue, setLightBgHue] = useState(40);
  const [lightBgSat, setLightBgSat] = useState(4);
  const [lightBgLight, setLightBgLight] = useState(98);

  const [darkBgHue, setDarkBgHue] = useState(0);
  const [darkBgSat, setDarkBgSat] = useState(0);
  const [darkBgLight, setDarkBgLight] = useState(4);

  // Font selections
  const [selectedHeadingFont, setSelectedHeadingFont] = useState(headingFonts[0]);
  const [selectedBodyFont, setSelectedBodyFont] = useState(bodyFonts[0]);

  // Preview mode
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");

  // Button variant overrides (for testing different styles)
  const [buttonOverrides, setButtonOverrides] = useState<Record<number, string>>({});

  // Card variant overrides
  const [cardOverrides, setCardOverrides] = useState<Record<number, string>>({});

  // Badge variant overrides
  const [badgeOverrides, setBadgeOverrides] = useState<Record<number, string>>({});

  // Category filters
  const [buttonCategoryFilter, setButtonCategoryFilter] = useState<string>("all");
  const [cardCategoryFilter, setCardCategoryFilter] = useState<string>("all");
  const [badgeCategoryFilter, setBadgeCategoryFilter] = useState<string>("all");
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<"all" | "club" | "member">(
    "all"
  );

  // Editable variant styles
  const [buttonStyles, setButtonStyles] = useState(defaultButtonStyles);
  const [badgeStyles, setBadgeStyles] = useState(defaultBadgeStyles);
  const [cardStyles, setCardStyles] = useState(defaultCardStyles);

  // Selected variant for editing
  const [selectedButtonVariant, setSelectedButtonVariant] = useState<string>("primary");
  const [selectedBadgeVariant, setSelectedBadgeVariant] = useState<string>("primary");
  const [selectedCardVariant, setSelectedCardVariant] = useState<string>("default");

  // Apply changes state
  const [isApplyingButtons, setIsApplyingButtons] = useState(false);
  const [isApplyingCards, setIsApplyingCards] = useState(false);
  const [isApplyingBadges, setIsApplyingBadges] = useState(false);
  const [applyResults, setApplyResults] = useState<
    { file: string; success: boolean; error?: string }[] | null
  >(null);
  const [showResultsModal, setShowResultsModal] = useState(false);

  // Get unique categories
  const buttonCategories = ["all", ...new Set(buttonInstances.map((b) => b.category))];
  const cardCategories = ["all", ...new Set(cardInstances.map((c) => c.category))];
  const badgeCategories = ["all", ...new Set(badgeInstances.map((b) => b.category))];

  // Filtered instances
  const filteredButtonInstances =
    buttonCategoryFilter === "all"
      ? buttonInstances
      : buttonInstances.filter((b) => b.category === buttonCategoryFilter);
  const filteredCardInstances =
    cardCategoryFilter === "all"
      ? cardInstances
      : cardInstances.filter((c) => c.category === cardCategoryFilter);

  // Helper to get current mode styles
  const getButtonStyle = (variantName: string) => {
    const variant = buttonStyles[variantName] || buttonStyles.primary;
    return previewMode === "light" ? variant.light : variant.dark;
  };

  const getBadgeStyle = (variantName: string) => {
    const variant = badgeStyles[variantName] || badgeStyles.default;
    return previewMode === "light" ? variant.light : variant.dark;
  };

  const getCardStyle = (variantName: string) => {
    const variant = cardStyles[variantName] || cardStyles.default;
    const modeStyle = previewMode === "light" ? variant.light : variant.dark;
    return { ...modeStyle, shadow: variant.shadow, radius: variant.radius };
  };
  const filteredBadgeInstances =
    badgeCategoryFilter === "all"
      ? badgeInstances
      : badgeInstances.filter((b) => b.category === badgeCategoryFilter);

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.href = googleFontsUrl;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const lightBgColor = `hsl(${lightBgHue} ${lightBgSat}% ${lightBgLight}%)`;
  const darkBgColor = `hsl(${darkBgHue} ${darkBgSat}% ${darkBgLight}%)`;

  const currentBgColor = previewMode === "light" ? lightBgColor : darkBgColor;
  const currentTextColor = previewMode === "light" ? "hsl(0 0% 9%)" : "hsl(0 0% 95%)";
  const currentMutedColor = previewMode === "light" ? "hsl(0 0% 45%)" : "hsl(0 0% 55%)";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Apply button changes to source files
  const handleApplyButtonChanges = async () => {
    const changes = buttonInstances
      .filter((b) => buttonOverrides[b.id] && buttonOverrides[b.id] !== b.currentVariant)
      .map((b) => ({
        file: b.file,
        currentVariant: b.currentVariant,
        newVariant: buttonOverrides[b.id],
        componentType: "button" as const,
      }));

    if (changes.length === 0) return;

    setIsApplyingButtons(true);
    try {
      const results = await applyStylingChanges(changes);
      setApplyResults(results);
      setShowResultsModal(true);

      // Clear successful overrides
      const successfulFiles = results.filter((r) => r.success).map((r) => r.file);
      const newOverrides = { ...buttonOverrides };
      buttonInstances.forEach((b) => {
        if (successfulFiles.includes(b.file) && newOverrides[b.id]) {
          delete newOverrides[b.id];
        }
      });
      setButtonOverrides(newOverrides);
    } catch (error) {
      console.error("Failed to apply changes:", error);
      setApplyResults([{ file: "unknown", success: false, error: String(error) }]);
      setShowResultsModal(true);
    } finally {
      setIsApplyingButtons(false);
    }
  };

  // Apply card changes to source files
  const handleApplyCardChanges = async () => {
    const changes = cardInstances
      .filter((c) => cardOverrides[c.id] && cardOverrides[c.id] !== c.currentVariant)
      .map((c) => ({
        file: c.file,
        currentVariant: c.currentVariant,
        newVariant: cardOverrides[c.id],
        componentType: "card" as const,
      }));

    if (changes.length === 0) return;

    setIsApplyingCards(true);
    try {
      const results = await applyStylingChanges(changes);
      setApplyResults(results);
      setShowResultsModal(true);

      // Clear successful overrides
      const successfulFiles = results.filter((r) => r.success).map((r) => r.file);
      const newOverrides = { ...cardOverrides };
      cardInstances.forEach((c) => {
        if (successfulFiles.includes(c.file) && newOverrides[c.id]) {
          delete newOverrides[c.id];
        }
      });
      setCardOverrides(newOverrides);
    } catch (error) {
      console.error("Failed to apply changes:", error);
      setApplyResults([{ file: "unknown", success: false, error: String(error) }]);
      setShowResultsModal(true);
    } finally {
      setIsApplyingCards(false);
    }
  };

  // Apply badge changes to source files
  const handleApplyBadgeChanges = async () => {
    const changes = badgeInstances
      .filter((b) => badgeOverrides[b.id] && badgeOverrides[b.id] !== b.currentVariant)
      .map((b) => ({
        file: b.file,
        currentVariant: b.currentVariant,
        newVariant: badgeOverrides[b.id],
        componentType: "badge" as const,
      }));

    if (changes.length === 0) return;

    setIsApplyingBadges(true);
    try {
      const results = await applyStylingChanges(changes);
      setApplyResults(results);
      setShowResultsModal(true);

      // Clear successful overrides
      const successfulFiles = results.filter((r) => r.success).map((r) => r.file);
      const newOverrides = { ...badgeOverrides };
      badgeInstances.forEach((b) => {
        if (successfulFiles.includes(b.file) && newOverrides[b.id]) {
          delete newOverrides[b.id];
        }
      });
      setBadgeOverrides(newOverrides);
    } catch (error) {
      console.error("Failed to apply changes:", error);
      setApplyResults([{ file: "unknown", success: false, error: String(error) }]);
      setShowResultsModal(true);
    } finally {
      setIsApplyingBadges(false);
    }
  };

  // Compute surface colors based on preview mode
  const surfaceColor =
    previewMode === "light"
      ? `hsl(${lightBgHue} ${Math.min(lightBgSat + 2, 100)}% ${Math.max(lightBgLight - 2, 0)}%)`
      : `hsl(${darkBgHue} ${darkBgSat}% ${Math.min(darkBgLight + 3, 100)}%)`;

  const surface2Color =
    previewMode === "light"
      ? `hsl(${lightBgHue} ${Math.min(lightBgSat + 3, 100)}% ${Math.max(lightBgLight - 5, 0)}%)`
      : `hsl(${darkBgHue} ${darkBgSat}% ${Math.min(darkBgLight + 7, 100)}%)`;

  const borderColor =
    previewMode === "light"
      ? `hsl(${lightBgHue} ${Math.min(lightBgSat + 4, 100)}% ${Math.max(lightBgLight - 10, 0)}%)`
      : `hsl(${darkBgHue} ${darkBgSat}% ${Math.min(darkBgLight + 11, 100)}%)`;

  return (
    <div
      className="p-6 space-y-8 transition-colors duration-300"
      style={{
        backgroundColor: currentBgColor,
        color: currentTextColor,
      }}
    >
      {/* Results Modal */}
      {showResultsModal && applyResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="max-w-lg w-full mx-4 p-6 rounded-lg shadow-xl"
            style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: currentTextColor }}>
              Apply Results
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {applyResults.map((result, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded text-sm"
                  style={{ backgroundColor: surface2Color }}
                >
                  <span className={result.success ? "text-green-500" : "text-red-500"}>
                    {result.success ? "✓" : "✗"}
                  </span>
                  <span className="flex-grow truncate" style={{ color: currentTextColor }}>
                    {result.file}
                  </span>
                  {"error" in result && result.error && (
                    <span className="text-xs text-red-500 truncate max-w-[200px]">
                      {result.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm" style={{ color: currentMutedColor }}>
                {applyResults.filter((r) => r.success).length}/{applyResults.length} successful
              </p>
              <button
                onClick={() => {
                  setShowResultsModal(false);
                  setApplyResults(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: "hsl(156 25% 50%)", color: "white" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ color: currentTextColor }}>
          Styling Test Page
        </h1>
        <p className="mb-8" style={{ color: currentMutedColor }}>
          Test background colors and font combinations. Changes here don&apos;t affect your actual
          site.
        </p>

        {/* Preview Mode Toggle */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setPreviewMode("light")}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: previewMode === "light" ? "hsl(156 25% 50%)" : surface2Color,
              color: previewMode === "light" ? "white" : currentTextColor,
              border: `1px solid ${borderColor}`,
            }}
          >
            Light Mode Preview
          </button>
          <button
            onClick={() => setPreviewMode("dark")}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: previewMode === "dark" ? "hsl(156 25% 50%)" : surface2Color,
              color: previewMode === "dark" ? "white" : currentTextColor,
              border: `1px solid ${borderColor}`,
            }}
          >
            Dark Mode Preview
          </button>
        </div>

        {/* Section 1: Background Colors */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4" style={{ color: currentTextColor }}>
            Background Colors
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Light Mode Background */}
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium" style={{ color: currentTextColor }}>
                  Light Mode Background
                </h3>
                <button
                  onClick={() => {
                    setLightBgHue(DEFAULT_LIGHT_BG.hue);
                    setLightBgSat(DEFAULT_LIGHT_BG.sat);
                    setLightBgLight(DEFAULT_LIGHT_BG.light);
                  }}
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={{
                    backgroundColor: surface2Color,
                    color: currentTextColor,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  Revert to Default
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm" style={{ color: currentMutedColor }}>
                    Hue: {lightBgHue}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={lightBgHue}
                    onChange={(e) => setLightBgHue(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm" style={{ color: currentMutedColor }}>
                    Saturation: {lightBgSat}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={lightBgSat}
                    onChange={(e) => setLightBgSat(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm" style={{ color: currentMutedColor }}>
                    Lightness: {lightBgLight}%
                  </label>
                  <input
                    type="range"
                    min="80"
                    max="100"
                    value={lightBgLight}
                    onChange={(e) => setLightBgLight(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div
                  className="h-20 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: lightBgColor, border: `1px solid ${borderColor}` }}
                >
                  <span style={{ color: "hsl(0 0% 9%)" }}>Sample Text</span>
                </div>
                <button
                  onClick={() => copyToClipboard(`--background: ${lightBgColor};`)}
                  className="text-sm hover:underline"
                  style={{ color: "hsl(156 25% 50%)" }}
                >
                  Copy: {lightBgColor}
                </button>
              </div>
            </div>

            {/* Dark Mode Background */}
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium" style={{ color: currentTextColor }}>
                  Dark Mode Background
                </h3>
                <button
                  onClick={() => {
                    setDarkBgHue(DEFAULT_DARK_BG.hue);
                    setDarkBgSat(DEFAULT_DARK_BG.sat);
                    setDarkBgLight(DEFAULT_DARK_BG.light);
                  }}
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={{
                    backgroundColor: surface2Color,
                    color: currentTextColor,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  Revert to Default
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm" style={{ color: currentMutedColor }}>
                    Hue: {darkBgHue}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={darkBgHue}
                    onChange={(e) => setDarkBgHue(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm" style={{ color: currentMutedColor }}>
                    Saturation: {darkBgSat}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={darkBgSat}
                    onChange={(e) => setDarkBgSat(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm" style={{ color: currentMutedColor }}>
                    Lightness: {darkBgLight}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={darkBgLight}
                    onChange={(e) => setDarkBgLight(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div
                  className="h-20 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: darkBgColor, border: `1px solid ${borderColor}` }}
                >
                  <span style={{ color: "hsl(0 0% 95%)" }}>Sample Text</span>
                </div>
                <button
                  onClick={() => copyToClipboard(`--background: ${darkBgColor};`)}
                  className="text-sm hover:underline"
                  style={{ color: "hsl(156 25% 50%)" }}
                >
                  Copy: {darkBgColor}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Font Selection */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4" style={{ color: currentTextColor }}>
            Font Selection
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Heading Fonts */}
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}
            >
              <h3 className="font-medium mb-1" style={{ color: currentTextColor }}>
                Heading Font
              </h3>
              <p className="text-xs mb-3" style={{ color: currentMutedColor }}>
                {headingFonts.length} fonts available
              </p>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {headingFonts.map((font) => (
                  <button
                    key={font.name}
                    onClick={() => setSelectedHeadingFont(font)}
                    className="w-full text-left p-3 rounded-lg transition-colors"
                    style={{
                      backgroundColor:
                        selectedHeadingFont.name === font.name
                          ? "hsla(156, 25%, 50%, 0.15)"
                          : surface2Color,
                      border:
                        selectedHeadingFont.name === font.name
                          ? "1px solid hsl(156 25% 50%)"
                          : `1px solid transparent`,
                      color: currentTextColor,
                    }}
                  >
                    <div style={{ fontFamily: font.family }} className="text-lg font-semibold">
                      {font.name}
                    </div>
                    <div className="text-xs" style={{ color: currentMutedColor }}>
                      {font.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Body Fonts */}
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}
            >
              <h3 className="font-medium mb-1" style={{ color: currentTextColor }}>
                Body Font
              </h3>
              <p className="text-xs mb-3" style={{ color: currentMutedColor }}>
                {bodyFonts.length} fonts available
              </p>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {bodyFonts.map((font) => (
                  <button
                    key={font.name}
                    onClick={() => setSelectedBodyFont(font)}
                    className="w-full text-left p-3 rounded-lg transition-colors"
                    style={{
                      backgroundColor:
                        selectedBodyFont.name === font.name
                          ? "hsla(156, 25%, 50%, 0.15)"
                          : surface2Color,
                      border:
                        selectedBodyFont.name === font.name
                          ? "1px solid hsl(156 25% 50%)"
                          : `1px solid transparent`,
                      color: currentTextColor,
                    }}
                  >
                    <div style={{ fontFamily: font.family }} className="text-base">
                      The quick brown fox jumps over the lazy dog.
                    </div>
                    <div className="text-xs mt-1" style={{ color: currentMutedColor }}>
                      {font.name} - {font.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Live Preview */}
        <section>
          <h2 className="text-2xl font-semibold mb-4" style={{ color: currentTextColor }}>
            Live Preview
          </h2>
          <p className="text-sm mb-4" style={{ color: currentMutedColor }}>
            Heading: <strong style={{ color: currentTextColor }}>{selectedHeadingFont.name}</strong>{" "}
            | Body: <strong style={{ color: currentTextColor }}>{selectedBodyFont.name}</strong>
          </p>

          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: currentBgColor, border: `1px solid ${borderColor}` }}
          >
            <div className="p-8 space-y-6">
              {/* Headings */}
              <div>
                <h1
                  style={{
                    fontFamily: selectedHeadingFont.family,
                    color: currentTextColor,
                    fontSize: "2.5rem",
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  Heading Level 1
                </h1>
                <h2
                  style={{
                    fontFamily: selectedHeadingFont.family,
                    color: currentTextColor,
                    fontSize: "1.875rem",
                    fontWeight: 600,
                    lineHeight: 1.3,
                    marginTop: "1rem",
                  }}
                >
                  Heading Level 2
                </h2>
                <h3
                  style={{
                    fontFamily: selectedHeadingFont.family,
                    color: currentTextColor,
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    lineHeight: 1.4,
                    marginTop: "0.75rem",
                  }}
                >
                  Heading Level 3
                </h3>
              </div>

              {/* Body Text */}
              <div>
                <p
                  style={{
                    fontFamily: selectedBodyFont.family,
                    color: currentTextColor,
                    fontSize: "1rem",
                    lineHeight: 1.6,
                  }}
                >
                  This is body text using {selectedBodyFont.name}. Lorem ipsum dolor sit amet,
                  consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore
                  magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.
                </p>
                <p
                  style={{
                    fontFamily: selectedBodyFont.family,
                    color: currentMutedColor,
                    fontSize: "0.875rem",
                    lineHeight: 1.5,
                    marginTop: "0.75rem",
                  }}
                >
                  This is smaller muted text, often used for descriptions and metadata.
                </p>
              </div>

              {/* Sample Card */}
              <div
                className="rounded-lg p-5 mt-6"
                style={{
                  backgroundColor: previewMode === "light" ? "hsl(0 0% 100%)" : "hsl(0 0% 8%)",
                  border: `1px solid ${previewMode === "light" ? "hsl(40 6% 88%)" : "hsl(0 0% 15%)"}`,
                }}
              >
                <h4
                  style={{
                    fontFamily: selectedHeadingFont.family,
                    color: currentTextColor,
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  Sample Card Title
                </h4>
                <p
                  style={{
                    fontFamily: selectedBodyFont.family,
                    color: currentMutedColor,
                    fontSize: "0.875rem",
                    lineHeight: 1.5,
                  }}
                >
                  This card shows how the font combination looks in a typical UI component.
                </p>
                <button
                  className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    fontFamily: selectedBodyFont.family,
                    backgroundColor: "hsl(156 25% 50%)",
                    color: "white",
                  }}
                >
                  Action Button
                </button>
              </div>
            </div>
          </div>

          {/* CSS Output */}
          <div
            className="mt-6 p-4 rounded-lg"
            style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}
          >
            <h3 className="font-medium mb-2" style={{ color: currentTextColor }}>
              CSS to Copy (when you find something you like):
            </h3>
            <pre
              className="text-sm p-3 rounded overflow-x-auto"
              style={{ backgroundColor: surface2Color, color: currentTextColor }}
            >
              {`/* Layout.tsx - import these fonts */
import { ${selectedHeadingFont.name.replace(/ /g, "_")}, ${selectedBodyFont.name.replace(/ /g, "_")} } from "next/font/google";

/* globals.css */
:root {
  --background: ${lightBgColor};
}
.dark {
  --background: ${darkBgColor};
}`}
            </pre>
            <button
              onClick={() =>
                copyToClipboard(`/* Fonts: ${selectedHeadingFont.name} (headings), ${selectedBodyFont.name} (body) */
:root {
  --background: ${lightBgColor};
}
.dark {
  --background: ${darkBgColor};
}`)
              }
              className="mt-2 text-sm hover:underline"
              style={{ color: "hsl(156 25% 50%)" }}
            >
              Copy CSS
            </button>
          </div>
        </section>

        {/* Section 4: Button Style Audit */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4" style={{ color: currentTextColor }}>
            Button Style Audit
          </h2>
          <p className="text-sm mb-6" style={{ color: currentMutedColor }}>
            Edit button variant styles directly, then see how they look across your codebase.
          </p>

          {/* Button Variant Editor */}
          <div
            className="p-4 rounded-lg mb-6"
            style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}
          >
            <h3 className="font-medium mb-3" style={{ color: currentTextColor }}>
              Edit Button Variants
            </h3>

            {/* Variant selector tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.keys(buttonStyles).map((variantName) => (
                <button
                  key={variantName}
                  onClick={() => setSelectedButtonVariant(variantName)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor:
                      selectedButtonVariant === variantName ? "hsl(156 25% 50%)" : surface2Color,
                    color: selectedButtonVariant === variantName ? "white" : currentTextColor,
                    border: `1px solid ${selectedButtonVariant === variantName ? "hsl(156 25% 50%)" : borderColor}`,
                  }}
                >
                  {variantName}
                </button>
              ))}
            </div>

            {/* Editor for selected variant */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Preview */}
              <div
                className="p-4 rounded-lg flex flex-col items-center justify-center gap-4"
                style={{ backgroundColor: surface2Color, minHeight: "120px" }}
              >
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 h-10 px-6 text-sm"
                  style={{
                    backgroundColor: getButtonStyle(selectedButtonVariant).bg,
                    color: getButtonStyle(selectedButtonVariant).text,
                    border: getButtonStyle(selectedButtonVariant).border
                      ? `1px solid ${getButtonStyle(selectedButtonVariant).border}`
                      : "none",
                  }}
                >
                  {selectedButtonVariant} Button
                </button>
                <p className="text-xs" style={{ color: currentMutedColor }}>
                  {buttonStyles[selectedButtonVariant].description}
                </p>
              </div>

              {/* Color inputs */}
              <div className="space-y-3">
                <div>
                  <label
                    className="text-xs font-medium block mb-1"
                    style={{ color: currentMutedColor }}
                  >
                    Background Color ({previewMode} mode)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={
                        getButtonStyle(selectedButtonVariant).bg === "transparent"
                          ? "#ffffff"
                          : getButtonStyle(selectedButtonVariant).bg.startsWith("hsl")
                            ? "#5ba37c"
                            : getButtonStyle(selectedButtonVariant).bg
                      }
                      onChange={(e) => {
                        const hex = e.target.value;
                        setButtonStyles((prev) => ({
                          ...prev,
                          [selectedButtonVariant]: {
                            ...prev[selectedButtonVariant],
                            [previewMode]: { ...prev[selectedButtonVariant][previewMode], bg: hex },
                          },
                        }));
                      }}
                      className="w-10 h-8 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={getButtonStyle(selectedButtonVariant).bg}
                      onChange={(e) => {
                        setButtonStyles((prev) => ({
                          ...prev,
                          [selectedButtonVariant]: {
                            ...prev[selectedButtonVariant],
                            [previewMode]: {
                              ...prev[selectedButtonVariant][previewMode],
                              bg: e.target.value,
                            },
                          },
                        }));
                      }}
                      className="flex-1 px-2 py-1 rounded text-sm"
                      style={{
                        backgroundColor: surface2Color,
                        color: currentTextColor,
                        border: `1px solid ${borderColor}`,
                      }}
                      placeholder="transparent, #hex, or hsl(...)"
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="text-xs font-medium block mb-1"
                    style={{ color: currentMutedColor }}
                  >
                    Text Color ({previewMode} mode)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={
                        getButtonStyle(selectedButtonVariant).text.startsWith("hsl")
                          ? "#ffffff"
                          : getButtonStyle(selectedButtonVariant).text
                      }
                      onChange={(e) => {
                        setButtonStyles((prev) => ({
                          ...prev,
                          [selectedButtonVariant]: {
                            ...prev[selectedButtonVariant],
                            [previewMode]: {
                              ...prev[selectedButtonVariant][previewMode],
                              text: e.target.value,
                            },
                          },
                        }));
                      }}
                      className="w-10 h-8 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={getButtonStyle(selectedButtonVariant).text}
                      onChange={(e) => {
                        setButtonStyles((prev) => ({
                          ...prev,
                          [selectedButtonVariant]: {
                            ...prev[selectedButtonVariant],
                            [previewMode]: {
                              ...prev[selectedButtonVariant][previewMode],
                              text: e.target.value,
                            },
                          },
                        }));
                      }}
                      className="flex-1 px-2 py-1 rounded text-sm"
                      style={{
                        backgroundColor: surface2Color,
                        color: currentTextColor,
                        border: `1px solid ${borderColor}`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="text-xs font-medium block mb-1"
                    style={{ color: currentMutedColor }}
                  >
                    Border Color ({previewMode} mode, optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={
                        getButtonStyle(selectedButtonVariant).border?.startsWith("hsl")
                          ? "#cccccc"
                          : getButtonStyle(selectedButtonVariant).border || "#cccccc"
                      }
                      onChange={(e) => {
                        setButtonStyles((prev) => ({
                          ...prev,
                          [selectedButtonVariant]: {
                            ...prev[selectedButtonVariant],
                            [previewMode]: {
                              ...prev[selectedButtonVariant][previewMode],
                              border: e.target.value,
                            },
                          },
                        }));
                      }}
                      className="w-10 h-8 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={getButtonStyle(selectedButtonVariant).border || ""}
                      onChange={(e) => {
                        setButtonStyles((prev) => ({
                          ...prev,
                          [selectedButtonVariant]: {
                            ...prev[selectedButtonVariant],
                            [previewMode]: {
                              ...prev[selectedButtonVariant][previewMode],
                              border: e.target.value || undefined,
                            },
                          },
                        }));
                      }}
                      className="flex-1 px-2 py-1 rounded text-sm"
                      style={{
                        backgroundColor: surface2Color,
                        color: currentTextColor,
                        border: `1px solid ${borderColor}`,
                      }}
                      placeholder="Leave empty for no border"
                    />
                  </div>
                </div>

                <button
                  onClick={() =>
                    setButtonStyles((prev) => ({
                      ...prev,
                      [selectedButtonVariant]: defaultButtonStyles[selectedButtonVariant],
                    }))
                  }
                  className="text-xs px-3 py-1.5 rounded"
                  style={{
                    backgroundColor: surface2Color,
                    color: currentMutedColor,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  Reset to Default
                </button>
              </div>
            </div>

            {/* All variants preview */}
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${borderColor}` }}>
              <h4 className="text-sm font-medium mb-3" style={{ color: currentTextColor }}>
                All Variants Preview ({previewMode} mode)
              </h4>
              <div className="flex flex-wrap gap-3">
                {Object.keys(buttonStyles).map((name) => {
                  const modeStyle = getButtonStyle(name);
                  return (
                    <button
                      key={name}
                      className="inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 h-9 px-4 text-sm"
                      style={{
                        backgroundColor: modeStyle.bg,
                        color: modeStyle.text,
                        border: modeStyle.border ? `1px solid ${modeStyle.border}` : "none",
                      }}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CSS Output */}
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${borderColor}` }}>
              <h4 className="text-sm font-medium mb-2" style={{ color: currentTextColor }}>
                Generated CSS ({previewMode} mode)
              </h4>
              <pre
                className="text-xs p-3 rounded overflow-x-auto"
                style={{ backgroundColor: surface2Color, color: currentMutedColor }}
              >
                {`/* button.tsx variant styles (${previewMode} mode) */
const variants = {
${Object.keys(buttonStyles)
  .map((name) => {
    const modeStyle = getButtonStyle(name);
    return `  ${name}: "bg-[${modeStyle.bg}] text-[${modeStyle.text}]${modeStyle.border ? ` border border-[${modeStyle.border}]` : ""}",`;
  })
  .join("\n")}
}`}
              </pre>
              <button
                onClick={() =>
                  copyToClipboard(
                    `const variants = {\n${Object.keys(buttonStyles)
                      .map((name) => {
                        const modeStyle = getButtonStyle(name);
                        return `  ${name}: "bg-[${modeStyle.bg}] text-[${modeStyle.text}]${modeStyle.border ? ` border border-[${modeStyle.border}]` : ""}",`;
                      })
                      .join("\n")}\n}`
                  )
                }
                className="mt-2 text-xs hover:underline"
                style={{ color: "hsl(156 25% 50%)" }}
              >
                Copy CSS
              </button>
            </div>
          </div>

          {/* Button Instances from Codebase */}
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium" style={{ color: currentTextColor }}>
                  Buttons in Your Codebase
                </h3>
                <p className="text-xs" style={{ color: currentMutedColor }}>
                  {buttonInstances.length} total buttons ({filteredButtonInstances.length} shown)
                </p>
              </div>
              <select
                value={buttonCategoryFilter}
                onChange={(e) => setButtonCategoryFilter(e.target.value)}
                className="text-sm rounded-md px-2 py-1.5"
                style={{
                  backgroundColor: surface2Color,
                  color: currentTextColor,
                  border: `1px solid ${borderColor}`,
                }}
              >
                {buttonCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredButtonInstances.map((instance) => {
                const currentVariantName = buttonOverrides[instance.id] || instance.currentVariant;
                const variantStyle = getButtonStyle(currentVariantName);
                const hasChanged =
                  buttonOverrides[instance.id] &&
                  buttonOverrides[instance.id] !== instance.currentVariant;

                return (
                  <div
                    key={instance.id}
                    className="flex items-center gap-4 p-3 rounded-lg"
                    style={{
                      backgroundColor: hasChanged ? "hsla(156, 25%, 50%, 0.1)" : surface2Color,
                      border: hasChanged ? "1px solid hsl(156 25% 50%)" : `1px solid transparent`,
                    }}
                  >
                    {/* Button Preview */}
                    <div className="flex-shrink-0 w-36">
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 h-9 px-4 text-sm w-full"
                        style={{
                          backgroundColor: variantStyle.bg,
                          color: variantStyle.text,
                          border: variantStyle.border ? `1px solid ${variantStyle.border}` : "none",
                        }}
                      >
                        {instance.label}
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex-grow min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: currentTextColor }}
                      >
                        {instance.location}
                      </p>
                      <p className="text-xs truncate" style={{ color: currentMutedColor }}>
                        {instance.file}
                      </p>
                    </div>

                    {/* Variant Selector */}
                    <div className="flex-shrink-0">
                      <select
                        value={currentVariantName}
                        onChange={(e) => {
                          setButtonOverrides((prev) => ({
                            ...prev,
                            [instance.id]: e.target.value,
                          }));
                        }}
                        className="text-sm rounded-md px-2 py-1.5"
                        style={{
                          backgroundColor: surface2Color,
                          color: currentTextColor,
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        {Object.keys(buttonStyles).map((variantName) => (
                          <option key={variantName} value={variantName}>
                            {variantName}
                            {variantName === instance.currentVariant ? " (current)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reset button */}
                    {hasChanged && (
                      <button
                        onClick={() => {
                          setButtonOverrides((prev) => {
                            const newOverrides = { ...prev };
                            delete newOverrides[instance.id];
                            return newOverrides;
                          });
                        }}
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: surface2Color, color: currentMutedColor }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary of Changes */}
            {Object.keys(buttonOverrides).length > 0 && (
              <div
                className="mt-4 p-3 rounded-lg"
                style={{ backgroundColor: surface2Color, border: `1px solid ${borderColor}` }}
              >
                <h4 className="text-sm font-medium mb-2" style={{ color: currentTextColor }}>
                  Proposed Changes (
                  {
                    Object.keys(buttonOverrides).filter(
                      (id) =>
                        buttonOverrides[Number(id)] !==
                        buttonInstances.find((b) => b.id === Number(id))?.currentVariant
                    ).length
                  }
                  )
                </h4>
                <pre className="text-xs overflow-x-auto" style={{ color: currentMutedColor }}>
                  {buttonInstances
                    .filter(
                      (b) => buttonOverrides[b.id] && buttonOverrides[b.id] !== b.currentVariant
                    )
                    .map(
                      (b) =>
                        `// ${b.file}\n// Change: variant="${b.currentVariant}" → variant="${buttonOverrides[b.id]}"`
                    )
                    .join("\n\n")}
                </pre>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleApplyButtonChanges}
                    disabled={isApplyingButtons}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "hsl(156 25% 50%)", color: "white" }}
                  >
                    {isApplyingButtons ? "Applying..." : "Apply Changes to Files"}
                  </button>
                  <button
                    onClick={() => {
                      const changes = buttonInstances
                        .filter(
                          (b) => buttonOverrides[b.id] && buttonOverrides[b.id] !== b.currentVariant
                        )
                        .map(
                          (b) =>
                            `// ${b.file}\n// Change: variant="${b.currentVariant}" → variant="${buttonOverrides[b.id]}"`
                        )
                        .join("\n\n");
                      copyToClipboard(changes);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: surface2Color,
                      color: currentTextColor,
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    Copy Changes
                  </button>
                  <button
                    onClick={() => setButtonOverrides({})}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: surface2Color,
                      color: currentMutedColor,
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    Reset All
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 5: Card Style Audit */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4" style={{ color: currentTextColor }}>
            Card Style Audit
          </h2>
          <p className="text-sm mb-6" style={{ color: currentMutedColor }}>
            Edit card variant styles directly. Adjust backgrounds, borders, and border radius.
          </p>

          {/* Card Variant Editor */}
          <div
            className="p-4 rounded-lg mb-6"
            style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}
          >
            <h3 className="font-medium mb-3" style={{ color: currentTextColor }}>
              Edit Card Variants
            </h3>

            {/* Variant selector tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.keys(cardStyles).map((variantName) => (
                <button
                  key={variantName}
                  onClick={() => setSelectedCardVariant(variantName)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor:
                      selectedCardVariant === variantName ? "hsl(156 25% 50%)" : surface2Color,
                    color: selectedCardVariant === variantName ? "white" : currentTextColor,
                    border: `1px solid ${selectedCardVariant === variantName ? "hsl(156 25% 50%)" : borderColor}`,
                  }}
                >
                  {variantName}
                </button>
              ))}
            </div>

            {/* Editor for selected card variant */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Preview */}
              <div
                className="p-4 rounded-lg flex flex-col items-center justify-center gap-2"
                style={{ backgroundColor: surface2Color, minHeight: "140px" }}
              >
                <div
                  className="p-4 w-full max-w-[200px]"
                  style={{
                    backgroundColor: getCardStyle(selectedCardVariant).bg,
                    border: getCardStyle(selectedCardVariant).border
                      ? `1px solid ${getCardStyle(selectedCardVariant).border}`
                      : "none",
                    borderRadius: getCardStyle(selectedCardVariant).radius,
                    boxShadow: getCardStyle(selectedCardVariant).shadow
                      ? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                      : "none",
                  }}
                >
                  <p className="text-sm font-medium" style={{ color: currentTextColor }}>
                    {selectedCardVariant}
                  </p>
                  <p className="text-xs mt-1" style={{ color: currentMutedColor }}>
                    Card preview
                  </p>
                </div>
                <p className="text-xs" style={{ color: currentMutedColor }}>
                  {cardStyles[selectedCardVariant].description}
                </p>
              </div>

              {/* Style inputs */}
              <div className="space-y-3">
                <div>
                  <label
                    className="text-xs font-medium block mb-1"
                    style={{ color: currentMutedColor }}
                  >
                    Background Color ({previewMode} mode)
                  </label>
                  <input
                    type="text"
                    value={getCardStyle(selectedCardVariant).bg}
                    onChange={(e) => {
                      setCardStyles((prev) => ({
                        ...prev,
                        [selectedCardVariant]: {
                          ...prev[selectedCardVariant],
                          [previewMode]: {
                            ...prev[selectedCardVariant][previewMode],
                            bg: e.target.value,
                          },
                        },
                      }));
                    }}
                    className="w-full px-2 py-1 rounded text-sm"
                    style={{
                      backgroundColor: surface2Color,
                      color: currentTextColor,
                      border: `1px solid ${borderColor}`,
                    }}
                    placeholder="transparent, #hex, or hsl(...)"
                  />
                </div>

                <div>
                  <label
                    className="text-xs font-medium block mb-1"
                    style={{ color: currentMutedColor }}
                  >
                    Border Color ({previewMode} mode, optional)
                  </label>
                  <input
                    type="text"
                    value={getCardStyle(selectedCardVariant).border || ""}
                    onChange={(e) => {
                      setCardStyles((prev) => ({
                        ...prev,
                        [selectedCardVariant]: {
                          ...prev[selectedCardVariant],
                          [previewMode]: {
                            ...prev[selectedCardVariant][previewMode],
                            border: e.target.value || undefined,
                          },
                        },
                      }));
                    }}
                    className="w-full px-2 py-1 rounded text-sm"
                    style={{
                      backgroundColor: surface2Color,
                      color: currentTextColor,
                      border: `1px solid ${borderColor}`,
                    }}
                    placeholder="Leave empty for no border"
                  />
                </div>

                <div>
                  <label
                    htmlFor="card-border-radius"
                    className="text-xs font-medium block mb-1"
                    style={{ color: currentMutedColor }}
                  >
                    Border Radius
                  </label>
                  <input
                    id="card-border-radius"
                    type="text"
                    value={cardStyles[selectedCardVariant].radius}
                    onChange={(e) => {
                      setCardStyles((prev) => ({
                        ...prev,
                        [selectedCardVariant]: {
                          ...prev[selectedCardVariant],
                          radius: e.target.value,
                        },
                      }));
                    }}
                    className="w-full px-2 py-1 rounded text-sm"
                    style={{
                      backgroundColor: surface2Color,
                      color: currentTextColor,
                      border: `1px solid ${borderColor}`,
                    }}
                    placeholder="8px, 16px, etc."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="card-shadow"
                    checked={cardStyles[selectedCardVariant].shadow || false}
                    onChange={(e) => {
                      setCardStyles((prev) => ({
                        ...prev,
                        [selectedCardVariant]: {
                          ...prev[selectedCardVariant],
                          shadow: e.target.checked,
                        },
                      }));
                    }}
                    className="rounded"
                  />
                  <label
                    htmlFor="card-shadow"
                    className="text-xs font-medium"
                    style={{ color: currentMutedColor }}
                  >
                    Has Shadow
                  </label>
                </div>

                <button
                  onClick={() =>
                    setCardStyles((prev) => ({
                      ...prev,
                      [selectedCardVariant]: defaultCardStyles[selectedCardVariant],
                    }))
                  }
                  className="text-xs px-3 py-1.5 rounded"
                  style={{
                    backgroundColor: surface2Color,
                    color: currentMutedColor,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  Reset to Default
                </button>
              </div>
            </div>

            {/* All card variants preview */}
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${borderColor}` }}>
              <h4 className="text-sm font-medium mb-3" style={{ color: currentTextColor }}>
                All Variants Preview ({previewMode} mode)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.keys(cardStyles).map((name) => {
                  const modeStyle = getCardStyle(name);
                  return (
                    <div
                      key={name}
                      className="p-3"
                      style={{
                        backgroundColor: modeStyle.bg,
                        border: modeStyle.border ? `1px solid ${modeStyle.border}` : "none",
                        borderRadius: modeStyle.radius,
                        boxShadow: modeStyle.shadow ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "none",
                        minHeight: "60px",
                      }}
                    >
                      <p className="text-xs font-medium" style={{ color: currentTextColor }}>
                        {name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card Instances from Codebase */}
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium" style={{ color: currentTextColor }}>
                  Cards in Your Codebase
                </h3>
                <p className="text-xs" style={{ color: currentMutedColor }}>
                  {cardInstances.length} total cards ({filteredCardInstances.length} shown)
                </p>
              </div>
              <select
                value={cardCategoryFilter}
                onChange={(e) => setCardCategoryFilter(e.target.value)}
                className="text-sm rounded-md px-2 py-1.5"
                style={{
                  backgroundColor: surface2Color,
                  color: currentTextColor,
                  border: `1px solid ${borderColor}`,
                }}
              >
                {cardCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredCardInstances.map((instance) => {
                const currentVariantName = cardOverrides[instance.id] || instance.currentVariant;
                const variantStyle = getCardStyle(currentVariantName);
                const hasChanged =
                  cardOverrides[instance.id] &&
                  cardOverrides[instance.id] !== instance.currentVariant;

                return (
                  <div
                    key={instance.id}
                    className="flex items-center gap-4 p-3 rounded-lg"
                    style={{
                      backgroundColor: hasChanged ? "hsla(156, 25%, 50%, 0.1)" : surface2Color,
                      border: hasChanged ? "1px solid hsl(156 25% 50%)" : `1px solid transparent`,
                    }}
                  >
                    {/* Card Preview */}
                    <div className="flex-shrink-0 w-32">
                      <div
                        className="p-3"
                        style={{
                          backgroundColor: variantStyle.bg,
                          border: variantStyle.border ? `1px solid ${variantStyle.border}` : "none",
                          borderRadius: variantStyle.radius,
                          boxShadow: variantStyle.shadow
                            ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                            : "none",
                          minHeight: "60px",
                        }}
                      >
                        <p
                          className="text-xs font-medium truncate"
                          style={{ color: currentTextColor }}
                        >
                          {instance.label}
                        </p>
                        <p className="text-[10px]" style={{ color: currentMutedColor }}>
                          Preview
                        </p>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-grow min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: currentTextColor }}
                      >
                        {instance.location}
                      </p>
                      <p className="text-xs truncate" style={{ color: currentMutedColor }}>
                        {instance.file}
                      </p>
                      <p className="text-[10px]" style={{ color: currentMutedColor }}>
                        Component: {instance.component}
                      </p>
                    </div>

                    {/* Variant Selector */}
                    <div className="flex-shrink-0">
                      <select
                        value={currentVariantName}
                        onChange={(e) => {
                          setCardOverrides((prev) => ({
                            ...prev,
                            [instance.id]: e.target.value,
                          }));
                        }}
                        className="text-sm rounded-md px-2 py-1.5"
                        style={{
                          backgroundColor: surface2Color,
                          color: currentTextColor,
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        {Object.keys(cardStyles).map((variantName) => (
                          <option key={variantName} value={variantName}>
                            {variantName}
                            {variantName === instance.currentVariant ? " (current)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reset button */}
                    {hasChanged && (
                      <button
                        onClick={() => {
                          setCardOverrides((prev) => {
                            const newOverrides = { ...prev };
                            delete newOverrides[instance.id];
                            return newOverrides;
                          });
                        }}
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: surface2Color, color: currentMutedColor }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary of Card Changes */}
            {Object.keys(cardOverrides).length > 0 && (
              <div
                className="mt-4 p-3 rounded-lg"
                style={{ backgroundColor: surface2Color, border: `1px solid ${borderColor}` }}
              >
                <h4 className="text-sm font-medium mb-2" style={{ color: currentTextColor }}>
                  Proposed Changes (
                  {
                    Object.keys(cardOverrides).filter(
                      (id) =>
                        cardOverrides[Number(id)] !==
                        cardInstances.find((c) => c.id === Number(id))?.currentVariant
                    ).length
                  }
                  )
                </h4>
                <pre className="text-xs overflow-x-auto" style={{ color: currentMutedColor }}>
                  {cardInstances
                    .filter((c) => cardOverrides[c.id] && cardOverrides[c.id] !== c.currentVariant)
                    .map(
                      (c) =>
                        `// ${c.file}\n// Change: variant="${c.currentVariant}" → variant="${cardOverrides[c.id]}"`
                    )
                    .join("\n\n")}
                </pre>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleApplyCardChanges}
                    disabled={isApplyingCards}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "hsl(156 25% 50%)", color: "white" }}
                  >
                    {isApplyingCards ? "Applying..." : "Apply Changes to Files"}
                  </button>
                  <button
                    onClick={() => {
                      const changes = cardInstances
                        .filter(
                          (c) => cardOverrides[c.id] && cardOverrides[c.id] !== c.currentVariant
                        )
                        .map(
                          (c) =>
                            `// ${c.file}\n// Change: variant="${c.currentVariant}" → variant="${cardOverrides[c.id]}"`
                        )
                        .join("\n\n");
                      copyToClipboard(changes);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: surface2Color,
                      color: currentTextColor,
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    Copy Changes
                  </button>
                  <button
                    onClick={() => setCardOverrides({})}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: surface2Color,
                      color: currentMutedColor,
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    Reset All
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 6: Badge Style Audit */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4" style={{ color: currentTextColor }}>
            Badge Style Audit
          </h2>
          <p className="text-sm mb-6" style={{ color: currentMutedColor }}>
            Edit badge variant styles directly. Adjust colors for status indicators across your app.
          </p>

          {/* Badge Variant Editor */}
          <div
            className="p-4 rounded-lg mb-6"
            style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}
          >
            <h3 className="font-medium mb-3" style={{ color: currentTextColor }}>
              Edit Badge Variants
            </h3>

            {/* Variant selector tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.keys(badgeStyles).map((variantName) => (
                <button
                  key={variantName}
                  onClick={() => setSelectedBadgeVariant(variantName)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor:
                      selectedBadgeVariant === variantName ? "hsl(156 25% 50%)" : surface2Color,
                    color: selectedBadgeVariant === variantName ? "white" : currentTextColor,
                    border: `1px solid ${selectedBadgeVariant === variantName ? "hsl(156 25% 50%)" : borderColor}`,
                  }}
                >
                  {variantName}
                </button>
              ))}
            </div>

            {/* Editor for selected badge variant */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Preview */}
              <div
                className="p-4 rounded-lg flex flex-col items-center justify-center gap-4"
                style={{ backgroundColor: surface2Color, minHeight: "100px" }}
              >
                <span
                  className="inline-flex items-center rounded-md font-medium px-3 py-1 text-sm"
                  style={{
                    backgroundColor: getBadgeStyle(selectedBadgeVariant).bg,
                    color: getBadgeStyle(selectedBadgeVariant).text,
                    border: getBadgeStyle(selectedBadgeVariant).border
                      ? `1px solid ${getBadgeStyle(selectedBadgeVariant).border}`
                      : "none",
                  }}
                >
                  {selectedBadgeVariant}
                </span>
                <p className="text-xs" style={{ color: currentMutedColor }}>
                  {badgeStyles[selectedBadgeVariant].description}
                </p>
              </div>

              {/* Color inputs */}
              <div className="space-y-3">
                <div>
                  <label
                    className="text-xs font-medium block mb-1"
                    style={{ color: currentMutedColor }}
                  >
                    Background Color ({previewMode} mode)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={
                        getBadgeStyle(selectedBadgeVariant).bg === "transparent"
                          ? "#ffffff"
                          : getBadgeStyle(selectedBadgeVariant).bg.startsWith("hsl")
                            ? "#5ba37c"
                            : getBadgeStyle(selectedBadgeVariant).bg
                      }
                      onChange={(e) => {
                        setBadgeStyles((prev) => ({
                          ...prev,
                          [selectedBadgeVariant]: {
                            ...prev[selectedBadgeVariant],
                            [previewMode]: {
                              ...prev[selectedBadgeVariant][previewMode],
                              bg: e.target.value,
                            },
                          },
                        }));
                      }}
                      className="w-10 h-8 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={getBadgeStyle(selectedBadgeVariant).bg}
                      onChange={(e) => {
                        setBadgeStyles((prev) => ({
                          ...prev,
                          [selectedBadgeVariant]: {
                            ...prev[selectedBadgeVariant],
                            [previewMode]: {
                              ...prev[selectedBadgeVariant][previewMode],
                              bg: e.target.value,
                            },
                          },
                        }));
                      }}
                      className="flex-1 px-2 py-1 rounded text-sm"
                      style={{
                        backgroundColor: surface2Color,
                        color: currentTextColor,
                        border: `1px solid ${borderColor}`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="text-xs font-medium block mb-1"
                    style={{ color: currentMutedColor }}
                  >
                    Text Color ({previewMode} mode)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={
                        getBadgeStyle(selectedBadgeVariant).text.startsWith("hsl")
                          ? "#ffffff"
                          : getBadgeStyle(selectedBadgeVariant).text
                      }
                      onChange={(e) => {
                        setBadgeStyles((prev) => ({
                          ...prev,
                          [selectedBadgeVariant]: {
                            ...prev[selectedBadgeVariant],
                            [previewMode]: {
                              ...prev[selectedBadgeVariant][previewMode],
                              text: e.target.value,
                            },
                          },
                        }));
                      }}
                      className="w-10 h-8 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={getBadgeStyle(selectedBadgeVariant).text}
                      onChange={(e) => {
                        setBadgeStyles((prev) => ({
                          ...prev,
                          [selectedBadgeVariant]: {
                            ...prev[selectedBadgeVariant],
                            [previewMode]: {
                              ...prev[selectedBadgeVariant][previewMode],
                              text: e.target.value,
                            },
                          },
                        }));
                      }}
                      className="flex-1 px-2 py-1 rounded text-sm"
                      style={{
                        backgroundColor: surface2Color,
                        color: currentTextColor,
                        border: `1px solid ${borderColor}`,
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={() =>
                    setBadgeStyles((prev) => ({
                      ...prev,
                      [selectedBadgeVariant]: defaultBadgeStyles[selectedBadgeVariant],
                    }))
                  }
                  className="text-xs px-3 py-1.5 rounded"
                  style={{
                    backgroundColor: surface2Color,
                    color: currentMutedColor,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  Reset to Default
                </button>
              </div>
            </div>

            {/* All badge variants preview */}
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${borderColor}` }}>
              <h4 className="text-sm font-medium mb-3" style={{ color: currentTextColor }}>
                All Variants Preview ({previewMode} mode)
              </h4>
              <div className="flex flex-wrap gap-3">
                {Object.keys(badgeStyles).map((name) => {
                  const modeStyle = getBadgeStyle(name);
                  return (
                    <span
                      key={name}
                      className="inline-flex items-center rounded-md font-medium px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: modeStyle.bg,
                        color: modeStyle.text,
                        border: modeStyle.border ? `1px solid ${modeStyle.border}` : "none",
                      }}
                    >
                      {name}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Badge Instances from Codebase */}
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium" style={{ color: currentTextColor }}>
                  Badges in Your Codebase
                </h3>
                <p className="text-xs" style={{ color: currentMutedColor }}>
                  {badgeInstances.length} total badges ({filteredBadgeInstances.length} shown)
                </p>
              </div>
              <select
                value={badgeCategoryFilter}
                onChange={(e) => setBadgeCategoryFilter(e.target.value)}
                className="text-sm rounded-md px-2 py-1.5"
                style={{
                  backgroundColor: surface2Color,
                  color: currentTextColor,
                  border: `1px solid ${borderColor}`,
                }}
              >
                {badgeCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {filteredBadgeInstances.map((instance) => {
                const currentVariantName = badgeOverrides[instance.id] || instance.currentVariant;
                const variantStyle = getBadgeStyle(currentVariantName);
                const hasChanged =
                  badgeOverrides[instance.id] &&
                  badgeOverrides[instance.id] !== instance.currentVariant;

                return (
                  <div
                    key={instance.id}
                    className="flex items-center gap-4 p-3 rounded-lg"
                    style={{
                      backgroundColor: hasChanged ? "hsla(156, 25%, 50%, 0.1)" : surface2Color,
                      border: hasChanged ? "1px solid hsl(156 25% 50%)" : `1px solid transparent`,
                    }}
                  >
                    {/* Badge Preview */}
                    <div className="flex-shrink-0 w-24">
                      <span
                        className="inline-flex items-center rounded-md font-medium px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: variantStyle.bg,
                          color: variantStyle.text,
                          border: variantStyle.border ? `1px solid ${variantStyle.border}` : "none",
                        }}
                      >
                        {instance.label}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-grow min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: currentTextColor }}
                      >
                        {instance.location}
                      </p>
                      <p className="text-xs truncate" style={{ color: currentMutedColor }}>
                        {instance.file}
                      </p>
                    </div>

                    {/* Variant Selector */}
                    <div className="flex-shrink-0">
                      <select
                        value={currentVariantName}
                        onChange={(e) => {
                          setBadgeOverrides((prev) => ({
                            ...prev,
                            [instance.id]: e.target.value,
                          }));
                        }}
                        className="text-sm rounded-md px-2 py-1.5"
                        style={{
                          backgroundColor: surface2Color,
                          color: currentTextColor,
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        {Object.keys(badgeStyles).map((variantName) => (
                          <option key={variantName} value={variantName}>
                            {variantName}
                            {variantName === instance.currentVariant ? " (current)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reset button */}
                    {hasChanged && (
                      <button
                        onClick={() => {
                          setBadgeOverrides((prev) => {
                            const newOverrides = { ...prev };
                            delete newOverrides[instance.id];
                            return newOverrides;
                          });
                        }}
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: surface2Color, color: currentMutedColor }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary of Badge Changes */}
            {Object.keys(badgeOverrides).length > 0 && (
              <div
                className="mt-4 p-3 rounded-lg"
                style={{ backgroundColor: surface2Color, border: `1px solid ${borderColor}` }}
              >
                <h4 className="text-sm font-medium mb-2" style={{ color: currentTextColor }}>
                  Proposed Changes (
                  {
                    Object.keys(badgeOverrides).filter(
                      (id) =>
                        badgeOverrides[Number(id)] !==
                        badgeInstances.find((b) => b.id === Number(id))?.currentVariant
                    ).length
                  }
                  )
                </h4>
                <pre className="text-xs overflow-x-auto" style={{ color: currentMutedColor }}>
                  {badgeInstances
                    .filter(
                      (b) => badgeOverrides[b.id] && badgeOverrides[b.id] !== b.currentVariant
                    )
                    .map(
                      (b) =>
                        `// ${b.file}\n// Change: variant="${b.currentVariant}" → variant="${badgeOverrides[b.id]}"`
                    )
                    .join("\n\n")}
                </pre>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleApplyBadgeChanges}
                    disabled={isApplyingBadges}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "hsl(156 25% 50%)", color: "white" }}
                  >
                    {isApplyingBadges ? "Applying..." : "Apply Changes to Files"}
                  </button>
                  <button
                    onClick={() => {
                      const changes = badgeInstances
                        .filter(
                          (b) => badgeOverrides[b.id] && badgeOverrides[b.id] !== b.currentVariant
                        )
                        .map(
                          (b) =>
                            `// ${b.file}\n// Change: variant="${b.currentVariant}" → variant="${badgeOverrides[b.id]}"`
                        )
                        .join("\n\n");
                      copyToClipboard(changes);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: surface2Color,
                      color: currentTextColor,
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    Copy Changes
                  </button>
                  <button
                    onClick={() => setBadgeOverrides({})}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: surface2Color,
                      color: currentMutedColor,
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    Reset All
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ============================================ */}
        {/* Activity Feed Line Items Section */}
        {/* ============================================ */}
        <section className="space-y-4">
          <div
            className="p-4 rounded-xl"
            style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: currentTextColor }}>
                Activity Feed Line Items
              </h2>
              <span
                className="text-xs px-2 py-1 rounded"
                style={{ backgroundColor: surface2Color, color: currentMutedColor }}
              >
                {ORGANIZED_ACTIVITIES.length} types
              </span>
            </div>

            <p className="text-sm mb-4" style={{ color: currentMutedColor }}>
              Every activity type that can appear in the activity feed, organized by filter
              category.
            </p>

            {/* Category Filter Tabs */}
            <div className="flex gap-2 mb-6">
              {(["all", "club", "member"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActivityCategoryFilter(cat)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor:
                      activityCategoryFilter === cat ? "hsl(156 25% 50%)" : surface2Color,
                    color: activityCategoryFilter === cat ? "white" : currentTextColor,
                  }}
                >
                  {cat === "all" ? "All" : cat === "club" ? "Club Activity" : "My Activity"}
                  <span className="ml-1.5 text-xs opacity-70">
                    (
                    {cat === "all"
                      ? ORGANIZED_ACTIVITIES.length
                      : ORGANIZED_ACTIVITIES.filter((a) => a.filterCategory === cat).length}
                    )
                  </span>
                </button>
              ))}
            </div>

            {/* Activity Items by Filter Group */}
            <div className="space-y-6">
              {Object.entries(
                groupActivitiesByFilter(
                  activityCategoryFilter === "all"
                    ? ORGANIZED_ACTIVITIES
                    : ORGANIZED_ACTIVITIES.filter(
                        (a) => a.filterCategory === activityCategoryFilter
                      )
                )
              ).map(([groupKey, activities]) => {
                const [category, filterKey] = groupKey.split(":");
                const filterLabel = activities[0]?.filterLabel || filterKey;
                const isClubCategory = category === "club";

                return (
                  <div key={groupKey}>
                    {/* Filter Group Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-grow" style={{ backgroundColor: borderColor }} />
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: isClubCategory ? "hsl(200 50% 20%)" : "hsl(280 50% 20%)",
                          color: isClubCategory ? "hsl(200 80% 80%)" : "hsl(280 80% 80%)",
                        }}
                      >
                        {isClubCategory ? "Club" : "My Activity"}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: currentTextColor }}>
                        {filterLabel}
                      </span>
                      <div className="h-px flex-grow" style={{ backgroundColor: borderColor }} />
                    </div>

                    {/* Activity Items in this Filter */}
                    <div className="space-y-2">
                      {activities.map((activity) => {
                        const displayType = getActivityDisplayType(
                          activity.action,
                          activity.isClubActivity
                        );
                        const verbiage = formatActivityVerbiage(
                          activity.action,
                          activity.details,
                          1,
                          activity.isClubActivity
                        );
                        const posterPath = activity.details.poster_path;
                        const posterUrl = posterPath
                          ? `https://image.tmdb.org/t/p/w185${posterPath}`
                          : null;

                        return (
                          <div
                            key={activity.action}
                            className="flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ backgroundColor: surface2Color }}
                          >
                            {/* Activity Type Badge */}
                            <div className="flex-shrink-0 w-40">
                              <code
                                className="text-[10px] px-1.5 py-0.5 rounded font-mono break-all"
                                style={{
                                  backgroundColor:
                                    previewMode === "light" ? "hsl(0 0% 90%)" : "hsl(0 0% 20%)",
                                  color:
                                    previewMode === "light" ? "hsl(0 0% 30%)" : "hsl(0 0% 70%)",
                                }}
                              >
                                {activity.action}
                              </code>
                            </div>

                            {/* Live Activity Line Item Preview */}
                            <div className="flex-grow min-w-0">
                              <div className="flex items-center gap-2.5">
                                {/* Display Image */}
                                <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
                                  {displayType === "movie_poster" ? (
                                    posterUrl ? (
                                      <div
                                        className="w-[19px] h-7 rounded-sm overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-black/20"
                                        style={{ backgroundColor: surface2Color }}
                                      >
                                        <Image
                                          src={posterUrl}
                                          alt={activity.details.movie_title || "Movie poster"}
                                          width={19}
                                          height={28}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div
                                        className="w-[19px] h-7 rounded-sm flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-black/20"
                                        style={{ backgroundColor: surface2Color }}
                                      >
                                        <FilmSlate
                                          className="w-3 h-3"
                                          style={{ color: currentMutedColor }}
                                          weight="fill"
                                        />
                                      </div>
                                    )
                                  ) : (
                                    <div
                                      className="w-7 h-7 rounded-full flex items-center justify-center"
                                      style={{ backgroundColor: "hsl(156 25% 50%)" }}
                                    >
                                      <User className="w-4 h-4 text-white" weight="bold" />
                                    </div>
                                  )}
                                </div>

                                {/* Content */}
                                <p className="flex-1 min-w-0 text-xs truncate">
                                  {displayType !== "movie_poster" && !activity.isClubActivity && (
                                    <>
                                      <span
                                        className="font-medium"
                                        style={{ color: currentTextColor }}
                                      >
                                        You
                                      </span>{" "}
                                    </>
                                  )}
                                  <span style={{ color: currentMutedColor }}>{verbiage}</span>
                                </p>

                                {/* Mock Time */}
                                <span
                                  className="text-[10px] flex-shrink-0"
                                  style={{ color: currentMutedColor }}
                                >
                                  2h ago
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div
              className="mt-6 p-3 rounded-lg"
              style={{ backgroundColor: surface2Color, border: `1px solid ${borderColor}` }}
            >
              <h4 className="text-sm font-medium mb-2" style={{ color: currentTextColor }}>
                Activity Type Summary
              </h4>
              <div
                className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs"
                style={{ color: currentMutedColor }}
              >
                <div>
                  <span className="font-medium" style={{ color: currentTextColor }}>
                    Club Activities:
                  </span>{" "}
                  {CLUB_ACTIVITY_TYPES.length} types
                </div>
                <div>
                  <span className="font-medium" style={{ color: currentTextColor }}>
                    Member Activities:
                  </span>{" "}
                  {MEMBER_ACTIVITY_TYPES.length} types
                </div>
                <div>
                  <span className="font-medium" style={{ color: currentTextColor }}>
                    Combined Types:
                  </span>{" "}
                  1 type
                </div>
                <div>
                  <span className="font-medium" style={{ color: currentTextColor }}>
                    Club Filters:
                  </span>{" "}
                  {Object.keys(CLUB_SUBFILTER_LABELS).length}
                </div>
                <div>
                  <span className="font-medium" style={{ color: currentTextColor }}>
                    Member Filters:
                  </span>{" "}
                  {Object.keys(MEMBER_SUBFILTER_LABELS).length}
                </div>
                <div>
                  <span className="font-medium" style={{ color: currentTextColor }}>
                    Total:
                  </span>{" "}
                  {ORGANIZED_ACTIVITIES.length} activity types
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
