
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyPlaceholder } from "@/components/ui/empty-placeholder";
import { FolderIcon, AlertCircle } from "lucide-react";

export function ChannelLoadingState() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export function ChannelEmptyState() {
  return (
    <EmptyPlaceholder
      message="No hay canales"
      description="No se encontraron canales de televisión, agrega uno para empezar."
      icon={<AlertCircle className="h-8 w-8 text-muted-foreground" />}
    />
  );
}
