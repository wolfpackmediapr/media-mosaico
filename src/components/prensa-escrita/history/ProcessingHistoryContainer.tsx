import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProcessingHistoryItem from "./ProcessingHistoryItem";

const fetchProcessingHistory = async () => {
  const { data, error } = await supabase
    .from("pdf_processing_jobs")
    .select("id, publication_name, status, created_at, progress, document_summary, error")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
};

const ProcessingHistoryContainer = () => {
  const { data: jobs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["press-processing-history"],
    queryFn: fetchProcessingHistory,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Historial de Procesamiento
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <>
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </>
        )}

        {!isLoading && (!jobs || jobs.length === 0) && (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">
              No hay documentos procesados aún.
            </p>
          </div>
        )}

        {jobs?.map((job) => (
          <ProcessingHistoryItem
            key={job.id}
            id={job.id}
            publicationName={job.publication_name}
            status={job.status}
            createdAt={job.created_at!}
            progress={job.progress}
            documentSummary={job.document_summary}
            error={job.error}
          />
        ))}
      </CardContent>
    </Card>
  );
};

export default ProcessingHistoryContainer;
