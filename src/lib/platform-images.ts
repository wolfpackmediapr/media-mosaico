
// Get fallback image URL based on source and platform
export function getFallbackImage(sourceName: string, platform: string): string {
  // First try to match exact source name
  switch (sourceName?.toLowerCase()) {
    case 'jay fonseca':
      return '/images/social/jay-fonseca.jpg';
    case 'jugando pelota dura':
      return '/images/social/jugando-pelota-dura.jpg';
    case 'molusco':
      return '/images/social/molusco.jpg';
    case 'benjamín torres gotay':
    case 'benjamin torres gotay':
      return '/images/social/benjamin-torres-gotay.jpg';
    default:
      // If no match for source name, fall back to platform
      switch (platform?.toLowerCase()) {
        case 'facebook':
          return '/images/social/facebook.jpg';
        case 'instagram':
          return '/images/social/instagram.jpg';
        case 'twitter':
          return '/images/social/twitter.jpg';
        case 'youtube':
          return '/images/social/youtube.jpg';
        case 'linkedin':
          return '/images/social/linkedin.jpg';
        default:
          // Default fallback image
          return '/images/social/social-media-default.jpg';
      }
  }
}
