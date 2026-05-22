import { useState } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientSpotlight, type SpotlightScope } from "@/hooks/use-client-spotlight";
import { ClientSpotlightCard } from "./ClientSpotlightCard";

interface Props {
  onClientSelect?: (clientName: string) => void;
  scope?: SpotlightScope;
}

const ClientSpotlightSection = ({ onClientSelect, scope = "all" }: Props) => {
  const [collapsed, setCollapsed] = useState(false);
  const { data: spotlights = [], isLoading } = useClientSpotlight(scope);

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">Menciones de Clientes</h2>
            <p className="text-xs text-muted-foreground">
              Últimas menciones detectadas en feeds (30 días)
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Mostrar" : "Ocultar"}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      {!collapsed && (
        <>
          {isLoading ? (
            <div className="flex gap-3 overflow-hidden">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-48 min-w-[320px] flex-shrink-0" />
              ))}
            </div>
          ) : spotlights.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hay menciones recientes de clientes.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {spotlights.map((s) => (
                <div key={s.clientId} className="snap-start">
                  <ClientSpotlightCard spotlight={s} onSelect={onClientSelect} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default ClientSpotlightSection;