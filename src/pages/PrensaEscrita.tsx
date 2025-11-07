
import React, { useState, useEffect } from "react";
import { toast } from "@/services/toastService";
import PressTabsContainer from "@/components/prensa-escrita/PressTabsContainer";
import { usePdfProcessing } from "@/hooks/use-pdf-processing";

export default function PrensaEscrita() {
  const [activeTab, setActiveTab] = useState("upload");
  
  // Use real hooks instead of mock state
  const {
    isUploading,
    uploadProgress,
    clippings,
    publicationName,
    processingError,
    processFile,
    resetProcessing,
    cancelProcessing,
    currentJob
  } = usePdfProcessing();
  
  // Demo toast (keep as-is)
  useEffect(() => {
    const hasShownDemo = sessionStorage.getItem("has-shown-prensa-demo");
    if (!hasShownDemo) {
      const timer = setTimeout(() => {
        toast.info("Sistema de notificaciones activo", {
          description: "Recibirás notificaciones cuando se procesen nuevos recortes de prensa",
          duration: 5000,
        });
        sessionStorage.setItem("has-shown-prensa-demo", "true");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Real file handling
  const handleFileSelect = async (file: File, pubName: string) => {
    try {
      await processFile(file, pubName);
      
      // Switch to results tab after successful processing
      setTimeout(() => {
        setActiveTab("results");
      }, 1000);
      
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Error al procesar el archivo", {
        description: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  };
  
  const handleCancelProcessing = () => {
    cancelProcessing();
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col space-y-1.5">
        <h2 className="text-3xl font-bold tracking-tight">Prensa Escrita</h2>
        <p className="text-muted-foreground">
          Gestión de recortes de prensa y documentos PDF
        </p>
      </div>
      
      <PressTabsContainer 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        clippings={clippings}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        publicationName={publicationName}
        documentSummary={currentJob?.document_summary}
        onFileSelect={handleFileSelect}
        onCancelProcessing={handleCancelProcessing}
      />
    </div>
  );
}
