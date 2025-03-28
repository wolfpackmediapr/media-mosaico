
import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { PressSettingsTabs } from "@/components/settings/press/PressSettingsTabs";
import { RefreshCw } from "lucide-react";

export default function PressSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("genres");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Set active tab based on current path
    const path = location.pathname;
    if (path.includes("/generos")) {
      setActiveTab("genres");
    } else if (path.includes("/fuentes")) {
      setActiveTab("sources");
    } else if (path.includes("/secciones")) {
      setActiveTab("sections");
    } else if (path.includes("/tarifas")) {
      setActiveTab("rates");
    }
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Navigate to the corresponding route
    switch (value) {
      case "genres":
        navigate("/ajustes/prensa/generos");
        break;
      case "sources":
        navigate("/ajustes/prensa/fuentes");
        break;
      case "sections":
        navigate("/ajustes/prensa/secciones");
        break;
      case "rates":
        navigate("/ajustes/prensa/tarifas");
        break;
      default:
        navigate("/ajustes/prensa");
    }
  };

  // This function would handle resetting all press data in a real app
  const handleResetData = () => {
    // Here we would implement the reset functionality
    // For now, we'll just add a placeholder
    setIsResetting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsResetting(false);
      // Ideally, we'd reload the data in all tabs here
    }, 1000);
  };

  return (
    <SettingsLayout
      title="Prensa"
      description="Administra géneros, fuentes, secciones y tarifas para medios de prensa"
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
      <PressSettingsTabs 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        loading={isResetting}
      />
    </SettingsLayout>
  );
}
