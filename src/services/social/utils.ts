
import type { SocialPost, SocialPlatform } from "@/types/social";
import { extractImageFromHtml } from "./content-sanitizer";

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
  return articlesData.map(article => {
    // Handle image extraction from various sources
    const image = article.image_url || extractImageUrl(article);
    
    return {
      id: article.id,
      title: article.title,
      description: article.description || '',
      link: article.link,
      pub_date: article.pub_date,
      source: article.feed_source?.name || article.source,
      image_url: image,
      platform: article.feed_source?.platform || 'social_media',
      platform_display_name: article.feed_source?.platform_display_name || article.feed_source?.platform || 'Social Media',
      platform_icon: article.feed_source?.platform_icon
    };
  });
};

// Transform platform data into SocialPlatform format
export const transformPlatformData = (
  platformData: Array<{ platform: string; platform_display_name: string | null }>,
  platformCounts: Record<string, number>
): SocialPlatform[] => {
  const platformNames: Record<string, string> = {};
  
  // Create platform names mapping
  platformData.forEach(fs => {
    if (fs.platform) {
      platformNames[fs.platform] = fs.platform_display_name || fs.platform;
    }
  });
  
  // Transform data to match SocialPlatform interface
  const platforms: SocialPlatform[] = Object.keys(platformNames).map(platform => ({
    id: platform,
    name: platformNames[platform] || platform,
    count: platformCounts[platform] || 0
  }));
  
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
    if (article.feed_source?.platform) {
      platformCounts[article.feed_source.platform] = 
        (platformCounts[article.feed_source.platform] || 0) + 1;
    }
  });
  
  return platformCounts;
};
