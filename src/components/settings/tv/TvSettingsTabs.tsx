
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelsManagement } from "@/components/settings/tv/ChannelsManagement";
import { ProgramsManagement } from "@/components/settings/tv/ProgramsManagement";

interface TvSettingsTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export const TvSettingsTabs = ({ activeTab, onTabChange }: TvSettingsTabsProps) => {
  return (
    <Tabs defaultValue={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="channels">Canales</TabsTrigger>
        <TabsTrigger value="programs">Programas</TabsTrigger>
      </TabsList>
      <TabsContent value="channels" className="space-y-4 pt-4">
        <ChannelsManagement />
      </TabsContent>
      <TabsContent value="programs" className="space-y-4 pt-4">
        <ProgramsManagement />
      </TabsContent>
    </Tabs>
  );
};
