
import { Menu, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";
import { useAuth } from "@/context/AuthContext";
import LogoutButton from "../auth/LogoutButton";

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { user } = useAuth();
  const userEmail = user?.email || "";
  const username = user?.user_metadata?.username || userEmail.split('@')[0];

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4 md:px-6 lg:px-8 sticky top-0 z-10">
      <div className="flex items-center gap-2 min-w-0 max-w-[70%]">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden h-11 w-11 shrink-0"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground truncate">Dashboard de Monitoreo</h2>
      </div>
      <div className="flex items-center space-x-2 md:space-x-4">
        <NotificationPopover />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="font-bold">{username}</span>
              <span className="text-xs text-muted-foreground">{userEmail}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Perfil</DropdownMenuItem>
            <DropdownMenuItem>Configuración</DropdownMenuItem>
            <DropdownMenuSeparator />
            <LogoutButton variant="ghost" showIcon={false} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;
