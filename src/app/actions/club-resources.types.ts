export type ResourceType = "link" | "text" | "rules";

export interface ClubResource {
  id: string;
  club_id: string;
  title: string;
  url: string | null;
  icon: string | null;
  description: string | null;
  resource_type: ResourceType;
  content: string | null;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateResourceInput {
  clubId: string;
  title: string;
  resourceType: ResourceType;
  url?: string;
  icon?: string;
  description?: string;
  content?: string;
}

export interface UpdateResourceInput {
  id: string;
  title?: string;
  url?: string;
  icon?: string;
  description?: string;
  content?: string;
  display_order?: number;
}
