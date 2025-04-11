
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { createSegmentsFromSentences, createSegmentsFromWords, createSegmentsFromWhisperSegments } from "./timestampedSegmentation";
import { createSegmentsFromTextChunks, createLengthBasedSegments } from "./textBasedSegmentation";

/**
 * Generate radio segments from transcription data
 */
export const generateRadioSegments = (
  transcriptionResult: TranscriptionResult | string,
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void
) => {
  // Return early if no result, no callback, or text too short
  if (!transcriptionResult || !onSegmentsReceived) return;
  
  const text = typeof transcriptionResult === 'string' ? transcriptionResult : transcriptionResult.text;
  
  // If text is too short, don't process
  if (!text || text.length < 100) return;
  
  console.log("Starting segment generation process");
  
  // If we have a TranscriptionResult object with timestamps, use that
  if (typeof transcriptionResult !== 'string') {
    // APPROACH 1: Use sentence-level timestamps if available
    if (transcriptionResult.sentences && transcriptionResult.sentences.length >= 2) {
      console.log(`Using ${transcriptionResult.sentences.length} sentences with timestamps`);
      if (createSegmentsFromSentences(transcriptionResult.sentences, text, transcriptionResult.audio_duration, onSegmentsReceived)) {
        return;
      }
    }
    
    // APPROACH 2: Use word-level timestamps if available to create clustered segments
    if (transcriptionResult.words && transcriptionResult.words.length > 0) {
      console.log(`Using ${transcriptionResult.words.length} words with timestamps to create segments`);
      if (createSegmentsFromWords(transcriptionResult.words, text, transcriptionResult.audio_duration, onSegmentsReceived)) {
        return;
      }
    }
    
    // APPROACH 3: Use Whisper segments if available
    if (transcriptionResult.segments && transcriptionResult.segments.length >= 2) {
      console.log(`Using ${transcriptionResult.segments.length} Whisper segments`);
      if (createSegmentsFromWhisperSegments(transcriptionResult.segments, text, transcriptionResult.audio_duration, onSegmentsReceived)) {
        return;
      }
    }
  }
  
  // Fallback to text-based segmentation approaches

  // APPROACH 4: Try natural sentence splitting
  const naturalSegments = text.split(/(?:\.\s+)(?=[A-Z])/g)
    .filter(seg => seg.trim().length > 100);
    
  if (naturalSegments.length >= 2) {
    console.log(`Found ${naturalSegments.length} natural segments`);
    if (createSegmentsFromTextChunks(naturalSegments, onSegmentsReceived)) {
      return;
    }
  }
  
  // APPROACH 5: Try paragraph splitting
  const paragraphs = text.split(/\n\s*\n/)
    .filter(p => p.trim().length > 50);
    
  if (paragraphs.length >= 2) {
    console.log(`Found ${paragraphs.length} paragraph segments`);
    if (createSegmentsFromTextChunks(paragraphs, onSegmentsReceived)) {
      return;
    }
  }
  
  // APPROACH 6: Last resort - create evenly sized segments
  createLengthBasedSegments(text, onSegmentsReceived);
};
