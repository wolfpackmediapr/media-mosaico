
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CirclePlus } from "lucide-react";

export function StationLoadingState() {
  return (
    <div>
      <div className="rounded-md border">
        <div className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
        <div className="p-4 border-t">
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
        <div className="p-4 border-t">
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StationEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <CirclePlus className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">No hay estaciones</h3>
      <p className="text-sm text-muted-foreground mb-4">
        No se han encontrado estaciones de radio. Añade una nueva estación para empezar.
      </p>
      <Button variant="outline">Añadir Estación</Button>
    </div>
  );
}
