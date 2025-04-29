
import React, { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validatePdfFile } from "@/utils/file-validators";
import { useToast } from "@/hooks/use-toast";

interface PDFDropZoneProps {
  onFileSelect: (file: File) => void;
  maxFileSizeMB: number;
  isUploading: boolean;
}

const PDFDropZone = ({ onFileSelect, maxFileSizeMB, isUploading }: PDFDropZoneProps) => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);

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
    
    if (!validatePdfFile(droppedFile, maxFileSizeMB)) {
      return;
    }
    
    toast({
      title: "Archivo seleccionado",
      description: `${droppedFile.name} (${(droppedFile.size / 1024 / 1024).toFixed(2)} MB)`,
    });
    
    onFileSelect(droppedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (!validatePdfFile(selectedFile, maxFileSizeMB)) {
        return;
      }
      
      toast({
        title: "Archivo seleccionado",
        description: `${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`,
      });
      
      onFileSelect(selectedFile);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragging ? "border-primary bg-primary/10" : "border-gray-300"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <p className="mb-2 text-sm text-gray-500">
        Arrastra y suelta un archivo PDF aquí o selecciónalo manualmente
      </p>
      <Button
        variant="outline"
        onClick={() => document.getElementById("fileInput")?.click()}
        className="mb-4"
        disabled={isUploading}
      >
        Seleccionar PDF
      </Button>
      <input
        id="fileInput"
        type="file"
        className="hidden"
        accept=".pdf"
        onChange={handleFileInput}
        disabled={isUploading}
      />
      <p className="text-xs text-gray-500 mt-4">
        Tamaño máximo permitido: {maxFileSizeMB}MB
      </p>
    </div>
  );
};

export default PDFDropZone;
