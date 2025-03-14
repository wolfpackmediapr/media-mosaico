import React from "react";
import PrensaPageHeader from "@/components/prensa-escrita/PrensaPageHeader";
import PressTabsContainer from "@/components/prensa-escrita/PressTabsContainer";
import { usePdfProcessing } from "@/hooks/use-pdf-processing";
import { useTabState } from "@/hooks/use-tab-state";
import { toast } from "@/hooks/use-toast";

const PrensaEscrita = () => {
  const { 
    isUploading, 
    uploadProgress, 
    clippings, 
    publicationName, 
    processFile,
    setClippings,
    cancelProcessing,
    processingError
  } = usePdfProcessing();
  
  const { activeTab, setActiveTab } = useTabState("upload");

  // Switch to results tab when clippings are available
  React.useEffect(() => {
    if (clippings.length > 0) {
      setActiveTab("results");
    }
  }, [clippings.length, setActiveTab]);

  // Show error toast when processing fails
  React.useEffect(() => {
    if (processingError) {
      toast({
        title: "Error al procesar el PDF",
        description: processingError,
        variant: "destructive",
      });
    }
  }, [processingError, toast]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PrensaPageHeader />
      
      <PressTabsContainer
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        clippings={clippings}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        publicationName={publicationName}
        onFileSelect={processFile}
        onCancelProcessing={cancelProcessing}
      />
    </div>
  );
};

export default PrensaEscrita;
