
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ParticipantesGestionSettings } from "@/pages/configuracion/participantes/ParticipantesGestionSettings";
import { ParticipantesCategoriasSettings } from "@/pages/configuracion/participantes/ParticipantesCategoriasSettings";

interface ParticipantesTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  loading?: boolean;
}

export function ParticipantesTabs({ 
  activeTab, 
  onTabChange,
  loading = false 
}: ParticipantesTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle>Configuración de Participantes</CardTitle>
            <CardDescription>
              Gestiona participantes de noticias y sus categorías
            </CardDescription>
          </div>
          <TabsList className="mt-2 sm:mt-0">
            <TabsTrigger value="gestion">Gestión</TabsTrigger>
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
          </TabsList>
        </div>
      </CardHeader>
      
      <TabsContent value="gestion">
        <ParticipantesGestionSettings />
      </TabsContent>
      
      <TabsContent value="categorias">
        <ParticipantesCategoriasSettings />
      </TabsContent>
    </Tabs>
  );
}
