"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";
import type { UserRatingPreferences } from "@/types/user-rating-preferences";
import type { DismissedHints } from "@/types/dismissed-hints";

interface UserProfile {
  id: string;
  email?: string;
  avatar_url?: string | null;
  display_name?: string | null;
  // Avatar columns - stored as proper columns, not in social_links JSON
  avatar_icon?: string | null;
  avatar_color_index?: number | null;
  avatar_border_color_index?: number | null;
  // Keep social_links for actual social links (Letterboxd, etc.)
  social_links?: Record<string, unknown> | null;
  rating_preferences?: UserRatingPreferences | null;
  dismissed_hints?: DismissedHints | null;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  isHintDismissed: (key: string) => boolean;
}

const UserProfileContext = createContext<UserProfileContextType>({
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
  isHintDismissed: () => true,
});

export function useUserProfile() {
  return useContext(UserProfileContext);
}

interface UserProfileProviderProps {
  children: ReactNode;
}

export function UserProfileProvider({ children }: UserProfileProviderProps) {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    if (!authUser) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, display_name, avatar_url, avatar_icon, avatar_color_index, avatar_border_color_index, social_links, rating_preferences, dismissed_hints"
        )
        .eq("id", authUser.id)
        .single();

      if (error) {
        console.error("UserProfileProvider: Error fetching profile:", error);
        setProfile(null);
      } else {
        setProfile({
          id: data.id,
          email: authUser.email,
          avatar_url: data.avatar_url,
          display_name: data.display_name,
          // Avatar columns - read from proper columns
          avatar_icon: data.avatar_icon,
          avatar_color_index: data.avatar_color_index,
          avatar_border_color_index: data.avatar_border_color_index,
          social_links: data.social_links as UserProfile["social_links"],
          rating_preferences: data.rating_preferences as UserRatingPreferences | null,
          dismissed_hints: data.dismissed_hints as DismissedHints | null,
        });
      }
    } catch (error) {
      console.error("UserProfileProvider: Error:", error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [authUser, supabase]);

  // Initial load and when auth user changes
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Subscribe to realtime changes on the users table for this user
  useEffect(() => {
    if (!authUser) return;

    const channel = supabase
      .channel(`user-profile-${authUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${authUser.id}`,
        },
        (payload) => {
          // Update profile when changes are detected
          const newData = payload.new as {
            id: string;
            display_name?: string | null;
            avatar_url?: string | null;
            avatar_icon?: string | null;
            avatar_color_index?: number | null;
            avatar_border_color_index?: number | null;
            social_links?: UserProfile["social_links"];
            rating_preferences?: UserRatingPreferences | null;
            dismissed_hints?: DismissedHints | null;
          };
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  display_name: newData.display_name,
                  avatar_url: newData.avatar_url,
                  avatar_icon: newData.avatar_icon,
                  avatar_color_index: newData.avatar_color_index,
                  avatar_border_color_index: newData.avatar_border_color_index,
                  social_links: newData.social_links,
                  rating_preferences: newData.rating_preferences,
                  dismissed_hints: newData.dismissed_hints,
                }
              : null
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser, supabase]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const isHintDismissed = useCallback(
    (key: string) => {
      // Default to true (hidden) when profile hasn't loaded to avoid flash
      if (!profile) return true;
      return !!profile.dismissed_hints?.[key];
    },
    [profile]
  );

  return (
    <UserProfileContext.Provider value={{ profile, isLoading, refreshProfile, isHintDismissed }}>
      {children}
    </UserProfileContext.Provider>
  );
}
