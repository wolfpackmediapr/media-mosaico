
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
  const { getDisplayName, getCustomName, isLoading: speakerLabelsLoading } = useSpeakerLabels({ transcriptionId });

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

      // Extract actual speaker IDs from the transcription text to check for custom names
      const speakerPattern = /^SPEAKER\s+(\d+):/gm;
      const speakerMatches = [...transcriptionText.matchAll(speakerPattern)];
      const actualSpeakerIds = [...new Set(speakerMatches.map(match => match[1]))]; // Get unique speaker numbers
      
      // Check if we have any custom speaker names for the actual speakers in the text
      const hasCustomNames = transcriptionId && getCustomName && actualSpeakerIds.some(speakerNum => {
        // Try different formats that might be stored in the database
        const possibleIds = [
          String.fromCharCode(64 + parseInt(speakerNum)), // "1" -> "A", "2" -> "B"
          `SPEAKER_${speakerNum}`,
          `SPEAKER ${speakerNum}`,
          speakerNum,
          `speaker_${speakerNum}`
        ];
        return possibleIds.some(id => getCustomName(id) && !getCustomName(id).toLowerCase().includes('speaker'));
      });

      console.log('[TranscriptionCopyButton] Custom speaker names check:', {
        hasTranscriptionId: !!transcriptionId,
        hasGetCustomName: !!getCustomName,
        hasCustomNames,
        actualSpeakerIds,
        sampleCustomNames: actualSpeakerIds.map(id => ({ 
          speakerId: id, 
          customName: getCustomName?.(String.fromCharCode(64 + parseInt(id))) 
        }))
      });

      // Always attempt to format with custom names if we have the necessary data
      if (transcriptionId && getDisplayName && hasCustomNames) {
        console.log('[TranscriptionCopyButton] Formatting transcription with custom speaker names');
        textToCopy = formatTranscriptionWithSpeakerNames(
          transcriptionText,
          transcriptionResult,
          getDisplayName,
          speakerLabelsLoading
        );
      } else {
        console.log('[TranscriptionCopyButton] Using original text - no custom names available');
      }

      console.log('[TranscriptionCopyButton] Final text to copy length:', textToCopy.length);
      console.log('[TranscriptionCopyButton] Sample of final text:', textToCopy.substring(0, 300));

      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      
      // Provide more specific success message
      const hasAppliedCustomNames = textToCopy !== transcriptionText;
      const message = hasAppliedCustomNames 
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
