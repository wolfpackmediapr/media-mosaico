import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProcessingHistoryItem, { HistoryJob } from "./ProcessingHistoryItem";
import { DocumentMetadata } from "@/hooks/prensa/types";

interface ProcessingHistoryContainerProps {
  onViewJob?: (job: {
    publicationName: string;
    documentSummary: string;
    documentMetadata: DocumentMetadata;
  }) => void;
}

const fetchProcessingHistory = async (): Promise<HistoryJob[]> => {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return [];

  // Active pipeline: File Search documents
  const fsQuery = supabase
    .from("press_file_search_documents")
    .select(
      "id, publication_name, publication_date, status, error, created_at, document_summary, total_clippings_found, categories, keywords, relevant_clients, original_filename"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  // Legacy pipeline: OCR jobs
  const legacyQuery = supabase
    .from("pdf_processing_jobs")
    .select("id, publication_name, status, created_at, progress, document_summary, error")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const [fsRes, legacyRes] = await Promise.all([fsQuery, legacyQuery]);

  const items: HistoryJob[] = [];

  if (!fsRes.error && fsRes.data) {
    for (const d of fsRes.data as any[]) {
      items.push({
        id: d.id,
        source: "filesearch",
        publicationName: d.publication_name,
        status: d.status === "active" ? "completed" : d.status || "completed",
        createdAt: d.created_at,
        progress: 100,
        documentSummary: d.document_summary,
        error: d.error,
        clippingsCount: d.total_clippings_found ?? 0,
        categories: d.categories ?? [],
        keywords: d.keywords ?? [],
        relevantClients: d.relevant_clients ?? [],
      });
    }
  }

  if (!legacyRes.error && legacyRes.data) {
    for (const j of legacyRes.data as any[]) {
      items.push({
        id: j.id,
        source: "legacy",
        publicationName: j.publication_name,
        status: j.status,
        createdAt: j.created_at,
        progress: j.progress,
        documentSummary: j.document_summary,
        error: j.error,
      });
    }
  }

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return items;
};

const ProcessingHistoryContainer = ({ onViewJob }: ProcessingHistoryContainerProps) => {
  const { data: jobs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["press-processing-history"],
    queryFn: fetchProcessingHistory,
  });

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!jobs) return [];
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      [j.publicationName, j.documentSummary ?? "", ...(j.relevantClients ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [jobs, search]);

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
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por publicación, cliente o resumen..."
            className="pl-9"
          />
        </div>

        {isLoading && (
          <>
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">
              {jobs && jobs.length > 0
                ? "Ningún documento coincide con la búsqueda."
                : "No hay documentos procesados aún."}
            </p>
          </div>
        )}

        {filtered.map((job) => (
          <ProcessingHistoryItem
            key={`${job.source}-${job.id}`}
            job={job}
            onView={
              onViewJob && job.source === "filesearch" && job.status === "completed"
                ? () =>
                    onViewJob({
                      publicationName: job.publicationName,
                      documentSummary: job.documentSummary ?? "",
                      documentMetadata: {
                        summary: job.documentSummary ?? "",
                        categories: job.categories ?? [],
                        keywords: job.keywords ?? [],
                        relevantClients: job.relevantClients ?? [],
                        totalClippings: job.clippingsCount ?? 0,
                      },
                    })
                : undefined
            }
          />
        ))}
      </CardContent>
    </Card>
  );
};

export default ProcessingHistoryContainer;
