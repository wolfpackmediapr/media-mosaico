
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSocialPosts } from "@/services/social/api";
import { transformArticlesToPosts } from "@/services/social/utils";
import type { SocialPost } from "@/types/social";

/**
 * Hook for fetching and managing social posts with filtering and pagination
 */
export function usePostData() {
  const [totalCount, setTotalCount] = useState(0);
  
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["social-posts"],
    queryFn: () => fetchPosts()
  });

  /**
   * Fetch posts with filtering and pagination
   */
  const fetchPosts = async (
    page = 1, 
    searchTerm = "", 
    selectedPlatforms: string[] = []
  ): Promise<SocialPost[]> => {
    console.log('Fetching posts with:', { page, searchTerm, selectedPlatforms });
    try {
      // Fetch posts using the API function
      const { data, count } = await fetchSocialPosts(page, searchTerm, selectedPlatforms);
      
      // Update total count
      if (count !== null) {
        setTotalCount(count);
      }
      
      // Transform articles to posts
      return transformArticlesToPosts(data || []);
    } catch (error) {
      console.error('Error fetching social posts:', error);
      return [];
    }
  };

  return {
    posts,
    isLoading,
    fetchPosts,
    totalCount
  };
}
