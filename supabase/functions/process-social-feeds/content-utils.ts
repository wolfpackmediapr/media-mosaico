
// Clean HTML content from feeds
export function cleanHtmlContent(html: string): string {
  if (!html) return '';
  
  try {
    // Remove script tags and their content
    let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove style tags and their content
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove all tags except for basic formatting and links
    cleaned = cleaned.replace(/<(?!\/?(b|strong|i|em|a|p|br|hr)(?:\s|>))[^>]+>/gi, '');
    
    // Remove excessive line breaks
    cleaned = cleaned.replace(/(\r\n|\n|\r){3,}/gm, '\n\n');
    
    // Remove excessive spaces
    cleaned = cleaned.replace(/\s{3,}/g, ' ');
    
    return cleaned.trim();
  } catch (error) {
    console.error('Error cleaning HTML content:', error);
    return html; // Return original if cleaning failed
  }
}

// Extract image URL from feed item
export function extractImageUrl(item: any): string | null {
  if (!item) return null;
  
  try {
    // Try direct image_url field
    if (item.image_url) return item.image_url;
    
    // Try media_content field (common in RSS feeds)
    if (item.media_content) return item.media_content;
    
    // Try different attachment formats
    if (item.attachments && Array.isArray(item.attachments) && item.attachments.length > 0) {
      const attachment = item.attachments[0];
      if (attachment.url) return attachment.url;
      if (attachment.image_url) return attachment.image_url;
    }
    
    // Try enclosures (common in RSS feeds)
    if (item.enclosures && Array.isArray(item.enclosures) && item.enclosures.length > 0) {
      const enclosure = item.enclosures[0];
      if (typeof enclosure === 'string') return enclosure;
      if (enclosure.url) return enclosure.url;
    }
    
    // Try to extract from content/description as last resort
    return extractImageFromHtml(item.description || item.content || '');
  } catch (error) {
    console.error('Error extracting image URL:', error);
    return null;
  }
}

// Extract first image from HTML content
export function extractImageFromHtml(html: string): string | null {
  if (!html) return null;
  
  try {
    // Simple regex to find image tags and extract src attribute
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    return imgMatch ? imgMatch[1] : null;
  } catch (error) {
    console.error('Error extracting image from HTML:', error);
    return null;
  }
}
