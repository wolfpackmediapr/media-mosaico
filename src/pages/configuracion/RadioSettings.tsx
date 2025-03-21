
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useTabState } from "@/hooks/use-tab-state";
import { RadioProgramsSettings } from "./radio/RadioProgramsSettings";
import { RadioTarifasSettings } from "./radio/RadioTarifasSettings";

export function RadioSettings() {
  const { activeTab, setActiveTab } = useTabState("programas");

  return (
    <SettingsLayout
      title="Configuración de Radio"
      description="Administra los programas y tarifas de radio"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-2">
          <TabsTrigger value="programas">Programas</TabsTrigger>
          <TabsTrigger value="tarifas">Tarifas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="programas" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <RadioProgramsSettings />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tarifas" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <RadioTarifasSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </SettingsLayout>
  );
}

export default RadioSettings;
