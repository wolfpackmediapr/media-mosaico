
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InstitucionesGestionSettings } from "@/pages/configuracion/instituciones/InstitucionesGestionSettings";
import { InstitucionesCategoriasSettings } from "@/pages/configuracion/instituciones/InstitucionesCategoriasSettings";
import { InstitucionesAgenciasSettings } from "@/pages/configuracion/instituciones/InstitucionesAgenciasSettings";

interface InstitucionesTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  loading?: boolean;
}

export function InstitucionesTabs({ 
  activeTab, 
  onTabChange,
  loading = false 
}: InstitucionesTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle>Configuración de Instituciones</CardTitle>
            <CardDescription>
              Gestiona instituciones, categorías y agencias
            </CardDescription>
          </div>
          <TabsList className="mt-2 sm:mt-0">
            <TabsTrigger value="gestion">Instituciones</TabsTrigger>
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
            <TabsTrigger value="agencias">Agencias</TabsTrigger>
          </TabsList>
        </div>
      </CardHeader>
      
      <TabsContent value="gestion">
        <InstitucionesGestionSettings />
      </TabsContent>
      
      <TabsContent value="categorias">
        <InstitucionesCategoriasSettings />
      </TabsContent>

      <TabsContent value="agencias">
        <InstitucionesAgenciasSettings />
      </TabsContent>
    </Tabs>
  );
}
