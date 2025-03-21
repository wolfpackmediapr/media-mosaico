
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyPlaceholder } from "@/components/ui/empty-placeholder";
import { PlusCircle } from "lucide-react";

export function ChannelLoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChannelEmptyState() {
  return (
    <EmptyPlaceholder>
      <EmptyPlaceholder.Icon>
        <PlusCircle className="h-8 w-8" />
      </EmptyPlaceholder.Icon>
      <EmptyPlaceholder.Title>No hay canales</EmptyPlaceholder.Title>
      <EmptyPlaceholder.Description>
        No hay canales de televisión añadidos aún.
        Añade un nuevo canal para empezar.
      </EmptyPlaceholder.Description>
    </EmptyPlaceholder>
  );
}
