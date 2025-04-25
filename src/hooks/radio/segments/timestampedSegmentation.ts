import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer";
import { SentenceTimestamp } from "@/services/audio/transcriptionService";
import { extractHeadline, extractKeywords } from "../utils/segmentUtils";

/**
 * Create segments from AssemblyAI sentences with timestamps
 */
export const createSegmentsFromSentences = (
  sentences: SentenceTimestamp[], 
  fullText: string,
  audioDuration?: number,
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void
): boolean => {
  if (!onSegmentsReceived) return false;
  
  // Group sentences into target segments (ideally 3-6 segments)
  const totalSentences = sentences.length;
  const targetSegmentCount = Math.min(6, Math.max(3, Math.floor(totalSentences / 8)));
  const sentencesPerSegment = Math.ceil(totalSentences / targetSegmentCount);
  
  const segments: RadioNewsSegment[] = [];
  
  for (let i = 0; i < targetSegmentCount; i++) {
    const startIndex = i * sentencesPerSegment;
    const endIndex = Math.min((i + 1) * sentencesPerSegment, totalSentences);
    
    if (startIndex >= totalSentences) break;
    
    const segmentSentences = sentences.slice(startIndex, endIndex);
    
    if (segmentSentences.length === 0) continue;
    
    const segmentText = segmentSentences.map(s => s.text).join(' ');
    const startTime = segmentSentences[0].start;
    const endTime = segmentSentences[segmentSentences.length - 1].end;
    const headline = extractHeadline(segmentText);
    
    segments.push({
      headline: headline || `Segmento ${i + 1}`,
      text: segmentText,
      startTime: startTime,
      end: endTime,
      keywords: extractKeywords(segmentText)
    });
  }
  
  if (segments.length > 0) {
    // Log timestamps for debugging
    console.log("Generated segments from sentences with timestamps:", segments.map(s => ({
      headline: s.headline,
      startTime: s.startTime,
      end: s.end
    })));
    
    onSegmentsReceived(segments);
    return true;
  }
  
  return false;
};

/**
 * Create segments from word-level timestamps
 */
export const createSegmentsFromWords = (
  words: any[], 
  fullText: string,
  audioDuration?: number,
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void
): boolean => {
  if (!onSegmentsReceived || words.length < 10) return false;
  
  const totalDuration = audioDuration || (words[words.length - 1]?.end || 0);
  
  // Target 4-6 segments of roughly equal duration
  const targetSegmentCount = Math.min(6, Math.max(3, Math.ceil(totalDuration / 60000)));
  const targetDurationPerSegment = totalDuration / targetSegmentCount;
  
  const segments: RadioNewsSegment[] = [];
  let currentSegmentWords: any[] = [];
  let segmentStartTime = words[0].start;
  let segmentIndex = 0;
  
  // Group words into segments based on duration
  for (let i = 0; i < words.length; i++) {
    currentSegmentWords.push(words[i]);
    
    // Check if we've reached the target duration or end of words
    const currentWordEnd = words[i].end;
    const segmentDuration = currentWordEnd - segmentStartTime;
    
    // Create a segment if we've reached target duration or at a sentence boundary
    const isEndOfSentence = words[i].text.match(/[.!?]$/);
    const isLongEnough = segmentDuration >= targetDurationPerSegment * 0.8;
    
    if ((isEndOfSentence && isLongEnough) || segmentDuration >= targetDurationPerSegment || i === words.length - 1) {
      if (currentSegmentWords.length > 5) {
        const segmentText = currentSegmentWords.map(w => w.text).join(' ');
        const headline = extractHeadline(segmentText);
        
        segments.push({
          headline: headline || `Segmento ${segmentIndex + 1}`,
          text: segmentText,
          startTime: segmentStartTime,
          end: currentWordEnd,
          keywords: extractKeywords(segmentText)
        });
        
        segmentIndex++;
        segmentStartTime = i < words.length - 1 ? words[i + 1].start : currentWordEnd;
        currentSegmentWords = [];
      }
    }
  }
  
  if (segments.length > 0) {
    // Log timestamps for debugging
    console.log("Generated segments from words with timestamps:", segments.map(s => ({
      headline: s.headline,
      startTime: s.startTime,
      end: s.end
    })));
    
    onSegmentsReceived(segments);
    return true;
  }
  
  return false;
};

/**
 * Create segments from Whisper segments
 */
export const createSegmentsFromWhisperSegments = (
  whisperSegments: any[],
  fullText: string,
  audioDuration?: number,
  onSegmentsReceived?: (segments: RadioNewsSegment[]) => void
): boolean => {
  if (!onSegmentsReceived) return false;
  
  // Group Whisper segments to get 3-6 final segments
  const totalSegments = whisperSegments.length;
  const targetSegmentCount = Math.min(6, Math.max(3, Math.ceil(totalSegments / 8)));
  const whisperSegmentsPerSegment = Math.ceil(totalSegments / targetSegmentCount);
  
  const segments: RadioNewsSegment[] = [];
  
  for (let i = 0; i < targetSegmentCount; i++) {
    const startIndex = i * whisperSegmentsPerSegment;
    const endIndex = Math.min((i + 1) * whisperSegmentsPerSegment, totalSegments);
    
    if (startIndex >= totalSegments) break;
    
    const currentWhisperSegments = whisperSegments.slice(startIndex, endIndex);
    
    if (currentWhisperSegments.length === 0) continue;
    
    const segmentText = currentWhisperSegments.map(s => s.text).join(' ');
    // Make sure to convert seconds to milliseconds for consistency
    const startTime = Math.round(currentWhisperSegments[0].start * 1000);
    const endTime = Math.round(currentWhisperSegments[currentWhisperSegments.length - 1].end * 1000);
    const headline = extractHeadline(segmentText);
    
    segments.push({
      headline: headline || `Segmento ${i + 1}`,
      text: segmentText,
      startTime: startTime,
      end: endTime,
      keywords: extractKeywords(segmentText)
    });
  }
  
  if (segments.length > 0) {
    // Log timestamps for debugging
    console.log("Generated segments from Whisper with timestamps:", segments.map(s => ({
      headline: s.headline,
      startTime: s.startTime,
      end: s.end,
      from: "whisper"
    })));
    
    onSegmentsReceived(segments);
    return true;
  }
  
  return false;
};
