
import React from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface PDFUploadProgressProps {
  progress: number;
}

const PDFUploadProgress = ({ progress }: PDFUploadProgressProps) => {
  const getStatusMessage = () => {
    if (progress < 15) {
      return "Subiendo archivo...";
    } else if (progress < 30) {
      return "Analizando estructura del PDF...";
    } else if (progress < 50) {
      return "Extrayendo páginas del documento...";
    } else if (progress < 70) {
      return "Procesando contenido con IA...";
    } else if (progress < 85) {
      return "Identificando recortes de prensa...";
    } else if (progress < 95) {
      return "Generando análisis semántico...";
    } else {
      return "Guardando resultados...";
    }
  };

  const getStageLabel = () => {
    if (progress < 15) {
      return "Subida";
    } else if (progress < 30) {
      return "Análisis inicial";
    } else if (progress < 50) {
      return "Extracción";
    } else if (progress < 70) {
      return "Procesamiento IA";
    } else if (progress < 85) {
      return "Identificación";
    } else if (progress < 95) {
      return "Análisis semántico";
    } else {
      return "Finalización";
    }
  };

  const getDetailedMessage = () => {
    if (progress < 15) {
      return "Transfiriendo archivo al servidor...";
    } else if (progress < 30) {
      return "Verificando formato y contenido del PDF...";
    } else if (progress < 50) {
      return "Separando páginas individuales para análisis...";
    } else if (progress < 70) {
      return "Analizando cada página con inteligencia artificial...";
    } else if (progress < 85) {
      return "Extrayendo artículos y noticias...";
    } else if (progress < 95) {
      return "Generando embeddings para búsqueda semántica...";
    } else {
      return "Almacenando recortes en la base de datos...";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
          <p className="text-sm font-medium text-primary">{getStatusMessage()}</p>
        </div>
        <span className="text-xs font-semibold text-primary">{progress.toFixed(0)}%</span>
      </div>
      
      <Progress value={progress} className="w-full h-2" />
      
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">{getStageLabel()}</span>
          <span className="text-muted-foreground">{progress >= 100 ? "Completado" : "En progreso"}</span>
        </div>
        
        <p className="text-xs text-muted-foreground">
          {getDetailedMessage()}
        </p>
      </div>
      
      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground italic">
          💡 Este proceso puede tomar varios minutos dependiendo del tamaño del PDF.<br />
          Por favor, no cierres esta página hasta que el proceso complete.
        </p>
      </div>

      {progress >= 95 && progress < 100 && (
        <p className="text-xs text-primary font-medium animate-pulse">
          ¡Casi listo! Guardando los recortes encontrados...
        </p>
      )}
    </div>
  );
};

export default PDFUploadProgress;
