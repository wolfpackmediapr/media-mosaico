
import React from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2, FileArchive } from "lucide-react";

interface PDFUploadProgressProps {
  progress: number;
}

const PDFUploadProgress = ({ progress }: PDFUploadProgressProps) => {
  const getStatusMessage = () => {
    if (progress < 10) {
      return "Subiendo archivo...";
    } else if (progress < 20) {
      return "Comprimiendo PDF...";
    } else if (progress < 50) {
      return "Procesando PDF con IA...";
    } else if (progress < 75) {
      return "Analizando contenido...";
    } else if (progress < 95) {
      return "Extrayendo recortes...";
    } else {
      return "Finalizando...";
    }
  };

  const getStageLabel = () => {
    if (progress < 10) {
      return "Subida";
    } else if (progress < 20) {
      return "Compresión";
    } else if (progress < 50) {
      return "Procesamiento IA";
    } else if (progress < 75) {
      return "Análisis";
    } else if (progress < 95) {
      return "Extracción";
    } else {
      return "Finalización";
    }
  };

  const isCompressing = progress >= 10 && progress < 20;

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        {isCompressing ? (
          <FileArchive className="h-5 w-5 text-primary mr-2 animate-pulse" />
        ) : (
          <Loader2 className="h-5 w-5 text-primary mr-2 animate-spin" />
        )}
        <p className="text-sm font-medium text-primary">{getStatusMessage()}</p>
      </div>
      
      <Progress value={progress} className="w-full h-2" />
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>{progress.toFixed(0)}% completado</span>
        <span>{getStageLabel()}</span>
      </div>
      
      <p className="text-xs text-muted-foreground mt-4 italic">
        Este proceso puede tomar varios minutos dependiendo del tamaño del PDF.<br />
        Por favor, no cierres esta página.
      </p>

      {isCompressing && (
        <p className="text-xs text-primary mt-2 flex items-center gap-1">
          <FileArchive className="h-3 w-3" />
          Optimizando archivo para mejorar la velocidad de procesamiento...
        </p>
      )}

      {progress >= 95 && (
        <p className="text-xs text-primary mt-2">
          ¡Casi listo! Preparando los resultados...
        </p>
      )}
    </div>
  );
};

export default PDFUploadProgress;
