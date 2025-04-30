
// Sanitize content for display on the frontend
export function sanitizeSocialContent(content: string): string {
  if (!content) return '';
  
  try {
    // Remove potentially malicious tags and attributes
    let sanitized = content;
    
    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove style tags and their content
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove inline event handlers (onclick, onload, etc.)
    sanitized = sanitized.replace(/\son\w+\s*=\s*["']?[^"']*["']?/gi, '');
    
    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript:/gi, 'invalid:');
    
    // Remove data: URLs from certain elements
    sanitized = sanitized.replace(/<(img|iframe)[^>]*\ssrc=["']data:[^>]*>/gi, '');
    
    // Add target="_blank" and rel="noopener noreferrer" to all links
    sanitized = sanitized.replace(/<a\s+([^>]*)href=["']([^"']+)["']([^>]*)>/gi, 
      (match, before, href, after) => {
        // Skip if already has target="_blank"
        if (/(target=["']_blank["'])/i.test(match)) {
          return match;
        }
        return `<a ${before}href="${href}" ${after} target="_blank" rel="noopener noreferrer">`;
      }
    );
    
    return sanitized;
  } catch (error) {
    console.error('Error sanitizing content:', error);
    return 'Error displaying content';
  }
}

// Extract image URL from HTML content
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
