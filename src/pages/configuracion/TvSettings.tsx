
import { useState } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelsManagement } from "@/components/settings/tv/ChannelsManagement";
import { ProgramsManagement } from "@/components/settings/tv/ProgramsManagement";

export default function TvSettings() {
  const [activeTab, setActiveTab] = useState<string>("channels");

  return (
    <SettingsLayout
      title="Televisión"
      description="Administra los canales y programas de televisión"
    >
      <Tabs defaultValue="channels" onValueChange={setActiveTab} className="w-full">
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
    </SettingsLayout>
  );
}
