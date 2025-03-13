
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Search } from "lucide-react";
import UploadContentTab from "./UploadContentTab";
import ResultsContentTab from "./ResultsContentTab";
import { PressClipping } from "@/hooks/use-pdf-processing";

interface PressTabsContainerProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  clippings: PressClipping[];
  isUploading: boolean;
  uploadProgress: number;
  publicationName: string;
  onFileSelect: (file: File, publicationName: string) => void;
  onCancelProcessing?: () => void;
}

const PressTabsContainer = ({
  activeTab,
  setActiveTab,
  clippings,
  isUploading,
  uploadProgress,
  publicationName,
  onFileSelect,
  onCancelProcessing
}: PressTabsContainerProps) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full md:w-[400px] grid-cols-2">
        <TabsTrigger value="upload">
          <FileText className="h-4 w-4 mr-2" />
          Subir PDF
        </TabsTrigger>
        <TabsTrigger value="results" disabled={clippings.length === 0}>
          <Search className="h-4 w-4 mr-2" />
          Resultados
          {clippings.length > 0 && (
            <span className="ml-2 bg-primary/20 text-primary rounded-full px-2 py-0.5 text-xs">
              {clippings.length}
            </span>
          )}
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
        <ResultsContentTab 
          isUploading={isUploading}
          clippings={clippings}
          publicationName={publicationName}
          setActiveTab={setActiveTab}
        />
      </TabsContent>
    </Tabs>
  );
};

export default PressTabsContainer;
