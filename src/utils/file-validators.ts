
import { toast } from "@/hooks/use-toast";

export const validatePdfFile = (file: File, maxSizeMB: number): boolean => {
  if (file.type !== 'application/pdf') {
    toast({
      title: "Tipo de archivo inválido",
      description: "Solo se permiten archivos PDF",
      variant: "destructive"
    });
    return false;
  }
  
  if (file.size > maxSizeMB * 1024 * 1024) {
    toast({
      title: "Archivo demasiado grande",
      description: `El tamaño máximo permitido es ${maxSizeMB}MB`,
      variant: "destructive"
    });
    return false;
  }
  
  return true;
};
