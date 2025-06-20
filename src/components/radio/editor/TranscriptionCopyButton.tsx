
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSpeakerLabels } from "@/hooks/radio/useSpeakerLabels";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface TranscriptionCopyButtonProps {
  transcriptionText: string;
  transcriptionResult?: TranscriptionResult;
  transcriptionId?: string;
  isProcessing: boolean;
}

// Enhanced formatting function that handles both utterances and plain text
const formatTranscriptionWithCustomNames = (
  text: string,
  transcriptionResult?: TranscriptionResult,
  getDisplayName?: (speaker: string) => string,
  isLoading?: boolean
): string => {
  console.log('[TranscriptionCopyButton] Formatting with custom names', {
    hasUtterances: !!transcriptionResult?.utterances,
    utterancesCount: transcriptionResult?.utterances?.length || 0,
    hasGetDisplayName: !!getDisplayName,
    isLoading,
    textLength: text.length
  });

  // If speaker labels are still loading, use original text
  if (isLoading) {
    console.log('[TranscriptionCopyButton] Speaker labels still loading, using original text');
    return text;
  }

  // If we have utterances and display name function, format with custom names
  if (transcriptionResult?.utterances && transcriptionResult.utterances.length > 0 && getDisplayName) {
    console.log('[TranscriptionCopyButton] Using utterances for formatting');
    const formattedText = transcriptionResult.utterances
      .map((utterance, index) => {
        const customName = getDisplayName(utterance.speaker);
        console.log(`[TranscriptionCopyButton] Utterance ${index}: speaker=${utterance.speaker}, customName=${customName}`);
        return `${customName}: ${utterance.text}`;
      })
      .join('\n\n');
    
    console.log('[TranscriptionCopyButton] Formatted text with utterances:', formattedText.substring(0, 200) + '...');
    return formattedText;
  }

  // If no utterances but we have plain text and display name function, try to format plain text
  if (text && getDisplayName) {
    console.log('[TranscriptionCopyButton] Attempting to format plain text with speaker names');
    
    // Split text into paragraphs to process line by line
    let formattedText = text;
    let foundSpeakers = false;
    
    // Enhanced regex to match "SPEAKER X:" format (the format used in our transcriptions)
    const speakerPattern = /^(SPEAKER\s+(\d+)):\s*/gmi;
    
    // Find all speaker matches first to understand the mapping
    const speakerMatches = [...text.matchAll(speakerPattern)];
    
    if (speakerMatches.length > 0) {
      foundSpeakers = true;
      console.log(`[TranscriptionCopyButton] Found ${speakerMatches.length} speaker instances`);
      
      // Create a map of replacements to avoid multiple replacements of the same text
      const replacements = new Map<string, string>();
      
      speakerMatches.forEach(match => {
        const fullMatch = match[1]; // "SPEAKER 1", "SPEAKER 2", etc.
        const speakerNumber = match[2]; // "1", "2", etc.
        
        // Try different speaker ID formats that might be stored in the database
        const possibleSpeakerIds = [
          `SPEAKER_${speakerNumber}`, // Format like "SPEAKER_1"
          `SPEAKER ${speakerNumber}`,  // Format like "SPEAKER 1"
          speakerNumber,               // Just the number "1"
          `speaker_${speakerNumber}`,  // Lowercase variant
        ];
        
        let customName = null;
        
        // Try each possible format to find a custom name
        for (const speakerId of possibleSpeakerIds) {
          const testName = getDisplayName(speakerId);
          // Check if we got a custom name (not the default formatted name)
          if (testName && !testName.includes('Speaker ')) {
            customName = testName;
            console.log(`[TranscriptionCopyButton] Found custom name for ${speakerId}: ${customName}`);
            break;
          }
        }
        
        // If no custom name found, try the getDisplayName with the full match
        if (!customName) {
          customName = getDisplayName(`SPEAKER_${speakerNumber}`);
        }
        
        // Store the replacement
        if (customName && !replacements.has(fullMatch)) {
          replacements.set(fullMatch, customName);
          console.log(`[TranscriptionCopyButton] Will replace "${fullMatch}" with "${customName}"`);
        }
      });
      
      // Apply all replacements
      replacements.forEach((customName, originalSpeaker) => {
        // Use word boundary to ensure we only replace speaker labels, not text content
        const replacePattern = new RegExp(`^${originalSpeaker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`, 'gmi');
        formattedText = formattedText.replace(replacePattern, `${customName}:`);
      });
    }
    
    if (foundSpeakers) {
      console.log('[TranscriptionCopyButton] Successfully formatted plain text with custom names');
      return formattedText;
    }
  }

  console.log('[TranscriptionCopyButton] Using original text as fallback');
  return text;
};

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
        textToCopy = formatTranscriptionWithCustomNames(
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
