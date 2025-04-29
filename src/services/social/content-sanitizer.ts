
// Clean HTML content
export function sanitizeSocialContent(html: string): string {
  if (!html) return '';
  
  // Remove script tags
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove inline styles
  sanitized = sanitized.replace(/style="[^"]*"/gi, '');
  
  // Remove excessive spaces and newlines
  sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();
  
  return sanitized;
}

// Extract image URL from HTML content
export function extractImageFromHtml(html: string): string | null {
  if (!html) return null;
  
  // Try to find img tags
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/i;
  const imgMatch = html.match(imgRegex);
  
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  
  // Try to find background images in style attributes
  const bgRegex = /background-image:\s*url\(['"]?([^'"]+)['"]?\)/i;
  const bgMatch = html.match(bgRegex);
  
  if (bgMatch && bgMatch[1]) {
    return bgMatch[1];
  }
  
  return null;
}
