
// Default fallback images for social media platforms
const platformImages: Record<string, string> = {
  // Source specific fallbacks
  "Jay Fonseca": "/images/social/jay-fonseca.jpg",
  "Jugando Pelota Dura": "/images/social/jugando-pelota-dura.jpg",
  "Molusco": "/images/social/molusco.jpg",
  "Benjamín Torres Gotay": "/images/social/benjamin-torres-gotay.jpg",

  // Platform fallbacks
  "twitter": "/images/social/twitter.jpg",
  "facebook": "/images/social/facebook.jpg",
  "instagram": "/images/social/instagram.jpg",
  "youtube": "/images/social/youtube.jpg",
  "linkedin": "/images/social/linkedin.jpg",
};

// Get fallback image for a specific source or platform
export const getFallbackImage = (source: string, platform?: string): string => {
  // First try to match by source name (e.g., "Jay Fonseca")
  if (source && platformImages[source]) {
    return platformImages[source];
  }
  
  // Then try to match by platform type (e.g., "twitter")
  if (platform && platformImages[platform.toLowerCase()]) {
    return platformImages[platform.toLowerCase()];
  }
  
  // Default fallback
  return "/placeholder.svg";
};
