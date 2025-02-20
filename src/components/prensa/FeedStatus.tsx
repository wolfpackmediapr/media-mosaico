
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import type { FeedSource } from "@/types/prensa";

interface FeedStatusProps {
  feedSources: FeedSource[];
}

const FeedStatus = ({ feedSources }: FeedStatusProps) => {
  if (feedSources.length === 0) return null;

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {feedSources.map((source) => (
        <div
          key={source.id}
          className="bg-card rounded-lg p-4 shadow-sm border"
        >
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-sm">{source.name}</h3>
            {source.error_count > 0 ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : source.last_successful_fetch ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-warning" />
            )}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {source.last_successful_fetch ? (
              <p>Última actualización: {new Date(source.last_successful_fetch).toLocaleString()}</p>
            ) : (
              <p>Sin actualizaciones recientes</p>
            )}
            {source.last_fetch_error && (
              <p className="text-destructive mt-1">Error: {source.last_fetch_error}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FeedStatus;
