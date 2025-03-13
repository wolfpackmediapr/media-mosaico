
import React, { useState } from "react";
import PDFUploadZone from "@/components/prensa-escrita/PDFUploadZone";
import PressClippingCard from "@/components/prensa-escrita/PressClippingCard";
import SearchClippingsSection from "@/components/prensa-escrita/SearchClippingsSection";
import GenerateReportButton from "@/components/prensa-escrita/GenerateReportButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Prensa Escrita</h1>
          <p className="text-muted-foreground">
            Analiza periódicos y revistas en formato PDF
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a 
              href="https://chat.openai.com/share/88a2c6eca1ab5d21d8e4d9a12338a9f4" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <FileText className="h-4 w-4 mr-2" />
              Documentación
              <ExternalLink className="h-3 w-3 ml-2" />
            </a>
          </Button>
        </div>
      </div>
      
      <Separator />
      
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
          <PDFUploadZone 
            onFileSelect={processFile}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
          
          <SearchClippingsSection />
        </TabsContent>
        
        <TabsContent value="results" className="space-y-6 mt-6">
          {isUploading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Procesando PDF...</span>
            </div>
          ) : clippings.length > 0 ? (
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
          ) : (
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrensaEscrita;
