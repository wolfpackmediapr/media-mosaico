
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { sanitizeSocialContent } from "@/services/social/content-sanitizer";
import { Twitter, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
import { getFallbackImage } from "@/lib/platform-images";
import { platformIcons } from "@/lib/platform-icons";
import type { SocialPost } from "@/types/social";

interface SocialPostCardProps {
  post: SocialPost;
}

const getPlatformIcon = (platform: string) => {
  const PlatformIcon = platformIcons[platform?.toLowerCase()] || Twitter;
  return <PlatformIcon className="h-4 w-4" />;
};

const SocialPostCard = ({ post }: SocialPostCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  
  // Format the publication date
  const pubDate = post.pub_date ? new Date(post.pub_date) : null;
  const formattedDate = pubDate ? formatDistanceToNow(pubDate, { 
    addSuffix: true, 
    locale: es 
  }) : '';
  
  // Clean the description HTML
  const sanitizedDescription = sanitizeSocialContent(post.description);
  
  // Get platform display name
  const platformDisplay = post.platform_display_name || post.platform;
  
  // Get fallback image based on source and platform
  const fallbackImage = getFallbackImage(post.source, post.platform);
  
  return (
    <Card className="h-full flex flex-col overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Post header with platform and date */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {post.feed_source?.profile_image_url && !profileImageError ? (
              <img
                src={post.feed_source.profile_image_url}
                alt={post.source}
                className="h-6 w-6 rounded-full object-cover"
                onError={() => setProfileImageError(true)}
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                {getPlatformIcon(post.platform)}
              </div>
            )}
            <span className="font-medium">{post.source}</span>
          </div>
          <div className="flex items-center">
            <Badge variant="outline" className="flex items-center space-x-1">
              {getPlatformIcon(post.platform)}
              <span className="ml-1 text-xs">{platformDisplay}</span>
            </Badge>
          </div>
        </div>
        
        {/* Post image if available */}
        {post.image_url && !imageError ? (
          <div className="relative aspect-video">
            <img
              src={post.image_url}
              alt={post.title || "Social media post"}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          // If the post image is missing or fails to load, use a fallback image
          <div className="relative aspect-video">
            <img
              src={fallbackImage}
              alt={post.title || "Social media post"}
              className="w-full h-full object-cover bg-gray-100"
            />
          </div>
        )}
        
        {/* Post content */}
        <div className="p-4 flex-1 flex flex-col">
          {post.title && (
            <h3 className="font-semibold text-base mb-2">{post.title}</h3>
          )}
          
          {sanitizedDescription && (
            <div
              className={`text-sm text-muted-foreground overflow-hidden ${
                expanded ? "" : "line-clamp-3"
              }`}
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            />
          )}
          
          {sanitizedDescription && sanitizedDescription.length > 150 && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="p-0 h-auto mt-1 self-start"
            >
              {expanded ? "Ver menos" : "Ver más"}
            </Button>
          )}
          
          <div className="mt-auto pt-2 text-xs text-muted-foreground">
            {formattedDate}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="border-t p-4 pt-3">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <a 
            href={post.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center"
          >
            <ExternalLink className="mr-2 h-3 w-3" />
            Ver post original
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SocialPostCard;
