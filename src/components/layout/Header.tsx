
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
import NotificationDot from "@/components/notifications/NotificationDot";

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
            <Button variant="outline" size="icon" className="relative" aria-label="Abrir notificaciones">
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
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <div className="relative flex items-start pe-3">
                    <div className="flex-1 space-y-1">
                      <button className="text-left text-foreground/80 after:absolute after:inset-0">
                        <span className="font-medium text-foreground hover:underline">
                          {notification.clientName || "Sistema"}
                        </span>{" "}
                        - {notification.title}
                      </button>
                      {notification.description && (
                        <div className="text-muted-foreground line-clamp-2">{notification.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {notification.status === "unread" && (
                      <div className="absolute end-0 self-center">
                        <span className="sr-only">No leído</span>
                        <NotificationDot />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && !isLoading && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No hay notificaciones nuevas
                </div>
              )}
              {isLoading && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Cargando notificaciones...
                </div>
              )}
              <div className="p-2 border-t border-border mt-2">
                <Button
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => window.location.href = "/notificaciones"}
                >
                  Ver todas las notificaciones
                </Button>
              </div>
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
