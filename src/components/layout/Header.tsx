
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
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 text-[10px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 max-h-[450px] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <h3 className="font-medium text-sm">Notificaciones</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => markAllAsRead()}
                >
                  Marcar todo como leído
                </Button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <NotificationsList 
                notifications={notifications.slice(0, 5)} 
                isLoading={isLoading} 
                onNotificationClick={handleNotificationClick}
                showViewAll={notifications.length > 5}
              />
            </div>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
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
