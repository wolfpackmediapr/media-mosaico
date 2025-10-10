import { TranscriptionResult, UtteranceTimestamp } from "@/services/audio/transcriptionService";

/**
 * TV-SPECIFIC: Formats speaker utterances with Gemini names preserved
 * Format: SPEAKER X (Name): Name: dialogue
 */
export function formatTvSpeakerText(utterances: UtteranceTimestamp[]): string {
  if (!utterances || utterances.length === 0) return "";
  
  return utterances
    .map((u) => {
      // Extract numeric part if speaker comes as "speaker_1" format
      const speakerNum = typeof u.speaker === 'string' ? 
        u.speaker.includes('_') ? u.speaker.split('_')[1] : u.speaker 
        : u.speaker;
      
      // Check if text has a name prefix: "Name: dialogue"
      const nameMatch = u.text.match(/^([A-Za-zÁ-ÿ\s]+):\s/);
      
      if (nameMatch) {
        const name = nameMatch[1];
        // Reconstruct as: SPEAKER X (Name): Name: dialogue
        return `SPEAKER ${speakerNum} (${name}): ${u.text}`.trim();
      } else {
        // No name, simple format
        return `SPEAKER ${speakerNum}: ${u.text}`.trim();
      }
    })
    .join("\n\n");
}

/**
 * TV-SPECIFIC: Parses TV transcription text with Gemini names
 * Input: "SPEAKER X (Name): dialogue"
 * Output: utterance with text as "Name: dialogue" and speaker as "X"
 */
export function parseTvSpeakerTextToUtterances(text: string): UtteranceTimestamp[] {
  if (!text) return [];
  
  const utterances: UtteranceTimestamp[] = [];
  const lineMatches: string[] = text.split(/\n\s*\n/);

  lineMatches.forEach((line, index) => {
    // Match format: SPEAKER X or SPEAKER X (Name): text
    const prefixMatch = line.match(/^SPEAKER (\d+|[A-Z])(?:\s*\(([^)]+)\))?:\s*/);
    if (prefixMatch) {
      const speaker = prefixMatch[1];
      const geminiName = prefixMatch[2]; // Extract Gemini name like "Hombre"
      
      // Remove the SPEAKER prefix to get text
      let textOnly = line.replace(/^SPEAKER (\d+|[A-Z])(?:\s*\(([^)]+)\))?:\s*/, "");
      
      // If Gemini name exists, prepend it to the text as "Name: text"
      if (geminiName && !textOnly.startsWith(geminiName + ':')) {
        textOnly = `${geminiName}: ${textOnly}`;
      }
      
      // For reconstructed utterances, add dummy timestamps based on index
      utterances.push({
        speaker,
        text: textOnly, // Text now includes name prefix if available
        start: index * 5000, // 5 seconds per segment as placeholder
        end: (index + 1) * 5000,
      });
    } else if (line.trim()) {
      // Handle text without speaker prefix
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
 * TV-SPECIFIC: Formats plain text as speaker format
 */
export function formatPlainTextAsTvSpeaker(text: string): string {
  if (!text) return "";
  
  // If the text already contains speaker labels, return as is
  if (text.match(/^SPEAKER \d+:/m)) {
    return text;
  }
  
  // Otherwise, split by paragraphs and format as if from a single speaker
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  
  if (paragraphs.length === 0) {
    return "SPEAKER 1: " + text.trim();
  }
  
  return paragraphs.map(p => "SPEAKER 1: " + p.trim()).join("\n\n");
}
