
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PrensaPageHeader from "@/components/prensa-escrita/PrensaPageHeader";
import PressTabsContainer from "@/components/prensa-escrita/PressTabsContainer";

interface PressClipping {
  id: string;
  title: string;
  content: string;
  category: string;
  page_number: number;
  summary_who?: string;
  summary_what?: string;
  summary_when?: string;
  summary_where?: string;
  summary_why?: string;
  keywords?: string[];
  client_relevance?: string[];
}

const PrensaEscrita = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clippings, setClippings] = useState<PressClipping[]>([]);
  const [publicationName, setPublicationName] = useState("");
  const [activeTab, setActiveTab] = useState("upload");

  const processFile = async (file: File, publicationName: string) => {
    setIsUploading(true);
    setUploadProgress(10);
    setPublicationName(publicationName);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 5;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 1000);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("publicationName", publicationName);

      const { data, error } = await supabase.functions.invoke("process-press-pdf", {
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      clearInterval(progressInterval);
      
      if (error) throw error;
      
      // Map the response to our component format
      const processedClippings = (data.clippings || []).map((clip: any) => ({
        id: clip.id,
        title: clip.title,
        content: clip.content,
        category: clip.category,
        page_number: clip.page_number,
        summary_who: clip.summary_who,
        summary_what: clip.summary_what,
        summary_when: clip.summary_when,
        summary_where: clip.summary_where,
        summary_why: clip.summary_why,
        keywords: clip.keywords,
        client_relevance: clip.client_relevance
      }));
      
      setClippings(processedClippings);
      setUploadProgress(100);
      
      toast({
        title: "PDF procesado exitosamente",
        description: `Se encontraron ${processedClippings.length} recortes de prensa`,
      });
      
      // Switch to results tab
      if (processedClippings.length > 0) {
        setActiveTab("results");
      }
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast({
        title: "Error al procesar el PDF",
        description: "No se pudo procesar el archivo PDF",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

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
      />
    </div>
  );
};

export default PrensaEscrita;
