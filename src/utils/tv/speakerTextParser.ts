import { UtteranceTimestamp } from "@/services/audio/transcriptionService";

/**
 * Parse TV-specific speaker-formatted text into structured utterances
 * Enhanced to handle mixed content and clean speaker separation
 */
export function parseTvSpeakerText(text: string): UtteranceTimestamp[] {
  if (!text || !text.trim()) return [];

  const utterances: UtteranceTimestamp[] = [];
  
  // First, clean the text from any analysis artifacts
  const cleanedText = cleanInputText(text);
  
  // Use matchAll to capture each SPEAKER segment individually in chronological order
  const segments: string[] = [];
  
  // Match each SPEAKER X: occurrence with its content until the next SPEAKER or end
  const speakerMatches = Array.from(
    cleanedText.matchAll(/(SPEAKER\s+\d+(?:\s*\([^)]+\))?:\s*)([^]*?)(?=SPEAKER\s+\d+|$)/gi)
  );
  
  // Extract segments preserving order - each match is a separate segment
  speakerMatches.forEach(match => {
    const speakerLabel = match[1].trim(); // SPEAKER X: or SPEAKER X (Name):
    const content = match[2].trim(); // The dialogue content
    if (content) {
      segments.push(`${speakerLabel} ${content}`);
    }
  });
  
  // Fallback to original method if no speaker patterns found
  if (segments.length === 0) {
    segments.push(...cleanedText.split(/\n\s*\n/).filter(segment => segment.trim()));
  }
  
  let currentTime = 0;
  const averageSegmentDuration = 5000; // 5 seconds per segment as placeholder
  
  // Track unique speakers for dynamic assignment
  const speakerMap = new Map<string, string>();
  let speakerCounter = 1;
  
  segments.forEach((segment, index) => {
    const trimmedSegment = segment.trim();
    if (!trimmedSegment || isAnalysisContent(trimmedSegment)) return;
    
    // Try different TV speaker patterns
    const patterns = [
      // Pattern 1: "SPEAKER 1: ROLE: text"
      /^SPEAKER\s+(\d+):\s*([^:]+):\s*(.*)/s,
      // Pattern 2: "SPEAKER 1: text"
      /^SPEAKER\s+(\d+):\s*(.*)/s,
      // Pattern 3: "PRESENTER: text" or "HOST: text"
      /^(PRESENTER|HOST|GUEST|LOCUTOR|ENTREVISTADO|CONDUCTOR|REPORTERO|REPORTERA|INVITADO|INVITADA|COMENTARISTA|ANALISTA|PERIODISTA):\s*(.*)/s,
      // Pattern 4: "[SPEAKER 1]: text"
      /^\[SPEAKER\s+(\d+)\]:\s*(.*)/s,
      // Pattern 5: "- SPEAKER: text"
      /^\s*-\s*(\w+):\s*(.*)/s,
      // Pattern 6: "NAME: text" (generic caps)
      /^([A-ZÁÉÍÓÚÑÜ\s]{2,15}):\s*(.*)/s
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
        } else if (i === 4) {
          // Pattern 5: "- SPEAKER: text"
          const rawSpeaker = match[1];
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
          if (!speakerMap.has(rawSpeaker)) {
            speakerMap.set(rawSpeaker, speaker);
            speakerCounter++;
          }
          textContent = match[2].trim();
        } else {
          // Pattern 6: "NAME: text"
          const rawSpeaker = match[1].trim();
          speaker = getOrAssignSpeaker(rawSpeaker, speakerMap, speakerCounter);
          if (!speakerMap.has(rawSpeaker)) {
            speakerMap.set(rawSpeaker, speaker);
            speakerCounter++;
          }
          textContent = match[2].trim();
        }
        
        // Validate text content is not empty and not analysis
        if (textContent && textContent.length > 5 && !isAnalysisContent(textContent)) {
          const startTime = currentTime;
          const endTime = currentTime + averageSegmentDuration;
          
          utterances.push({
            speaker: speaker,
            text: textContent,
            start: startTime,
            end: endTime,
          });
          
          currentTime = endTime;
        }
        break;
      }
    }
    
    // If no pattern matched but looks like valid dialogue, treat as unknown speaker
    if (!matched && trimmedSegment && trimmedSegment.length > 10 && 
        !isAnalysisContent(trimmedSegment) && !trimmedSegment.includes('{')) {
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
 * Get or assign a speaker ID in the format "speaker_X"
 */
function getOrAssignSpeaker(rawSpeaker: string, speakerMap: Map<string, string>, speakerCounter: number): string {
  if (speakerMap.has(rawSpeaker)) {
    return speakerMap.get(rawSpeaker)!;
  }
  return `speaker_${speakerCounter}`;
}

/**
 * Enhanced cleaning of input text from analysis artifacts and mixed content
 */
function cleanInputText(text: string): string {
  if (!text) return "";
  
  let cleaned = text;
  
  // Enhanced JSON and structure artifacts removal
  cleaned = cleaned
    .replace(/[\{\}]/g, '')
    .replace(/"[^"]*":\s*/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/')
    .replace(/[\[\]]/g, '')
    .replace(/,\s*$/gm, '')
    .replace(/^\s*,/gm, '')
    .trim();
  
  // Remove enhanced analysis section markers and headers
  cleaned = cleaned
    .replace(/## PASO \d+:.*$/gmi, '')
    .replace(/## SECCIÓN \d+:.*$/gmi, '')
    .replace(/\*\*FORMATO OBLIGATORIO.*?\*\*/gs, '')
    .replace(/\*\*REGLAS ESTRICTAS.*?\*\*/gs, '')
    .replace(/\*\*EJEMPLO CORRECTO.*?\*\*/gs, '')
    .replace(/\[TIPO DE CONTENIDO:.*?\]/gi, '');
  
  // Remove instruction text and format guidelines
  const instructionPatterns = [
    /CRÍTICO - SOLO DIÁLOGOS.*?(?=SPEAKER|$)/gs,
    /Tu tarea principal.*?(?=SPEAKER|$)/gs,
    /FORMATO OBLIGATORIO.*?(?=SPEAKER|$)/gs,
    /REGLAS ESTRICTAS.*?(?=SPEAKER|$)/gs,
    /USA NOMBRES REALES.*?(?=SPEAKER|$)/gs,
    /NO incluyas análisis.*?(?=SPEAKER|$)/gs
  ];
  
  instructionPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  return cleaned.trim();
}

/**
 * Enhanced check if content is analysis-related rather than transcription dialogue
 */
function isAnalysisContent(text: string): boolean {
  if (!text) return true;
  
  const analysisKeywords = [
    'transcription', 'visual_analysis', 'analysis', 'summary', 'keywords', 'segments',
    'transcripción', 'análisis', 'resumen', 'palabras', 'segmentos',
    'who', 'what', 'when', 'where', 'why', 'quién', 'qué', 'cuándo', 'dónde', 'por qué',
    'formato', 'reglas', 'ejemplo', 'paso', 'sección', 'crítico', 'obligatorio', 'estrictas'
  ];
  
  const lowerText = text.toLowerCase();
  
  // Enhanced analysis field pattern detection
  const hasAnalysisPattern = analysisKeywords.some(keyword => 
    lowerText.startsWith(keyword + ':') || 
    lowerText.includes('"' + keyword + '"') ||
    lowerText.includes(keyword + '":') ||
    lowerText.includes(keyword + ' obligatorio') ||
    lowerText.includes(keyword + ' para')
  );
  
  // Enhanced JSON and instruction pattern detection
  const hasJsonPattern = text.includes('{') || text.includes('}') || 
                         text.includes('":') || text.startsWith('"');
                         
  const isInstruction = text.includes('**') || text.startsWith('##') || 
                       text.includes('FORMATO') || text.includes('REGLAS') ||
                       text.includes('EJEMPLO') || text.includes('PASO');
  
  // Check if it's too short or looks like metadata
  const isTooShort = text.trim().length < 10;
  
  // Check for content type markers
  const hasContentMarker = text.includes('[TIPO DE CONTENIDO:') || 
                          text.includes('[SECCIÓN') ||
                          text.includes('[PASO');
  
  return hasAnalysisPattern || hasJsonPattern || isTooShort || isInstruction || hasContentMarker;
}

/**
 * Map role names to speaker numbers for consistency
 */
function mapRoleToSpeakerNumber(role: string): string {
  const roleMap: { [key: string]: string } = {
    'PRESENTER': '1',
    'HOST': '1',
    'LOCUTOR': '1',
    'CONDUCTOR': '1',
    'GUEST': '2',
    'ENTREVISTADO': '2',
    'INVITADO': '2',
    'INVITADA': '2',
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
    // Standard speaker patterns
    /SPEAKER\s+\d+:/i,
    /PRESENTER:/i,
    /HOST:/i,
    /GUEST:/i,
    /LOCUTOR:/i,
    /ENTREVISTADO:/i,
    /\[SPEAKER\s+\d+\]/i,
    /^\s*-\s*\w+:/m,
    
    // Enhanced patterns for better detection
    /^[A-ZÁÉÍÓÚÑÜ\s]{2,}:\s*/m,  // Generic "NAME: " pattern (caps)
    /CONDUCTOR:/i,
    /REPORTERO:|REPORTERA:/i,
    /INVITADO:|INVITADA:/i,
    /COMENTARISTA:/i,
    /ANALISTA:/i,
    /PERIODISTA:/i,
    
    // Role-based patterns
    /SPEAKER\s+\d+:\s*[A-ZÁÉÍÓÚÑÜ\s]+:/i,  // "SPEAKER 1: NAME:"
    /^\d+\.\s*[A-ZÁÉÍÓÚÑÜ\s]+:/m,  // "1. NAME:"
    
    // Mixed format patterns
    /\[[A-ZÁÉÍÓÚÑÜ\s]+\]:/i,  // "[NAME]:"
    /-\s*[A-ZÁÉÍÓÚÑÜ\s]{2,}:/i  // "- NAME:"
  ];
  
  return patterns.some(pattern => pattern.test(text));
}