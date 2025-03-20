
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { platformIcons } from "@/lib/platform-icons";
import type { SocialPost } from "@/types/social";
import { sanitizeSocialContent, extractImageFromHtml, getPlatformPlaceholderImage } from "@/services/social/content-sanitizer";
import { useState, useEffect } from "react";
import { Image } from "@/components/ui/image";

interface SocialPostCardProps {
  post: SocialPost;
}

const SocialPostCard = ({ post }: SocialPostCardProps) => {
  const PlatformIcon = platformIcons[post.platform] || platformIcons.news;
  const sanitizedDescription = sanitizeSocialContent(post.description);
  
  // Extract image from content if no image_url is provided
  const contentImage = !post.image_url ? extractImageFromHtml(post.description) : null;
  
  // Use a more specific placeholder image for Twitter/social media
  const placeholderImage = getPlatformPlaceholderImage(post.platform);
  
  // Track image loading state
  const [imageError, setImageError] = useState(false);
  const [imageToUse, setImageToUse] = useState<string | null>(null);
  
  // Map of known profile images - updated with new image for Benjamín Torres Gotay
  const profileImageMap: Record<string, string> = {
    "Jay Fonseca": "/lovable-uploads/245cf068-419d-4227-918d-f35e38320b3e.png",
    "Jugando Pelota Dura": "/lovable-uploads/2cc77865-c53b-42a6-a1fd-96ed2c7a031e.png", 
    "Benjamín Torres Gotay": "/lovable-uploads/3201a499-9523-4ff1-a701-cadf852b7314.png"
  };
  
  // Determine profile image and update image state when post changes
  useEffect(() => {
    // Reset image error state when post changes
    setImageError(false);
    
    // Get the profile image for this source
    const profileImageUrl = profileImageMap[post.source] || null;
    
    console.log(`Post source: "${post.source}"`);
    console.log(`Looking up profile image for "${post.source}": ${profileImageUrl}`);
    
    // Determine which image to display with clear priority order
    let newImageToUse = post.image_url || contentImage || profileImageUrl || placeholderImage;
    
    // If we're explicitly using the profile image, log it
    if (profileImageUrl && (newImageToUse === profileImageUrl)) {
      console.log(`Using profile image for ${post.source}: ${profileImageUrl}`);
    }
    
    setImageToUse(newImageToUse);
  }, [post, contentImage, placeholderImage]);
  
  // Handle image load errors
  const handleImageError = () => {
    console.log(`Image failed to load: ${imageToUse}`);
    
    // If image fails, try to use profile image as fallback or placeholder
    const profileImage = profileImageMap[post.source];
    
    // Only set error state if we haven't already tried the fallback image
    if (!imageError) {
      setImageError(true);
      
      // Explicitly set fallback image
      if (profileImage) {
        console.log(`Falling back to profile image: ${profileImage}`);
        setImageToUse(profileImage);
      } else {
        console.log(`No profile image available, using placeholder: ${placeholderImage}`);
        setImageToUse(placeholderImage);
      }
    }
  };
  
  // Ensure we have an image to display
  const finalImageUrl = imageToUse || placeholderImage;
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="w-full h-48 overflow-hidden">
          <Image 
            src={finalImageUrl}
            alt={post.title}
            className="w-full h-full object-cover"
            onError={handleImageError}
            crossOrigin="anonymous"
            loading="lazy"
            width={400}
            height={400}
          />
        </div>
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <PlatformIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {post.source}
            </span>
            <Badge variant="outline" className="ml-auto">
              {post.platform_display_name || post.platform}
            </Badge>
          </div>
          <h3 className="font-bold text-lg mb-2 line-clamp-2">{post.title}</h3>
          {sanitizedDescription && (
            <div 
              className="text-muted-foreground mb-2 prose-sm max-w-none line-clamp-3"
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between p-4 pt-0 text-sm text-muted-foreground">
        <span>
          {post.pub_date && 
            formatDistanceToNow(new Date(post.pub_date), { 
              addSuffix: true,
              locale: es
            })
          }
        </span>
        <a 
          href={post.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center text-primary hover:underline"
        >
          Ver original
          <ExternalLink className="ml-1 h-3 w-3" />
        </a>
      </CardFooter>
    </Card>
  );
};

export default SocialPostCard;
