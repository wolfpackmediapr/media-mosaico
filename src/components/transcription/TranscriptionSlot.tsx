import { Card, CardContent } from "@/components/ui/card";
import TranscriptionMetadata from "./TranscriptionMetadata";
import TranscriptionEditor from "./TranscriptionEditor";
import TranscriptionActions from "./TranscriptionActions";
import TranscriptionAnalysis from "./TranscriptionAnalysis";

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
  analysis?: {
    quien?: string;
    que?: string;
    cuando?: string;
    donde?: string;
    porque?: string;
    summary?: string;
    alerts?: any[];
    keywords?: string[];
  };
  onTranscriptionChange: (text: string) => void;
}

const TranscriptionSlot = ({
  isProcessing,
  transcriptionText,
  metadata,
  analysis,
  onTranscriptionChange,
}: TranscriptionSlotProps) => {
  return (
    <div className="space-y-6">
      <Card>
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
      <TranscriptionAnalysis analysis={analysis} />
    </div>
  );
};

export default TranscriptionSlot;