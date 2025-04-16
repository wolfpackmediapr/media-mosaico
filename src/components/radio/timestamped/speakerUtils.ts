
import { UtteranceTimestamp } from "@/services/audio/transcriptionService";
import { formatTime } from "./timeUtils";

/**
 * Format speaker utterance into readable format with timestamp
 */
export const formatSpeakerUtterance = (utterance: UtteranceTimestamp): string => {
  const timestamp = formatTime(utterance.start);
  return `SPEAKER ${utterance.speaker} (${timestamp}):\n${utterance.text}`;
};

/**
 * Format all utterances into a speaker-timestamped transcript
 */
export const formatSpeakerTranscript = (utterances: UtteranceTimestamp[]): string => {
  if (!utterances || utterances.length === 0) {
    return "";
  }
  
  return utterances
    .map(utterance => formatSpeakerUtterance(utterance))
    .join('\n\n');
};

/**
 * Convert regular transcript to speaker-based format if utterances are available
 */
export const getSpeakerFormattedText = (
  text: string, 
  utterances?: UtteranceTimestamp[]
): string => {
  if (!utterances || utterances.length === 0) {
    return text;
  }
  
  return formatSpeakerTranscript(utterances);
};
