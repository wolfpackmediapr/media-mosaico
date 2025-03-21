
import React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface EmptyStateProps {
  onAddNew: () => void;
}

export function EmptyState({ onAddNew }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="mb-4 text-muted-foreground">No hay categorías definidas</p>
      <Button onClick={onAddNew}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Agregar primera categoría
      </Button>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex justify-center py-8">
      <div className="animate-pulse text-center">
        <p className="text-muted-foreground">Cargando categorías...</p>
      </div>
    </div>
  );
}
