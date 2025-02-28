
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { platformIcons } from "@/lib/platform-icons";
import type { SocialPost } from "@/types/social";

interface SocialPostCardProps {
  post: SocialPost;
}

const SocialPostCard = ({ post }: SocialPostCardProps) => {
  const PlatformIcon = platformIcons[post.platform] || platformIcons.news;
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {post.image_url && (
          <div className="w-full h-48 overflow-hidden">
            <img 
              src={post.image_url} 
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
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
          {post.description && (
            <p className="text-muted-foreground line-clamp-3 mb-2">{post.description}</p>
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
