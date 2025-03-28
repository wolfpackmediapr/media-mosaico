
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GenresSettings } from "@/pages/configuracion/press/GenresSettings";
import { SourcesSettings } from "@/pages/configuracion/press/SourcesSettings";
import { SectionsSettings } from "@/pages/configuracion/press/SectionsSettings";
import { RatesSettings } from "@/pages/configuracion/press/RatesSettings";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface PressSettingsTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  loading?: boolean;
}

export function PressSettingsTabs({ 
  activeTab, 
  onTabChange,
  loading = false 
}: PressSettingsTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
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
  );
}
