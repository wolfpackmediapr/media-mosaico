
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NotificationsList from "./NotificationsList";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { transformNotification } from "@/hooks/notifications";

interface NotificationFeedProps {
  maxItems?: number;
  showHeader?: boolean;
  className?: string;
}

const NotificationFeed: React.FC<NotificationFeedProps> = ({
  maxItems = 5,
  showHeader = true,
  className = "",
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Function to fetch notifications
  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("client_alerts")
      .select("*, clients(name)")
      .order("created_at", { ascending: false })
      .limit(maxItems);
    
    if (error) throw error;
    
    return data.map(transformNotification);
  };
  
  // Query with optimized caching
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications-feed"],
    queryFn: fetchNotifications,
    staleTime: 60000, // 1 minute stale time
    refetchInterval: 10000, // Poll every 10 seconds
  });
  
  // Listen for notification count changes
  const fetchUnreadCount = async () => {
    const { count, error } = await supabase
      .from("client_alerts")
      .select("*", { count: "exact", head: true })
      .eq("status", "unread");
    
    if (error) throw error;
    return count || 0;
  };
  
  const { data: unreadCount } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: fetchUnreadCount,
    staleTime: 30000, // 30 seconds stale time
    refetchInterval: 10000, // Poll every 10 seconds
  });
  
  // Handle notification click
  const handleNotificationClick = async (id: string) => {
    // Mark as read
    const { error } = await supabase
      .from("client_alerts")
      .update({ status: "read" })
      .eq("id", id);
    
    if (error) {
      console.error("Error marking notification as read:", error);
      return;
    }
    
    // Update cache directly with optimistic update
    queryClient.setQueryData(["notifications-feed"], (oldData: any) => {
      if (!oldData) return oldData;
      return oldData.map((notification: any) => {
        if (notification.id === id) {
          return { ...notification, status: "read" };
        }
        return notification;
      });
    });
    
    // Also update the unread count cache
    queryClient.setQueryData(["notifications", "unread"], (oldCount: number) => {
      return Math.max(0, (oldCount || 0) - 1);
    });
  };
  
  // Navigate to notifications page
  const handleViewAll = () => {
    navigate("/notificaciones");
  };
  
  return (
    <Card className={`overflow-hidden ${className}`}>
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">
            Notificaciones Recientes
          </CardTitle>
          {unreadCount && unreadCount > 0 ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Bell className="h-3 w-3" />
              {unreadCount}
            </Badge>
          ) : null}
        </CardHeader>
      )}
      <CardContent className={showHeader ? "pt-2" : "pt-0"}>
        <NotificationsList
          notifications={notifications || []}
          isLoading={isLoading}
          onNotificationClick={handleNotificationClick}
          showViewAll={true}
        />
      </CardContent>
    </Card>
  );
};

export default NotificationFeed;
