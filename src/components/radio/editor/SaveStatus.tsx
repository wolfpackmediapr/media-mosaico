
interface SaveStatusProps {
  isSaving: boolean;
}

export const SaveStatus = ({ isSaving }: SaveStatusProps) => {
  if (!isSaving) return null;

  return (
    <div className="absolute top-2 right-2">
      <span className="text-sm text-primary animate-pulse">
        Guardando...
      </span>
    </div>
  );
};
