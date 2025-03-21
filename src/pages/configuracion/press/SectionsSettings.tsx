
import { CardContent } from "@/components/ui/card";

export function SectionsSettings() {
  return (
    <CardContent className="p-6">
      <div className="flex items-center justify-center h-56 border-2 border-dashed rounded-md">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            Gestión de secciones de prensa en desarrollo
          </p>
          <p className="text-sm text-muted-foreground">
            Esta funcionalidad estará disponible próximamente
          </p>
        </div>
      </div>
    </CardContent>
  );
}
