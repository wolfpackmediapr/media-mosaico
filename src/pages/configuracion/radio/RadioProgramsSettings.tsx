
import { useState } from "react";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function RadioProgramsSettings() {
  return (
    <>
      <CardHeader>
        <CardTitle>Programas de Radio</CardTitle>
        <CardDescription>
          Administra los programas de radio disponibles en el sistema
        </CardDescription>
      </CardHeader>
      
      <div className="p-6">
        <div className="flex items-center justify-center h-56 border-2 border-dashed rounded-md">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Gestión de programas de radio en desarrollo
            </p>
            <p className="text-sm text-muted-foreground">
              Esta funcionalidad estará disponible próximamente
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
