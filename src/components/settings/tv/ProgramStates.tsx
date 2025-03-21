
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyPlaceholder } from "@/components/ui/empty-placeholder";
import { AlertCircle, Tv } from "lucide-react";

export function ProgramLoadingState() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export function ProgramEmptyState({ hasChannels = true }: { hasChannels?: boolean }) {
  if (!hasChannels) {
    return (
      <EmptyPlaceholder
        message="No hay canales"
        description="Primero debes crear canales antes de poder añadir programas."
        icon={<AlertCircle className="h-8 w-8 text-muted-foreground" />}
      />
    );
  }

  return (
    <EmptyPlaceholder
      message="No hay programas"
      description="No se encontraron programas de televisión, agrega uno para empezar."
      icon={<Tv className="h-8 w-8 text-muted-foreground" />}
    />
  );
}
