
import type { SocialPost, SocialPlatform } from "@/types/social";

// Transform database articles to SocialPost format
export const transformArticlesToPosts = (articlesData: any[]): SocialPost[] => {
  return articlesData.map(article => ({
    id: article.id,
    title: article.title,
    description: article.description || '',
    link: article.link,
    pub_date: article.pub_date,
    source: article.feed_source?.name || article.source,
    image_url: article.image_url,
    platform: article.feed_source?.platform || 'social_media',
    platform_display_name: article.feed_source?.platform_display_name || article.feed_source?.platform || 'Social Media',
    platform_icon: article.feed_source?.platform_icon
  }));
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
