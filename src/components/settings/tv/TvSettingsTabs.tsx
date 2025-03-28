
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelsManagement } from "./ChannelsManagement";
import { ProgramsManagement } from "./ProgramsManagement";
import { TvTarifasSettings } from "@/pages/configuracion/tv/TvTarifasSettings";

interface TvSettingsTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  loading?: boolean;
}

export function TvSettingsTabs({ activeTab, onTabChange, loading = false }: TvSettingsTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="mb-4">
        <TabsTrigger value="channels">Canales</TabsTrigger>
        <TabsTrigger value="programs">Programas</TabsTrigger>
        <TabsTrigger value="rates">Tarifas</TabsTrigger>
      </TabsList>
      
      <TabsContent value="channels">
        <ChannelsManagement isLoading={loading} />
      </TabsContent>
      
      <TabsContent value="programs">
        <ProgramsManagement isLoading={loading} />
      </TabsContent>
      
      <TabsContent value="rates">
        <TvTarifasSettings isLoading={loading} />
      </TabsContent>
    </Tabs>
  );
}
