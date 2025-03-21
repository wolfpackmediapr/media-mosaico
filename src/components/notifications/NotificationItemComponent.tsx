
import React from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItemComponentProps {
  id: string;
  title: string;
  description: string | null;
  status: "unread" | "read" | "archived";
  createdAt: string;
  importance: number;
  clientName?: string | null;
  keywords?: string[];
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

/**
 * Improved notification item component with error handling
 */
const NotificationItemComponent: React.FC<NotificationItemComponentProps> = ({
  id,
  title,
  description,
  status,
  createdAt,
  importance,
  clientName,
  keywords,
  onMarkAsRead,
  onDelete,
  className,
}) => {
  const isUnread = status === "unread";
  const formattedDate = React.useMemo(() => {
    try {
      return formatDistanceToNow(new Date(createdAt), { 
        addSuffix: true,
        locale: es
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "fecha desconocida";
    }
  }, [createdAt]);

  const getPriorityColor = (importance: number) => {
    if (importance >= 5) return "bg-red-100 text-red-800 border-red-200";
    if (importance >= 4) return "bg-orange-100 text-orange-800 border-orange-200";
    if (importance >= 3) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  const handleMarkAsRead = () => {
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
    }
  };

  return (
    <Card 
      className={cn(
        "mb-2 cursor-pointer hover:bg-accent/30 transition-colors border",
        isUnread ? "border-l-4 border-l-primary" : "",
        className
      )}
      onClick={handleMarkAsRead}
    >
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isUnread && <div className="w-2 h-2 rounded-full bg-primary" />}
              <h4 className={cn("font-medium", isUnread ? "text-foreground" : "text-muted-foreground")}>
                {title}
              </h4>
            </div>
            
            {clientName && (
              <Badge variant="outline" className="mb-1">
                {clientName}
              </Badge>
            )}
            
            {description && (
              <p className="text-sm text-muted-foreground mb-2">{description}</p>
            )}
            
            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">{formattedDate}</div>
              
              <div className="flex gap-1">
                {isUnread && onMarkAsRead && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(id);
                    }}
                  >
                    <Check className="h-3 w-3" />
                    <span className="sr-only">Mark as read</span>
                  </Button>
                )}
                
                {onDelete && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="sr-only">Delete</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {importance > 0 && (
            <Badge 
              variant="outline" 
              className={cn("ml-2 self-start", getPriorityColor(importance))}
            >
              {importance >= 5 ? "Urgente" : 
               importance >= 4 ? "Alta" : 
               importance >= 3 ? "Media" : "Baja"}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationItemComponent;
