
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

export default function GeneralSettings() {
  return (
    <SettingsLayout
      title="Configuración General"
      description="Administra la configuración general del sistema"
    >
      <CardHeader>
        <CardTitle>Configuración General</CardTitle>
        <CardDescription>
          Estas configuraciones afectan a todos los aspectos del sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Medios</h3>
            <p className="text-sm text-muted-foreground">
              Gestiona los medios de comunicación disponibles en el sistema
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/ajustes/general/medios">Configurar medios</Link>
            </Button>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Categorías</h3>
            <p className="text-sm text-muted-foreground">
              Administra las categorías para clasificar el contenido
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/ajustes/general/categorias">Configurar categorías</Link>
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Los cambios en la configuración general afectan a todo el sistema
        </p>
      </CardFooter>
    </SettingsLayout>
  );
}
