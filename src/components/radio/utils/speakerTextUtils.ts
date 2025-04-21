
import { TranscriptionResult, UtteranceTimestamp } from "@/services/audio/transcriptionService";

/**
 * Formats the speaker utterances into a single text block, i.e.
 * SPEAKER 1: <text>
 * SPEAKER 2: <text>
 * ...
 */
export function formatSpeakerText(utterances: UtteranceTimestamp[]): string {
  if (!utterances || utterances.length === 0) return "";
  return utterances
    .map(
      (u) =>
        `SPEAKER ${u.speaker}: ${u.text}`.trim()
    )
    .join("\n\n");
}

/**
 * Attempts to parse an edited speaker-annotated text back to utterances.
 * This only supports a simple format where each utterance starts with "SPEAKER X:"
 */
export function parseSpeakerTextToUtterances(text: string): UtteranceTimestamp[] {
  // Uses RegExp to find all utterances
  const utteranceRegex = /^SPEAKER (\d+)\:(.*)$/gm;
  const utterances: UtteranceTimestamp[] = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let lineMatches: string[] = text.split(/\n\s*\n/);

  lineMatches.forEach((line) => {
    // Match the format SPEAKER X: text
    const prefixMatch = line.match(/^SPEAKER (\d+):\s*/);
    if (prefixMatch) {
      const speaker = prefixMatch[1];
      const textOnly = line.replace(/^SPEAKER (\d+):\s*/, "");
      // No start/end/other data as it's only editable, purely for display/editing
      utterances.push({
        speaker,
        text: textOnly,
        start: 0,
        end: 0,
      });
    }
  });

  return utterances;
}
