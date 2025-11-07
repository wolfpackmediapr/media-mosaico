import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";

interface PDFUploadFormProps {
  publicationName: string;
  onPublicationNameChange: (name: string) => void;
  onSubmit: () => void;
  isUploading: boolean;
  isSubmitting: boolean;
  hasFile: boolean;
}

const PDFUploadForm = ({
  publicationName,
  onPublicationNameChange,
  onSubmit,
  isUploading,
  isSubmitting,
  hasFile
}: PDFUploadFormProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="publicationName" className="text-sm font-medium">
          Nombre de la Publicación
        </label>
        <Input
          id="publicationName"
          value={publicationName}
          onChange={(e) => onPublicationNameChange(e.target.value)}
          placeholder="Ej: El Nuevo Día, 25 de Agosto 2023"
          disabled={isUploading}
        />
      </div>
      
      <Button 
        className="w-full" 
        disabled={isUploading || isSubmitting || !hasFile || !publicationName.trim()}
        onClick={onSubmit}
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
          "Procesar Archivo"
        )}
      </Button>
    </div>
  );
};

export default PDFUploadForm;
