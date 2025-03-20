
import React from "react";
import { useNavigate } from "react-router-dom";
import NotificationItem, { NotificationItemProps } from "./NotificationItem";
import { Button } from "@/components/ui/button";
import { EmptyPlaceholder } from "@/components/ui/empty-placeholder";
import { Inbox } from "lucide-react";

interface NotificationsListProps {
  notifications: Omit<NotificationItemProps, "onClick">[];
  isLoading?: boolean;
  onNotificationClick?: (id: string) => void;
  showViewAll?: boolean;
  showClientInfo?: boolean;
}

const NotificationsList = ({
  notifications,
  isLoading = false,
  onNotificationClick,
  showViewAll = false,
  showClientInfo = true,
}: NotificationsListProps) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start p-3 gap-3">
            <div className="w-5 h-5 rounded-full bg-muted animate-pulse"></div>
            <div className="flex-1">
              <div className="h-4 bg-muted rounded animate-pulse"></div>
              <div className="h-3 bg-muted rounded animate-pulse mt-2 w-3/4"></div>
              <div className="h-2 bg-muted rounded animate-pulse mt-2 w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <EmptyPlaceholder 
        message="No hay notificaciones nuevas"
        icon={<Inbox className="h-12 w-12 text-muted-foreground" />}
      />
    );
  }

  return (
    <div className="flex flex-col">
      <div className="divide-y divide-border">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            {...notification}
            onClick={onNotificationClick}
          />
        ))}
      </div>
      
      {showViewAll && (
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => navigate("/notificaciones")}
          >
            Ver todas las notificaciones
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationsList;
