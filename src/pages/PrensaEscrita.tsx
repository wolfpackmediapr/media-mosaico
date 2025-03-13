
import React from "react";
import PrensaPageHeader from "@/components/prensa-escrita/PrensaPageHeader";
import PressTabsContainer from "@/components/prensa-escrita/PressTabsContainer";
import { usePdfProcessing } from "@/hooks/use-pdf-processing";
import { useTabState } from "@/hooks/use-tab-state";

const PrensaEscrita = () => {
  const { 
    isUploading, 
    uploadProgress, 
    clippings, 
    publicationName, 
    processFile,
    setClippings,
    cancelProcessing
  } = usePdfProcessing();
  
  const { activeTab, setActiveTab } = useTabState("upload");

  React.useEffect(() => {
    if (clippings.length > 0) {
      setActiveTab("results");
    }
  }, [clippings.length, setActiveTab]);

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
