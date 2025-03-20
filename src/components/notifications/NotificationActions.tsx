
import React from "react";
import { MoreHorizontal, CheckSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface NotificationActionsProps {
  markAllAsRead: () => void;
  unreadCount: number;
}

const NotificationActions = ({
  markAllAsRead,
  unreadCount
}: NotificationActionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          className="flex items-center gap-2"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <CheckSquare className="h-4 w-4" />
          <span>Marcar todo como leído</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive flex items-center gap-2">
          <Trash2 className="h-4 w-4" />
          <span>Eliminar todas</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationActions;
