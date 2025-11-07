import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, X } from "lucide-react";
import { toast } from "@/services/toastService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePdfThumbnail } from "@/hooks/use-pdf-thumbnail";
import PDFFileSelector from "./PDFFileSelector";
import PDFUploadForm from "./PDFUploadForm";
import PDFUploadProgress from "../PDFUploadProgress";

interface PDFUploadContainerProps {
  onFileSelect: (file: File, publicationName: string) => void;
  onCancelProcessing?: () => void;
  isUploading: boolean;
  uploadProgress: number;
}

const PDFUploadContainer = ({
  onFileSelect,
  onCancelProcessing,
  isUploading,
  uploadProgress
}: PDFUploadContainerProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [publicationName, setPublicationName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { thumbnailUrl } = usePdfThumbnail(file);

  const maxFileSizeMB = 40;

  const handleFileSelected = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setError("");
    
    const fileName = selectedFile.name.replace('.pdf', '').trim();
    if (fileName && !publicationName) {
      setPublicationName(fileName);
    }
  }, [publicationName]);

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
      setIsSubmitting(false);
    }
  }, [file, publicationName, onFileSelect]);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <h3 className="text-lg font-medium">Subir PDF o Imagen de Prensa Escrita</h3>
              <p className="text-sm text-gray-500">
                Sube un PDF de periódico o una imagen (JPG/PNG) para analizar su contenido
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
              <PDFFileSelector
                file={file}
                thumbnailUrl={thumbnailUrl}
                onFileSelect={handleFileSelected}
                onClear={clearSelection}
                maxFileSizeMB={maxFileSizeMB}
                isUploading={isUploading}
              />
              
              <PDFUploadForm
                publicationName={publicationName}
                onPublicationNameChange={setPublicationName}
                onSubmit={handleSubmit}
                isUploading={isUploading}
                isSubmitting={isSubmitting}
                hasFile={!!file}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFUploadContainer;
