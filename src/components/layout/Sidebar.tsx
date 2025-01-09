import { Home, Tv, Radio, Newspaper, Bell, BarChart2, Settings, HelpCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const menuItems = [
  { icon: Home, label: "Inicio", path: "/" },
  { icon: Tv, label: "BOT TV", path: "/tv" },
  { icon: Radio, label: "BOT Radio", path: "/radio" },
  { icon: Newspaper, label: "BOT Prensa", path: "/prensa" },
  { icon: Bell, label: "Alertas", path: "/alertas" },
  { icon: BarChart2, label: "Reportes", path: "/reportes" },
  { icon: Settings, label: "Ajustes", path: "/ajustes" },
  { icon: HelpCircle, label: "Ayuda", path: "/ayuda" },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-primary-800">Publimedia</h1>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-800"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;