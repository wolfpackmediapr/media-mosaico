
import { Textarea } from "@/components/ui/textarea";

interface TranscriptionTextAreaProps {
  text: string;
  isProcessing: boolean;
  isEditing: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onClick?: () => void;
}

const TranscriptionTextArea = ({
  text,
  isProcessing,
  isEditing,
  onChange,
  onClick,
}: TranscriptionTextAreaProps) => {
  return (
    <Textarea
      placeholder="Aquí aparecerá el texto transcrito..."
      className={`min-h-[200px] resize-y pr-12 ${isEditing ? 'border-primary' : ''} focus:border-primary focus-visible:ring-1`}
      value={text}
      onChange={onChange}
      readOnly={isProcessing || !isEditing}
      onClick={onClick}
    />
  );
};

export default TranscriptionTextArea;
