
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyPlaceholder } from "@/components/ui/empty-placeholder";
import { PlusCircle, AlertCircle } from "lucide-react";

export function ProgramLoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <div className="flex space-x-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ProgramEmptyStateProps {
  hasChannels: boolean;
}

export function ProgramEmptyState({ hasChannels }: ProgramEmptyStateProps) {
  return (
    <EmptyPlaceholder>
      <EmptyPlaceholder.Icon>
        {hasChannels ? (
          <PlusCircle className="h-8 w-8" />
        ) : (
          <AlertCircle className="h-8 w-8" />
        )}
      </EmptyPlaceholder.Icon>
      <EmptyPlaceholder.Title>No hay programas</EmptyPlaceholder.Title>
      <EmptyPlaceholder.Description>
        {hasChannels 
          ? "No hay programas de televisión añadidos aún. Añade un nuevo programa para empezar."
          : "No hay canales de televisión añadidos. Añade un canal primero antes de añadir programas."}
      </EmptyPlaceholder.Description>
    </EmptyPlaceholder>
  );
}
