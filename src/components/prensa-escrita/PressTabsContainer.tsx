
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Search, Clock } from "lucide-react";
import UploadContentTab from "./UploadContentTab";
import ResultsContainer from "./results/ResultsContainer";
import ProcessingHistoryContainer from "./history/ProcessingHistoryContainer";
import { PressClipping, DocumentMetadata } from "@/hooks/prensa/types";

interface PressTabsContainerProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  clippings: PressClipping[];
  isUploading: boolean;
  uploadProgress: number;
  publicationName: string;
  documentSummary?: string;
  documentMetadata?: DocumentMetadata;
  onFileSelect: (file: File, publicationName: string, publicationDate?: Date) => void;
  onCancelProcessing?: () => void;
}

const PressTabsContainer = ({
  activeTab,
  setActiveTab,
  clippings,
  isUploading,
  uploadProgress,
  publicationName,
  documentSummary,
  documentMetadata,
  onFileSelect,
  onCancelProcessing
}: PressTabsContainerProps) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full md:w-[500px] grid-cols-3">
        <TabsTrigger value="upload">
          <FileText className="h-4 w-4 mr-2" />
          Subir PDF
        </TabsTrigger>
        <TabsTrigger value="results" disabled={clippings.length === 0 && !documentSummary}>
          <Search className="h-4 w-4 mr-2" />
          Resultados
          {clippings.length > 0 && (
            <span className="ml-2 bg-primary/20 text-primary rounded-full px-2 py-0.5 text-xs">
              {clippings.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="history">
          <Clock className="h-4 w-4 mr-2" />
          Historial
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="upload" className="space-y-6 mt-6">
        <UploadContentTab 
          onFileSelect={onFileSelect}
          onCancelProcessing={onCancelProcessing}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      </TabsContent>
      
      <TabsContent value="results" className="space-y-6 mt-6">
        <ResultsContainer 
          isUploading={isUploading}
          clippings={clippings}
          publicationName={publicationName}
          documentSummary={documentSummary}
          documentMetadata={documentMetadata}
          setActiveTab={setActiveTab}
        />
      </TabsContent>

      <TabsContent value="history" className="space-y-6 mt-6">
        <ProcessingHistoryContainer />
      </TabsContent>
    </Tabs>
  );
};

export default PressTabsContainer;
