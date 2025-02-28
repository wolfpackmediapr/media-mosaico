
/**
 * Sanitizes social media content by removing unwanted HTML and formatting properly
 */
export const sanitizeSocialContent = (content: string): string => {
  if (!content) return '';
  
  // First check if this is a Twitter-style post (which often has blockquotes)
  if (content.includes('<blockquote class="twitter-tweet"') || 
      content.includes('<blockquote class="twitter-content"')) {
    return handleTwitterContent(content);
  }
  
  // For other content, do basic HTML cleanup
  let cleaned = content
    // Replace multiple line breaks with a single one
    .replace(/(<br\s*\/?>){2,}/gi, '<br />')
    // Remove any script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Replace blockquotes with styled divs
    .replace(/<blockquote>/gi, '<div class="pl-4 border-l-2 border-gray-300 my-2">')
    .replace(/<\/blockquote>/gi, '</div>')
    // Handle nested blockquotes in Twitter content
    .replace(/<blockquote class="[^"]*">/gi, '<div class="pl-4 border-l-2 border-gray-300 my-2">')
    // Make all links open in new tab
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
 */
const handleTwitterContent = (content: string): string => {
  // Extract text content from blockquotes
  const matches = content.match(/<p>(.*?)<\/p>/g);
  
  if (matches && matches.length > 0) {
    // Join the first few paragraphs and add styling
    return matches.slice(0, 3)
      .join('')
      .replace(/<p>/g, '<p class="mb-2">')
      // Ensure links open in new tab
      .replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline" ');
  }
  
  // Extract any text content if no paragraphs found
  const textContent = content.replace(/<[^>]*>/g, ' ').trim();
  if (textContent) {
    return `<p>${textContent}</p>`;
  }
  
  // If we couldn't extract content or it's empty, return a simplified version
  return content
    .replace(/<blockquote[^>]*>/g, '<div class="social-quote">')
    .replace(/<\/blockquote>/g, '</div>')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};
