
import { Loader2 } from "lucide-react";

export function ClientLoadingState() {
  return (
    <div className="text-center py-8">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
      <p>Cargando clientes...</p>
    </div>
  );
}
