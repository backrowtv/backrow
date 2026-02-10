import type { RatingRubric } from "@/types/club-settings";

export interface UserRubric {
  id: string;
  user_id: string;
  name: string;
  categories: RatingRubric[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface FestivalRubricLock {
  id: string;
  festival_id: string;
  user_id: string;
  rubric_id: string | null;
  rubric_snapshot: {
    id?: string;
    name: string;
    categories: RatingRubric[];
  } | null;
  use_club_rubric: boolean;
  opted_out: boolean;
  dont_ask_again: boolean;
  locked_at: string;
}

export interface ActionResult<T = void> {
  success?: boolean;
  data?: T;
  error?: string;
}
