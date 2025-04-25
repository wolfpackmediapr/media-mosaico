
interface TranscriptionFeedbackProps {
  isEmpty: boolean;
  isProcessing: boolean;
  showTimestamps: boolean;
  hasTimestampData: boolean;
}

export const TranscriptionFeedback = ({ 
  isEmpty, 
  isProcessing, 
  showTimestamps,
  hasTimestampData 
}: TranscriptionFeedbackProps) => {
  if (isEmpty && !isProcessing) {
    return (
      <p className="text-sm text-muted-foreground mt-2">
        Procese un archivo de audio para ver la transcripción aquí. Podrá editar el texto una vez transcrito.
      </p>
    );
  }

  if (showTimestamps && !hasTimestampData) {
    return (
      <p className="text-sm text-yellow-500 mt-2">
        No hay datos de timestamps disponibles para esta transcripción.
      </p>
    );
  }

  return null;
};
