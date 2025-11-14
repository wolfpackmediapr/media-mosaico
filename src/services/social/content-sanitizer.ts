import DOMPurify from 'dompurify';

/**
 * Sanitizes social media content by removing unwanted HTML and formatting properly
 * Uses DOMPurify for comprehensive XSS protection
 */
export const sanitizeSocialContent = (content: string): string => {
  if (!content) return '';
  
  // Configure DOMPurify with safe options
  const config = {
    ALLOWED_TAGS: ['p', 'br', 'a', 'div', 'blockquote', 'strong', 'em', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
  };
  
  // First sanitize with DOMPurify to remove XSS vectors
  let cleaned = DOMPurify.sanitize(content, config);
  
  // Then apply our formatting preferences
  cleaned = cleaned
    // Replace multiple line breaks with a single one
    .replace(/(<br\s*\/?>){2,}/gi, '<br />')
    // Replace blockquotes with styled divs
    .replace(/<blockquote>/gi, '<div class="pl-4 border-l-2 border-gray-300 my-2">')
    .replace(/<\/blockquote>/gi, '</div>')
    // Handle nested blockquotes
    .replace(/<blockquote class="[^"]*">/gi, '<div class="pl-4 border-l-2 border-gray-300 my-2">')
    // Make all links open in new tab (DOMPurify may strip these, so re-add)
    .replace(/<a /gi, '<a target="_blank" rel="noopener noreferrer" ');
  
  // Limit to 3 paragraphs for readability
  const paragraphs = cleaned.split('</p>');
  if (paragraphs.length > 3) {
    cleaned = paragraphs.slice(0, 3).join('</p>') + '</p>';
  }
  
  return cleaned;
};

/**
 * Special handling for Twitter content which often has embedded tweets
 * This function is now deprecated but kept for backward compatibility
 * DOMPurify in sanitizeSocialContent handles all sanitization
 */
const handleTwitterContent = (content: string): string => {
  // Use the main sanitization function for consistency
  return sanitizeSocialContent(content);
};

/**
 * Extract image URL from content if post doesn't have one
 */
export const extractImageFromHtml = (content: string): string | null => {
  if (!content) return null;
  
  // Try to find image tag
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    // Verify it's not a tiny icon
    const urlLower = imgMatch[1].toLowerCase();
    if (!urlLower.includes('icon') && !urlLower.includes('avatar') && !urlLower.includes('emoji')) {
      return imgMatch[1];
    }
  }
  
  // Try to find Twitter image cards
  const twitterMatch = content.match(/twitter:image[^>]+content=["']([^"']+)["']/i);
  if (twitterMatch && twitterMatch[1]) {
    return twitterMatch[1];
  }
  
  // Look for background images in style attributes
  const bgMatch = content.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/i);
  if (bgMatch && bgMatch[1]) {
    return bgMatch[1];
  }
  
  return null;
};

/**
 * Generate a placeholder image URL for social platforms
 */
export const getPlatformPlaceholderImage = (platform: string, sourceName?: string): string => {
  // Special case for Benjamin Torres Gotay feed
  if (sourceName === 'Benjamín Torres Gotay') {
    return "/lovable-uploads/3201a499-9523-4ff1-a701-cadf852b7314.png";
  }

  // Special case for Molusco feed
  if (sourceName === 'Molusco') {
    return "/lovable-uploads/861a51b6-0cb5-41fc-9c28-6eddfe0ecc80.png";
  }

  const placeholders = {
    twitter: "https://images.unsplash.com/photo-1611162616475-46b635cb6868",
    facebook: "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb",
    instagram: "https://images.unsplash.com/photo-1611262588024-d12430b98920",
    linkedin: "https://images.unsplash.com/photo-1611944212129-29977ae1398c",
    default: "https://images.unsplash.com/photo-1611162616475-46b635cb6868"
  };
  
  return placeholders[platform as keyof typeof placeholders] || placeholders.default;
};
