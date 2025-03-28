
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CirclePlus, RadioTower } from "lucide-react";

export function ProgramLoadingState() {
  return (
    <div>
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-60" />
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
        <div className="p-4 border-t space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProgramEmptyState({ hasStations }: { hasStations: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        {hasStations ? (
          <CirclePlus className="h-6 w-6 text-muted-foreground" />
        ) : (
          <RadioTower className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-lg font-medium mb-1">
        {hasStations ? "No hay programas" : "No hay estaciones"}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {hasStations 
          ? "No se encontraron programas de radio. Añade un nuevo programa para empezar." 
          : "Primero necesitas crear al menos una estación de radio."}
      </p>
      <Button variant="outline">
        {hasStations ? "Añadir Programa" : "Añadir Estación"}
      </Button>
    </div>
  );
}
