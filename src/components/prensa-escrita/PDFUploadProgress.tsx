
import React from "react";
import { Progress } from "@/components/ui/progress";

interface PDFUploadProgressProps {
  progress: number;
}

const PDFUploadProgress = ({ progress }: PDFUploadProgressProps) => {
  const getStatusMessage = () => {
    if (progress < 50) {
      return "Subiendo archivo...";
    } else if (progress < 95) {
      return "Procesando PDF...";
    } else {
      return "Finalizando...";
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{getStatusMessage()}</p>
      <Progress value={progress} className="w-full h-2" />
      <p className="text-xs text-gray-500">{progress.toFixed(0)}% completado</p>
      <p className="text-xs text-muted-foreground">
        Este proceso puede tomar varios minutos dependiendo del tamaño del PDF
      </p>
    </div>
  );
};

export default PDFUploadProgress;
