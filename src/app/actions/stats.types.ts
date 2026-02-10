export interface FestivalParticipationData extends Record<string, string | number> {
  month: string;
  count: number;
}

export interface RatingDistributionData extends Record<string, string | number> {
  range: string;
  count: number;
}

export interface TopRatedMovieData extends Record<string, string | number> {
  title: string;
  avgRating: number;
  ratingCount: number;
}

export interface MemberActivityData extends Record<string, string | number> {
  name: string;
  activity: number;
}

export interface FestivalCompletionData extends Record<string, string | number> {
  name: string;
  value: number;
}

export interface RatingTrendsData extends Record<string, string | number> {
  month: string;
  avgRating: number;
}
