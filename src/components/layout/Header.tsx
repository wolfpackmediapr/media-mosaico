
import { Bell, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import NotificationsList from "@/components/notifications/NotificationsList";
import { useNotifications } from "@/hooks/use-notifications";

const Header = () => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4 md:px-6 lg:px-8 sticky top-0 z-10">
      <div className="flex items-center max-w-[70%]">
        <h2 className="text-lg md:text-xl font-semibold text-foreground truncate">Dashboard de Monitoreo</h2>
      </div>
      <div className="flex items-center space-x-2 md:space-x-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 left-full min-w-5 -translate-x-1/2 px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-1">
            <div className="flex items-baseline justify-between gap-4 px-3 py-2">
              <div className="text-sm font-semibold">Notificaciones</div>
              {unreadCount > 0 && (
                <button 
                  className="text-xs font-medium hover:underline" 
                  onClick={() => markAllAsRead()}
                >
                  Marcar todo como leído
                </button>
              )}
            </div>
            <div
              role="separator"
              aria-orientation="horizontal"
              className="-mx-1 my-1 h-px bg-border"
            ></div>
            <div className="max-h-[400px] overflow-y-auto">
              <NotificationsList 
                notifications={notifications.slice(0, 10)} 
                isLoading={isLoading} 
                onNotificationClick={handleNotificationClick}
                showViewAll={notifications.length > 10}
              />
            </div>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Perfil</DropdownMenuItem>
            <DropdownMenuItem>Configuración</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Cerrar Sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
