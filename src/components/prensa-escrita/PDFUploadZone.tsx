
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

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
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [publicationName, setPublicationName] = useState("");
  const [error, setError] = useState("");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;
    
    if (droppedFile.type !== 'application/pdf') {
      setError("Por favor, selecciona un archivo PDF");
      return;
    }
    
    setFile(droppedFile);
    setError("");
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (selectedFile.type !== 'application/pdf') {
        setError("Por favor, selecciona un archivo PDF");
        return;
      }
      
      setFile(selectedFile);
      setError("");
    }
  };

  const handleSubmit = () => {
    if (!file) {
      setError("Por favor, selecciona un archivo PDF");
      return;
    }
    
    if (!publicationName.trim()) {
      setError("Por favor, ingresa el nombre de la publicación");
      return;
    }
    
    onFileSelect(file, publicationName);
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
            <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
              {error}
            </div>
          )}
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/10" : "border-gray-300"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            
            {isUploading ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Procesando archivo...</p>
                <Progress value={uploadProgress} className="w-full h-2" />
                <p className="text-xs text-gray-500">{uploadProgress.toFixed(0)}% completado</p>
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
                {file && (
                  <p className="text-sm font-medium text-primary">
                    Archivo seleccionado: {file.name}
                  </p>
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
