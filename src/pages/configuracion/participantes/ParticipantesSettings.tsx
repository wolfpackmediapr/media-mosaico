
import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { ParticipantesTabs } from "@/components/settings/participantes/ParticipantesTabs";
import { RefreshCw } from "lucide-react";

export function ParticipantesSettings() {
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
    }
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Navigate to the corresponding route
    switch (value) {
      case "gestion":
        navigate("/ajustes/participantes/gestion");
        break;
      case "categorias":
        navigate("/ajustes/participantes/categorias");
        break;
      default:
        navigate("/ajustes/participantes");
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
      title="Participantes de la Noticia"
      description="Administra los participantes de las noticias y sus categorías"
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
      <ParticipantesTabs 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        loading={isResetting}
      />
    </SettingsLayout>
  );
}

// For backward compatibility
export default ParticipantesSettings;
