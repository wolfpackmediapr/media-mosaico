
import { TranscriptionResult, UtteranceTimestamp } from "@/services/audio/transcriptionService";

/**
 * Formats the speaker utterances into a single text block, with optional custom names
 */
export function formatSpeakerText(
  utterances: UtteranceTimestamp[], 
  speakerLabels?: Record<string, string>
): string {
  if (!utterances || utterances.length === 0) return "";
  
  return utterances
    .map((u) => {
      // Extract numeric part if speaker comes as "speaker_1" format from AssemblyAI
      const speakerNum = typeof u.speaker === 'string' ? 
        u.speaker.includes('_') ? u.speaker.split('_')[1] : u.speaker 
        : u.speaker;
      
      const originalSpeaker = `SPEAKER ${speakerNum}`;
      const displayName = speakerLabels?.[originalSpeaker] || originalSpeaker;
      
      return `${displayName}: ${u.text}`.trim();
    })
    .join("\n\n");
}

/**
 * Attempts to parse an edited speaker-annotated text back to utterances.
 * This supports both original and custom speaker names
 */
export function parseSpeakerTextToUtterances(
  text: string,
  speakerLabels?: Record<string, string>
): UtteranceTimestamp[] {
  if (!text) return [];
  
  // Create reverse mapping from custom names to original speakers
  const reverseLabels: Record<string, string> = {};
  if (speakerLabels) {
    Object.entries(speakerLabels).forEach(([original, custom]) => {
      reverseLabels[custom] = original;
    });
  }
  
  const utterances: UtteranceTimestamp[] = [];
  const lineMatches: string[] = text.split(/\n\s*\n/);

  lineMatches.forEach((line, index) => {
    // Try to match custom speaker names first, then original format
    let speakerMatch = null;
    let textOnly = line;
    
    // Check for custom speaker names
    for (const [customName, originalName] of Object.entries(reverseLabels)) {
      const customPattern = new RegExp(`^${escapeRegExp(customName)}:\\s*`, 'i');
      if (customPattern.test(line)) {
        const originalSpeaker = originalName.replace('SPEAKER ', '');
        speakerMatch = originalSpeaker;
        textOnly = line.replace(customPattern, '');
        break;
      }
    }
    
    // If no custom match, try original SPEAKER X: format
    if (!speakerMatch) {
      const originalMatch = line.match(/^SPEAKER (\d+|[A-Z]):\s*/);
      if (originalMatch) {
        speakerMatch = originalMatch[1];
        textOnly = line.replace(/^SPEAKER (\d+|[A-Z]):\s*/, "");
      }
    }
    
    if (speakerMatch && textOnly.trim()) {
      utterances.push({
        speaker: speakerMatch,
        text: textOnly.trim(),
        start: index * 5000, // 5 seconds per segment as placeholder
        end: (index + 1) * 5000,
      });
    } else if (line.trim()) {
      // Handle text without speaker prefix - assign to "unknown" speaker
      utterances.push({
        speaker: "0",
        text: line.trim(),
        start: index * 5000,
        end: (index + 1) * 5000,
      });
    }
  });

  return utterances;
}

/**
 * Parses plain text into speaker format if it doesn't have speaker labels already
 */
export function formatPlainTextAsSpeaker(text: string): string {
  if (!text) return "";
  
  // If the text already contains speaker labels, return as is
  if (text.match(/^SPEAKER \d+:/m) || text.match(/^[A-Z][^:]*:/m)) {
    return text;
  }
  
  // Otherwise, split by paragraphs and format as if from a single speaker
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  
  if (paragraphs.length === 0) {
    return "SPEAKER 1: " + text.trim();
  }
  
  return paragraphs.map(p => "SPEAKER 1: " + p.trim()).join("\n\n");
}

/**
 * Helper function to escape special regex characters
 */
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Apply custom speaker names to formatted text
 */
export function applySpeakerLabelsToText(
  text: string, 
  speakerLabels: Record<string, string>
): string {
  if (!text || !speakerLabels || Object.keys(speakerLabels).length === 0) {
    return text;
  }
  
  let updatedText = text;
  
  // Replace each occurrence of original speaker names with custom names
  Object.entries(speakerLabels).forEach(([originalSpeaker, customName]) => {
    const regex = new RegExp(`^${escapeRegExp(originalSpeaker)}:`, 'gm');
    updatedText = updatedText.replace(regex, `${customName}:`);
  });
  
  return updatedText;
}
