export interface MemberActivity {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  avatarIcon: string | null;
  avatarColorIndex: number | null;
  avatarBorderColorIndex: number | null;
  email: string | null;
  username: string | null;
  hasWatched: boolean;
  watchedAt: string | null;
  rating: number | null;
}
