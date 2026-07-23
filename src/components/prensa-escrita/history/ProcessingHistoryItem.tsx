import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, AlertCircle, Loader2, Clock, Eye } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface HistoryJob {
  id: string;
  source: "filesearch" | "legacy";
  publicationName: string;
  status: string;
  createdAt: string;
  progress: number | null;
  documentSummary: string | null;
  error: string | null;
  clippingsCount?: number;
  categories?: string[];
  keywords?: string[];
  relevantClients?: string[];
}

interface ProcessingHistoryItemProps {
  job: HistoryJob;
  onView?: () => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  completed: { label: "Completado", variant: "default", icon: <CheckCircle className="h-4 w-4" /> },
  processing: { label: "Procesando", variant: "secondary", icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  pending: { label: "Pendiente", variant: "outline", icon: <Clock className="h-4 w-4" /> },
  error: { label: "Error", variant: "destructive", icon: <AlertCircle className="h-4 w-4" /> },
};

const ProcessingHistoryItem = ({ job, onView }: ProcessingHistoryItemProps) => {
  const { publicationName, status, createdAt, progress, documentSummary, error, clippingsCount, relevantClients, source } = job;
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <FileText className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm truncate">{publicationName}</p>
          <div className="flex items-center gap-2 shrink-0">
            {source === "legacy" && (
              <Badge variant="outline" className="text-[10px] uppercase">Legacy</Badge>
            )}
            <Badge variant={config.variant} className="flex items-center gap-1 text-xs">
              {config.icon}
              {config.label}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(new Date(createdAt), "d MMM yyyy, HH:mm", { locale: es })}
          {progress != null && status === "processing" && ` · ${progress}%`}
          {typeof clippingsCount === "number" && clippingsCount > 0 && ` · ${clippingsCount} recortes`}
        </p>
        {documentSummary && (
          <p className="text-xs text-muted-foreground line-clamp-2">{documentSummary}</p>
        )}
        {relevantClients && relevantClients.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {relevantClients.slice(0, 5).map((c) => (
              <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
            ))}
            {relevantClients.length > 5 && (
              <Badge variant="outline" className="text-[10px]">+{relevantClients.length - 5}</Badge>
            )}
          </div>
        )}
        {error && (
          <p className="text-xs text-destructive line-clamp-2">{error}</p>
        )}
        {onView && (
          <div className="pt-2">
            <Button size="sm" variant="outline" onClick={onView}>
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Ver resultados
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingHistoryItem;
