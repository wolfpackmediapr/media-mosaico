
import type { SocialPost, SocialPlatform } from "@/types/social";
import { extractImageFromHtml, getPlatformPlaceholderImage } from "./content-sanitizer";
import { SOCIAL_PLATFORMS } from "./api";

// Extract image URL from various possible sources in social feed data
const extractImageUrl = (article: any): string | null => {
  // Try direct image_url field
  if (article.image_url) return article.image_url;
  
  // Try media_content field (common in RSS feeds)
  if (article.media_content) return article.media_content;
  
  // Try different attachment formats
  if (article.attachments && Array.isArray(article.attachments) && article.attachments.length > 0) {
    const attachment = article.attachments[0];
    if (attachment.url) return attachment.url;
    if (attachment.image_url) return attachment.image_url;
  }
  
  // Try enclosures (common in RSS feeds)
  if (article.enclosures && Array.isArray(article.enclosures) && article.enclosures.length > 0) {
    const enclosure = article.enclosures[0];
    if (typeof enclosure === 'string') return enclosure;
    if (enclosure.url) return enclosure.url;
  }
  
  // Try to extract from content/description as last resort
  return extractImageFromHtml(article.description || article.content || '');
};

// Transform database articles to SocialPost format
export const transformArticlesToPosts = (articlesData: any[]): SocialPost[] => {
  return articlesData
    .map(article => {
      // Handle image extraction from various sources
      let image = article.image_url || extractImageUrl(article);
      
      // Apply source-specific fallback if no image is found
      if (!image && article.feed_source?.name) {
        // Get platform-specific placeholder based on source name
        image = getPlatformPlaceholderImage(
          article.feed_source?.platform || 'social_media', 
          article.feed_source?.name
        );
      }
      
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
