
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink, Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import type { SocialPost } from "@/types/social";
import { platformIcons } from "@/lib/platform-icons";
import { getSocialPostImage } from "@/services/social/image-utils";
import { sanitizeSocialContent } from "@/services/social/content-sanitizer";

interface SocialPostCardProps {
  post: SocialPost;
}

const SocialPostCard = ({ post }: SocialPostCardProps) => {
  const {
    title,
    description,
    link,
    pub_date,
    source,
    platform,
    platform_display_name
  } = post;

  // Track image loading state
  const [imageError, setImageError] = useState(false);

  // Use the proper image utility function to get the correct image with fallbacks
  const imageUrl = getSocialPostImage(post);

  // Sanitize the description content to handle HTML properly
  const sanitizedDescription = sanitizeSocialContent(description || '');

  // Format the publication date
  const formattedDate = pub_date ? formatDistanceToNow(new Date(pub_date), { addSuffix: true }) : '';
  
  // Get the platform icon component
  const PlatformIcon = platform && platformIcons[platform] ? platformIcons[platform] : platformIcons.social_media;

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      {imageUrl && !imageError ? (
        <div className="relative w-full aspect-video overflow-hidden">
          <img 
            src={imageUrl} 
            alt={title || "Social media post"} 
            className="object-cover w-full h-full"
            onError={() => setImageError(true)}
          />
        </div>
      ) : imageError ? (
        <div className="relative w-full aspect-video bg-muted flex items-center justify-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground opacity-50" />
        </div>
      ) : null}
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="flex items-center gap-1">
            <PlatformIcon className="h-3 w-3" />
            <span>{platform_display_name || source}</span>
          </Badge>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-1 h-3 w-3" />
            <span>{formattedDate}</span>
          </div>
        </div>
        
        <CardTitle className="text-lg mt-2 line-clamp-2">{title}</CardTitle>
      </CardHeader>
      
      <CardContent className="pb-2 flex-grow">
        {sanitizedDescription ? (
          <div 
            className="text-muted-foreground line-clamp-3 prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
          />
        ) : (
          <CardDescription className="line-clamp-3">
            No description available
          </CardDescription>
        )}
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full flex items-center"
          onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          View Original Post
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SocialPostCard;
