
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSpeakerLabels } from "@/hooks/radio/useSpeakerLabels";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { formatTranscriptionWithSpeakerNames } from "@/components/radio/utils/speakerLabelUtils";

interface TranscriptionCopyButtonProps {
  transcriptionText: string;
  transcriptionResult?: TranscriptionResult;
  transcriptionId?: string;
  isProcessing: boolean;
}

const TranscriptionCopyButton: React.FC<TranscriptionCopyButtonProps> = ({
  transcriptionText,
  transcriptionResult,
  transcriptionId,
  isProcessing
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const { getDisplayName, isLoading: speakerLabelsLoading } = useSpeakerLabels({ transcriptionId });

  // Enhanced validation for when the button should be disabled
  const isButtonDisabled = !transcriptionText || isProcessing || speakerLabelsLoading;

  const handleCopyText = async () => {
    try {
      console.log('[TranscriptionCopyButton] Starting copy operation', {
        hasTranscriptionText: !!transcriptionText,
        hasTranscriptionResult: !!transcriptionResult,
        hasTranscriptionId: !!transcriptionId,
        speakerLabelsLoading,
        utterancesCount: transcriptionResult?.utterances?.length || 0
      });

      // Wait a bit for speaker labels to load if they're still loading
      if (speakerLabelsLoading) {
        console.log('[TranscriptionCopyButton] Speaker labels still loading, waiting...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      let textToCopy = transcriptionText;

      // Always attempt to format with custom names if we have the necessary data
      if (transcriptionId && getDisplayName) {
        textToCopy = formatTranscriptionWithSpeakerNames(
          transcriptionText,
          transcriptionResult,
          getDisplayName,
          speakerLabelsLoading
        );
      } else {
        console.log('[TranscriptionCopyButton] Missing required data for custom formatting', {
          hasTranscriptionId: !!transcriptionId,
          hasGetDisplayName: !!getDisplayName
        });
      }

      console.log('[TranscriptionCopyButton] Final text to copy length:', textToCopy.length);
      console.log('[TranscriptionCopyButton] Sample of final text:', textToCopy.substring(0, 300));

      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      
      // Provide more specific success message
      const hasCustomNames = textToCopy !== transcriptionText;
      const message = hasCustomNames 
        ? "Transcripción copiada con nombres personalizados" 
        : "Transcripción copiada al portapapeles";
      
      toast.success(message);
      
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('[TranscriptionCopyButton] Failed to copy transcription:', error);
      toast.error("No se pudo copiar la transcripción. Intente de nuevo.");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleCopyText}
      disabled={isButtonDisabled}
      className="w-full sm:w-auto"
    >
      {speakerLabelsLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isCopied ? (
        <CheckCheck className="mr-2 h-4 w-4 text-green-500" />
      ) : (
        <Copy className="mr-2 h-4 w-4" />
      )}
      {speakerLabelsLoading ? 'Cargando...' : isCopied ? 'Copiado' : 'Copiar Transcripción'}
    </Button>
  );
};

export default TranscriptionCopyButton;
