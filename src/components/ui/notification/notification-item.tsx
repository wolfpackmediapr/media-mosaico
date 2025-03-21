
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NotificationItemProps } from "./types";

export const NotificationItem = ({
  notification,
  index,
  onMarkAsRead,
  textColor = "text-foreground",
  dotColor = "text-primary",
  hoverBgColor = "hover:bg-accent/50",
}: NotificationItemProps) => (
  <motion.div
    initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
    transition={{ duration: 0.3, delay: index * 0.1 }}
    key={notification.id}
    className={cn(`p-4 ${hoverBgColor} cursor-pointer transition-colors`)}
    onClick={() => onMarkAsRead(notification.id)}
  >
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-2">
        {!notification.read && (
          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        )}
        <h4 className={`text-sm font-medium ${textColor}`}>
          {notification.title}
        </h4>
      </div>

      <span className={`text-xs text-muted-foreground`}>
        {notification.timestamp.toLocaleDateString()}
      </span>
    </div>
    <p className={`text-xs text-muted-foreground mt-1`}>
      {notification.description}
    </p>
  </motion.div>
);

export default NotificationItem;
