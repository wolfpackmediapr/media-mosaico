
import { Check, AlertCircle, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileStatusIndicatorProps {
  status: "valid" | "invalid" | "needs-reupload" | "loading";
  className?: string;
}

export function FileStatusIndicator({ status, className }: FileStatusIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {status === "valid" && (
        <>
          <Check className="w-4 h-4 text-green-500" />
          <span className="text-xs text-green-600">Archivo válido</span>
        </>
      )}
      
      {status === "invalid" && (
        <>
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-xs text-red-600">Archivo inválido</span>
        </>
      )}
      
      {status === "needs-reupload" && (
        <>
          <UploadCloud className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-amber-600">Necesita resubirse</span>
        </>
      )}
      
      {status === "loading" && (
        <>
          <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs text-blue-600">Cargando</span>
        </>
      )}
    </div>
  );
}

export default FileStatusIndicator;
