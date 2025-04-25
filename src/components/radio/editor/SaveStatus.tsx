
import { useEffect, useState } from "react";

interface SaveStatusProps {
  isSaving: boolean;
  saveError?: string | null;
  saveSuccess?: boolean;
}

export const SaveStatus = ({ isSaving, saveError, saveSuccess }: SaveStatusProps) => {
  const [showSuccess, setShowSuccess] = useState(false);
  
  useEffect(() => {
    if (saveSuccess) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 2000); // Hide success message after 2 seconds
      
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  // Don't render anything if there's nothing to show
  if (!isSaving && !saveError && !showSuccess) return null;

  return (
    <div className="absolute top-2 right-2">
      {isSaving && (
        <span className="text-sm text-primary animate-pulse">
          Guardando...
        </span>
      )}
      
      {saveError && (
        <span className="text-sm text-destructive">
          Error: {saveError}
        </span>
      )}
      
      {showSuccess && !isSaving && (
        <span className="text-sm text-success">
          Guardado exitoso
        </span>
      )}
    </div>
  );
};
