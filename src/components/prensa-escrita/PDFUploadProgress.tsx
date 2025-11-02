
import React from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface PDFUploadProgressProps {
  progress: number;
}

const PDFUploadProgress = ({ progress }: PDFUploadProgressProps) => {
  const getStatusMessage = () => {
    if (progress < 10) {
      return "Inicializando procesamiento...";
    } else if (progress < 20) {
      return "Subiendo archivo...";
    } else if (progress < 30) {
      return "Analizando estructura del documento...";
    } else if (progress < 50) {
      return "Creando lotes de procesamiento...";
    } else if (progress < 70) {
      return "Procesando páginas (lote en curso)...";
    } else if (progress < 85) {
      return "Extrayendo recortes de prensa...";
    } else if (progress < 95) {
      return "Analizando contenido con IA...";
    } else {
      return "Generando embeddings y guardando...";
    }
  };

  const getStageLabel = () => {
    if (progress < 10) {
      return "Inicialización";
    } else if (progress < 20) {
      return "Subida";
    } else if (progress < 30) {
      return "Análisis inicial";
    } else if (progress < 50) {
      return "Preparación de lotes";
    } else if (progress < 70) {
      return "Procesamiento por lotes";
    } else if (progress < 85) {
      return "Extracción";
    } else if (progress < 95) {
      return "Análisis IA";
    } else {
      return "Finalización";
    }
  };

  const getDetailedMessage = () => {
    if (progress < 10) {
      return "Preparando el sistema para procesar tu documento...";
    } else if (progress < 20) {
      return "Transfiriendo el archivo de forma segura a nuestros servidores...";
    } else if (progress < 30) {
      return "Detectando páginas, tamaño y características del PDF...";
    } else if (progress < 50) {
      return "Dividiendo el documento en lotes para procesamiento eficiente...";
    } else if (progress < 70) {
      return "Extrayendo páginas y procesándolas por lotes...";
    } else if (progress < 85) {
      return "Identificando y separando cada artículo o recorte individual...";
    } else if (progress < 95) {
      return "Utilizando IA avanzada para comprender el contenido de cada recorte...";
    } else {
      return "Creando vectores semánticos y guardando todos los recortes...";
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
