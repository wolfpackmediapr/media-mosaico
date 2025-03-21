
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2 } from "lucide-react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { seedMediaOutlets } from "@/services/media/mediaImportService";
import { defaultCsvData } from "@/services/media/defaultMediaData";

export function GeneralSettings() {
  const [initialized, setInitialized] = useState(false);

  // Seed the media outlets on first load
  useEffect(() => {
    const initData = async () => {
      try {
        if (!initialized) {
          await seedMediaOutlets(defaultCsvData);
          setInitialized(true);
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      }
    };
    
    initData();
  }, [initialized]);

  return (
    <SettingsLayout
      title="Configuración General"
      description="Administra la configuración general del sistema"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Configuración General
        </CardTitle>
        <CardDescription>
          Ajustes globales del sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold mb-2">Ajustes de Apariencia</h3>
            <p className="text-sm text-muted-foreground">
              Personalizar colores, temas e interfaces
            </p>
          </div>
          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold mb-2">Notificaciones</h3>
            <p className="text-sm text-muted-foreground">
              Configurar preferencias de notificaciones y alertas
            </p>
          </div>
          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold mb-2">Seguridad</h3>
            <p className="text-sm text-muted-foreground">
              Configurar opciones de seguridad y acceso
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-6">
        <p className="text-xs text-muted-foreground">
          Los cambios en la configuración general afectan a todo el sistema
        </p>
      </CardFooter>
    </SettingsLayout>
  );
}
