
import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { InstitucionesTabs } from "@/components/settings/instituciones/InstitucionesTabs";
import { RefreshCw } from "lucide-react";

export function InstitucionesSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("gestion");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Set active tab based on current path
    const path = location.pathname;
    if (path.includes("/gestion")) {
      setActiveTab("gestion");
    } else if (path.includes("/categorias")) {
      setActiveTab("categorias");
    } else if (path.includes("/agencias")) {
      setActiveTab("agencias");
    }
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Navigate to the corresponding route
    switch (value) {
      case "gestion":
        navigate("/ajustes/instituciones/gestion");
        break;
      case "categorias":
        navigate("/ajustes/instituciones/categorias");
        break;
      case "agencias":
        navigate("/ajustes/instituciones/agencias");
        break;
      default:
        navigate("/ajustes/instituciones");
    }
  };

  const handleResetData = () => {
    setIsResetting(true);
    
    // Simulate API call or data reset
    setTimeout(() => {
      // Reload the page to reset all data
      window.location.reload();
      setIsResetting(false);
    }, 1000);
  };

  return (
    <SettingsLayout
      title="Instituciones y Agencias"
      description="Administra las instituciones, sus categorías y agencias relacionadas"
      action={
        <Button 
          variant="outline" 
          onClick={handleResetData}
          disabled={isResetting}
        >
          {isResetting ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Restablecer datos
        </Button>
      }
    >
      <InstitucionesTabs 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        loading={isResetting}
      />
    </SettingsLayout>
  );
}

// For backward compatibility
export default InstitucionesSettings;
