import React from "react";
import { Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import GenerateReportButton from "../GenerateReportButton";
import DocumentSummaryCard from "./DocumentSummaryCard";
import ClippingsGrid from "./ClippingsGrid";
import { PressClipping } from "@/hooks/prensa/types";

interface ResultsContainerProps {
  isUploading: boolean;
  clippings: PressClipping[];
  publicationName: string;
  setActiveTab: (tab: string) => void;
  documentSummary?: string;
}

const ResultsContainer = ({
  isUploading,
  clippings,
  publicationName,
  setActiveTab,
  documentSummary
}: ResultsContainerProps) => {
  if (isUploading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Procesando PDF...</span>
      </div>
    );
  }

  // Show summary with message when no clippings but document was processed
  if (clippings.length === 0 && documentSummary) {
    return (
      <>
        <DocumentSummaryCard summary={documentSummary} />
        <div className="text-center p-8 bg-muted/50 rounded-lg">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-2">
            No se encontraron artículos relacionados con clientes
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            El documento fue procesado correctamente, pero no se identificaron artículos 
            relacionados con los clientes configurados en el sistema.
          </p>
          <Button onClick={() => setActiveTab("upload")} variant="outline">
            Procesar otro PDF
          </Button>
        </div>
      </>
    );
  }

  // Show empty state when no processing has been done
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
      {documentSummary && (
        <DocumentSummaryCard summary={documentSummary} />
      )}
      
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
            keywords: clip.keywords,
            clientRelevance: clip.client_relevance,
            publicationName
          }))}
          publicationName={publicationName}
        />
      </div>
      
      <ClippingsGrid clippings={clippings} publicationName={publicationName} />
    </>
  );
};

export default ResultsContainer;
