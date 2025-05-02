
import { useState, useEffect } from "react";
import { usePlatformData } from "./use-platform-data";
import { usePostData } from "./use-post-data";
import { useRefreshFeeds } from "./use-refresh-feeds";
import { ITEMS_PER_PAGE } from "@/services/social/api";
import type { SocialPost } from "@/types/social";

/**
 * Combined hook for the RedesSociales page that integrates all social feed functionality
 */
export function useSocialFeeds() {
  const { platforms, isLoading: isPlatformsLoading } = usePlatformData();
  const { posts, isLoading: isPostsLoading, fetchPosts, totalCount } = usePostData();
  const { refreshFeeds, isRefreshing, lastRefreshTime } = useRefreshFeeds();
  const [displayPosts, setDisplayPosts] = useState<SocialPost[]>([]);

  // Function to fetch platforms - kept for API compatibility
  const fetchPlatforms = async () => {
    // This is now handled by usePlatformData internally
    return platforms;
  };

  return {
    posts,
    platforms,
    displayPosts,
    setDisplayPosts,
    isLoading: isPlatformsLoading || isPostsLoading,
    isRefreshing,
    totalCount,
    fetchPosts,
    fetchPlatforms,
    refreshFeeds,
    lastRefreshTime
  };
}

// Re-exporting the legacy hooks for backward compatibility
export { useSocialPlatforms, useSocialPosts, useJayFonsecaFeed, useRefreshSocialFeeds, useJayFonsecaRefresh } from "./legacy-hooks";
