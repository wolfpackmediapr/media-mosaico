import type { SocialPost, SocialPlatform } from "@/types/social";
import { getSocialPostImage } from "./image-utils";
import { SOCIAL_PLATFORMS } from "./api";

// Transform database articles to SocialPost format
export const transformArticlesToPosts = (articlesData: any[]): SocialPost[] => {
  return articlesData
    .map(article => {
      // Get image with fallbacks handled by the utility function
      const image = getSocialPostImage(article);
      
      // Make sure we have all the required properties for the SocialPost type
      return {
        id: article.id,
        title: article.title || '',
        description: article.description || '',
        link: article.link || '',
        pub_date: article.pub_date,
        source: article.feed_source?.name || article.source || '',
        image_url: image,
        platform: article.feed_source?.platform || 'social_media',
        platform_display_name: article.feed_source?.name || article.feed_source?.platform_display_name || article.feed_source?.platform || 'Social Media',
        platform_icon: article.feed_source?.platform_icon,
        feed_source: article.feed_source ? {
          profile_image_url: null,
          name: article.feed_source.name,
          platform: article.feed_source.platform
        } : undefined
      };
    });
};

// Transform platform data into SocialPlatform format
export const transformPlatformData = (
  feedSources: Array<any>,
  platformCounts: Record<string, number>
): SocialPlatform[] => {
  // Debug what we're working with
  console.log('Transform platform data:', { feedSources, platformCounts });
  
  const platformMap: Record<string, SocialPlatform> = {};
  
  // Create platform entries from feed sources
  feedSources.forEach(fs => {
    // Use the source name (e.g., "Jay Fonseca") as the platform identifier
    const platformName = fs.name;
    
    if (platformName) {
      // If this platform name is already in the map, just update the count
      if (platformMap[platformName]) {
        platformMap[platformName].count = platformCounts[platformName] || 0;
      } else {
        // Otherwise create a new entry
        platformMap[platformName] = {
          id: fs.platform || 'twitter', // Default to twitter for icon purposes
          name: platformName,
          count: platformCounts[platformName] || 0
        };
      }
    }
  });
  
  // Convert map to array and sort
  const platforms = Object.values(platformMap);
  
  // Debug the resulting platforms
  console.log('Final platforms data:', platforms);
  
  // Sort by count descending, then name ascending
  platforms.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });
  
  return platforms;
};

// Calculate platform counts from articles
export const calculatePlatformCounts = (articles: any[]): Record<string, number> => {
  const platformCounts: Record<string, number> = {};
  
  articles.forEach(article => {
    if (article.feed_source?.name) {
      const sourceName = article.feed_source.name;
      platformCounts[sourceName] = (platformCounts[sourceName] || 0) + 1;
    }
  });
  
  console.log('Platform counts calculated:', platformCounts);
  return platformCounts;
};
