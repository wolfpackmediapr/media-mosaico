
import React from "react";
import { Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import PressClippingCard from "@/components/prensa-escrita/PressClippingCard";
import GenerateReportButton from "@/components/prensa-escrita/GenerateReportButton";
import { PressClipping } from "@/hooks/use-pdf-processing";

interface ResultsContentTabProps {
  isUploading: boolean;
  clippings: PressClipping[];
  publicationName: string;
  setActiveTab: (tab: string) => void;
}

const ResultsContentTab = ({
  isUploading,
  clippings,
  publicationName,
  setActiveTab
}: ResultsContentTabProps) => {
  if (isUploading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Procesando PDF...</span>
      </div>
    );
  }

  if (clippings.length === 0) {
    return (
      <div className="text-center p-12 bg-muted/50 rounded-lg">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No hay recortes de prensa</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Sube un archivo PDF de prensa escrita para analizar su contenido
        </p>
        <Button onClick={() => setActiveTab("upload")}>
          Subir PDF
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">
          Recortes de prensa: {publicationName}
        </h2>
        <GenerateReportButton 
          clippings={clippings.map(clip => ({
            id: clip.id,
            title: clip.title,
            content: clip.content,
            category: clip.category,
            pageNumber: clip.page_number,
            summary: {
              who: clip.summary_who || '',
              what: clip.summary_what || '',
              when: clip.summary_when || '',
              where: clip.summary_where || '',
              why: clip.summary_why || ''
            },
            keywords: clip.keywords,
            clientRelevance: clip.client_relevance,
            publicationName
          }))}
          publicationName={publicationName}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clippings.map((clipping) => (
          <PressClippingCard
            key={clipping.id}
            id={clipping.id}
            title={clipping.title}
            content={clipping.content}
            category={clipping.category}
            pageNumber={clipping.page_number}
            summary={clipping.summary_who ? {
              who: clipping.summary_who,
              what: clipping.summary_what || '',
              when: clipping.summary_when || '',
              where: clipping.summary_where || '',
              why: clipping.summary_why || ''
            } : undefined}
            keywords={clipping.keywords}
            clientRelevance={clipping.client_relevance}
            publicationName={publicationName}
          />
        ))}
      </div>
    </>
  );
};

export default ResultsContentTab;
