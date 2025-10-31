
import { toast } from "sonner";

export const validatePdfFile = (file: File, maxSizeMB: number): boolean => {
  if (file.type !== 'application/pdf') {
    toast.error("Tipo de archivo inválido", {
      description: "Solo se permiten archivos PDF"
    });
    return false;
  }
  
  if (file.size > maxSizeMB * 1024 * 1024) {
    toast.error("Archivo demasiado grande", {
      description: `El tamaño máximo permitido es ${maxSizeMB}MB`
    });
    return false;
  }
  
  return true;
};

export const validatePressFile = (file: File, maxSizeMB: number): boolean => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    toast.error("Tipo de archivo inválido", {
      description: "Solo se permiten archivos PDF, JPG, PNG o WEBP"
    });
    return false;
  }
  
  if (file.size > maxSizeMB * 1024 * 1024) {
    toast.error("Archivo demasiado grande", {
      description: `El tamaño máximo permitido es ${maxSizeMB}MB`
    });
    return false;
  }
  
  return true;
};
