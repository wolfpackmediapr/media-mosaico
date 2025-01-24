import { Card, CardContent } from "@/components/ui/card";
import TranscriptionMetadata from "./TranscriptionMetadata";
import TranscriptionEditor from "./TranscriptionEditor";
import TranscriptionActions from "./TranscriptionActions";
import { useEffect } from "react";

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
  formId?: string;
}

const TranscriptionSlot = ({
  isProcessing,
  transcriptionText,
  metadata,
  onTranscriptionChange,
  formId,
}: TranscriptionSlotProps) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//embed.typeform.com/next/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

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
      
      {formId && (
        <Card className="p-4">
          <div 
            data-tf-live={formId}
            className="w-full min-h-[500px]"
          />
        </Card>
      )}
    </div>
  );
};

export default TranscriptionSlot;