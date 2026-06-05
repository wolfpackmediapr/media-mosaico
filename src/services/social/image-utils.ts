
import { extractImageFromHtml, getPlatformPlaceholderImage } from "./content-sanitizer";

const PROXY_HOST_SUFFIXES = ["cdninstagram.com", "fbcdn.net"];

/**
 * Rewrite hotlink-blocked image URLs (Instagram CDN) through our edge proxy
 * so the browser can render them without a referrer/403 block.
 */
export const proxyImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const host = parsed.hostname.toLowerCase();
  const needsProxy = PROXY_HOST_SUFFIXES.some(
    (s) => host === s || host.endsWith("." + s),
  );
  if (!needsProxy) return url;

  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) return url;
  return `${base}/functions/v1/social-image-proxy?url=${encodeURIComponent(url)}`;
};

/**
 * Extract image URL from various possible sources in social feed data
 */
export const extractImageUrl = (article: any): string | null => {
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

/**
 * Get appropriate image for a social post, with fallbacks
 */
export const getSocialPostImage = (article: any): string | null => {
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
  
  return proxyImageUrl(image);
};
