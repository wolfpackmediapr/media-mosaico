
import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PDFDropZone from "./PDFDropZone";
import PDFPreview from "./PDFPreview";
import PDFUploadProgress from "./PDFUploadProgress";
import { usePdfThumbnail } from "@/hooks/use-pdf-thumbnail";

interface PDFUploadZoneProps {
  onFileSelect: (file: File, publicationName: string) => void;
  isUploading: boolean;
  uploadProgress: number;
}

const PDFUploadZone = ({
  onFileSelect,
  isUploading,
  uploadProgress
}: PDFUploadZoneProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [publicationName, setPublicationName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { thumbnailUrl } = usePdfThumbnail(file);

  const maxFileSizeMB = 40; // 40MB max file size

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setError("");
  };

  const clearSelection = () => {
    setFile(null);
    setError("");
  };

  const handleSubmit = useCallback(async () => {
    if (!file) {
      setError("Por favor, selecciona un archivo PDF");
      toast({
        title: "Error",
        description: "Por favor, selecciona un archivo PDF",
        variant: "destructive"
      });
      return;
    }
    
    if (!publicationName.trim()) {
      setError("Por favor, ingresa el nombre de la publicación");
      toast({
        title: "Error",
        description: "Por favor, ingresa el nombre de la publicación",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Procesando PDF",
      description: "Este proceso puede tomar varios minutos, por favor espera...",
    });
    
    setError("");
    setIsSubmitting(true);
    
    try {
      console.log("Submitting file for processing:", file.name);
      await onFileSelect(file, publicationName);
      console.log("File submitted successfully");
    } catch (error) {
      console.error("Error processing file:", error);
      setError(error instanceof Error ? error.message : "Error al procesar el archivo");
      toast({
        title: "Error",
        description: "Error al procesar el archivo. Por favor, intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [file, publicationName, onFileSelect, toast]);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <h3 className="text-lg font-medium">Subir PDF de Prensa Escrita</h3>
              <p className="text-sm text-gray-500">
                Sube un PDF de periódico o revista para analizar su contenido
              </p>
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {isUploading ? (
            <PDFUploadProgress progress={uploadProgress} />
          ) : (
            <>
              {file ? (
                <PDFPreview 
                  file={file} 
                  thumbnailUrl={thumbnailUrl} 
                  onClear={clearSelection}
                  isUploading={isUploading}
                />
              ) : (
                <PDFDropZone 
                  onFileSelect={handleFileSelected} 
                  maxFileSizeMB={maxFileSizeMB}
                  isUploading={isUploading}
                />
              )}
            </>
          )}
          
          <div className="space-y-2">
            <label htmlFor="publicationName" className="text-sm font-medium">
              Nombre de la Publicación
            </label>
            <Input
              id="publicationName"
              value={publicationName}
              onChange={(e) => setPublicationName(e.target.value)}
              placeholder="Ej: El Nuevo Día, 25 de Agosto 2023"
              disabled={isUploading}
            />
          </div>
          
          <Button 
            className="w-full" 
            disabled={isUploading || !file || !publicationName.trim() || isSubmitting}
            onClick={handleSubmit}
            type="button"
            aria-label="Procesar PDF"
          >
            {isSubmitting ? (
              <>
                <Upload className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : isUploading ? (
              "Procesando..."
            ) : (
              "Procesar PDF"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFUploadZone;
