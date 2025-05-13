
import { TranscriptionResult, UtteranceTimestamp } from "@/services/audio/transcriptionService";
import { formatSpeakerText, parseSpeakerTextToUtterances } from "@/components/radio/utils/speakerTextUtils";

/**
 * Check if a transcription contains speaker data
 */
export const hasSpeakerData = (transcription?: TranscriptionResult): boolean => {
  return !!(transcription?.utterances && transcription.utterances.length > 0);
};

/**
 * Ensure transcription has consistent formatting
 */
export const ensureConsistentFormatting = (
  transcriptionText: string,
  transcriptionResult?: TranscriptionResult,
  onTranscriptionChange?: (text: string) => void
): string => {
  if (hasSpeakerData(transcriptionResult)) {
    // Format the text with speaker labels if available
    const formattedText = formatSpeakerText(transcriptionResult!.utterances!);
    
    if (formattedText && formattedText !== transcriptionText && onTranscriptionChange) {
      // Update the transcription text if it's not already formatted
      onTranscriptionChange(formattedText);
      return formattedText;
    }
  }
  
  return transcriptionText;
};

/**
 * Calculate the active utterance index based on current playback time
 */
export const getActiveUtteranceIndex = (
  utterances: UtteranceTimestamp[],
  currentTimeSeconds: number
): number => {
  if (!utterances || utterances.length === 0 || !currentTimeSeconds) {
    return -1;
  }
  
  return utterances.findIndex(
    (u) => currentTimeSeconds >= u.start / 1000 && currentTimeSeconds <= u.end / 1000
  );
};

/**
 * Generate an enhanced transcription result from plain text with speaker formatting
 */
export const enhanceTranscriptionFromText = (
  text: string,
  existingResult?: TranscriptionResult
): TranscriptionResult | undefined => {
  if (!text) return existingResult;
  
  const parsedUtterances = parseSpeakerTextToUtterances(text);
  
  if (parsedUtterances.length > 0) {
    return {
      ...(existingResult || {}),
      text,
      utterances: parsedUtterances
    } as TranscriptionResult;
  }
  
  return existingResult;
};
