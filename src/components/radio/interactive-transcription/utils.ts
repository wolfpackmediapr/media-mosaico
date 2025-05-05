
import { UtteranceTimestamp } from "@/services/audio/transcriptionService";

/**
 * Calculate which segment should be active based on the current playback time
 * 
 * @param utterances Array of utterances with timestamps
 * @param currentTime Current audio playback time in seconds
 * @returns The active utterance or null if none matches
 */
export const calculateCurrentSegment = (
  utterances: UtteranceTimestamp[],
  currentTime: number
): UtteranceTimestamp | null => {
  if (!utterances || utterances.length === 0) {
    console.log('[calculateCurrentSegment] No utterances available');
    return null;
  }

  // Make sure currentTime is in seconds
  let timeInSeconds = currentTime;
  
  // Log input for debugging
  console.log(`[calculateCurrentSegment] Finding segment at ${timeInSeconds.toFixed(2)}s in ${utterances.length} utterances`);
  
  // Find the utterance that contains the current time
  const currentUtterance = utterances.find(utterance => {
    // Ensure utterance times are in seconds (some may be in milliseconds)
    const startTime = utterance.start > 1000 ? utterance.start / 1000 : utterance.start;
    const endTime = utterance.end > 1000 ? utterance.end / 1000 : utterance.end;
    
    // Check if current time falls within this utterance's range
    const isWithinRange = timeInSeconds >= startTime && timeInSeconds <= endTime;
    
    if (isWithinRange) {
      console.log(`[calculateCurrentSegment] Found segment: ${startTime.toFixed(2)}s to ${endTime.toFixed(2)}s`);
    }
    
    return isWithinRange;
  });

  if (currentUtterance) {
    return currentUtterance;
  }

  // If we didn't find a direct match, find the closest upcoming utterance
  // This helps when we're in a gap between utterances
  const upcomingUtterances = utterances
    .filter(utterance => {
      const startTime = utterance.start > 1000 ? utterance.start / 1000 : utterance.start;
      return startTime > timeInSeconds;
    })
    .sort((a, b) => {
      const aStart = a.start > 1000 ? a.start / 1000 : a.start;
      const bStart = b.start > 1000 ? b.start / 1000 : b.start;
      return aStart - bStart;
    });

  if (upcomingUtterances.length > 0) {
    const nextUtterance = upcomingUtterances[0];
    const startTime = nextUtterance.start > 1000 ? nextUtterance.start / 1000 : nextUtterance.start;
    
    // If the next utterance is very close (within 1 second), consider it current
    if (startTime - timeInSeconds < 1.0) {
      console.log(`[calculateCurrentSegment] Using upcoming segment starting at ${startTime.toFixed(2)}s (in ${(startTime - timeInSeconds).toFixed(2)}s)`);
      return nextUtterance;
    }
  }

  // If no current or upcoming utterance is found, find the most recent past utterance
  const pastUtterances = utterances
    .filter(utterance => {
      const endTime = utterance.end > 1000 ? utterance.end / 1000 : utterance.end;
      return endTime < timeInSeconds;
    })
    .sort((a, b) => {
      const aEnd = a.end > 1000 ? a.end / 1000 : a.end;
      const bEnd = b.end > 1000 ? b.end / 1000 : b.end;
      return bEnd - aEnd; // Sort descending to get the most recent
    });

  if (pastUtterances.length > 0) {
    const lastUtterance = pastUtterances[0];
    const endTime = lastUtterance.end > 1000 ? lastUtterance.end / 1000 : lastUtterance.end;
    
    // If the last utterance ended very recently (within 2 seconds), consider it current
    if (timeInSeconds - endTime < 2.0) {
      console.log(`[calculateCurrentSegment] Using recent past segment ending at ${endTime.toFixed(2)}s (${(timeInSeconds - endTime).toFixed(2)}s ago)`);
      return lastUtterance;
    }
  }

  console.log(`[calculateCurrentSegment] No suitable segment found at ${timeInSeconds.toFixed(2)}s`);
  return null;
};
