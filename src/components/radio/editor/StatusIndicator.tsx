
interface StatusIndicatorProps {
  isSaving: boolean;
}

const StatusIndicator = ({ isSaving }: StatusIndicatorProps) => {
  if (!isSaving) return null;
  
  return (
    <span className="text-xs text-primary animate-pulse whitespace-nowrap">
      Guardando...
    </span>
  );
};

export default StatusIndicator;
