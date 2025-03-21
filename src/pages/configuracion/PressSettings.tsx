
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GenresSettings } from "./press/GenresSettings";
import { SourcesSettings } from "./press/SourcesSettings";
import { SectionsSettings } from "./press/SectionsSettings";
import { RatesSettings } from "./press/RatesSettings";
import { useNavigate, useLocation } from "react-router-dom";

export default function PressSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("genres");

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

  return (
    <SettingsLayout
      title="Prensa"
      description="Administra géneros, fuentes, secciones y tarifas para medios de prensa"
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>Configuración de Prensa</CardTitle>
              <CardDescription>
                Gestiona todos los aspectos relacionados con los medios de prensa
              </CardDescription>
            </div>
            <TabsList className="mt-2 sm:mt-0">
              <TabsTrigger value="genres">Géneros</TabsTrigger>
              <TabsTrigger value="sources">Fuentes</TabsTrigger>
              <TabsTrigger value="sections">Secciones</TabsTrigger>
              <TabsTrigger value="rates">Tarifas</TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>
        
        <TabsContent value="genres">
          <GenresSettings />
        </TabsContent>
        
        <TabsContent value="sources">
          <SourcesSettings />
        </TabsContent>
        
        <TabsContent value="sections">
          <SectionsSettings />
        </TabsContent>
        
        <TabsContent value="rates">
          <RatesSettings />
        </TabsContent>
      </Tabs>
    </SettingsLayout>
  );
}
