
import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/services/toastService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PDFDropZone from "./PDFDropZone";
import PDFPreview from "./PDFPreview";
import PDFUploadProgress from "./PDFUploadProgress";
import { usePdfThumbnail } from "@/hooks/use-pdf-thumbnail";

interface PDFUploadZoneProps {
  onFileSelect: (file: File, publicationName: string) => void;
  onCancelProcessing?: () => void;
  isUploading: boolean;
  uploadProgress: number;
}

const PDFUploadZone = ({
  onFileSelect,
  onCancelProcessing,
  isUploading,
  uploadProgress
}: PDFUploadZoneProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [publicationName, setPublicationName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { thumbnailUrl } = usePdfThumbnail(file);

  const maxFileSizeMB = 40; // 40MB max file size

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setError("");
    
    // Try to guess a publication name from the file name
    const fileName = selectedFile.name.replace('.pdf', '').trim();
    if (fileName && !publicationName) {
      setPublicationName(fileName);
    }
  };

  const clearSelection = useCallback(() => {
    setFile(null);
    setError("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!file) {
      setError("Por favor, selecciona un archivo PDF");
      toast.error("Error", {
        description: "Por favor, selecciona un archivo PDF"
      });
      return;
    }
    
    if (!publicationName.trim()) {
      setError("Por favor, ingresa el nombre de la publicación");
      toast.error("Error", {
        description: "Por favor, ingresa el nombre de la publicación"
      });
      return;
    }
    
    // Good user feedback
    toast.info("Procesando PDF", {
      description: "Este proceso puede tomar varios minutos, por favor espera..."
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
      toast.error("Error", {
        description: "Error al procesar el archivo. Por favor, intenta nuevamente."
      });
      setIsSubmitting(false); // Allow retry on error
    }
    // Don't set isSubmitting to false on success - the parent component will handle this
    // based on the status of the overall process
  }, [file, publicationName, onFileSelect]);

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
            <div className="space-y-4">
              <PDFUploadProgress progress={uploadProgress} />
              
              {onCancelProcessing && (
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={onCancelProcessing}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar procesamiento
                </Button>
              )}
            </div>
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
          
          {!isUploading && (
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
          )}
          
          {!isUploading && (
            <Button 
              className="w-full" 
              disabled={isUploading || isSubmitting || !file || !publicationName.trim()}
              onClick={handleSubmit}
              type="button"
              aria-label="Procesar PDF"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </span>
              ) : isUploading ? (
                "Procesando..."
              ) : (
                "Procesar PDF"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFUploadZone;
