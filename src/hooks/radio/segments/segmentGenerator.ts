
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { createSegmentsFromText } from "./textBasedSegmentation";
import { createSegmentsFromSentences, createSegmentsFromWords, createSegmentsFromWhisperSegments } from "./timestampedSegmentation";

/**
 * Generate radio segments from transcription, using timestamps if available
 */
export const generateRadioSegments = (
  transcriptionData: TranscriptionResult | string,
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void
): boolean => {
  if (!onSegmentsReceived) return false;
  
  // Log what we're using for segmentation
  console.log("Generating segments from:", 
    typeof transcriptionData === 'string' ? 'Text only' : 'Transcription result with timestamps');
  
  // If we have a TranscriptionResult with timestamps, use them
  if (typeof transcriptionData !== 'string') {
    const result = transcriptionData;
    const text = result.text || '';
    
    // Try different timestamp data sources in order of preference
    
    // 1. First try with sentences (best user experience)
    if (result.sentences && result.sentences.length > 0) {
      console.log(`Using ${result.sentences.length} sentences with timestamps`);
      if (createSegmentsFromSentences(result.sentences, text, result.audio_duration, onSegmentsReceived)) {
        return true;
      }
    }
    
    // 2. Then try with whisper segments if available
    if (result.segments && result.segments.length > 0) {
      console.log(`Using ${result.segments.length} Whisper segments with timestamps`);
      if (createSegmentsFromWhisperSegments(result.segments, text, result.audio_duration, onSegmentsReceived)) {
        return true;
      }
    }
    
    // 3. Then try with individual words
    if (result.words && result.words.length > 0) {
      console.log(`Using ${result.words.length} words with timestamps`);
      if (createSegmentsFromWords(result.words, text, result.audio_duration, onSegmentsReceived)) {
        return true;
      }
    }
    
    // 4. Fallback to text-based segmentation using the full text
    console.log(`Falling back to text-based segmentation with ${text.length} chars`);
    return createSegmentsFromText(text, onSegmentsReceived);
  }
  
  // Simple text-based segmentation for string input
  return createSegmentsFromText(transcriptionData, onSegmentsReceived);
};
