
import React from "react";
import { cn } from "@/lib/utils";

const NotificationDot = ({ className }: { className?: string }) => {
  return (
    <svg
      width="6"
      height="6"
      fill="currentColor"
      viewBox="0 0 6 6"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("notification-dot", className)}
      aria-hidden="true"
    >
      <circle cx="3" cy="3" r="3" />
    </svg>
  );
};

export default NotificationDot;
