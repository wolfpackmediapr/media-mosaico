import { Link } from "react-router-dom";
import { RefreshCw, Send, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTypeformAlerts } from "@/hooks/use-typeform-alerts";
import { AlertResponseCard } from "./AlertResponseCard";

export default function AlertasSpotlightSection() {
  const { data, isLoading, isFetching, refresh } = useTypeformAlerts({
    form: "all",
    pageSize: 12,
  });

  const items = (data?.items ?? []).slice(0, 6);

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Alertas TV & Radio
          </h2>
          <p className="text-sm text-muted-foreground">
            Últimas respuestas capturadas desde los formularios de monitoreo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refrescar
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/envio-alertas">
              Ver todas <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Aún no hay respuestas de los formularios.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((alert) => (
            <AlertResponseCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </section>
  );
}