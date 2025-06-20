
import { TranscriptionResult } from "@/services/audio/transcriptionService";

/**
 * Formats transcription text with custom speaker names
 */
export const formatTranscriptionWithSpeakerNames = (
  text: string,
  transcriptionResult?: TranscriptionResult,
  getDisplayName?: (speaker: string) => string,
  isLoading?: boolean
): string => {
  console.log('[speakerLabelUtils] Formatting with custom names', {
    hasUtterances: !!transcriptionResult?.utterances,
    utterancesCount: transcriptionResult?.utterances?.length || 0,
    hasGetDisplayName: !!getDisplayName,
    isLoading,
    textLength: text.length
  });

  // If speaker labels are still loading, use original text
  if (isLoading) {
    console.log('[speakerLabelUtils] Speaker labels still loading, using original text');
    return text;
  }

  // If we have utterances and display name function, format with custom names
  if (transcriptionResult?.utterances && transcriptionResult.utterances.length > 0 && getDisplayName) {
    console.log('[speakerLabelUtils] Using utterances for formatting');
    const formattedText = transcriptionResult.utterances
      .map((utterance, index) => {
        const customName = getDisplayName(utterance.speaker);
        console.log(`[speakerLabelUtils] Utterance ${index}: speaker=${utterance.speaker}, customName=${customName}`);
        return `${customName}: ${utterance.text}`;
      })
      .join('\n\n');
    
    console.log('[speakerLabelUtils] Formatted text with utterances:', formattedText.substring(0, 200) + '...');
    return formattedText;
  }

  // If no utterances but we have plain text and display name function, try to format plain text
  if (text && getDisplayName) {
    console.log('[speakerLabelUtils] Attempting to format plain text with speaker names');
    
    let formattedText = text;
    let foundSpeakers = false;
    
    // Enhanced regex to match "SPEAKER X:" format (the format used in our transcriptions)
    const speakerPattern = /^(SPEAKER\s+(\d+)):\s*/gmi;
    
    // Find all speaker matches first to understand the mapping
    const speakerMatches = [...text.matchAll(speakerPattern)];
    
    if (speakerMatches.length > 0) {
      foundSpeakers = true;
      console.log(`[speakerLabelUtils] Found ${speakerMatches.length} speaker instances`);
      
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
            console.log(`[speakerLabelUtils] Found custom name for ${speakerId}: ${customName}`);
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
          console.log(`[speakerLabelUtils] Will replace "${fullMatch}" with "${customName}"`);
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
      console.log('[speakerLabelUtils] Successfully formatted plain text with custom names');
      return formattedText;
    }
  }

  console.log('[speakerLabelUtils] Using original text as fallback');
  return text;
};
