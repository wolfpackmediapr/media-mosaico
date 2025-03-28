
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StationsManagement } from "./StationsManagement";
import { ProgramsManagement } from "./ProgramsManagement";

interface RadioSettingsTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  loading?: boolean;
}

export function RadioSettingsTabs({ activeTab, onTabChange, loading = false }: RadioSettingsTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full grid grid-cols-2">
        <TabsTrigger value="stations">Estaciones</TabsTrigger>
        <TabsTrigger value="programs">Programas</TabsTrigger>
      </TabsList>
      
      <TabsContent value="stations" className="space-y-4 mt-4">
        <StationsManagement />
      </TabsContent>
      
      <TabsContent value="programs" className="space-y-4 mt-4">
        <ProgramsManagement />
      </TabsContent>
    </Tabs>
  );
}
