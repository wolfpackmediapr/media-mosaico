
import { UtteranceTimestamp } from "@/services/audio/transcriptionService";

/**
 * Generate a consistent color for a speaker based on their ID
 */
export const getSpeakerColor = (speakerId: string | number): string => {
  // Use the canonical speaker letter / token as the hue seed for stable colors.
  let numericId: number;

  if (typeof speakerId === 'string') {
    // New format: "A|Name|Role" → use "A"
    const head = speakerId.split('|')[0];
    // Legacy format: "speaker_1_(Name)" → use the number after the underscore
    if (head.toLowerCase().startsWith('speaker_')) {
      const token = head.split('_')[1] || '';
      const num = parseInt(token, 10);
      numericId = Number.isNaN(num) ? token.charCodeAt(0) : num;
    } else {
      numericId = head.charCodeAt(0);
    }
  } else {
    numericId = speakerId;
  }
  
  // Use the numeric ID to generate a hue value (0-360)
  // Multiply by 137.5 (phi * 100) to get a good distribution
  const hue = (numericId * 137.5) % 360;
  
  // Use a consistent saturation and lightness for all speakers
  return `hsl(${hue}, 70%, 50%)`;
};

/**
 * Normalize timestamp to seconds consistently
 */
export const normalizeTimeToSeconds = (time: number): number => {
  // If time is clearly in milliseconds (> 10 hours worth of seconds = 36000),
  // then convert to seconds. This handles the edge case where values between
  // 60-1000 could be either seconds (for long videos) or milliseconds.
  if (time > 36000) {
    return time / 1000;
  }
  return time;
};

/**
 * Get a unique list of speakers from utterances
 */
export const getUniqueSpeakers = (utterances: UtteranceTimestamp[]): (string | number)[] => {
  if (!utterances || utterances.length === 0) return [];
  return Array.from(new Set(utterances.map(u => u.speaker))).sort();
};

/**
 * Format speaker name for display
 */
export const formatSpeakerName = (speakerId: string | number): string => {
  if (typeof speakerId === 'string') {
    // New TV format: "A|Name|Role"
    if (speakerId.includes('|')) {
      const [, name] = speakerId.split('|');
      if (name) return name.trim();
    }
    // Legacy TV format with embedded name
    const nameMatch = speakerId.match(/speaker_\w+_\(([^)]+)\)/i);
    if (nameMatch) return nameMatch[1].split(' - ')[0].trim();

    // Letter-only id → "Hablante A"
    if (/^[A-Z]$/i.test(speakerId)) return `Hablante ${speakerId.toUpperCase()}`;

    if (speakerId.toLowerCase().startsWith('speaker_')) {
      const token = speakerId.split('_')[1] || '';
      return `Hablante ${token.toUpperCase()}`;
    }
    return `Hablante ${speakerId}`;
  }
  return `Hablante ${speakerId}`;
};

/**
 * Find the active segment based on current time
 */
export const calculateCurrentSegment = (
  utterances: UtteranceTimestamp[], 
  currentTime: number
): UtteranceTimestamp | null => {
  if (!utterances || utterances.length === 0) return null;
  
  // Ensure time is in seconds for consistent comparison
  const timeInSeconds = normalizeTimeToSeconds(currentTime);
  
  // Find the utterance that contains the current time
  for (const utterance of utterances) {
    const start = normalizeTimeToSeconds(utterance.start);
    const end = normalizeTimeToSeconds(utterance.end);
    
    if (timeInSeconds >= start && timeInSeconds <= end) {
      return utterance;
    }
  }
  
  return null;
};
