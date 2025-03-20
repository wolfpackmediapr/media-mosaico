
import React from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Bell, Info, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface NotificationItemProps {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
  status: "unread" | "read" | "archived";
  importance: number;
  clientName?: string;
  clientId?: string;
  keywords?: string[];
  onClick?: (id: string) => void;
}

const NotificationItem = ({
  id,
  title,
  description,
  createdAt,
  status,
  importance,
  clientName,
  clientId,
  keywords,
  onClick,
}: NotificationItemProps) => {
  const handleClick = () => {
    if (onClick) onClick(id);
  };

  return (
    <div
      className={cn(
        "flex items-start p-3 gap-3 cursor-pointer border-b border-border transition-colors",
        status === "unread" ? "bg-accent/20" : "bg-transparent",
        "hover:bg-accent/10"
      )}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 mt-1">
        {importance >= 4 ? (
          <AlertCircle
            className="h-5 w-5 text-destructive"
            aria-hidden="true"
          />
        ) : (
          <Info className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p
            className={cn(
              "text-sm font-medium",
              status === "unread" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {title}
          </p>
          
          {clientName && (
            <Badge variant="outline" className="ml-2 text-xs">
              {clientName}
            </Badge>
          )}
        </div>
        
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {description}
          </p>
        )}
        
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </p>
          
          {keywords && keywords.length > 0 && (
            <div className="flex items-center">
              <Tag className="h-3 w-3 text-muted-foreground mr-1" />
              <div className="flex space-x-1 overflow-hidden">
                {keywords.slice(0, 2).map((keyword, index) => (
                  <span key={index} className="text-xs bg-muted rounded-sm px-1">
                    {keyword}
                  </span>
                ))}
                
                {keywords.length > 2 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs bg-muted rounded-sm px-1 cursor-help">
                          +{keywords.length - 2}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="flex flex-col space-y-1">
                          {keywords.slice(2).map((keyword, index) => (
                            <span key={index}>{keyword}</span>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
