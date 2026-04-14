"use client";

import type { Icon, IconWeight } from "@phosphor-icons/react";
import {
  Sword,
  Compass,
  PaintBrush,
  SmileyWink,
  Detective,
  VideoCamera,
  MaskHappy,
  UsersThree,
  MagicWand,
  HourglassSimple,
  Skull,
  MusicNote,
  MagnifyingGlass,
  Heart,
  Atom,
  Lightning,
  ShieldChevron,
  Mountains,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const GENRE_ICON_MAP: Record<string, Icon> = {
  action: Sword,
  adventure: Compass,
  animation: PaintBrush,
  comedy: SmileyWink,
  crime: Detective,
  documentary: VideoCamera,
  drama: MaskHappy,
  family: UsersThree,
  fantasy: MagicWand,
  history: HourglassSimple,
  horror: Skull,
  music: MusicNote,
  mystery: MagnifyingGlass,
  romance: Heart,
  "sci-fi": Atom,
  thriller: Lightning,
  war: ShieldChevron,
  western: Mountains,
};

export function getGenreIcon(slug: string): Icon | undefined {
  return GENRE_ICON_MAP[slug];
}

interface GenreIconProps {
  slug: string;
  size?: number;
  weight?: IconWeight;
  className?: string;
}

export function GenreIcon({ slug, size = 16, weight = "bold", className }: GenreIconProps) {
  const IconComponent = GENRE_ICON_MAP[slug];
  if (!IconComponent) return null;

  return <IconComponent size={size} weight={weight} className={cn(className)} />;
}
