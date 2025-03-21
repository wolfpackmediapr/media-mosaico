
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GenresSettings } from "./press/GenresSettings";
import { SourcesSettings } from "./press/SourcesSettings";
import { SectionsSettings } from "./press/SectionsSettings";
import { RatesSettings } from "./press/RatesSettings";

export default function PressSettings() {
  const [activeTab, setActiveTab] = useState("genres");

  return (
    <SettingsLayout
      title="Prensa"
      description="Administra géneros, fuentes, secciones y tarifas para medios de prensa"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
