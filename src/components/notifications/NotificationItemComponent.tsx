
import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import NotificationDot from "./NotificationDot";
import { NotificationItem } from "./types";

interface NotificationItemProps {
  notification: NotificationItem;
  index: number;
  onMarkAsRead: (id: string) => void;
  textColor?: string;
  hoverBgColor?: string;
}

const NotificationItemComponent = ({
  notification,
  index,
  onMarkAsRead,
  textColor = "text-foreground",
  hoverBgColor = "hover:bg-accent",
}: NotificationItemProps) => (
  <motion.div
    initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
    transition={{ duration: 0.3, delay: index * 0.1 }}
    key={notification.id}
    className={cn(`p-3 ${hoverBgColor} cursor-pointer transition-colors rounded-md`)}
    onClick={() => onMarkAsRead(notification.id)}
  >
    <div className="relative flex items-start pe-3">
      <div className="flex-1 space-y-1">
        <div className="flex justify-between items-start">
          <h4 className={`text-sm font-medium ${textColor}`}>
            {notification.title}
          </h4>
          
          <span className="text-xs text-muted-foreground ml-2">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
        </div>
        
        {notification.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {notification.description}
          </p>
        )}
        
        {notification.clientName && (
          <div className="flex items-center mt-1">
            <Badge variant="outline" className="text-xs">
              {notification.clientName}
            </Badge>
          </div>
        )}
      </div>
      
      {notification.status === "unread" && (
        <div className="absolute end-0 self-center">
          <span className="sr-only">No leído</span>
          <NotificationDot className="text-primary" />
        </div>
      )}
    </div>
  </motion.div>
);

export default NotificationItemComponent;
