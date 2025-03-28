
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StationsManagement } from "./StationsManagement";
import { ProgramsManagement } from "./ProgramsManagement";
import { RadioTarifasSettings } from "@/pages/configuracion/radio/RadioTarifasSettings";

interface RadioSettingsTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  loading?: boolean;
}

export function RadioSettingsTabs({ activeTab, onTabChange, loading = false }: RadioSettingsTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="stations">Estaciones</TabsTrigger>
        <TabsTrigger value="programs">Programas</TabsTrigger>
        <TabsTrigger value="rates">Tarifas</TabsTrigger>
      </TabsList>
      
      <TabsContent value="stations" className="space-y-4 mt-4">
        <StationsManagement />
      </TabsContent>
      
      <TabsContent value="programs" className="space-y-4 mt-4">
        <ProgramsManagement />
      </TabsContent>
      
      <TabsContent value="rates" className="space-y-4 mt-4">
        <RadioTarifasSettings />
      </TabsContent>
    </Tabs>
  );
}
