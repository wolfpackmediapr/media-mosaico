
import { Button } from "@/components/ui/button";
import { Clock, Edit, Check } from "lucide-react";

interface TranscriptionModeToggleProps {
  showTimestamps: boolean;
  isEditing: boolean;
  hasTimestampData: boolean;
  isProcessing: boolean;
  toggleTimestampView: () => void;
  toggleEditMode: () => void;
}

const TranscriptionModeToggle = ({
  showTimestamps,
  isEditing,
  hasTimestampData,
  isProcessing,
  toggleTimestampView,
  toggleEditMode,
}: TranscriptionModeToggleProps) => {
  return (
    <>
      {hasTimestampData && (
        <Button
          type="button"
          size="icon"
          variant={showTimestamps ? "default" : "ghost"}
          onClick={toggleTimestampView}
          disabled={isProcessing}
          className={`hover:bg-primary/10 transition-colors ${showTimestamps ? 'text-white bg-primary' : ''}`}
          aria-label={showTimestamps ? "Vista normal" : "Vista con timestamps"}
          title={showTimestamps ? "Vista normal" : "Vista con timestamps"}
        >
          <Clock className="h-4 w-4" />
        </Button>
      )}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={toggleEditMode}
        disabled={isProcessing || showTimestamps}
        className="hover:bg-primary/10 transition-colors"
        aria-label={isEditing ? "Finalizar edición" : "Editar texto"}
        title={isEditing ? "Finalizar edición" : "Editar texto"}
      >
        {isEditing ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Edit className={`h-4 w-4 ${isEditing ? 'text-primary' : ''}`} />
        )}
      </Button>
    </>
  );
};

export default TranscriptionModeToggle;
