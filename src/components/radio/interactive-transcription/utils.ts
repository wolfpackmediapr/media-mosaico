
import { UtteranceTimestamp } from "@/services/audio/transcriptionService";

// Optimized function to calculate the current segment with improved accuracy
export const calculateCurrentSegment = (
  utterances: UtteranceTimestamp[],
  currentTime: number
): UtteranceTimestamp | null => {
  // Edge case: no utterances
  if (!utterances || utterances.length === 0) return null;
  
  // Edge case: before first segment
  if (currentTime < utterances[0].start) return null;
  
  // Edge case: after last segment
  const lastUtterance = utterances[utterances.length - 1];
  if (currentTime > lastUtterance.end + 1) return null;
  
  // Binary search for more efficient segment finding
  // Much faster than linear search for large transcriptions
  let low = 0;
  let high = utterances.length - 1;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const segment = utterances[mid];
    
    // Check if currentTime is within this segment's range (with small buffer)
    // Allow small 0.2s buffer at the end to avoid gaps between segments
    if (currentTime >= segment.start && currentTime <= segment.end + 0.2) {
      return segment;
    }
    
    // If currentTime is before this segment
    if (currentTime < segment.start) {
      high = mid - 1;
    } else {
      // If currentTime is after this segment
      low = mid + 1;
    }
  }
  
  // If we didn't find an exact match, return the last segment
  // that starts before currentTime
  for (let i = utterances.length - 1; i >= 0; i--) {
    if (utterances[i].start <= currentTime) {
      return utterances[i];
    }
  }
  
  return null;
};

// Color palette for speakers
const SPEAKER_COLORS = [
  "#4E79A7", "#F28E2B", "#E15759", "#76B7B2", 
  "#59A14F", "#EDC948", "#B07AA1", "#FF9DA7",
  "#9C755F", "#BAB0AC", "#2E8A99", "#7A6F9B"
];

// Get consistent color for a speaker
export const getSpeakerColor = (speakerId: string | number): string => {
  let id = "";
  
  if (typeof speakerId === 'string') {
    // Extract numeric portion if format is "speaker_X"
    const match = speakerId.match(/(\d+)$/);
    id = match ? match[1] : speakerId;
  } else {
    id = String(speakerId);
  }
  
  // Convert the id to a number for color selection
  let numericId = 0;
  for (let i = 0; i < id.length; i++) {
    numericId += id.charCodeAt(i);
  }
  
  // Use modulo to get a consistent color from the palette
  return SPEAKER_COLORS[numericId % SPEAKER_COLORS.length];
};
