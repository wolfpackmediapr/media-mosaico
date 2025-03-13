
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

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
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [publicationName, setPublicationName] = useState("");
  const [error, setError] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const maxFileSizeMB = 40; // 40MB max file size

  useEffect(() => {
    // Clean up thumbnail URL when component unmounts
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [thumbnailUrl]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (fileToValidate: File): boolean => {
    if (fileToValidate.type !== 'application/pdf') {
      setError("Por favor, selecciona un archivo PDF");
      toast({
        title: "Tipo de archivo inválido",
        description: "Solo se permiten archivos PDF",
        variant: "destructive"
      });
      return false;
    }
    
    if (fileToValidate.size > maxFileSizeMB * 1024 * 1024) {
      setError(`El archivo es demasiado grande. El tamaño máximo permitido es ${maxFileSizeMB}MB.`);
      toast({
        title: "Archivo demasiado grande",
        description: `El tamaño máximo permitido es ${maxFileSizeMB}MB`,
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const generatePdfThumbnail = async (pdfFile: File) => {
    try {
      // Create a blob URL for the PDF file
      const pdfUrl = URL.createObjectURL(pdfFile);
      
      // Load the PDF.js library dynamically
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set the worker source
      const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      
      // Get the first page
      const page = await pdf.getPage(1);
      
      // Set scale for the rendering
      const viewport = page.getViewport({ scale: 0.5 });
      
      // Create a canvas to render the page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render the page to the canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Convert canvas to blob URL
        canvas.toBlob((blob) => {
          if (blob) {
            const thumbUrl = URL.createObjectURL(blob);
            setThumbnailUrl(thumbUrl);
          }
        }, 'image/png');
      }
      
      // Clean up PDF URL
      URL.revokeObjectURL(pdfUrl);
    } catch (error) {
      console.error('Error generating PDF thumbnail:', error);
      // If thumbnail generation fails, don't show an error to the user,
      // just proceed without a thumbnail
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;
    
    if (!validateFile(droppedFile)) {
      return;
    }
    
    setFile(droppedFile);
    setError("");
    
    // Generate thumbnail for the PDF
    await generatePdfThumbnail(droppedFile);
    
    toast({
      title: "Archivo seleccionado",
      description: `${droppedFile.name} (${(droppedFile.size / 1024 / 1024).toFixed(2)} MB)`,
    });
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (!validateFile(selectedFile)) {
        return;
      }
      
      setFile(selectedFile);
      setError("");
      
      // Generate thumbnail for the PDF
      await generatePdfThumbnail(selectedFile);
      
      toast({
        title: "Archivo seleccionado",
        description: `${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`,
      });
    }
  };

  const handleSubmit = () => {
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
    onFileSelect(file, publicationName);
  };

  const clearSelection = () => {
    setFile(null);
    setError("");
    if (thumbnailUrl) {
      URL.revokeObjectURL(thumbnailUrl);
      setThumbnailUrl(null);
    }
  };

  const getStatusMessage = () => {
    if (uploadProgress < 50) {
      return "Subiendo archivo...";
    } else if (uploadProgress < 95) {
      return "Procesando PDF...";
    } else {
      return "Finalizando...";
    }
  };

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
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/10" : "border-gray-300"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!file && <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />}
            
            {isUploading ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">{getStatusMessage()}</p>
                <Progress value={uploadProgress} className="w-full h-2" />
                <p className="text-xs text-gray-500">{uploadProgress.toFixed(0)}% completado</p>
                <p className="text-xs text-muted-foreground">
                  Este proceso puede tomar varios minutos dependiendo del tamaño del PDF
                </p>
              </div>
            ) : (
              <>
                {file ? (
                  <div className="space-y-4">
                    {thumbnailUrl ? (
                      <div className="relative mx-auto max-w-xs">
                        <img 
                          src={thumbnailUrl} 
                          alt="Vista previa del PDF" 
                          className="mx-auto max-h-40 object-contain border rounded shadow-sm"
                        />
                        <button 
                          onClick={clearSelection}
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                          aria-label="Eliminar archivo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="mx-auto max-w-xs bg-gray-100 p-4 rounded">
                        <FileText className="h-10 w-10 mx-auto text-gray-500 mb-2" />
                        <p className="text-xs text-gray-500">Vista previa no disponible</p>
                      </div>
                    )}
                    <p className="text-sm font-medium text-primary">
                      Archivo: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearSelection}
                      className="mt-1"
                    >
                      Eliminar
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="mb-2 text-sm text-gray-500">
                      Arrastra y suelta un archivo PDF aquí o selecciónalo manualmente
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("fileInput")?.click()}
                      className="mb-4"
                    >
                      Seleccionar PDF
                    </Button>
                    <input
                      id="fileInput"
                      type="file"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleFileInput}
                    />
                    <p className="text-xs text-gray-500 mt-4">
                      Tamaño máximo permitido: {maxFileSizeMB}MB
                    </p>
                  </>
                )}
              </>
            )}
          </div>
          
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
            disabled={isUploading || !file || !publicationName.trim()}
            onClick={handleSubmit}
          >
            {isUploading ? "Procesando..." : "Procesar PDF"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFUploadZone;
