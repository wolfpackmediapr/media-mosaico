
// Clean up HTML content for better display
export const cleanHtmlContent = (html: string): string => {
  if (!html) return '';
  
  // Remove script tags
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove excessive newlines and spaces
  cleaned = cleaned.replace(/\n\s+/g, '\n').trim();
  
  return cleaned;
};

// Extract image URL from content if possible
export const extractImageUrl = (item: any): string | null => {
  // Check all possible image sources in order of preference
  
  // Direct image property
  if (item.image) return item.image;
  
  // Media content
  if (item.media_content) return item.media_content;
  
  // Media content in different format
  if (item.media && item.media.content) return item.media.content;
  
  // Attachments array
  if (item.attachments && Array.isArray(item.attachments) && item.attachments.length > 0) {
    const attachment = item.attachments[0];
    if (attachment.url) return attachment.url;
    if (attachment.image_url) return attachment.image_url;
  }
  
  // Enclosures (common in RSS feeds)
  if (item.enclosures && Array.isArray(item.enclosures) && item.enclosures.length > 0) {
    const enclosure = item.enclosures[0];
    if (typeof enclosure === 'string') return enclosure;
    if (enclosure.url) return enclosure.url;
  }
  
  // Thumbnail
  if (item.thumbnail) return item.thumbnail;
  
  // Extract from HTML as last resort
  return extractImageFromHtml(item.content_html || item.description || '');
};

// Extract image from HTML content
export const extractImageFromHtml = (html: string): string | null => {
  // Try to extract image tag
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) return imgMatch[1];
  
  // Try background-image style
  const bgImgMatch = html.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/i);
  if (bgImgMatch && bgImgMatch[1]) return bgImgMatch[1];
  
  // Try Twitter card/summary image (often in meta tags)
  const twitterMatch = html.match(/twitter:image[^>]+content=["']([^"']+)["']/i);
  if (twitterMatch && twitterMatch[1]) return twitterMatch[1];
  
  return null;
};
