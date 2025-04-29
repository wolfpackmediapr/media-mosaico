
interface SaveStatusProps {
  isSaving: boolean;
  saveError?: string | null;
  saveSuccess?: boolean;
}

export const SaveStatus = ({ isSaving, saveError, saveSuccess }: SaveStatusProps) => {
  if (!isSaving && !saveError && !saveSuccess) return null;

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
      
      {saveSuccess && !isSaving && (
        <span className="text-sm text-success">
          Guardado exitoso
        </span>
      )}
    </div>
  );
};
