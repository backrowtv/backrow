export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          club_id: string | null;
          created_at: string | null;
          details: Json | null;
          id: string;
          user_id: string | null;
        };
        Insert: {
          action: string;
          club_id?: string | null;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          club_id?: string | null;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log_archive: {
        Row: {
          action: string;
          archived_at: string | null;
          club_id: string | null;
          created_at: string;
          details: Json | null;
          id: string;
          user_id: string | null;
        };
        Insert: {
          action: string;
          archived_at?: string | null;
          club_id?: string | null;
          created_at: string;
          details?: Json | null;
          id: string;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          archived_at?: string | null;
          club_id?: string | null;
          created_at?: string;
          details?: Json | null;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      background_images: {
        Row: {
          created_at: string;
          credit_actor: string | null;
          credit_studio: string | null;
          credit_title: string | null;
          credit_year: number | null;
          entity_id: string;
          entity_type: string;
          extend_past_content: boolean | null;
          height_preset: string;
          height_px: number | null;
          id: string;
          image_url: string;
          is_active: boolean;
          mobile_height_preset: string | null;
          mobile_height_px: number | null;
          mobile_object_position: string | null;
          mobile_opacity: number | null;
          mobile_scale: number | null;
          object_position: string;
          opacity: number;
          scale: number;
          updated_at: string;
          vignette_opacity: number;
        };
        Insert: {
          created_at?: string;
          credit_actor?: string | null;
          credit_studio?: string | null;
          credit_title?: string | null;
          credit_year?: number | null;
          entity_id: string;
          entity_type: string;
          extend_past_content?: boolean | null;
          height_preset?: string;
          height_px?: number | null;
          id?: string;
          image_url: string;
          is_active?: boolean;
          mobile_height_preset?: string | null;
          mobile_height_px?: number | null;
          mobile_object_position?: string | null;
          mobile_opacity?: number | null;
          mobile_scale?: number | null;
          object_position?: string;
          opacity?: number;
          scale?: number;
          updated_at?: string;
          vignette_opacity?: number;
        };
        Update: {
          created_at?: string;
          credit_actor?: string | null;
          credit_studio?: string | null;
          credit_title?: string | null;
          credit_year?: number | null;
          entity_id?: string;
          entity_type?: string;
          extend_past_content?: boolean | null;
          height_preset?: string;
          height_px?: number | null;
          id?: string;
          image_url?: string;
          is_active?: boolean;
          mobile_height_preset?: string | null;
          mobile_height_px?: number | null;
          mobile_object_position?: string | null;
          mobile_opacity?: number | null;
          mobile_scale?: number | null;
          object_position?: string;
          opacity?: number;
          scale?: number;
          updated_at?: string;
          vignette_opacity?: number;
        };
        Relationships: [];
      };
      backrow_matinee: {
        Row: {
          club_id: string | null;
          created_at: string;
          curator_note: string | null;
          expires_at: string | null;
          featured_at: string;
          id: string;
          tmdb_id: number;
          updated_at: string;
        };
        Insert: {
          club_id?: string | null;
          created_at?: string;
          curator_note?: string | null;
          expires_at?: string | null;
          featured_at?: string;
          id?: string;
          tmdb_id: number;
          updated_at?: string;
        };
        Update: {
          club_id?: string | null;
          created_at?: string;
          curator_note?: string | null;
          expires_at?: string | null;
          featured_at?: string;
          id?: string;
          tmdb_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "backrow_matinee_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "backrow_matinee_tmdb_id_fkey";
            columns: ["tmdb_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["tmdb_id"];
          },
        ];
      };
      badges: {
        Row: {
          badge_type: string;
          club_id: string | null;
          created_at: string | null;
          description: string;
          icon_url: string | null;
          id: string;
          name: string;
          requirements_jsonb: Json;
        };
        Insert: {
          badge_type: string;
          club_id?: string | null;
          created_at?: string | null;
          description: string;
          icon_url?: string | null;
          id?: string;
          name: string;
          requirements_jsonb?: Json;
        };
        Update: {
          badge_type?: string;
          club_id?: string | null;
          created_at?: string | null;
          description?: string;
          icon_url?: string | null;
          id?: string;
          name?: string;
          requirements_jsonb?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "badges_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      blocked_users: {
        Row: {
          blocked_by: string;
          club_id: string;
          created_at: string | null;
          reason: string | null;
          user_id: string;
        };
        Insert: {
          blocked_by: string;
          club_id: string;
          created_at?: string | null;
          reason?: string | null;
          user_id: string;
        };
        Update: {
          blocked_by?: string;
          club_id?: string;
          created_at?: string | null;
          reason?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_by_fkey";
            columns: ["blocked_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocked_users_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocked_users_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          club_id: string | null;
          created_at: string | null;
          id: string;
          message: string;
          user_id: string | null;
        };
        Insert: {
          club_id?: string | null;
          created_at?: string | null;
          id?: string;
          message: string;
          user_id?: string | null;
        };
        Update: {
          club_id?: string | null;
          created_at?: string | null;
          id?: string;
          message?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages_archive: {
        Row: {
          archived_at: string | null;
          club_id: string | null;
          created_at: string;
          id: string;
          message: string;
          user_id: string | null;
        };
        Insert: {
          archived_at?: string | null;
          club_id?: string | null;
          created_at: string;
          id: string;
          message: string;
          user_id?: string | null;
        };
        Update: {
          archived_at?: string | null;
          club_id?: string | null;
          created_at?: string;
          id?: string;
          message?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      club_announcements: {
        Row: {
          announcement_type: string | null;
          club_id: string;
          content_html: string | null;
          created_at: string;
          expires_at: string | null;
          id: string;
          image_opacity: number | null;
          image_url: string | null;
          message: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          announcement_type?: string | null;
          club_id: string;
          content_html?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          image_opacity?: number | null;
          image_url?: string | null;
          message: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          announcement_type?: string | null;
          club_id?: string;
          content_html?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          image_opacity?: number | null;
          image_url?: string | null;
          message?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "club_announcements_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_announcements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      club_badges: {
        Row: {
          badge_id: string;
          club_id: string;
          created_at: string;
          earned_at: string | null;
          id: string;
          progress: number;
        };
        Insert: {
          badge_id: string;
          club_id: string;
          created_at?: string;
          earned_at?: string | null;
          id?: string;
          progress?: number;
        };
        Update: {
          badge_id?: string;
          club_id?: string;
          created_at?: string;
          earned_at?: string | null;
          id?: string;
          progress?: number;
        };
        Relationships: [
          {
            foreignKeyName: "club_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_badges_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      club_event_rsvps: {
        Row: {
          created_at: string | null;
          event_id: string;
          status: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          event_id: string;
          status: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          event_id?: string;
          status?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "club_event_rsvps_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "club_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_event_rsvps_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      club_events: {
        Row: {
          club_id: string;
          created_at: string | null;
          created_by: string;
          description: string | null;
          end_date: string | null;
          event_date: string;
          event_type: string;
          id: string;
          location: string | null;
          max_attendees: number | null;
          poll_id: string | null;
          status: string;
          title: string;
          tmdb_id: number | null;
          updated_at: string | null;
        };
        Insert: {
          club_id: string;
          created_at?: string | null;
          created_by: string;
          description?: string | null;
          end_date?: string | null;
          event_date: string;
          event_type: string;
          id?: string;
          location?: string | null;
          max_attendees?: number | null;
          poll_id?: string | null;
          status?: string;
          title: string;
          tmdb_id?: number | null;
          updated_at?: string | null;
        };
        Update: {
          club_id?: string;
          created_at?: string | null;
          created_by?: string;
          description?: string | null;
          end_date?: string | null;
          event_date?: string;
          event_type?: string;
          id?: string;
          location?: string | null;
          max_attendees?: number | null;
          poll_id?: string | null;
          status?: string;
          title?: string;
          tmdb_id?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "club_events_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_events_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "club_polls";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_events_tmdb_id_fkey";
            columns: ["tmdb_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["tmdb_id"];
          },
        ];
      };
      club_invites: {
        Row: {
          club_id: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          id: string;
          token: string;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          club_id: string;
          created_at?: string;
          created_by: string;
          expires_at: string;
          id?: string;
          token: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: {
          club_id?: string;
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          id?: string;
          token?: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "club_invites_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_invites_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_invites_used_by_fkey";
            columns: ["used_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      club_join_requests: {
        Row: {
          club_id: string;
          created_at: string | null;
          denial_reason: string | null;
          id: string;
          message: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          club_id: string;
          created_at?: string | null;
          denial_reason?: string | null;
          id?: string;
          message?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          club_id?: string;
          created_at?: string | null;
          denial_reason?: string | null;
          id?: string;
          message?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "club_join_requests_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_join_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_join_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      club_members: {
        Row: {
          club_avatar_url: string | null;
          club_bio: string | null;
          club_display_name: string | null;
          club_id: string;
          joined_at: string | null;
          preferences: Json | null;
          role: string;
          user_id: string;
        };
        Insert: {
          club_avatar_url?: string | null;
          club_bio?: string | null;
          club_display_name?: string | null;
          club_id: string;
          joined_at?: string | null;
          preferences?: Json | null;
          role: string;
          user_id: string;
        };
        Update: {
          club_avatar_url?: string | null;
          club_bio?: string | null;
          club_display_name?: string | null;
          club_id?: string;
          joined_at?: string | null;
          preferences?: Json | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      club_movie_pool: {
        Row: {
          club_id: string;
          created_at: string | null;
          deleted_at: string | null;
          id: string;
          pitch: string | null;
          tmdb_id: number;
          user_id: string;
        };
        Insert: {
          club_id: string;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          pitch?: string | null;
          tmdb_id: number;
          user_id: string;
        };
        Update: {
          club_id?: string;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          pitch?: string | null;
          tmdb_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "club_movie_pool_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_movie_pool_tmdb_id_fkey";
            columns: ["tmdb_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["tmdb_id"];
          },
          {
            foreignKeyName: "club_movie_pool_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      club_notes: {
        Row: {
          club_id: string | null;
          created_at: string | null;
          id: string;
          note: string;
          tmdb_id: number | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          club_id?: string | null;
          created_at?: string | null;
          id?: string;
          note: string;
          tmdb_id?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          club_id?: string | null;
          created_at?: string | null;
          id?: string;
          note?: string;
          tmdb_id?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "club_notes_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_notes_tmdb_id_fkey";
            columns: ["tmdb_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["tmdb_id"];
          },
          {
            foreignKeyName: "club_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      club_poll_votes: {
        Row: {
          created_at: string;
          id: string;
          option_index: number;
          poll_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          option_index: number;
          poll_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          option_index?: number;
          poll_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "club_poll_votes_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "club_polls";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_poll_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      club_polls: {
        Row: {
          action_data: Json | null;
          action_type: string | null;
          allow_multiple: boolean;
          club_id: string;
          created_at: string;
          expires_at: string | null;
          id: string;
          is_anonymous: boolean;
          options: Json;
          processed_at: string | null;
          question: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          action_data?: Json | null;
          action_type?: string | null;
          allow_multiple?: boolean;
          club_id: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          is_anonymous?: boolean;
          options: Json;
          processed_at?: string | null;
          question: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          action_data?: Json | null;
          action_type?: string | null;
          allow_multiple?: boolean;
          club_id?: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          is_anonymous?: boolean;
          options?: Json;
          processed_at?: string | null;
          question?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "club_polls_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_polls_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      club_resources: {
        Row: {
          club_id: string;
          content: string | null;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          display_order: number | null;
          icon: string | null;
          id: string;
          resource_type: string;
          title: string;
          updated_at: string | null;
          url: string | null;
        };
        Insert: {
          club_id: string;
          content?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          display_order?: number | null;
          icon?: string | null;
          id?: string;
          resource_type?: string;
          title: string;
          updated_at?: string | null;
          url?: string | null;
        };
        Update: {
          club_id?: string;
          content?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          display_order?: number | null;
          icon?: string | null;
          id?: string;
          resource_type?: string;
          title?: string;
          updated_at?: string | null;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "club_resources_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_resources_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      club_stats: {
        Row: {
          average_festival_rating: number | null;
          club_id: string;
          completed_festivals: number | null;
          festivals_count: number | null;
          highest_rated_movie_id: number | null;
          last_activity: string | null;
          members_count: number | null;
          most_nominated_movie_id: number | null;
          total_movies_watched: number | null;
          updated_at: string | null;
        };
        Insert: {
          average_festival_rating?: number | null;
          club_id: string;
          completed_festivals?: number | null;
          festivals_count?: number | null;
          highest_rated_movie_id?: number | null;
          last_activity?: string | null;
          members_count?: number | null;
          most_nominated_movie_id?: number | null;
          total_movies_watched?: number | null;
          updated_at?: string | null;
        };
        Update: {
          average_festival_rating?: number | null;
          club_id?: string;
          completed_festivals?: number | null;
          festivals_count?: number | null;
          highest_rated_movie_id?: number | null;
          last_activity?: string | null;
          members_count?: number | null;
          most_nominated_movie_id?: number | null;
          total_movies_watched?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "club_stats_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: true;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      club_word_blacklist: {
        Row: {
          added_by: string;
          club_id: string;
          created_at: string;
          id: string;
          word: string;
        };
        Insert: {
          added_by: string;
          club_id: string;
          created_at?: string;
          id?: string;
          word: string;
        };
        Update: {
          added_by?: string;
          club_id?: string;
          created_at?: string;
          id?: string;
          word?: string;
        };
        Relationships: [
          {
            foreignKeyName: "club_word_blacklist_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_word_blacklist_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      clubs: {
        Row: {
          allow_non_admin_nominations: boolean | null;
          archived: boolean | null;
          auto_start_next_festival: boolean | null;
          avatar_border_color_index: number | null;
          avatar_color_index: number | null;
          avatar_icon: string | null;
          background_type: string | null;
          background_value: string | null;
          blind_nominations_enabled: boolean | null;
          club_ratings_enabled: boolean | null;
          created_at: string | null;
          description: string | null;
          featured: boolean;
          featured_at: string | null;
          featured_badge_ids: string[] | null;
          featured_until: string | null;
          festival_type: string | null;
          genres: string[] | null;
          id: string;
          keywords: string[] | null;
          max_nominations_per_user: number | null;
          max_themes_per_user: number | null;
          movie_pool_auto_promote_threshold: number | null;
          movie_pool_governance: string | null;
          movie_pool_voting_enabled: boolean | null;
          name: string;
          nomination_guessing_enabled: boolean | null;
          nomination_timing: Json | null;
          picture_url: string | null;
          placement_points: Json | null;
          privacy: string;
          producer_id: string;
          rating_increment: number | null;
          rating_max: number | null;
          rating_min: number | null;
          rating_rubric_name: string | null;
          rating_unit: string | null;
          rating_visual_icon: string | null;
          recently_watched_retention: Json | null;
          results_reveal_delay_seconds: number | null;
          results_reveal_direction: string | null;
          results_reveal_type: string | null;
          rubric_enforcement: string | null;
          scoring_enabled: boolean | null;
          season_standings_enabled: boolean | null;
          settings: Json;
          slug: string | null;
          theme_color: string | null;
          theme_governance: string | null;
          theme_submissions_locked: boolean | null;
          theme_voting_enabled: boolean | null;
          themes_enabled: boolean | null;
          updated_at: string | null;
          watch_rate_timing: Json | null;
        };
        Insert: {
          allow_non_admin_nominations?: boolean | null;
          archived?: boolean | null;
          auto_start_next_festival?: boolean | null;
          avatar_border_color_index?: number | null;
          avatar_color_index?: number | null;
          avatar_icon?: string | null;
          background_type?: string | null;
          background_value?: string | null;
          blind_nominations_enabled?: boolean | null;
          club_ratings_enabled?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          featured?: boolean;
          featured_at?: string | null;
          featured_badge_ids?: string[] | null;
          featured_until?: string | null;
          festival_type?: string | null;
          genres?: string[] | null;
          id?: string;
          keywords?: string[] | null;
          max_nominations_per_user?: number | null;
          max_themes_per_user?: number | null;
          movie_pool_auto_promote_threshold?: number | null;
          movie_pool_governance?: string | null;
          movie_pool_voting_enabled?: boolean | null;
          name: string;
          nomination_guessing_enabled?: boolean | null;
          nomination_timing?: Json | null;
          picture_url?: string | null;
          placement_points?: Json | null;
          privacy: string;
          producer_id: string;
          rating_increment?: number | null;
          rating_max?: number | null;
          rating_min?: number | null;
          rating_rubric_name?: string | null;
          rating_unit?: string | null;
          rating_visual_icon?: string | null;
          recently_watched_retention?: Json | null;
          results_reveal_delay_seconds?: number | null;
          results_reveal_direction?: string | null;
          results_reveal_type?: string | null;
          rubric_enforcement?: string | null;
          scoring_enabled?: boolean | null;
          season_standings_enabled?: boolean | null;
          settings?: Json;
          slug?: string | null;
          theme_color?: string | null;
          theme_governance?: string | null;
          theme_submissions_locked?: boolean | null;
          theme_voting_enabled?: boolean | null;
          themes_enabled?: boolean | null;
          updated_at?: string | null;
          watch_rate_timing?: Json | null;
        };
        Update: {
          allow_non_admin_nominations?: boolean | null;
          archived?: boolean | null;
          auto_start_next_festival?: boolean | null;
          avatar_border_color_index?: number | null;
          avatar_color_index?: number | null;
          avatar_icon?: string | null;
          background_type?: string | null;
          background_value?: string | null;
          blind_nominations_enabled?: boolean | null;
          club_ratings_enabled?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          featured?: boolean;
          featured_at?: string | null;
          featured_badge_ids?: string[] | null;
          featured_until?: string | null;
          festival_type?: string | null;
          genres?: string[] | null;
          id?: string;
          keywords?: string[] | null;
          max_nominations_per_user?: number | null;
          max_themes_per_user?: number | null;
          movie_pool_auto_promote_threshold?: number | null;
          movie_pool_governance?: string | null;
          movie_pool_voting_enabled?: boolean | null;
          name?: string;
          nomination_guessing_enabled?: boolean | null;
          nomination_timing?: Json | null;
          picture_url?: string | null;
          placement_points?: Json | null;
          privacy?: string;
          producer_id?: string;
          rating_increment?: number | null;
          rating_max?: number | null;
          rating_min?: number | null;
          rating_rubric_name?: string | null;
          rating_unit?: string | null;
          rating_visual_icon?: string | null;
          recently_watched_retention?: Json | null;
          results_reveal_delay_seconds?: number | null;
          results_reveal_direction?: string | null;
          results_reveal_type?: string | null;
          rubric_enforcement?: string | null;
          scoring_enabled?: boolean | null;
          season_standings_enabled?: boolean | null;
          settings?: Json;
          slug?: string | null;
          theme_color?: string | null;
          theme_governance?: string | null;
          theme_submissions_locked?: boolean | null;
          theme_voting_enabled?: boolean | null;
          themes_enabled?: boolean | null;
          updated_at?: string | null;
          watch_rate_timing?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "clubs_producer_id_fkey";
            columns: ["producer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_submissions: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          message: string;
          name: string;
          subject: string;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: string;
          message: string;
          name: string;
          subject: string;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          subject?: string;
        };
        Relationships: [];
      };
      curated_collections: {
        Row: {
          created_at: string;
          display_order: number;
          emoji: string | null;
          id: string;
          is_active: boolean;
          movies: Json;
          name: string;
          show_on_home: boolean;
          show_on_search: boolean;
          slug: string;
          subtitle: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          emoji?: string | null;
          id?: string;
          is_active?: boolean;
          movies?: Json;
          name: string;
          show_on_home?: boolean;
          show_on_search?: boolean;
          slug: string;
          subtitle?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          emoji?: string | null;
          id?: string;
          is_active?: boolean;
          movies?: Json;
          name?: string;
          show_on_home?: boolean;
          show_on_search?: boolean;
          slug?: string;
          subtitle?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      direct_messages: {
        Row: {
          club_id: string;
          created_at: string;
          id: string;
          message: string;
          read_at: string | null;
          recipient_id: string;
          sender_id: string;
        };
        Insert: {
          club_id: string;
          created_at?: string;
          id?: string;
          message: string;
          read_at?: string | null;
          recipient_id: string;
          sender_id: string;
        };
        Update: {
          club_id?: string;
          created_at?: string;
          id?: string;
          message?: string;
          read_at?: string | null;
          recipient_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "direct_messages_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "direct_messages_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      discussion_comments: {
        Row: {
          author_id: string;
          content: string;
          created_at: string | null;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          is_edited: boolean | null;
          is_spoiler: boolean | null;
          parent_id: string | null;
          thread_id: string;
          updated_at: string | null;
          upvotes: number | null;
        };
        Insert: {
          author_id: string;
          content: string;
          created_at?: string | null;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          is_edited?: boolean | null;
          is_spoiler?: boolean | null;
          parent_id?: string | null;
          thread_id: string;
          updated_at?: string | null;
          upvotes?: number | null;
        };
        Update: {
          author_id?: string;
          content?: string;
          created_at?: string | null;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          is_edited?: boolean | null;
          is_spoiler?: boolean | null;
          parent_id?: string | null;
          thread_id?: string;
          updated_at?: string | null;
          upvotes?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "discussion_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussion_comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "discussion_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussion_comments_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "discussion_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      discussion_thread_tags: {
        Row: {
          created_at: string | null;
          festival_id: string | null;
          id: string;
          person_tmdb_id: number | null;
          tag_type: string;
          thread_id: string;
          tmdb_id: number | null;
        };
        Insert: {
          created_at?: string | null;
          festival_id?: string | null;
          id?: string;
          person_tmdb_id?: number | null;
          tag_type: string;
          thread_id: string;
          tmdb_id?: number | null;
        };
        Update: {
          created_at?: string | null;
          festival_id?: string | null;
          id?: string;
          person_tmdb_id?: number | null;
          tag_type?: string;
          thread_id?: string;
          tmdb_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "discussion_thread_tags_festival_id_fkey";
            columns: ["festival_id"];
            isOneToOne: false;
            referencedRelation: "festivals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussion_thread_tags_person_tmdb_id_fkey";
            columns: ["person_tmdb_id"];
            isOneToOne: false;
            referencedRelation: "persons";
            referencedColumns: ["tmdb_id"];
          },
          {
            foreignKeyName: "discussion_thread_tags_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "discussion_threads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussion_thread_tags_tmdb_id_fkey";
            columns: ["tmdb_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["tmdb_id"];
          },
        ];
      };
      discussion_thread_unlocks: {
        Row: {
          id: string;
          thread_id: string;
          unlocked_at: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          unlocked_at?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          unlocked_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discussion_thread_unlocks_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "discussion_threads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussion_thread_unlocks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      discussion_threads: {
        Row: {
          author_id: string;
          auto_created: boolean | null;
          club_id: string;
          comment_count: number | null;
          content: string;
          created_at: string | null;
          festival_id: string | null;
          id: string;
          is_locked: boolean | null;
          is_pinned: boolean | null;
          is_spoiler: boolean | null;
          person_name: string | null;
          person_tmdb_id: number | null;
          person_type: string | null;
          slug: string | null;
          thread_type: string;
          title: string;
          tmdb_id: number | null;
          unlock_on_watch: boolean | null;
          updated_at: string | null;
          upvotes: number | null;
        };
        Insert: {
          author_id: string;
          auto_created?: boolean | null;
          club_id: string;
          comment_count?: number | null;
          content: string;
          created_at?: string | null;
          festival_id?: string | null;
          id?: string;
          is_locked?: boolean | null;
          is_pinned?: boolean | null;
          is_spoiler?: boolean | null;
          person_name?: string | null;
          person_tmdb_id?: number | null;
          person_type?: string | null;
          slug?: string | null;
          thread_type: string;
          title: string;
          tmdb_id?: number | null;
          unlock_on_watch?: boolean | null;
          updated_at?: string | null;
          upvotes?: number | null;
        };
        Update: {
          author_id?: string;
          auto_created?: boolean | null;
          club_id?: string;
          comment_count?: number | null;
          content?: string;
          created_at?: string | null;
          festival_id?: string | null;
          id?: string;
          is_locked?: boolean | null;
          is_pinned?: boolean | null;
          is_spoiler?: boolean | null;
          person_name?: string | null;
          person_tmdb_id?: number | null;
          person_type?: string | null;
          slug?: string | null;
          thread_type?: string;
          title?: string;
          tmdb_id?: number | null;
          unlock_on_watch?: boolean | null;
          updated_at?: string | null;
          upvotes?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "discussion_threads_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussion_threads_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussion_threads_festival_id_fkey";
            columns: ["festival_id"];
            isOneToOne: false;
            referencedRelation: "festivals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussion_threads_person_tmdb_id_fkey";
            columns: ["person_tmdb_id"];
            isOneToOne: false;
            referencedRelation: "persons";
            referencedColumns: ["tmdb_id"];
          },
          {
            foreignKeyName: "discussion_threads_tmdb_id_fkey";
            columns: ["tmdb_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["tmdb_id"];
          },
        ];
      };
      discussion_votes: {
        Row: {
          comment_id: string | null;
          created_at: string | null;
          id: string;
          thread_id: string | null;
          user_id: string;
        };
        Insert: {
          comment_id?: string | null;
          created_at?: string | null;
          id?: string;
          thread_id?: string | null;
          user_id: string;
        };
        Update: {
          comment_id?: string | null;
          created_at?: string | null;
          id?: string;
          thread_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discussion_votes_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "discussion_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussion_votes_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "discussion_threads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussion_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      email_digest_log: {
        Row: {
          digest_type: string;
          id: string;
          notification_ids: string[] | null;
          sent_at: string;
          user_id: string | null;
        };
        Insert: {
          digest_type: string;
          id?: string;
          notification_ids?: string[] | null;
          sent_at: string;
          user_id?: string | null;
        };
        Update: {
          digest_type?: string;
          id?: string;
          notification_ids?: string[] | null;
          sent_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_digest_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      favorite_clubs: {
        Row: {
          club_id: string;
          created_at: string | null;
          user_id: string;
        };
        Insert: {
          club_id: string;
          created_at?: string | null;
          user_id: string;
        };
        Update: {
          club_id?: string;
          created_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorite_clubs_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorite_clubs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback_items: {
        Row: {
          admin_response: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          status: string;
          title: string;
          type: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          admin_response?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          status?: string;
          title: string;
          type: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          admin_response?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          status?: string;
          title?: string;
          type?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback_votes: {
        Row: {
          created_at: string | null;
          feedback_id: string;
          id: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          feedback_id: string;
          id?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          feedback_id?: string;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_votes_feedback_id_fkey";
            columns: ["feedback_id"];
            isOneToOne: false;
            referencedRelation: "feedback_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      festival_results: {
        Row: {
          calculated_at: string;
          festival_id: string;
          is_final: boolean | null;
          results: Json;
        };
        Insert: {
          calculated_at: string;
          festival_id: string;
          is_final?: boolean | null;
          results: Json;
        };
        Update: {
          calculated_at?: string;
          festival_id?: string;
          is_final?: boolean | null;
          results?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "festival_results_festival_id_fkey";
            columns: ["festival_id"];
            isOneToOne: true;
            referencedRelation: "festivals";
            referencedColumns: ["id"];
          },
        ];
      };
      festival_rubric_locks: {
        Row: {
          dont_ask_again: boolean;
          festival_id: string;
          id: string;
          locked_at: string;
          opted_out: boolean;
          rubric_id: string | null;
          rubric_snapshot: Json | null;
          use_club_rubric: boolean;
          user_id: string;
        };
        Insert: {
          dont_ask_again?: boolean;
          festival_id: string;
          id?: string;
          locked_at?: string;
          opted_out?: boolean;
          rubric_id?: string | null;
          rubric_snapshot?: Json | null;
          use_club_rubric?: boolean;
          user_id: string;
        };
        Update: {
          dont_ask_again?: boolean;
          festival_id?: string;
          id?: string;
          locked_at?: string;
          opted_out?: boolean;
          rubric_id?: string | null;
          rubric_snapshot?: Json | null;
          use_club_rubric?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "festival_rubric_locks_festival_id_fkey";
            columns: ["festival_id"];
            isOneToOne: false;
            referencedRelation: "festivals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "festival_rubric_locks_rubric_id_fkey";
            columns: ["rubric_id"];
            isOneToOne: false;
            referencedRelation: "user_rubrics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "festival_rubric_locks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      festival_standings: {
        Row: {
          average_rating: number | null;
          correct_guesses: number | null;
          created_at: string | null;
          festival_id: string;
          guessing_accuracy: number | null;
          guessing_points: number | null;
          nominations_count: number | null;
          points: number;
          rank: number;
          ratings_count: number | null;
          user_id: string;
        };
        Insert: {
          average_rating?: number | null;
          correct_guesses?: number | null;
          created_at?: string | null;
          festival_id: string;
          guessing_accuracy?: number | null;
          guessing_points?: number | null;
          nominations_count?: number | null;
          points: number;
          rank: number;
          ratings_count?: number | null;
          user_id: string;
        };
        Update: {
          average_rating?: number | null;
          correct_guesses?: number | null;
          created_at?: string | null;
          festival_id?: string;
          guessing_accuracy?: number | null;
          guessing_points?: number | null;
          nominations_count?: number | null;
          points?: number;
          rank?: number;
          ratings_count?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "festival_standings_festival_id_fkey";
            columns: ["festival_id"];
            isOneToOne: false;
            referencedRelation: "festivals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "festival_standings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      festivals: {
        Row: {
          auto_advance: boolean | null;
          background_type: string | null;
          background_value: string | null;
          club_id: string;
          created_at: string | null;
          deleted_at: string | null;
          id: string;
          keywords: string[] | null;
          member_count_at_creation: number;
          nomination_deadline: string | null;
          phase: string;
          picture_url: string | null;
          poster_url: string | null;
          rating_deadline: string | null;
          results_date: string | null;
          season_id: string | null;
          slug: string | null;
          start_date: string;
          status: string;
          theme: string | null;
          theme_selected_by: string | null;
          theme_source: string | null;
          updated_at: string | null;
          watch_deadline: string | null;
        };
        Insert: {
          auto_advance?: boolean | null;
          background_type?: string | null;
          background_value?: string | null;
          club_id: string;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          keywords?: string[] | null;
          member_count_at_creation: number;
          nomination_deadline?: string | null;
          phase: string;
          picture_url?: string | null;
          poster_url?: string | null;
          rating_deadline?: string | null;
          results_date?: string | null;
          season_id?: string | null;
          slug?: string | null;
          start_date: string;
          status: string;
          theme?: string | null;
          theme_selected_by?: string | null;
          theme_source?: string | null;
          updated_at?: string | null;
          watch_deadline?: string | null;
        };
        Update: {
          auto_advance?: boolean | null;
          background_type?: string | null;
          background_value?: string | null;
          club_id?: string;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          keywords?: string[] | null;
          member_count_at_creation?: number;
          nomination_deadline?: string | null;
          phase?: string;
          picture_url?: string | null;
          poster_url?: string | null;
          rating_deadline?: string | null;
          results_date?: string | null;
          season_id?: string | null;
          slug?: string | null;
          start_date?: string;
          status?: string;
          theme?: string | null;
          theme_selected_by?: string | null;
          theme_source?: string | null;
          updated_at?: string | null;
          watch_deadline?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "festivals_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "festivals_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      filter_analytics: {
        Row: {
          created_at: string | null;
          filter_combination: Json;
          has_results: boolean | null;
          id: string;
          result_count: number;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          filter_combination: Json;
          has_results?: boolean | null;
          id?: string;
          result_count: number;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          filter_combination?: Json;
          has_results?: boolean | null;
          id?: string;
          result_count?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "filter_analytics_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      future_nomination_links: {
        Row: {
          club_id: string;
          created_at: string;
          festival_id: string | null;
          future_nomination_id: string;
          id: string;
          nominated: boolean | null;
          nominated_at: string | null;
          theme_pool_id: string | null;
        };
        Insert: {
          club_id: string;
          created_at?: string;
          festival_id?: string | null;
          future_nomination_id: string;
          id?: string;
          nominated?: boolean | null;
          nominated_at?: string | null;
          theme_pool_id?: string | null;
        };
        Update: {
          club_id?: string;
          created_at?: string;
          festival_id?: string | null;
          future_nomination_id?: string;
          id?: string;
          nominated?: boolean | null;
          nominated_at?: string | null;
          theme_pool_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "future_nomination_links_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "future_nomination_links_festival_id_fkey";
            columns: ["festival_id"];
            isOneToOne: false;
            referencedRelation: "festivals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "future_nomination_links_future_nomination_id_fkey";
            columns: ["future_nomination_id"];
            isOneToOne: false;
            referencedRelation: "future_nomination_list";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "future_nomination_links_theme_pool_id_fkey";
            columns: ["theme_pool_id"];
            isOneToOne: false;
            referencedRelation: "theme_pool";
            referencedColumns: ["id"];
          },
        ];
      };
      future_nomination_list: {
        Row: {
          created_at: string;
          id: string;
          note: string | null;
          tags: string[] | null;
          tmdb_id: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          note?: string | null;
          tags?: string[] | null;
          tmdb_id: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          note?: string | null;
          tags?: string[] | null;
          tmdb_id?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "future_nomination_list_tmdb_id_fkey";
            columns: ["tmdb_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["tmdb_id"];
          },
        ];
      };
      generic_ratings: {
        Row: {
          rating: number | null;
          tmdb_id: number;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          rating?: number | null;
          tmdb_id: number;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          rating?: number | null;
          tmdb_id?: number;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generic_ratings_tmdb_id_fkey";
            columns: ["tmdb_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["tmdb_id"];
          },
          {
            foreignKeyName: "generic_ratings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      hidden_activities: {
        Row: {
          activity_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          activity_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          activity_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hidden_activities_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activity_log";
            referencedColumns: ["id"];
          },
        ];
      };
      hidden_watch_history: {
        Row: {
          created_at: string;
          tmdb_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          tmdb_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          tmdb_id?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      movie_pool_votes: {
        Row: {
          club_pool_item_id: string | null;
          created_at: string | null;
          id: string;
          nomination_id: string | null;
          user_id: string;
          vote_type: string;
        };
        Insert: {
          club_pool_item_id?: string | null;
          created_at?: string | null;
          id?: string;
          nomination_id?: string | null;
          user_id: string;
          vote_type?: string;
        };
        Update: {
          club_pool_item_id?: string | null;
          created_at?: string | null;
          id?: string;
          nomination_id?: string | null;
          user_id?: string;
          vote_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "movie_pool_votes_club_pool_item_id_fkey";
            columns: ["club_pool_item_id"];
            isOneToOne: false;
            referencedRelation: "club_movie_pool";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movie_pool_votes_nomination_id_fkey";
            columns: ["nomination_id"];
            isOneToOne: false;
            referencedRelation: "nominations";
            referencedColumns: ["id"];
          },
        ];
      };
      movies: {
        Row: {
          backdrop_url: string | null;
          cached_at: string | null;
          cast: string[] | null;
          certification: string | null;
          director: string | null;
          genres: string[] | null;
          overview: string | null;
          popularity_score: number | null;
          poster_url: string | null;
          runtime: number | null;
          slug: string | null;
          tagline: string | null;
          title: string;
          tmdb_id: number;
          year: number | null;
        };
        Insert: {
          backdrop_url?: string | null;
          cached_at?: string | null;
          cast?: string[] | null;
          certification?: string | null;
          director?: string | null;
          genres?: string[] | null;
          overview?: string | null;
          popularity_score?: number | null;
          poster_url?: string | null;
          runtime?: number | null;
          slug?: string | null;
          tagline?: string | null;
          title: string;
          tmdb_id: number;
          year?: number | null;
        };
        Update: {
          backdrop_url?: string | null;
          cached_at?: string | null;
          cast?: string[] | null;
          certification?: string | null;
          director?: string | null;
          genres?: string[] | null;
          overview?: string | null;
          popularity_score?: number | null;
          poster_url?: string | null;
          runtime?: number | null;
          slug?: string | null;
          tagline?: string | null;
          title?: string;
          tmdb_id?: number;
          year?: number | null;
        };
        Relationships: [];
      };
      nomination_guesses: {
        Row: {
          created_at: string | null;
          festival_id: string | null;
          guesses: Json;
          id: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          festival_id?: string | null;
          guesses: Json;
          id?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          festival_id?: string | null;
          guesses?: Json;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "nomination_guesses_festival_id_fkey";
            columns: ["festival_id"];
            isOneToOne: false;
            referencedRelation: "festivals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nomination_guesses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      nominations: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          deleted_at: string | null;
          display_slot: string | null;
          endless_status: string | null;
          festival_id: string;
          hidden_from_history: boolean | null;
          id: string;
          pitch: string | null;
          tmdb_id: number;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          display_slot?: string | null;
          endless_status?: string | null;
          festival_id: string;
          hidden_from_history?: boolean | null;
          id?: string;
          pitch?: string | null;
          tmdb_id: number;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          display_slot?: string | null;
          endless_status?: string | null;
          festival_id?: string;
          hidden_from_history?: boolean | null;
          id?: string;
          pitch?: string | null;
          tmdb_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "nominations_festival_id_fkey";
            columns: ["festival_id"];
            isOneToOne: false;
            referencedRelation: "festivals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nominations_tmdb_id_fkey";
            columns: ["tmdb_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["tmdb_id"];
          },
          {
            foreignKeyName: "nominations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_dead_letter_queue: {
        Row: {
          created_at: string | null;
          failed_at: string;
          id: string;
          last_error: string | null;
          notification_id: string | null;
          retry_count: number | null;
        };
        Insert: {
          created_at?: string | null;
          failed_at: string;
          id?: string;
          last_error?: string | null;
          notification_id?: string | null;
          retry_count?: number | null;
        };
        Update: {
          created_at?: string | null;
          failed_at?: string;
          id?: string;
          last_error?: string | null;
          notification_id?: string | null;
          retry_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "notification_dead_letter_queue_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: false;
            referencedRelation: "notifications";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_delivery_log: {
        Row: {
          attempted_at: string;
          created_at: string | null;
          delivery_method: string;
          error_message: string | null;
          id: string;
          notification_id: string | null;
          status: string;
        };
        Insert: {
          attempted_at: string;
          created_at?: string | null;
          delivery_method: string;
          error_message?: string | null;
          id?: string;
          notification_id?: string | null;
          status: string;
        };
        Update: {
          attempted_at?: string;
          created_at?: string | null;
          delivery_method?: string;
          error_message?: string | null;
          id?: string;
          notification_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: false;
            referencedRelation: "notifications";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          archived: boolean | null;
          archived_at: string | null;
          club_id: string | null;
          created_at: string | null;
          festival_id: string | null;
          id: string;
          link: string | null;
          message: string;
          read: boolean | null;
          related_user_id: string | null;
          title: string;
          type: string;
          user_id: string | null;
        };
        Insert: {
          archived?: boolean | null;
          archived_at?: string | null;
          club_id?: string | null;
          created_at?: string | null;
          festival_id?: string | null;
          id?: string;
          link?: string | null;
          message: string;
          read?: boolean | null;
          related_user_id?: string | null;
          title: string;
          type: string;
          user_id?: string | null;
        };
        Update: {
          archived?: boolean | null;
          archived_at?: string | null;
          club_id?: string | null;
          created_at?: string | null;
          festival_id?: string | null;
          id?: string;
          link?: string | null;
          message?: string;
          read?: boolean | null;
          related_user_id?: string | null;
          title?: string;
          type?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_festival_id_fkey";
            columns: ["festival_id"];
            isOneToOne: false;
            referencedRelation: "festivals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_related_user_id_fkey";
            columns: ["related_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      persons: {
        Row: {
          biography: string | null;
          birthday: string | null;
          cached_at: string;
          created_at: string;
          deathday: string | null;
          id: string;
          known_for_department: string | null;
          name: string;
          place_of_birth: string | null;
          profile_url: string | null;
          slug: string;
          tmdb_id: number;
        };
        Insert: {
          biography?: string | null;
          birthday?: string | null;
          cached_at?: string;
          created_at?: string;
          deathday?: string | null;
          id?: string;
          known_for_department?: string | null;
          name: string;
          place_of_birth?: string | null;
          profile_url?: string | null;
          slug: string;
          tmdb_id: number;
        };
        Update: {
          biography?: string | null;
          birthday?: string | null;
          cached_at?: string;
          created_at?: string;
          deathday?: string | null;
          id?: string;
          known_for_department?: string | null;
          name?: string;
          place_of_birth?: string | null;
          profile_url?: string | null;
          slug?: string;
          tmdb_id?: number;
        };
        Relationships: [];
      };
      private_notes: {
        Row: {
          created_at: string | null;
          festival_id: string | null;
          id: string;
          note: string;
          tmdb_id: number | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          festival_id?: string | null;
          id?: string;
          note: string;
          tmdb_id?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          festival_id?: string | null;
          id?: string;
          note?: string;
          tmdb_id?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "private_notes_festival_id_fkey";
            columns: ["festival_id"];
            isOneToOne: false;
            referencedRelation: "festivals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "private_notes_tmdb_id_fkey";
            columns: ["tmdb_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["tmdb_id"];
          },
          {
            foreignKeyName: "private_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          last_used_at: string;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          last_used_at?: string;
          p256dh: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          last_used_at?: string;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ratings: {
        Row: {
          created_at: string | null;
          deleted_at: string | null;
          festival_id: string;
          id: string;
          nomination_id: string;
          rating: number | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          deleted_at?: string | null;
          festival_id: string;
          id?: string;
          nomination_id: string;
          rating?: number | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          deleted_at?: string | null;
          festival_id?: string;
          id?: string;
          nomination_id?: string;
          rating?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ratings_festival_id_fkey";
            columns: ["festival_id"];
            isOneToOne: false;
            referencedRelation: "festivals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratings_nomination_id_fkey";
            columns: ["nomination_id"];
            isOneToOne: false;
            referencedRelation: "nominations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      search_analytics: {
        Row: {
          created_at: string | null;
          filters: Json | null;
          has_results: boolean | null;
          id: string;
          query: string;
          result_counts: Json | null;
          total_results: number;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          filters?: Json | null;
          has_results?: boolean | null;
          id?: string;
          query: string;
          result_counts?: Json | null;
          total_results: number;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          filters?: Json | null;
          has_results?: boolean | null;
          id?: string;
          query?: string;
          result_counts?: Json | null;
          total_results?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "search_analytics_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      seasons: {
        Row: {
          club_id: string;
          created_at: string | null;
          deleted_at: string | null;
          end_date: string;
          id: string;
          name: string;
          slug: string | null;
          start_date: string;
          subtitle: string | null;
        };
        Insert: {
          club_id: string;
          created_at?: string | null;
          deleted_at?: string | null;
          end_date: string;
          id?: string;
          name: string;
          slug?: string | null;
          start_date: string;
          subtitle?: string | null;
        };
        Update: {
          club_id?: string;
          created_at?: string | null;
          deleted_at?: string | null;
          end_date?: string;
          id?: string;
          name?: string;
          slug?: string | null;
          start_date?: string;
          subtitle?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "seasons_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      site_admins: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_admins_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_admins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      site_announcements: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          is_active: boolean | null;
          message: string;
          priority: number | null;
          show_on_dashboard: boolean | null;
          show_on_landing: boolean | null;
          starts_at: string | null;
          title: string;
          type: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          message: string;
          priority?: number | null;
          show_on_dashboard?: boolean | null;
          show_on_landing?: boolean | null;
          starts_at?: string | null;
          title: string;
          type?: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          message?: string;
          priority?: number | null;
          show_on_dashboard?: boolean | null;
          show_on_landing?: boolean | null;
          starts_at?: string | null;
          title?: string;
          type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "site_announcements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      site_settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string | null;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      stack_rankings: {
        Row: {
          created_at: string | null;
          festival_id: string | null;
          id: string;
          ranked_order: Json;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          festival_id?: string | null;
          id?: string;
          ranked_order: Json;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          festival_id?: string | null;
          id?: string;
          ranked_order?: Json;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stack_rankings_festival_id_fkey";
            columns: ["festival_id"];
            isOneToOne: false;
            referencedRelation: "festivals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stack_rankings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      stripe_event_log: {
        Row: {
          created_at: string | null;
          event_id: string;
          processed_at: string;
          type: string;
        };
        Insert: {
          created_at?: string | null;
          event_id: string;
          processed_at: string;
          type: string;
        };
        Update: {
          created_at?: string | null;
          event_id?: string;
          processed_at?: string;
          type?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null;
          created_at: string | null;
          current_period_end: string | null;
          id: string;
          plan: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          trial_ends_at: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          cancel_at_period_end?: boolean | null;
          created_at?: string | null;
          current_period_end?: string | null;
          id?: string;
          plan: string;
          status: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          cancel_at_period_end?: boolean | null;
          created_at?: string | null;
          current_period_end?: string | null;
          id?: string;
          plan?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      theme_pool: {
        Row: {
          added_by: string | null;
          club_id: string | null;
          created_at: string | null;
          id: string;
          is_used: boolean | null;
          theme_name: string;
        };
        Insert: {
          added_by?: string | null;
          club_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_used?: boolean | null;
          theme_name: string;
        };
        Update: {
          added_by?: string | null;
          club_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_used?: boolean | null;
          theme_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "theme_pool_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "theme_pool_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      theme_pool_votes: {
        Row: {
          created_at: string | null;
          id: string;
          theme_id: string;
          updated_at: string | null;
          user_id: string | null;
          vote_type: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          theme_id: string;
          updated_at?: string | null;
          user_id?: string | null;
          vote_type: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          theme_id?: string;
          updated_at?: string | null;
          user_id?: string | null;
          vote_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "theme_pool_votes_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "theme_pool";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "theme_pool_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      theme_votes: {
        Row: {
          created_at: string | null;
          festival_id: string;
          theme_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          festival_id: string;
          theme_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          festival_id?: string;
          theme_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "theme_votes_festival_id_fkey";
            columns: ["festival_id"];
            isOneToOne: false;
            referencedRelation: "festivals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "theme_votes_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "theme_pool";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "theme_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      tmdb_search_cache: {
        Row: {
          cached_at: string | null;
          query: string;
          results: Json;
        };
        Insert: {
          cached_at?: string | null;
          query: string;
          results: Json;
        };
        Update: {
          cached_at?: string | null;
          query?: string;
          results?: Json;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          badge_id: string;
          club_id: string | null;
          earned_at: string | null;
          id: string;
          progress_jsonb: Json | null;
          user_id: string;
        };
        Insert: {
          badge_id: string;
          club_id?: string | null;
          earned_at?: string | null;
          id?: string;
          progress_jsonb?: Json | null;
          user_id: string;
        };
        Update: {
          badge_id?: string;
          club_id?: string | null;
          earned_at?: string | null;
          id?: string;
          progress_jsonb?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_badges_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_badges_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string | null;
          id: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string | null;
          id?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_favorites: {
        Row: {
          created_at: string;
          id: string;
          image_path: string | null;
          is_featured: boolean;
          item_type: string;
          sort_order: number;
          subtitle: string | null;
          title: string;
          tmdb_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_path?: string | null;
          is_featured?: boolean;
          item_type: string;
          sort_order?: number;
          subtitle?: string | null;
          title: string;
          tmdb_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_path?: string | null;
          is_featured?: boolean;
          item_type?: string;
          sort_order?: number;
          subtitle?: string | null;
          title?: string;
          tmdb_id?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      user_reports: {
        Row: {
          admin_notes: string | null;
          created_at: string | null;
          details: string | null;
          id: string;
          reason: string;
          reported_id: string;
          reporter_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          created_at?: string | null;
          details?: string | null;
          id?: string;
          reason: string;
          reported_id: string;
          reporter_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          created_at?: string | null;
          details?: string | null;
          id?: string;
          reason?: string;
          reported_id?: string;
          reporter_id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_reports_reported_id_fkey";
            columns: ["reported_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_reports_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_rubrics: {
        Row: {
          categories: Json;
          created_at: string;
          id: string;
          is_all_clubs_default: boolean | null;
          is_default: boolean;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          categories?: Json;
          created_at?: string;
          id?: string;
          is_all_clubs_default?: boolean | null;
          is_default?: boolean;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          categories?: Json;
          created_at?: string;
          id?: string;
          is_all_clubs_default?: boolean | null;
          is_default?: boolean;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_rubrics_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_stats: {
        Row: {
          average_rating_given: number | null;
          festivals_played: number | null;
          festivals_won: number | null;
          highest_rated_movie_id: number | null;
          last_active: string | null;
          lowest_rated_movie_id: number | null;
          nominations_total: number | null;
          ratings_total: number | null;
          total_points: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          average_rating_given?: number | null;
          festivals_played?: number | null;
          festivals_won?: number | null;
          highest_rated_movie_id?: number | null;
          last_active?: string | null;
          lowest_rated_movie_id?: number | null;
          nominations_total?: number | null;
          ratings_total?: number | null;
          total_points?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          average_rating_given?: number | null;
          festivals_played?: number | null;
          festivals_won?: number | null;
          highest_rated_movie_id?: number | null;
          last_active?: string | null;
          lowest_rated_movie_id?: number | null;
          nominations_total?: number | null;
          ratings_total?: number | null;
          total_points?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          accessibility_preferences: Json | null;
          avatar_border_color_index: number | null;
          avatar_color_index: number | null;
          avatar_icon: string | null;
          avatar_url: string | null;
          bio: string | null;
          clubs_count: number | null;
          created_at: string | null;
          discussion_preferences: Json | null;
          dismissed_hints: Json | null;
          display_name: string;
          email: string;
          email_verified: boolean | null;
          favorite_actor_tmdb_id: number | null;
          favorite_composer_tmdb_id: number | null;
          favorite_director_tmdb_id: number | null;
          favorite_genres: string[] | null;
          favorite_movie_tmdb_id: number | null;
          featured_badge_ids: string[] | null;
          hidden_providers: number[] | null;
          id: string;
          id_card_settings: Json | null;
          last_display_name_change: string | null;
          mobile_nav_preferences: Json | null;
          movies_watched_count: number | null;
          rating_preferences: Json | null;
          show_profile_popup: boolean | null;
          show_watch_providers: boolean | null;
          sidebar_nav_preferences: Json | null;
          social_links: Json | null;
          updated_at: string | null;
          username: string;
          username_auto_derived: boolean;
          username_last_changed_at: string | null;
          watch_history_private: boolean | null;
          watch_provider_region: string | null;
        };
        Insert: {
          accessibility_preferences?: Json | null;
          avatar_border_color_index?: number | null;
          avatar_color_index?: number | null;
          avatar_icon?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          clubs_count?: number | null;
          created_at?: string | null;
          discussion_preferences?: Json | null;
          dismissed_hints?: Json | null;
          display_name: string;
          email: string;
          email_verified?: boolean | null;
          favorite_actor_tmdb_id?: number | null;
          favorite_composer_tmdb_id?: number | null;
          favorite_director_tmdb_id?: number | null;
          favorite_genres?: string[] | null;
          favorite_movie_tmdb_id?: number | null;
          featured_badge_ids?: string[] | null;
          hidden_providers?: number[] | null;
          id?: string;
          id_card_settings?: Json | null;
          last_display_name_change?: string | null;
          mobile_nav_preferences?: Json | null;
          movies_watched_count?: number | null;
          rating_preferences?: Json | null;
          show_profile_popup?: boolean | null;
          show_watch_providers?: boolean | null;
          sidebar_nav_preferences?: Json | null;
          social_links?: Json | null;
          updated_at?: string | null;
          username: string;
          username_auto_derived?: boolean;
          username_last_changed_at?: string | null;
          watch_history_private?: boolean | null;
          watch_provider_region?: string | null;
        };
        Update: {
          accessibility_preferences?: Json | null;
          avatar_border_color_index?: number | null;
          avatar_color_index?: number | null;
          avatar_icon?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          clubs_count?: number | null;
          created_at?: string | null;
          discussion_preferences?: Json | null;
          dismissed_hints?: Json | null;
          display_name?: string;
          email?: string;
          email_verified?: boolean | null;
          favorite_actor_tmdb_id?: number | null;
          favorite_composer_tmdb_id?: number | null;
          favorite_director_tmdb_id?: number | null;
          favorite_genres?: string[] | null;
          favorite_movie_tmdb_id?: number | null;
          featured_badge_ids?: string[] | null;
          hidden_providers?: number[] | null;
          id?: string;
          id_card_settings?: Json | null;
          last_display_name_change?: string | null;
          mobile_nav_preferences?: Json | null;
          movies_watched_count?: number | null;
          rating_preferences?: Json | null;
          show_profile_popup?: boolean | null;
          show_watch_providers?: boolean | null;
          sidebar_nav_preferences?: Json | null;
          social_links?: Json | null;
          updated_at?: string | null;
          username?: string;
          username_auto_derived?: boolean;
          username_last_changed_at?: string | null;
          watch_history_private?: boolean | null;
          watch_provider_region?: string | null;
        };
        Relationships: [];
      };
      watch_history: {
        Row: {
          contexts: Json;
          first_watched_at: string;
          id: string;
          tmdb_id: number;
          updated_at: string | null;
          user_id: string;
          watch_count: number;
        };
        Insert: {
          contexts?: Json;
          first_watched_at: string;
          id?: string;
          tmdb_id: number;
          updated_at?: string | null;
          user_id: string;
          watch_count?: number;
        };
        Update: {
          contexts?: Json;
          first_watched_at?: string;
          id?: string;
          tmdb_id?: number;
          updated_at?: string | null;
          user_id?: string;
          watch_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "watch_history_tmdb_id_fkey";
            columns: ["tmdb_id"];
            isOneToOne: false;
            referencedRelation: "movies";
            referencedColumns: ["tmdb_id"];
          },
          {
            foreignKeyName: "watch_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      _run_pgtap_test: { Args: { test_sql: string }; Returns: string[] };
      archive_old_notifications: { Args: never; Returns: number };
      can_update_club: {
        Args: { p_club_id: string; p_user_id: string };
        Returns: boolean;
      };
      delete_old_archived_notifications: { Args: never; Returns: number };
      fuzzy_search_club_notes: {
        Args: { result_limit?: number; search_query: string };
        Returns: {
          club_id: string;
          club_name: string;
          id: string;
          movie_title: string;
          movie_year: number;
          note: string;
          similarity_score: number;
          tmdb_id: number;
        }[];
      };
      fuzzy_search_discussions: {
        Args: { result_limit?: number; search_query: string };
        Returns: {
          club_id: string;
          club_name: string;
          club_slug: string;
          id: string;
          similarity_score: number;
          slug: string;
          title: string;
        }[];
      };
      fuzzy_search_festivals: {
        Args: { result_limit?: number; search_query: string };
        Returns: {
          club_id: string;
          club_name: string;
          club_slug: string;
          id: string;
          similarity_score: number;
          slug: string;
          theme: string;
        }[];
      };
      fuzzy_search_movies: {
        Args: { result_limit?: number; search_query: string };
        Returns: {
          poster_url: string;
          similarity_score: number;
          slug: string;
          title: string;
          tmdb_id: number;
          year: number;
        }[];
      };
      fuzzy_search_private_notes: {
        Args: { result_limit?: number; search_query: string };
        Returns: {
          id: string;
          movie_title: string;
          movie_year: number;
          note: string;
          similarity_score: number;
          tmdb_id: number;
        }[];
      };
      generate_season_slug: { Args: { season_name: string }; Returns: string };
      generate_slug: { Args: { input_text: string }; Returns: string };
      get_backrow_matinee_club_id: { Args: never; Returns: string };
      get_current_matinee: {
        Args: never;
        Returns: {
          curator_note: string;
          expires_at: string;
          featured_at: string;
          id: string;
          movie_director: string;
          movie_genres: string[];
          movie_poster_url: string;
          movie_title: string;
          movie_year: string;
          tmdb_id: number;
        }[];
      };
      get_featured_club: {
        Args: never;
        Returns: {
          avg_rating: number;
          description: string;
          festival_count: number;
          id: string;
          member_count: number;
          name: string;
          picture_url: string;
        }[];
      };
      is_club_member: {
        Args: { p_club_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_club_producer: {
        Args: { p_club_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_club_public: { Args: { p_club_id: string }; Returns: boolean };
      is_site_admin: { Args: { check_user_id: string }; Returns: boolean };
      is_super_admin: { Args: { check_user_id: string }; Returns: boolean };
      is_user_blocked: { Args: { target_user_id: string }; Returns: boolean };
      run_pgtap_test: { Args: { test_sql: string }; Returns: string[] };
      search_private_notes_fuzzy: {
        Args: { result_limit?: number; search_query: string };
        Returns: {
          id: string;
          movie_title: string;
          movie_year: number;
          note: string;
          similarity_score: number;
          tmdb_id: string;
        }[];
      };
      tap_finish: { Args: never; Returns: string[] };
      tap_ok: { Args: { v_bool: boolean; v_desc: string }; Returns: string };
      tap_plan: { Args: { v_count: number }; Returns: string };
      test_authenticate_as: { Args: { user_id: string }; Returns: undefined };
      test_clear_authentication: { Args: never; Returns: undefined };
      test_count_as_authenticated: {
        Args: { query_sql: string };
        Returns: number;
      };
      test_create_user: {
        Args: { p_display_name?: string; p_email: string; p_username?: string };
        Returns: string;
      };
      test_delete_user: { Args: { p_user_id: string }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
