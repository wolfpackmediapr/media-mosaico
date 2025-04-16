
import { Home, Tv, Radio, Newspaper, Bell, BarChart2, Settings, HelpCircle, Send, Rss, Menu, Tablet, FileText, BookOpen } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";

const mainMenuItems = [
  { icon: Home, label: "Inicio", path: "/", requiredModule: "any" },
  { icon: BookOpen, label: "Publiteca", path: "/publiteca/prensa", requiredModule: "publiteca" },
  { icon: Tv, label: "TV", path: "/tv", requiredModule: "tv" },
  { icon: Radio, label: "Radio", path: "/radio", requiredModule: "radio" },
  { icon: Tablet, label: "Prensa Digital", path: "/prensa", requiredModule: "prensa" },
  { icon: FileText, label: "Prensa Escrita", path: "/prensa-escrita", requiredModule: "prensa" },
  { icon: Rss, label: "Redes Sociales", path: "/redes-sociales", requiredModule: "social" },
  { icon: Bell, label: "Notificaciones", path: "/notificaciones", requiredModule: "notifications" },
  { icon: Send, label: "Envío de Alertas", path: "/envio-alertas", requiredModule: "alerts" },
  { icon: BarChart2, label: "Reportes", path: "/reportes", requiredModule: "reports" },
  { icon: BookOpen, label: "Media Monitoring", path: "/media-monitoring", requiredModule: "monitoring" },
];

const bottomMenuItems = [
  { icon: Settings, label: "Configuración", path: "/ajustes", requiredModule: "settings" },
  { icon: HelpCircle, label: "Ayuda", path: "/ayuda", requiredModule: "any" },
];

const Sidebar = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { checkModuleAccess, isAdmin } = usePermissions();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Filter menu items based on user permissions
  const getFilteredMenuItems = (items: typeof mainMenuItems) => {
    return items.filter(item => {
      if (item.requiredModule === "any") return true;
      if (item.requiredModule === "radio") return checkModuleAccess("radio") !== "no_access";
      return isAdmin(); // Only admins can access other modules
    });
  };

  const filteredMainMenuItems = getFilteredMenuItems(mainMenuItems);
  const filteredBottomMenuItems = getFilteredMenuItems(bottomMenuItems);

  const MenuItem = ({ item }: { item: typeof mainMenuItems[0] }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path || 
                    (item.path !== "/" && location.pathname.startsWith(`${item.path}`));
    
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
          {filteredMainMenuItems.map((item) => (
            <li key={item.path}>
              <MenuItem item={item} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <ul className="space-y-1">
          {filteredBottomMenuItems.map((item) => (
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
