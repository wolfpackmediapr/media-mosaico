
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSocialFeedError } from "@/services/social/error-handler";

export function useSocialPlatforms() {
  return useQuery({
    queryKey: ["social-platforms"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("social_platforms")
          .select("*")
          .order("name", { ascending: true });

        if (error) throw error;

        return data || [];
      } catch (error) {
        handleSocialFeedError(error, "platforms");
        return [];
      }
    },
  });
}

export function useSocialPosts(platformId?: string) {
  return useQuery({
    queryKey: ["social-posts", platformId],
    queryFn: async () => {
      if (!platformId) return [];

      try {
        const { data, error } = await supabase
          .from("social_posts")
          .select("*")
          .eq("platform_id", platformId)
          .order("published_at", { ascending: false });

        if (error) throw error;

        return data || [];
      } catch (error) {
        handleSocialFeedError(error, "posts");
        return [];
      }
    },
    enabled: !!platformId,
  });
}

export function useJayFonsecaFeed() {
  return useQuery({
    queryKey: ["jay-fonseca-feed"],
    queryFn: async () => {
      try {
        const { data: feed, error } = await supabase
          .from("jay_fonseca_feed")
          .select("*")
          .order("published_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        return feed || [];
      } catch (error) {
        handleSocialFeedError(error, "feed");
        return [];
      }
    },
  });
}

export function useRefreshSocialFeeds() {
  return {
    refreshFeeds: async () => {
      try {
        const { error } = await supabase.functions.invoke("refresh-social-feeds");

        if (error) throw error;

        return { success: true };
      } catch (error) {
        handleSocialFeedError(error, "refresh");
        return { success: false };
      }
    },
  };
}

export function useJayFonsecaRefresh() {
  return {
    refreshFeed: async () => {
      try {
        const { error } = await supabase.functions.invoke("refresh-jay-fonseca");

        if (error) throw error;

        return { success: true };
      } catch (error) {
        handleSocialFeedError(error, "refresh");
        return { success: false };
      }
    },
  };
}
