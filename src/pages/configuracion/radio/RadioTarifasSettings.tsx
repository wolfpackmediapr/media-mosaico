
import { useState } from "react";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function RadioTarifasSettings() {
  return (
    <>
      <CardHeader>
        <CardTitle>Tarifas de Radio</CardTitle>
        <CardDescription>
          Administra las tarifas de publicidad para programas de radio
        </CardDescription>
      </CardHeader>
      
      <div className="p-6">
        <div className="flex items-center justify-center h-56 border-2 border-dashed rounded-md">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Gestión de tarifas de radio en desarrollo
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
