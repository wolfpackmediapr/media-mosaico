import React from "react";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, AlertCircle, Loader2, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProcessingHistoryItemProps {
  id: string;
  publicationName: string;
  status: string;
  createdAt: string;
  progress: number | null;
  documentSummary: string | null;
  error: string | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  completed: { label: "Completado", variant: "default", icon: <CheckCircle className="h-4 w-4" /> },
  processing: { label: "Procesando", variant: "secondary", icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  pending: { label: "Pendiente", variant: "outline", icon: <Clock className="h-4 w-4" /> },
  error: { label: "Error", variant: "destructive", icon: <AlertCircle className="h-4 w-4" /> },
};

const ProcessingHistoryItem = ({
  publicationName,
  status,
  createdAt,
  progress,
  documentSummary,
  error,
}: ProcessingHistoryItemProps) => {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <FileText className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm truncate">{publicationName}</p>
          <Badge variant={config.variant} className="shrink-0 flex items-center gap-1 text-xs">
            {config.icon}
            {config.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(new Date(createdAt), "d MMM yyyy, HH:mm", { locale: es })}
          {progress != null && status === "processing" && ` · ${progress}%`}
        </p>
        {documentSummary && (
          <p className="text-xs text-muted-foreground line-clamp-2">{documentSummary}</p>
        )}
        {error && (
          <p className="text-xs text-destructive line-clamp-2">{error}</p>
        )}
      </div>
    </div>
  );
};

export default ProcessingHistoryItem;
