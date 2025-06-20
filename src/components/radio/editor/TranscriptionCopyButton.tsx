
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { useSpeakerLabels } from "@/hooks/radio/useSpeakerLabels";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface TranscriptionCopyButtonProps {
  transcriptionText: string;
  transcriptionResult?: TranscriptionResult;
  transcriptionId?: string;
  isProcessing: boolean;
}

const formatTranscriptionWithCustomNames = (
  text: string,
  transcriptionResult?: TranscriptionResult,
  getDisplayName?: (speaker: string) => string
): string => {
  if (!transcriptionResult?.utterances || !getDisplayName) {
    return text;
  }

  // If we have utterances, format each one with custom speaker names
  return transcriptionResult.utterances
    .map(utterance => {
      const customName = getDisplayName(utterance.speaker);
      return `${customName}: ${utterance.text}`;
    })
    .join('\n\n');
};

const TranscriptionCopyButton: React.FC<TranscriptionCopyButtonProps> = ({
  transcriptionText,
  transcriptionResult,
  transcriptionId,
  isProcessing
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const { getDisplayName } = useSpeakerLabels({ transcriptionId });

  const handleCopyText = async () => {
    try {
      let textToCopy = transcriptionText;

      // If we have utterances and transcriptionId, format with custom names
      if (transcriptionResult?.utterances && transcriptionId) {
        textToCopy = formatTranscriptionWithCustomNames(
          transcriptionText,
          transcriptionResult,
          getDisplayName
        );
      }

      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      toast.success("Transcripción copiada al portapapeles");
      
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy transcription:', error);
      toast.error("No se pudo copiar la transcripción. Intente de nuevo.");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleCopyText}
      disabled={!transcriptionText || isProcessing}
      className="w-full sm:w-auto"
    >
      {isCopied ? (
        <CheckCheck className="mr-2 h-4 w-4 text-green-500" />
      ) : (
        <Copy className="mr-2 h-4 w-4" />
      )}
      {isCopied ? 'Copiado' : 'Copiar Transcripción'}
    </Button>
  );
};

export default TranscriptionCopyButton;
