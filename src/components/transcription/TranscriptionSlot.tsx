import { Card, CardContent } from "@/components/ui/card";
import TranscriptionMetadata from "./TranscriptionMetadata";
import TranscriptionEditor from "./TranscriptionEditor";
import TranscriptionActions from "./TranscriptionActions";

interface TranscriptionSlotProps {
  isProcessing: boolean;
  transcriptionText: string;
  metadata?: {
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
    keywords?: string[];
  };
  onTranscriptionChange: (text: string) => void;
}

const TranscriptionSlot = ({
  isProcessing,
  transcriptionText,
  metadata,
  onTranscriptionChange,
}: TranscriptionSlotProps) => {
  return (
    <Card className="mt-6">
      <TranscriptionMetadata metadata={metadata} />
      <CardContent className="space-y-4">
        <TranscriptionEditor
          transcriptionText={transcriptionText}
          isProcessing={isProcessing}
          onTranscriptionChange={onTranscriptionChange}
        />
        <TranscriptionActions
          transcriptionText={transcriptionText}
          metadata={metadata}
          isProcessing={isProcessing}
        />
      </CardContent>
    </Card>
  );
};

export default TranscriptionSlot;