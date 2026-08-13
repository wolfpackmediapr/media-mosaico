import { Home, Tv, Radio, Newspaper, Bell, BarChart2, Settings, HelpCircle, Send, Rss, Menu, Tablet, FileText, BookOpen } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSectionPermissions, type SectionKey } from "@/hooks/use-section-permissions";

const mainMenuItems: { icon: any; label: string; path: string; section?: SectionKey; adminOnly?: boolean }[] = [
  { icon: Home, label: "Inicio", path: "/", section: "inicio" },
  { icon: BookOpen, label: "Publiteca", path: "/publiteca/prensa", section: "publiteca" },
  { icon: Tv, label: "TV", path: "/tv", section: "tv" },
  { icon: Radio, label: "Radio", path: "/radio", section: "radio" },
  { icon: Tablet, label: "Prensa Digital", path: "/prensa", section: "prensa" },
  { icon: FileText, label: "Prensa Escrita", path: "/prensa-escrita", section: "prensa-escrita" },
  { icon: Rss, label: "Redes Sociales", path: "/redes-sociales", section: "redes-sociales" },
  { icon: Bell, label: "Notificaciones", path: "/notificaciones", section: "notificaciones" },
  { icon: Send, label: "Alertas Enviadas", path: "/envio-alertas", section: "envio-alertas" },
  { icon: BarChart2, label: "Reportes", path: "/reportes", section: "reportes" },
  { icon: BookOpen, label: "Media Monitoring", path: "/media-monitoring", adminOnly: true },
];

const bottomMenuItems = [
  { icon: Settings, label: "Configuración", path: "/ajustes" },
  { icon: HelpCircle, label: "Ayuda", path: "/ayuda" },
];

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

const Sidebar = ({ mobile = false, onNavigate }: SidebarProps) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const { canAccess } = useSectionPermissions();
  const collapsed = mobile ? false : isCollapsed;

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (data) setUserRole(data.role);
    };
    fetchRole();
  }, [user]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const MenuItem = ({ item }: { item: typeof mainMenuItems[0] }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path || 
                    (item.path !== "/" && location.pathname.startsWith(`${item.path}`));
    
    return (
      <Link
        to={item.path}
        onClick={onNavigate}
        className={cn(
          "flex items-center space-x-3 px-4 py-2.5 min-h-[44px] rounded-lg transition-colors",
          isActive
            ? "bg-primary-50 text-primary-800"
            : "text-gray-600 hover:bg-gray-50",
          collapsed && "justify-center px-2"
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span className="font-medium truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <div 
      data-sidebar-desktop={mobile ? undefined : "true"}
      className={cn(
        "bg-white border-gray-200 flex flex-col z-10 transition-all duration-300",
        mobile ? "w-full h-full border-r-0" : "hidden md:flex border-r",
        !mobile && (collapsed ? "w-16" : "w-64")
      )}
    >
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        {!collapsed && (
          <Image
            src="/lovable-uploads/da0f30a7-c379-42a2-95ed-ce8b4c40abd4.png"
            alt="Publimedia"
            className="h-8 w-auto"
          />
        )}
        {!mobile && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={toggleSidebar}
            className={cn("p-1", collapsed && "mx-auto")}
            aria-label="Alternar menú lateral"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {mainMenuItems
            .filter((item) => {
              if (item.adminOnly) return userRole === "administrator";
              if (item.section) return canAccess(item.section);
              return true;
            })
            .map((item) => (
            <li key={item.path}>
              <MenuItem item={item} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <ul className="space-y-1">
          {bottomMenuItems
            .filter(item => {
              if (item.path === "/ajustes" && userRole !== 'administrator') return false;
              return true;
            })
            .map((item) => (
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
