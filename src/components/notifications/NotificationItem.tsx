
import React from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Bell, Info } from "lucide-react";

export interface NotificationItemProps {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
  status: "unread" | "read" | "archived";
  importance: number;
  onClick?: (id: string) => void;
}

const NotificationItem = ({
  id,
  title,
  description,
  createdAt,
  status,
  importance,
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
        <p
          className={cn(
            "text-sm font-medium",
            status === "unread" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {title}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {description}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};

export default NotificationItem;
