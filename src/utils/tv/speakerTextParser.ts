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
  
  // Track unique speakers for dynamic assignment with enhanced counter
  const speakerMap = new Map<string, string>();
  const speakerCounter = { value: 1 };
  
  segments.forEach((segment, index) => {
    const trimmedSegment = segment.trim();
    if (!trimmedSegment) return;
    
    // Try different TV speaker patterns including enhanced visual identification
    const patterns = [
      // Pattern 1: "**Full Name with Title:** text" (Enhanced Gemini format with visual identification)
      /^\*\*([A-ZÁÉÍÓÚÑÜ][a-záéíóúñü\s]+(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü\s]*){1,4}(?:\s*-\s*[^*:]+)?)\*\*:\s*(.*)/s,
      // Pattern 2: "**Speaker Name:** text" (Standard Gemini format)
      /^\*\*([^*]+):\*\*\s*(.*)/s,
      // Pattern 3: "FULL NAME:" (from visual identification)
      /^([A-ZÁÉÍÓÚÑÜ][a-záéíóúñü\s]+(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü\s]*){1,3}):\s*(.*)/s,
      // Pattern 4: "ROLE - NAME:" (professional titles with names)
      /^((?:REPORTERA?|PRESENTADORA?|CORRESPONSAL|ANALISTA|SECRETARIA?|ALCALDE|GOBERNADORA?)\s*-?\s*[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü\s]*(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü\s]*){0,3}):\s*(.*)/s,
      // Pattern 5: "SPEAKER 1: ROLE: text"
      /^SPEAKER\s+(\d+):\s*([^:]+):\s*(.*)/s,
      // Pattern 6: "SPEAKER 1: text"
      /^SPEAKER\s+(\d+):\s*(.*)/s,
      // Pattern 7: "PRESENTER: text" or "HOST: text"
      /^(PRESENTER|HOST|GUEST|LOCUTOR|ENTREVISTADO|PRESENTADORA|REPORTERA|REPORTERO):\s*(.*)/s,
      // Pattern 8: "[SPEAKER 1]: text"
      /^\[SPEAKER\s+(\d+)\]:\s*(.*)/s,
      // Pattern 9: "- SPEAKER: text"
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
          // Pattern 1: "**Full Name with Title:** text" (Enhanced visual identification)
          const rawSpeaker = match[1].trim();
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
          textContent = match[2].trim();
        } else if (i === 1) {
          // Pattern 2: "**Speaker Name:** text" (Standard Gemini format)
          const rawSpeaker = match[1].trim();
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
          textContent = match[2].trim();
        } else if (i === 2) {
          // Pattern 3: "FULL NAME:" (from visual identification)
          const rawSpeaker = match[1].trim();
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
          textContent = match[2].trim();
        } else if (i === 3) {
          // Pattern 4: "ROLE - NAME:" (professional titles with names)
          const rawSpeaker = match[1].trim();
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
          textContent = match[2].trim();
        } else if (i === 4) {
          // Pattern 5: "SPEAKER 1: ROLE: text"
          const rawSpeaker = `${match[1]}_${match[2].trim()}`;
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
          const role = match[2].trim();
          textContent = match[3].trim();
          textContent = `${role}: ${textContent}`;
        } else if (i === 5) {
          // Pattern 6: "SPEAKER 1: text"
          const rawSpeaker = match[1];
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
          textContent = match[2].trim();
        } else if (i === 6) {
          // Pattern 7: "PRESENTER: text" etc.
          const rawSpeaker = match[1];
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
          textContent = match[2].trim();
        } else if (i === 7) {
          // Pattern 8: "[SPEAKER 1]: text"
          const rawSpeaker = match[1];
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
          textContent = match[2].trim();
        } else {
          // Pattern 9: "- SPEAKER: text"
          const rawSpeaker = match[1];
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
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
        speaker: "speaker_1",
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
 * Get or assign a speaker ID in the format "speaker_X" with enhanced name similarity matching
 */
function getOrAssignSpeaker(rawSpeaker: string, speakerMap: Map<string, string>, speakerCounter: { value: number }): string {
  // Clean and normalize the speaker name
  let cleanSpeaker = rawSpeaker.trim();
  
  // Clean up visual identification markers and improve speaker names
  cleanSpeaker = cleanSpeaker
    .replace(/^\*\*|\*\*$/g, '') // Remove bold markers
    .replace(/\s*-\s*/, ' - ')    // Normalize dashes
    .trim();
  
  // Check for existing exact match first
  if (speakerMap.has(cleanSpeaker)) {
    return speakerMap.get(cleanSpeaker)!;
  }
  
  // Check for similar names (case-insensitive partial matching)
  for (const [existingSpeaker, existingId] of speakerMap.entries()) {
    if (areNamesSimilar(cleanSpeaker, existingSpeaker)) {
      // Update the map to use the more complete/recent name
      speakerMap.delete(existingSpeaker);
      speakerMap.set(cleanSpeaker, existingId);
      return existingId;
    }
  }

  // Assign new speaker ID
  const speakerId = `speaker_${speakerCounter.value}`;
  speakerMap.set(cleanSpeaker, speakerId);
  speakerCounter.value++;
  
  return speakerId;
}

/**
 * Helper function to check if two names refer to the same person
 */
function areNamesSimilar(name1: string, name2: string): boolean {
  const normalize = (name: string) => name.toLowerCase()
    .replace(/[^a-záéíóúñü\s]/g, '')
    .trim()
    .split(/\s+/);
  
  const words1 = normalize(name1);
  const words2 = normalize(name2);
  
  // If one is a subset of the other (e.g., "María" vs "María González")
  if (words1.length !== words2.length) {
    const shorter = words1.length < words2.length ? words1 : words2;
    const longer = words1.length < words2.length ? words2 : words1;
    return shorter.every(word => longer.includes(word));
  }
  
  // Check for significant overlap in names
  const commonWords = words1.filter(word => words2.includes(word));
  return commonWords.length >= Math.min(2, Math.min(words1.length, words2.length));
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
    /\*\*[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü\s]+(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü\s]*){1,4}(?:\s*-\s*[^*:]+)?\*\*:/i, // Enhanced names with titles
    /\*\*[^*]+:\*\*/i, // Standard Gemini format: **Speaker:**
    /[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü\s]+(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü\s]*){1,3}:/i, // Full names from visual identification
    /(?:REPORTERA?|PRESENTADORA?|CORRESPONSAL|ANALISTA|SECRETARIA?|ALCALDE|GOBERNADORA?)\s*-?\s*[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü\s]*:/i, // Professional titles with names
    /SPEAKER\s+\d+:/i,
    /PRESENTER:/i,
    /HOST:/i,
    /GUEST:/i,
    /LOCUTOR:/i,
    /ENTREVISTADO:/i,
    /REPORTERA?:/i,
    /\[SPEAKER\s+\d+\]/i,
    /^\s*-\s*\w+:/m
  ];
  
  return patterns.some(pattern => pattern.test(text));
}