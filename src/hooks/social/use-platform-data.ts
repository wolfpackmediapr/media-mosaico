
import { useQuery } from "@tanstack/react-query";
import { transformPlatformData, calculatePlatformCounts } from "@/services/social/utils";
import { fetchPlatformsData, fetchPlatformCounts } from "@/services/social/api";
import type { SocialPlatform } from "@/types/social";

/**
 * Hook for fetching platform data and counts
 */
export function usePlatformData(): {
  platforms: SocialPlatform[];
  isLoading: boolean;
} {
  const { data: platforms = [], isLoading } = useQuery({
    queryKey: ["social-platforms"],
    queryFn: fetchPlatforms
  });

  return { platforms, isLoading };
}

/**
 * Fetch available platforms and their post counts
 */
export async function fetchPlatforms(): Promise<SocialPlatform[]> {
  try {
    // First get all feed sources that match our social platforms
    console.log('Fetching platforms data...');
    const feedSources = await fetchPlatformsData();
    
    // Then fetch all articles from these feed sources to calculate counts
    console.log('Fetching platform counts...');
    const articles = await fetchPlatformCounts();
    
    // Calculate counts for each platform (based on feed source name)
    const platformCounts = calculatePlatformCounts(articles || []);
    
    // Transform the data to match the SocialPlatform type with counts
    return transformPlatformData(feedSources || [], platformCounts);
  } catch (error) {
    console.error('Error fetching platforms:', error);
    return [];
  }
}
