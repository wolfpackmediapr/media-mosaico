
import React from "react";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PDFPreviewProps {
  file: File;
  thumbnailUrl: string | null;
  onClear: () => void;
  isUploading: boolean;
}

const PDFPreview = ({ file, thumbnailUrl, onClear, isUploading }: PDFPreviewProps) => {
  return (
    <div className="space-y-4">
      {thumbnailUrl ? (
        <div className="relative mx-auto max-w-xs">
          <img 
            src={thumbnailUrl} 
            alt="Vista previa del PDF" 
            className="mx-auto max-h-40 object-contain border rounded shadow-sm"
          />
          <button 
            onClick={onClear}
            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
            aria-label="Eliminar archivo"
            disabled={isUploading}
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
        onClick={onClear}
        className="mt-1"
        disabled={isUploading}
      >
        Eliminar
      </Button>
    </div>
  );
};

export default PDFPreview;
