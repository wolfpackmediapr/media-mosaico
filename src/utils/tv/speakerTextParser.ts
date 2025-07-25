import { UtteranceTimestamp } from "@/services/audio/transcriptionService";

/**
 * Parse TV-specific speaker-formatted text into structured utterances
 * Handles format like: "SPEAKER 1: SECRETARIA DESIGNADA DE EDUCACIÓN: [text]"
 */
export function parseTvSpeakerText(text: string): UtteranceTimestamp[] {
  if (!text || !text.trim()) return [];

  const utterances: UtteranceTimestamp[] = [];
  
  // Split by double newlines to get separate utterances
  const segments = text.split(/\n\s*\n/).filter(segment => segment.trim());
  
  let currentTime = 0;
  const averageSegmentDuration = 5000; // 5 seconds per segment as placeholder
  
  // Track unique speakers for dynamic assignment
  const speakerMap = new Map<string, string>();
  let speakerCounter = 1;
  
  segments.forEach((segment, index) => {
    const trimmedSegment = segment.trim();
    if (!trimmedSegment) return;
    
    // Try different TV speaker patterns
    const patterns = [
      // Pattern 1: "SPEAKER 1: ROLE: text"
      /^SPEAKER\s+(\d+):\s*([^:]+):\s*(.*)/s,
      // Pattern 2: "SPEAKER 1: text"
      /^SPEAKER\s+(\d+):\s*(.*)/s,
      // Pattern 3: "PRESENTER: text" or "HOST: text"
      /^(PRESENTER|HOST|GUEST|LOCUTOR|ENTREVISTADO):\s*(.*)/s,
      // Pattern 4: "[SPEAKER 1]: text"
      /^\[SPEAKER\s+(\d+)\]:\s*(.*)/s,
      // Pattern 5: "- SPEAKER: text"
      /^\s*-\s*(\w+):\s*(.*)/s
    ];
    
    let matched = false;
    
    for (let i = 0; i < patterns.length; i++) {
      const match = trimmedSegment.match(patterns[i]);
      if (match) {
        matched = true;
        let speaker: string;
        let textContent: string;
        
        if (i === 0) {
          // Pattern 1: "SPEAKER 1: ROLE: text"
          const rawSpeaker = `${match[1]}_${match[2].trim()}`;
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
          if (!speakerMap.has(rawSpeaker)) {
            speakerMap.set(rawSpeaker, speaker);
            speakerCounter++;
          }
          const role = match[2].trim();
          textContent = match[3].trim();
          textContent = `${role}: ${textContent}`;
        } else if (i === 1) {
          // Pattern 2: "SPEAKER 1: text"
          const rawSpeaker = match[1];
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
          if (!speakerMap.has(rawSpeaker)) {
            speakerMap.set(rawSpeaker, speaker);
            speakerCounter++;
          }
          textContent = match[2].trim();
        } else if (i === 2) {
          // Pattern 3: "PRESENTER: text" etc.
          const rawSpeaker = match[1];
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
          if (!speakerMap.has(rawSpeaker)) {
            speakerMap.set(rawSpeaker, speaker);
            speakerCounter++;
          }
          textContent = match[2].trim();
        } else if (i === 3) {
          // Pattern 4: "[SPEAKER 1]: text"
          const rawSpeaker = match[1];
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
          if (!speakerMap.has(rawSpeaker)) {
            speakerMap.set(rawSpeaker, speaker);
            speakerCounter++;
          }
          textContent = match[2].trim();
        } else {
          // Pattern 5: "- SPEAKER: text"
          const rawSpeaker = match[1];
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
          if (!speakerMap.has(rawSpeaker)) {
            speakerMap.set(rawSpeaker, speaker);
            speakerCounter++;
          }
          textContent = match[2].trim();
        }
        
        const startTime = currentTime;
        const endTime = currentTime + averageSegmentDuration;
        
        utterances.push({
          speaker: speaker,
          text: textContent,
          start: startTime,
          end: endTime,
        });
        
        currentTime = endTime;
        break;
      }
    }
    
    // If no pattern matched, treat as unknown speaker
    if (!matched && trimmedSegment) {
      utterances.push({
        speaker: "1",
        text: trimmedSegment,
        start: currentTime,
        end: currentTime + averageSegmentDuration,
      });
      currentTime += averageSegmentDuration;
    }
  });
  
  return utterances;
}

/**
 * Map role names to speaker numbers for consistency
 */
function mapRoleToSpeakerNumber(role: string): string {
  const roleMap: { [key: string]: string } = {
    'PRESENTER': '1',
    'HOST': '1',
    'LOCUTOR': '1',
    'GUEST': '2',
    'ENTREVISTADO': '2',
    'SPEAKER': '1',
  };
  
  return roleMap[role.toUpperCase()] || '1';
}

/**
 * Check if text contains TV-specific speaker patterns
 */
export function hasTvSpeakerPatterns(text: string): boolean {
  if (!text || !text.trim()) return false;
  
  const patterns = [
    /SPEAKER\s+\d+:/i,
    /PRESENTER:/i,
    /HOST:/i,
    /GUEST:/i,
    /LOCUTOR:/i,
    /ENTREVISTADO:/i,
    /\[SPEAKER\s+\d+\]/i,
    /^\s*-\s*\w+:/m
  ];
  
  return patterns.some(pattern => pattern.test(text));
}