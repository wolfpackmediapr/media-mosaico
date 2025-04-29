
import React, { useState, useEffect } from "react";
import { PressTabsContainer } from "@/components/prensa-escrita";
import { toast } from "@/services/toastService";
import { supabase } from "@/integrations/supabase/client";
import { PressClipping } from "@/hooks/use-pdf-processing";

const PrensaEscrita = () => {
  const [activeTab, setActiveTab] = useState("upload");
  const [clippings, setClippings] = useState<PressClipping[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [publicationName, setPublicationName] = useState("");
  
  // Demo toast to show user how notifications will appear
  useEffect(() => {
    // Only show the demo notification once per session
    const hasShownDemo = sessionStorage.getItem("has-shown-prensa-demo");
    
    if (!hasShownDemo) {
      // Wait a moment before showing the demo notification
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

  const handleFileSelect = async (file: File, pubName: string) => {
    setIsUploading(true);
    setUploadProgress(0);
    setPublicationName(pubName);
    
    // Simulate file processing with progress updates
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + 5;
      });
    }, 500);
    
    try {
      // TODO: Replace with actual PDF processing logic
      // This is just a simulation for now
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate some test clippings
      const mockClippings: PressClipping[] = [
        {
          id: "1",
          title: "Gobierno anuncia nuevas medidas económicas",
          content: "El gobierno ha anunciado hoy un paquete de medidas económicas destinadas a fortalecer la economía local y estimular el crecimiento en sectores clave.",
          category: "Economía",
          page_number: 1,
          summary_who: "El gobierno",
          summary_what: "Anuncio de medidas económicas",
          summary_when: "Hoy",
          summary_where: "En conferencia de prensa",
          summary_why: "Para estimular el crecimiento económico",
          keywords: ["economía", "gobierno", "crecimiento"],
          client_relevance: ["Banco Nacional", "Ministerio de Hacienda"]
        },
        {
          id: "2",
          title: "Avances en la investigación de vacuna contra el dengue",
          content: "Científicos locales reportan importantes avances en el desarrollo de una vacuna contra el dengue que podría estar disponible el próximo año.",
          category: "Salud",
          page_number: 3,
          summary_who: "Científicos locales",
          summary_what: "Avances en vacuna contra el dengue",
          summary_when: "Recientemente",
          summary_where: "Laboratorios de investigación",
          summary_why: "Para combatir la epidemia de dengue",
          keywords: ["salud", "dengue", "vacuna", "investigación"],
          client_relevance: ["Ministerio de Salud", "Hospital Central"]
        }
      ];
      
      setClippings(mockClippings);
      setUploadProgress(100);
      
      // Switch to results tab after processing is complete
      setTimeout(() => {
        setActiveTab("results");
        setIsUploading(false);
      }, 500);
      
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast.error("Error al procesar el PDF", {
        description: "Ocurrió un error al procesar el archivo. Por favor, intenta nuevamente."
      });
      setIsUploading(false);
    }
  };
  
  const handleCancelProcessing = () => {
    setIsUploading(false);
    setUploadProgress(0);
    toast.info("Procesamiento cancelado", {
      description: "Se ha cancelado el procesamiento del PDF."
    });
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
        onFileSelect={handleFileSelect}
        onCancelProcessing={handleCancelProcessing}
      />
    </div>
  );
};

export default PrensaEscrita;
