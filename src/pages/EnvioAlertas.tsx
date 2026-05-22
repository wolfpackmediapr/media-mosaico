import { useEffect, useState } from "react";
import { Bell, RefreshCw, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { useTypeformAlerts, type AlertFormFilter } from "@/hooks/use-typeform-alerts";
import { AlertResponseCard } from "@/components/alertas/AlertResponseCard";

const PAGE_SIZE = 12;

const EnvioAlertas = () => {
  const [form, setForm] = useState<AlertFormFilter>("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [form, debounced]);

  const { data, isLoading, isFetching, refresh, error } = useTypeformAlerts({
    form,
    search: debounced,
    pageSize: PAGE_SIZE,
    page,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const tvMissing = data && data.tvFormConfigured === false;

  const handlePrev = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  const handleNext = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Alertas Enviadas</h1>
            <p className="text-muted-foreground mt-1">
              Respuestas capturadas desde los formularios de monitoreo TV y Radio
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refrescar
          </Button>
        </header>

        {tvMissing && (
          <Alert>
            <AlertTitle>Formulario de TV no configurado</AlertTitle>
            <AlertDescription>
              Define el secret <code>TYPEFORM_TV_FORM_ID</code> para incluir las respuestas del
              formulario de TV.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error al cargar respuestas</AlertTitle>
            <AlertDescription>{(error as Error).message}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={form} onValueChange={(v) => setForm(v as AlertFormFilter)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="tv">TV</TabsTrigger>
              <TabsTrigger value="radio">Radio</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en título, resumen, cliente…"
              className="pl-8"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card">
            <Bell className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold">Sin respuestas</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No se encontraron respuestas con los filtros actuales.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((a) => (
                <AlertResponseCard key={`${a.formType}-${a.id}`} alert={a} />
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrev}
                disabled={page <= 1 || isFetching}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2 min-w-[60px] text-center">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleNext}
                disabled={page >= totalPages || isFetching}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground ml-2">
                {total} total
              </span>
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default EnvioAlertas;
