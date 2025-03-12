
import { Home, Tv, Radio, Newspaper, Bell, BarChart2, Settings, HelpCircle, Send, Rss, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mainMenuItems = [
  { icon: Home, label: "Inicio", path: "/" },
  { icon: Tv, label: "TV", path: "/tv" },
  { icon: Radio, label: "Radio", path: "/radio" },
  { icon: Newspaper, label: "Prensa", path: "/prensa" },
  { icon: Rss, label: "Redes Sociales", path: "/redes-sociales" },
  { icon: Bell, label: "Notificaciones", path: "/notificaciones" },
  { icon: Send, label: "Envío de Alertas", path: "/envio-alertas" },
  { icon: BarChart2, label: "Reportes", path: "/reportes" },
];

const bottomMenuItems = [
  { icon: Settings, label: "Ajustes", path: "/ajustes" },
  { icon: HelpCircle, label: "Ayuda", path: "/ayuda" },
];

const Sidebar = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const MenuItem = ({ item }: { item: typeof mainMenuItems[0] }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors",
          isActive
            ? "bg-primary-50 text-primary-800"
            : "text-gray-600 hover:bg-gray-50",
          isCollapsed && "justify-center px-2"
        )}
        title={isCollapsed ? item.label : undefined}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && <span className="font-medium truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <div 
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col z-10 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        {!isCollapsed && (
          <Image
            src="/lovable-uploads/da0f30a7-c379-42a2-95ed-ce8b4c40abd4.png"
            alt="Publimedia"
            className="h-8 w-auto"
          />
        )}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={toggleSidebar}
          className={cn("p-1", isCollapsed && "mx-auto")}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {mainMenuItems.map((item) => (
            <li key={item.path}>
              <MenuItem item={item} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <ul className="space-y-1">
          {bottomMenuItems.map((item) => (
            <li key={item.path}>
              <MenuItem item={item} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
