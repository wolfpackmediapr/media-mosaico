
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
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full justify-start border-b bg-transparent p-0">
        <TabsTrigger
          value="channels"
          className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 py-2"
        >
          Canales
        </TabsTrigger>
        <TabsTrigger
          value="programs"
          className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 py-2"
        >
          Programas
        </TabsTrigger>
        <TabsTrigger
          value="rates"
          className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 py-2"
        >
          Tarifas
        </TabsTrigger>
      </TabsList>
      <TabsContent value="channels" className="mt-4">
        <ChannelsManagement isLoading={loading} />
      </TabsContent>
      <TabsContent value="programs" className="mt-4">
        <ProgramsManagement isLoading={loading} />
      </TabsContent>
      <TabsContent value="rates" className="mt-4">
        <TvTarifasSettings isLoading={loading} />
      </TabsContent>
    </Tabs>
  );
}
